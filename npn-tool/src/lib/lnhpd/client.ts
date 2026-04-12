const BASE_URL = "https://health-products.canada.ca/api/natural-licences";

interface LNHPDOptions {
  lang?: "en" | "fr";
  page?: number;
}

async function fetchLNHPD(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`LNHPD API error: ${res.status}`);
  return res.json();
}

export async function searchProducts(query: string, opts: LNHPDOptions = {}) {
  return fetchLNHPD("productlicence", {
    ...(opts.lang && { lang: opts.lang }),
    ...(opts.page && { page: String(opts.page) }),
    type: "json",
    id: query,
  });
}

export async function getMedicinalIngredients(productId: string, lang: "en" | "fr" = "en") {
  return fetchLNHPD("medicinalingredient", { id: productId, lang, type: "json" });
}

export async function getNonMedicinalIngredients(productId: string, lang: "en" | "fr" = "en") {
  return fetchLNHPD("nonmedicinalingredient", { id: productId, lang, type: "json" });
}

export async function getProductPurpose(productId: string, lang: "en" | "fr" = "en") {
  return fetchLNHPD("productpurpose", { id: productId, lang, type: "json" });
}

export async function getProductRisk(productId: string, lang: "en" | "fr" = "en") {
  return fetchLNHPD("productrisk", { id: productId, lang, type: "json" });
}

export async function getProductDose(productId: string, lang: "en" | "fr" = "en") {
  return fetchLNHPD("productdose", { id: productId, lang, type: "json" });
}

export async function getProductRoute(productId: string, lang: "en" | "fr" = "en") {
  return fetchLNHPD("productroute", { id: productId, lang, type: "json" });
}
