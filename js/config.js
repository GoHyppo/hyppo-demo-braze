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
};
