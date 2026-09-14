// Config comercial única — troque preços, links e prazo de garantia só aqui.
window.SALADA_CONFIG = {
  BASIC_PRICE: 10.00,
  PREMIUM_PRICE: 29.90,
  UPGRADE_PRICE: 14.90,

  BASIC_CHECKOUT_URL: "https://app.zuptos.com.br/checkout/bca85447aae2abf0",
  PREMIUM_CHECKOUT_URL: "https://app.zuptos.com.br/checkout/72f01fe23c8d647c",
  UPGRADE_CHECKOUT_URL: "https://app.zuptos.com.br/checkout/b1f87b00a9338a66",

  GARANTIA_DIAS: 7,

  // Meta Pixel — mesmo ID já usado no checkout (Zuptos), pra landing page e checkout caírem no mesmo pixel.
  // O snippet base fica em index.html; este valor é só referência/documentação.
  META_PIXEL_ID: "1925294838146815"
};
