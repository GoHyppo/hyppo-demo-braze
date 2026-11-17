# hyppo-demo-braze

Demo interna de Hyppo para mostrar cómo se integra Braze en una web con el **Web SDK** y ver en el
dashboard cómo aparece cada cosa: identidad, atributos, custom events, compras, in-app messages,
Banners y Content Cards. Es un sitio estático (HTML + JS, sin build) publicado en GitHub Pages.

Cada sección de la página tiene un desplegable de **Particularidades** con lo que no es obvio la
primera vez, y el panel de la derecha muestra cada llamada al SDK.

## Archivos

| Archivo | Qué tiene |
|---|---|
| `index.html` | Las secciones de la demo |
| `js/config.js` | API key, SDK endpoint, IDs de los placements de Banners y de las campañas |
| `guia.html` | Guía para presentar la demo |
| `js/app.js` | Toda la integración con el SDK |
| `css/styles.css` | Estilos con los colores y la tipografía de Hyppo |

El SDK se carga por CDN (`js.appboycdn.com/web-sdk/7.1/`), que recibe los parches de la 7.1 solo.
Pasar a otra versión es un cambio a mano.

## Setup en Braze

1. **App web**: Settings → App Settings → agregar una app de plataforma Web. Copiar la *API key* y
   el *SDK endpoint* a `js/config.js`. La key del Web SDK es pública por diseño (viaja en el
   navegador), así que va commiteada.
2. **Banner Placements**: Settings → Banner Placements, crear `demo_home_hero` y `demo_tienda`
   (los IDs tienen que coincidir con `config.js`). Banners depende del paquete contratado; si el
   workspace no lo tiene, el log muestra `FEATURE_DISABLED`.
3. **Campañas de la demo** (creadas en el sandbox y activas desde el 2026-11-17):
   - `[Demo] In-app de prueba`: in-app con trigger `demo_inapp`.
   - `[Demo] Oferta por plan`: in-app con trigger `demo_boton_clickeado`, texto según el atributo `plan`.
   - Canvas `[Demo] Carrito abandonado v2`: entra con `agrego_al_carrito`, espera 2 minutos, in-app y división por el `plan` del evento: free recibe un email con oferta a Pro; el resto, un test A/B de asunto. Conversión y salida: el custom event `compro`. (El primer Canvas, sin ramas, quedó detenido.)
   - Sus IDs van en `js/config.js` (`campaigns`, `canvases`) para los links "Ver en Braze".
   - Pendiente: Banners y Content Cards, cuando el sandbox los tenga.

`guia.html` es la guía para presentar la demo paso a paso, con capturas en `assets/guia/`.

## Correr local

```sh
python3 -m http.server 8000
```

y abrir `http://localhost:8000`. Abrir el `index.html` directo como archivo no sirve: el SDK
necesita un origen http(s).

## Qué se manda a Braze

| Acción | Llamada | Dónde se ve |
|---|---|---|
| Identificar | `changeUser`, `setEmail`, `setFirstName`, `setCustomUserAttribute("plan")` | Audience → Search Users |
| Cerrar sesión | `wipeData()` | Device nuevo, usuario anónimo |
| Enviar evento | `logCustomEvent(nombre, props)` | Perfil del usuario, Data Settings → Custom Events |
| Al carrito | `logCustomEvent("agrego_al_carrito", {producto, precio, plan})` | Ídem |
| Comprar | `logPurchase(id, precio, "USD", 1)` | Revenue, Data Settings → Products |
| Disparar in-app | `logCustomEvent("demo_inapp")` | El mensaje en la página |
