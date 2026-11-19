const cfg = window.BRAZE_CONFIG;
const $ = (sel) => document.querySelector(sel);

const PRODUCTS = [
  { id: "remera-hyppo", name: "Remera Hyppo", price: 25 },
  { id: "buzo-hyppo", name: "Buzo Hyppo", price: 64 },
  { id: "gorra-hyppo", name: "Gorra Hyppo", price: 22 },
];

function log(method, detail = "", kind = "") {
  const li = document.createElement("li");
  li.className = kind;
  li.innerHTML = `<span class="t">${new Date().toLocaleTimeString()}</span> <code>${method}</code> ${detail ? `<pre>${typeof detail === "string" ? detail : JSON.stringify(detail, null, 2)}</pre>` : ""}`;
  $("#log").prepend(li);
  countLog();
  console.log("[braze]", method, detail);
}
function countLog() { $("#log-count").textContent = $("#log").children.length; }

// El log, y si el panel está abierto, sobreviven a las recargas de la demo (solo en esta pestaña).
const LOG_KEY = "braze-demo-log";
const LOG_OPEN_KEY = "braze-demo-log-open";
function saveLog() {
  try { sessionStorage.setItem(LOG_KEY, $("#log").innerHTML); } catch (e) { /* sin storage, se pierde el log */ }
}
function restoreLog() {
  try { $("#log").innerHTML = sessionStorage.getItem(LOG_KEY) || ""; } catch (e) { /* idem */ }
  countLog();
  try { setLogOpen(sessionStorage.getItem(LOG_OPEN_KEY) === "1"); } catch (e) { /* queda minimizado */ }
}
function setLogOpen(open) {
  document.body.classList.toggle("log-closed", !open);
  try { sessionStorage.setItem(LOG_OPEN_KEY, open ? "1" : "0"); } catch (e) { /* sin storage */ }
}

// Cada acción manda los datos en el momento, para verlos rápido en el dashboard.
function flush() { braze.requestImmediateDataFlush(); }

// Links al dashboard de Braze, siempre en una pestaña nueva.
const dashUrl = (path) => `${cfg.dashboard}/${path}/${cfg.workspaceId}`;
function setupBrazeLinks() {
  document.querySelectorAll("[data-link]").forEach((a) => {
    const [kind, key] = a.dataset.link.split(":");
    const id = kind === "canvas" ? cfg.canvases[key] : cfg.campaigns[key];
    if (!id) { a.hidden = true; return; }
    // Abren la vista de resultados, no el editor: page=-2 en campañas, isEditing=false en Canvas.
    a.href = kind === "canvas" ? `${dashUrl(`engagement/canvas/${id}`)}?isEditing=false`
      : `${dashUrl(`engagement/campaigns/${id}`)}?page=-2`;
    a.target = "_blank";
    a.rel = "noopener";
  });
}

const currentUserId = () => braze.getUser()?.getUserId() || null;

function refreshUserInfo() {
  const id = currentUserId();
  const deviceId = braze.getDeviceId();
  $("#who").textContent = id ? `identificado: ${id}` : "anónimo";
  $("#who").classList.toggle("ok", Boolean(id));
  $("#device-id").textContent = deviceId || "—";
  // Search Users acepta ?query=; a un anónimo se lo encuentra por device ID.
  $("#link-profile").href = `${dashUrl("users/user_search")}?query=${encodeURIComponent(id || deviceId)}`;
  $("#cart-hint").textContent = id ? "Agrega un producto al carrito y espera 2 minutos." : "Primero identifícate con tu email en el paso 2.";
}

function renderBanners(snapshot) {
  for (const [slot, placementId] of Object.entries(cfg.bannerPlacements)) {
    const banner = snapshot.banners[placementId];
    const container = document.querySelector(`.banner-slot[data-placement="${slot}"]`);
    if (!banner || banner.isControl) continue; // queda el aviso punteado
    container.innerHTML = "";
    braze.insertBanner(banner, container);
    container.classList.add("filled");
  }
}

function refreshBanners() {
  const ids = Object.values(cfg.bannerPlacements);
  braze.requestBannersRefresh(ids);
  log("requestBannersRefresh", ids);
}

function setupBanners() {
  braze.subscribeToBannersEvents((event) => {
    if (event.type === braze.ChannelEventType.ERROR) {
      log("banners: ERROR", { reason: event.reason, retryState: event.retryState }, "err");
      return;
    }
    log("banners", { placements: Object.keys(event.cacheSnapshot.banners) });
    renderBanners(event.cacheSnapshot);
  });
}

function renderProducts(highlight) {
  $("#products").innerHTML = PRODUCTS.map((p) => `
    <div class="product${p.id === highlight ? " highlight" : ""}" id="prod-${p.id}">
      ${p.id === highlight ? '<span class="tag">Para ti</span>' : ""}
      <div class="thumb">${p.name.split(" ")[0]}</div>
      <strong>${p.name}</strong>
      <span class="muted">USD ${p.price}</span>
      <div class="row">
        <button class="ghost small" data-cart="${p.id}">Al carrito</button>
        <button class="small" data-buy="${p.id}">Comprar</button>
      </div>
    </div>`).join("");
}

function setupUi() {
  $("#btn-log-open").addEventListener("click", () => setLogOpen(true));
  $("#btn-log-close").addEventListener("click", () => setLogOpen(false));
  $("#toggle-notes").addEventListener("change", (e) => document.body.classList.toggle("show-notes", e.target.checked));

  $("#form-user").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    // ID estable por persona: el mismo email da el mismo perfil en cada demo.
    const id = "demo-" + f.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    braze.changeUser(id);
    const user = braze.getUser();
    user.setEmail(f.email.trim());
    if (f.first_name) user.setFirstName(f.first_name.trim());
    user.setCustomUserAttribute("plan", f.plan);
    flush();
    log(`changeUser("${id}") + atributos`, { email: f.email, first_name: f.first_name, plan: f.plan });
    refreshUserInfo();
    // El changeUser ya pidió los banners, pero Braze tarda unos 20 s en guardar el plan:
    // se vuelven a pedir dos veces (cada sesión tiene 5 pedidos).
    $("#identify-hint").textContent = "Braze está armando tu banner: tarda unos 20 segundos…";
    setTimeout(refreshBanners, 15000);
    setTimeout(() => { refreshBanners(); $("#identify-hint").textContent = `Listo: el banner de arriba es el de plan ${f.plan}.`; }, 30000);
  });

  // Vuelve a ser un visitante anónimo nuevo: wipeData() borra el usuario y genera un device nuevo.
  $("#btn-reset").addEventListener("click", () => {
    braze.wipeData();
    $("#log").innerHTML = "";
    log("wipeData", "Visitante anónimo nuevo");
    saveLog();
    history.replaceState(null, "", location.pathname);
    setTimeout(() => location.reload(), 500);
  });

  $("#products").addEventListener("click", (e) => {
    const cartId = e.target.dataset.cart;
    const buyId = e.target.dataset.buy;
    const p = PRODUCTS.find((x) => x.id === (cartId || buyId));
    if (!p) return;
    if (cartId) {
      // El plan viaja en el evento: el Canvas se divide por esta propiedad y no por el atributo,
      // que puede no estar procesado todavía si la persona se acaba de identificar.
      const props = { producto: p.id, nombre: p.name, precio: p.price, plan: $("select[name=plan]").value };
      braze.logCustomEvent("agrego_al_carrito", props);
      log('logCustomEvent("agrego_al_carrito")', props);
      e.target.textContent = "En el carrito ✓";
    } else {
      braze.logPurchase(p.id, p.price, "USD", 1);
      // Además de la compra, un custom event: en el sandbox el Canvas no ofrece "Makes Purchase"
      // como conversión ni como salida, pero sí "Performs custom event". También dispara la card post-compra.
      const props = { producto: p.id, nombre: p.name, precio: p.price };
      braze.logCustomEvent("compro", props);
      log(`logPurchase("${p.id}", ${p.price}, "USD", 1) + logCustomEvent("compro")`, props);
      e.target.textContent = "Comprado ✓";
      // La card post-compra tarda unos 20 s en estar disponible.
      for (const ms of [15000, 30000]) setTimeout(() => braze.requestContentCardsRefresh(), ms);
    }
    flush();
  });

  $("#btn-inapp").addEventListener("click", () => {
    braze.logCustomEvent("demo_boton_clickeado");
    flush();
    log('logCustomEvent("demo_boton_clickeado")', "La campaña responde con un modal según tu plan");
  });
}

// Llegada desde el email del Canvas: ?uid=<external ID>&producto=<id>.
function handleEmailArrival() {
  const q = new URLSearchParams(location.search);
  const uid = q.get("uid");
  const producto = q.get("producto");
  renderProducts(uid ? producto : null);
  if (!uid) return;
  braze.changeUser(uid);
  flush();
  log(`changeUser("${uid}")`, { origen: "link del email", producto });
  $("#from-email-id").textContent = uid;
  $("#from-email").hidden = false;
  history.replaceState(null, "", location.pathname);
  setTimeout(() => document.getElementById(`prod-${producto}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
}

function init() {
  setupBrazeLinks();
  document.querySelectorAll("[data-placement-id]").forEach((el) => {
    el.textContent = cfg.bannerPlacements[el.dataset.placementId];
  });
  restoreLog();
  setupUi();

  // EasyPrivacy (Brave Shields, uBlock, etc.) bloquea el CDN del SDK y el envío de datos.
  if (typeof window.braze === "undefined") {
    renderProducts(null);
    $("#status").textContent = "Bloqueado: desactiva el bloqueador para esta página";
    $("#status").classList.add("err");
    log("SDK no cargó", "Un bloqueador de anuncios (Brave Shields, uBlock…) bloquea js.appboycdn.com y braze.eu/api/v3/data/. Desactívalo para este sitio y recarga.", "err");
    return;
  }

  braze.initialize(cfg.apiKey, {
    baseUrl: cfg.baseUrl,
    enableLogging: true, // el detalle completo queda en la consola del navegador
    allowUserSuppliedJavascript: true, // lo piden los banners y los in-app HTML
  });
  braze.automaticallyShowInAppMessages();
  braze.subscribeToInAppMessage((msg) => log("in-app recibido", msg.message || msg.header || "(sin texto)"));
  braze.subscribeToContentCardsUpdates((cards) => log("content cards", `${cards.cards.length} cards`));
  braze.showContentCards($("#cards-feed"));
  braze.openSession();
  // Los banners se escuchan y se piden después de abrir la sesión: antes, el SDK responde FEATURE_DISABLED.
  setupBanners();
  refreshBanners();

  $("#status").textContent = "Conectado a Braze";
  $("#status").classList.add("ok");
  log("initialize", { baseUrl: cfg.baseUrl });
  handleEmailArrival();
  refreshUserInfo();
}

init();
