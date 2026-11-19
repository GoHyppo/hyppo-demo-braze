# hyppo-demo-braze

Demo de Hyppo para mostrar Braze en una web con el **Web SDK**, pensada para presentar en una reunión
compartiendo pantalla. Es un recorrido guiado de cinco pasos, cada uno con lo que hace la web y un link
a dónde se ve en Braze. Sitio estático (HTML + JS, sin build) en GitHub Pages:
<https://gohyppo.github.io/hyppo-demo-braze/>. Push a `main` = deploy. Es la hermana de
`hyppo-demo-customerio` y sigue su formato: la clienta es Sofía, la tienda vende ropa y la página va en
español neutro (tú). Si cambia el formato de una, revisar la otra.

Workspace: **HYPPO**, sandbox de partner en el cluster EU-02 (`dashboard-02.braze.eu`).

## El recorrido

| Paso | Qué hace la web | Qué responde Braze |
|---|---|---|
| 1 · Visitante anónimo | `initialize` + `openSession`; perfil anónimo por device ID | Banner `[Demo] Banner hero por plan` en `demo_home_hero`, con el texto para anónimos |
| 2 · Identificarse | `changeUser("demo-" + email)`, `setEmail`, `setFirstName`, `setCustomUserAttribute("plan")`, y otro `requestBannersRefresh` a los 5 s | El mismo banner, con el texto del plan |
| 3 · Carrito abandonado → email → web | `logCustomEvent("agrego_al_carrito", {producto, nombre, precio, plan})`; comprar es `logPurchase` + `logCustomEvent("compro")` | Canvas `[Demo] Carrito abandonado v2`: a los 2 min in-app y email según el plan (free → oferta a Pro; pro/enterprise → Experiment Path 50/50 de asunto). El link vuelve con `?uid=…&producto=…`. Conversión y salida: `compro`. Arriba de los productos, `[Demo] Banner tienda` en `demo_tienda` |
| 4 · In-app | `logCustomEvent("demo_boton_clickeado")` | `[Demo] Oferta por plan`: modal con el texto según el plan, con re-evaluación antes de mostrar |
| 5 · Content Cards | `showContentCards` en `#cards-feed` | `[Demo] Card de bienvenida` (en la primera impresión) y `[Demo] Card post-compra` (trigger `compro`) |

El toggle **Notas técnicas** de arriba muestra lo que no es obvio de cada paso. El panel negro (arranca
minimizado, se abre abajo a la derecha) muestra cada llamada al SDK y tiene **Empezar de nuevo**
(`wipeData()`: visitante anónimo con un device nuevo). `guia.html` es la guía para presentar, con capturas
en `assets/guia/`.

## Antes de la reunión

- Bajar el bloqueador de anuncios en el sitio: EasyPrivacy (Brave Shields, uBlock) bloquea
  `js.appboycdn.com` y `braze.eu/api/v3/data/`. Si está activo, arriba dice "Bloqueado".
- Hacer el recorrido una vez con tu email: una campaña de in-app recién lanzada llega recién en la sesión
  siguiente.
- El ID de cada persona es `demo-` + su email normalizado, así que el mismo email vuelve al mismo perfil.

## Archivos

| Archivo | Qué tiene |
|---|---|
| `index.html` | Los pasos |
| `js/config.js` | API key, SDK endpoint, placements de Banners e IDs de campañas y Canvas (para los links "↗") |
| `js/app.js` | Toda la integración con el SDK |
| `css/styles.css` | Estilos con los colores y la tipografía de Hyppo (los mismos que la demo de Customer.io) |
| `guia.html` | Guía para presentar |

El SDK se carga por CDN (`js.appboycdn.com/web-sdk/7.1/`), que recibe los parches de la 7.1 solo.
Pasar a otra versión es un cambio a mano.

## Setup en Braze

1. **App web**: Settings → App Settings → app de plataforma Web. La *API key* y el *SDK endpoint* van
   en `js/config.js`. La key del Web SDK es pública por diseño, así que va commiteada.
2. **Banner Placements**: Settings → Banner Placements, `demo_home_hero` y `demo_tienda` (los IDs tienen
   que coincidir con `config.js`). Banners y Content Cards dependen del paquete; sin Banners, el log
   muestra `FEATURE_DISABLED`.
3. **Campañas**, todas con el prefijo `[Demo]`: las de la tabla de arriba. El Canvas v1 (sin ramas) y
   `[Demo] In-app de prueba` (trigger `demo_inapp`) quedaron de pruebas anteriores y la página ya no los usa.

## Correr local

```sh
python3 -m http.server 8000
```

y abrir `http://localhost:8000`. Abrir el `index.html` directo como archivo no sirve: el SDK necesita
un origen http(s).
