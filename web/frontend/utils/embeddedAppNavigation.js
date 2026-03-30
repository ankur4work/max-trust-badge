const EMBEDDED_APP_CACHE = {
  host: "__SHOPIFY_DEV_HOST",
  shop: "__SHOPIFY_SHOP",
};

function readEmbeddedParam(name) {
  if (typeof window === "undefined") return null;

  const value = new URLSearchParams(window.location.search).get(name);
  const cacheKey = EMBEDDED_APP_CACHE[name];

  if (value) {
    window[cacheKey] = value;
    return value;
  }

  return window[cacheKey] || null;
}

export function getEmbeddedAppHost() {
  return readEmbeddedParam("host");
}

export function getEmbeddedAppShop() {
  return readEmbeddedParam("shop");
}

export function withEmbeddedAppParams(path) {
  const url = new URL(path, "https://embedded-app.local");
  const host = getEmbeddedAppHost();
  const shop = getEmbeddedAppShop();

  if (host && !url.searchParams.has("host")) {
    url.searchParams.set("host", host);
  }

  if (shop && !url.searchParams.has("shop")) {
    url.searchParams.set("shop", shop);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
