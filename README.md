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
| `js/config.js` | API key, SDK endpoint e IDs de los placements de Banners |
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
3. **Campañas para probar**:
   - In-app message action-based, trigger *Perform custom event* `demo_inapp`.
   - Banner sobre `demo_home_hero` y otro sobre `demo_tienda` (por ejemplo, segmentado por el
     atributo `plan`).
   - Content Card para todos los usuarios.

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
| Al carrito | `logCustomEvent("agrego_al_carrito", {producto, precio})` | Ídem |
| Comprar | `logPurchase(id, precio, "USD", 1)` | Revenue, Data Settings → Products |
| Disparar in-app | `logCustomEvent("demo_inapp")` | El mensaje en la página |
