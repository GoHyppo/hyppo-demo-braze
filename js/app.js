const cfg = window.BRAZE_CONFIG;
const $ = (sel) => document.querySelector(sel);

const PRODUCTS = [
  { id: "remera-hyppo", name: "Remera Hyppo", price: 25 },
  { id: "buzo-hyppo", name: "Buzo Hyppo", price: 60 },
  { id: "taza-hyppo", name: "Taza Hyppo", price: 12 },
];

function log(method, detail = "", kind = "") {
  const li = document.createElement("li");
  li.className = kind;
  li.innerHTML = `<span class="t">${new Date().toLocaleTimeString()}</span> <code>${method}</code> ${detail ? `<pre>${typeof detail === "string" ? detail : JSON.stringify(detail, null, 2)}</pre>` : ""}`;
  $("#log").prepend(li);
  console.log("[braze]", method, detail);
}

// Cada acción manda los datos en el momento, para verlos rápido en el dashboard.
function flush() {
  braze.requestImmediateDataFlush();
}

// Links al dashboard de Braze, siempre en una pestaña nueva.
const dashUrl = (path) => `${cfg.dashboard}/${path}/${cfg.workspaceId}`;

function setupBrazeLinks() {
  document.querySelectorAll("[data-braze-link]").forEach((a) => {
    const [kind, key] = a.dataset.brazeLink.split(":");
    a.href = kind === "canvas" ? dashUrl(`engagement/canvas/${cfg.canvases[key]}`)
      : dashUrl(`engagement/campaigns/${cfg.campaigns[key]}`);
    a.target = "_blank";
    a.rel = "noopener";
  });
}

function refreshUserInfo() {
  const userId = braze.getUser()?.getUserId();
  const deviceId = braze.getDeviceId();
  $("#current-user").textContent = userId || "anónimo";
  $("#device-id").textContent = deviceId || "—";
  // Search Users acepta ?query=; a un anónimo se lo encuentra por device ID.
  const link = $("#user-link");
  link.href = `${dashUrl("users/user_search")}?query=${encodeURIComponent(userId || deviceId)}`;
  link.textContent = userId ? "Ver este usuario en Braze ↗" : "Ver este usuario anónimo en Braze (por device ID) ↗";
}

function renderBanners(snapshot) {
  for (const [slot, placementId] of Object.entries(cfg.bannerPlacements)) {
    const container = document.querySelector(`.banner-slot[data-placement="${slot}"]`);
    const banner = snapshot.banners[placementId];
    if (!banner || banner.isControl) {
      container.classList.remove("filled");
      container.innerHTML = `<p class="fallback">Placement <code>${placementId}</code>: sin banner para este usuario${banner?.isControl ? " (grupo de control)" : ""}.</p>`;
      continue;
    }
    braze.insertBanner(banner, container);
    container.classList.add("filled");
  }
}

function setupBanners() {
  const ids = Object.values(cfg.bannerPlacements);
  braze.subscribeToBannersEvents((event) => {
    const T = braze.ChannelEventType;
    if (event.type === T.ERROR) {
      log("banners: ERROR", { reason: event.reason, retryState: event.retryState }, "err");
      return;
    }
    log(`banners: ${event.type}`, { placements: Object.keys(event.cacheSnapshot.banners) });
    renderBanners(event.cacheSnapshot);
  });
  braze.requestBannersRefresh(ids);
  log("requestBannersRefresh", ids);
}

function setupUi() {
  $("#form-user").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    braze.changeUser(f.external_id);
    const user = braze.getUser();
    if (f.email) user.setEmail(f.email);
    if (f.first_name) user.setFirstName(f.first_name);
    user.setCustomUserAttribute("plan", f.plan);
    flush();
    log("changeUser + atributos", f);
    refreshUserInfo();
  });

  $("#btn-logout").addEventListener("click", () => {
    braze.wipeData();
    log("wipeData", "Se recarga la página con un device nuevo");
    setTimeout(() => location.reload(), 800);
  });

  $("#form-event").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = new FormData(e.target).get("name");
    const props = { seccion: "eventos", origen: "demo-braze" };
    braze.logCustomEvent(name, props);
    flush();
    log(`logCustomEvent("${name}")`, props);
  });

  $("#products").innerHTML = PRODUCTS.map((p) => `
    <div class="product">
      <div class="thumb">${p.name.split(" ")[0]}</div>
      <strong>${p.name}</strong>
      <span class="muted">USD ${p.price}</span>
      <div class="row">
        <button class="ghost small" data-cart="${p.id}">Al carrito</button>
        <button class="small" data-buy="${p.id}">Comprar</button>
      </div>
    </div>`).join("");

  $("#products").addEventListener("click", (e) => {
    const cartId = e.target.dataset.cart;
    const buyId = e.target.dataset.buy;
    const p = PRODUCTS.find((x) => x.id === (cartId || buyId));
    if (!p) return;
    if (cartId) {
      // El plan viaja en el evento: el Canvas se divide por esta propiedad y no por el atributo,
      // que puede no estar procesado todavía si el usuario se acaba de identificar.
      const props = { producto: p.id, nombre: p.name, precio: p.price, plan: $("select[name=plan]").value };
      braze.logCustomEvent("agrego_al_carrito", props);
      log('logCustomEvent("agrego_al_carrito")', props);
    } else {
      braze.logPurchase(p.id, p.price, "USD", 1, { origen: "demo-braze" });
      // Además de la compra, un custom event: en el sandbox el Canvas no ofrece "Makes Purchase"
      // como conversión ni como salida, pero sí "Performs custom event".
      braze.logCustomEvent("compro", { producto: p.id, precio: p.price });
      log(`logPurchase("${p.id}", ${p.price}, "USD", 1)`);
    }
    flush();
  });

  $("#btn-inapp").addEventListener("click", () => {
    braze.logCustomEvent("demo_inapp");
    flush();
    log('logCustomEvent("demo_inapp")', "Si hay una campaña con ese trigger, el in-app aparece ahora");
  });

  $("#btn-banners").addEventListener("click", () => {
    const ids = Object.values(cfg.bannerPlacements);
    braze.requestBannersRefresh(ids);
    log("requestBannersRefresh", ids);
  });

  $("#btn-cards").addEventListener("click", () => {
    braze.requestContentCardsRefresh();
    log("requestContentCardsRefresh");
  });

  $("#btn-clear").addEventListener("click", () => { $("#log").innerHTML = ""; });
}

// Llegada desde el email del Canvas: ?uid=<external ID>&producto=<id>.
// Identifica al usuario (el link lo arma Braze con {{${user_id}}}) y destaca el producto del carrito.
function handleEmailArrival() {
  const q = new URLSearchParams(location.search);
  const uid = q.get("uid");
  const producto = q.get("producto");
  if (uid) {
    braze.changeUser(uid);
    flush();
    log("llegada desde el email: changeUser", { uid, producto });
    refreshUserInfo();
  }
  const card = producto && document.querySelector(`[data-buy="${producto}"]`)?.closest(".product");
  if (card) {
    card.classList.add("highlight");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function init() {
  setupBrazeLinks();
  document.querySelectorAll("[data-placement-id]").forEach((el) => {
    el.textContent = cfg.bannerPlacements[el.dataset.placementId];
  });

  // EasyPrivacy (Brave Shields, uBlock, etc.) bloquea el CDN del SDK y el envío de datos.
  if (typeof window.braze === "undefined") {
    $("#status").textContent = "SDK bloqueado: desactivá el bloqueador para esta página";
    $("#status").classList.add("err");
    log("SDK no cargó", "Un bloqueador de anuncios (Brave Shields, uBlock…) bloquea js.appboycdn.com y braze.eu/api/v3/data/. Desactivalo para este sitio y recargá.", "err");
    return;
  }

  if (!cfg.apiKey || !cfg.baseUrl) {
    $("#status").textContent = "Falta apiKey / baseUrl en js/config.js";
    $("#status").classList.add("err");
    log("config", "Completá apiKey y baseUrl en js/config.js", "err");
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
  setupBanners();
  braze.openSession();

  setupUi();
  $("#status").textContent = "SDK inicializado";
  $("#status").classList.add("ok");
  log("initialize", { baseUrl: cfg.baseUrl });
  refreshUserInfo();
  handleEmailArrival();
}

init();
