// Datos de la app web en Braze: Settings → App Settings → (app web del workspace).
// La API key del Web SDK es pública por diseño (viaja en el navegador), así que va commiteada.
window.BRAZE_CONFIG = {
  apiKey: "68da4039-611e-4fbf-bcaa-61675730a389", // "API key" de la app web
  baseUrl: "sdk.fra-02.braze.eu",                  // "SDK endpoint" (sin https://)

  // Tienen que existir con el mismo ID en Settings → Banner Placements.
  bannerPlacements: {
    hero: "demo_home_hero",
    tienda: "demo_tienda",
  },

  // Para los links "Ver en Braze": dashboard del cluster y ID del workspace (sale de cualquier URL del dashboard).
  dashboard: "https://dashboard-02.braze.eu",
  workspaceId: "6af7599362e095008e8352fb",

  // Campañas y Canvas de la demo (el ID sale de su URL en el dashboard).
  campaigns: {
    ofertaPorPlan: "6afc7f19a02914008ea56367", // [Demo] Oferta por plan (in-app del paso 4)
    bannerHero: "6afdfe170aeba5008eccebf4", // [Demo] Banner hero por plan
    bannerTienda: "6afe055f0a1404008e9cf87d", // [Demo] Banner tienda
    cardBienvenida: "6afdfbac22b25e009019c374", // [Demo] Card de bienvenida
    cardPostCompra: "6afe05eb32846e008d6977f2", // [Demo] Card post-compra
  },
  canvases: {
    carritoAbandonado: "6afc9660b31a20008e70dcf8", // [Demo] Carrito abandonado v2
  },
};
