import { prisma } from "../db/prisma";

const BASE = "https://health-products.canada.ca/api/natural-licences";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  return res.json();
}

/**
 * Sync LNHPD data for all existing licences in our DB.
 * For each NPN, fetches full data from HC API and enriches local record.
 * Idempotent — safe to run multiple times.
 */
export async function syncLNHPD(): Promise<{
  synced: number; skipped: number; errors: number; details: string[];
}> {
  const details: string[] = [];
  let synced = 0, skipped = 0, errors = 0;

  // Get all our licences
  const licences = await prisma.productLicence.findMany({
    select: { id: true, licenceNumber: true, productName: true, lnhpdId: true },
  });

  for (const lic of licences) {
    if (!lic.licenceNumber) { skipped++; continue; }

    try {
      // Search LNHPD by NPN number
      const products = await fetchJson(`${BASE}/productlicence/?lang=en&type=json&id=${lic.licenceNumber}`) as Array<Record<string, unknown>>;

      if (!Array.isArray(products) || products.length === 0) {
        details.push(`Not found in LNHPD: ${lic.licenceNumber} — ${lic.productName}`);
        skipped++;
        continue;
      }

      const product = products[0];
      const lnhpdId = String(product.lnhpd_id || "");

      if (!lnhpdId) { skipped++; continue; }

      // Fetch detailed data — HC API returns mixed formats:
      // Some endpoints return flat arrays, others return { metadata: {}, data: [...] }
      const [ingredientsRaw, purposesRaw, risksRaw, dosesRaw] = await Promise.all([
        fetchJson(`${BASE}/medicinalingredient/?lang=en&type=json&id=${lnhpdId}`),
        fetchJson(`${BASE}/productpurpose/?lang=en&type=json&id=${lnhpdId}`),
        fetchJson(`${BASE}/productrisk/?lang=en&type=json&id=${lnhpdId}`),
        fetchJson(`${BASE}/productdose/?lang=en&type=json&id=${lnhpdId}`),
      ]);

      // Normalize — extract .data if wrapped, otherwise use as-is
      const normalize = (raw: unknown): unknown[] => {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
          const d = (raw as Record<string, unknown>).data;
          return Array.isArray(d) ? d : [];
        }
        return [];
      };

      const ingredients = normalize(ingredientsRaw);
      const purposes = normalize(purposesRaw);
      const risks = normalize(risksRaw);
      const doses = normalize(dosesRaw);

      // Update our local record with enriched data
      await prisma.productLicence.update({
        where: { id: lic.id },
        data: {
          lnhpdId,
          productName: (product.product_name as string) || lic.productName,
          dosageForm: (product.dosage_form as string) || undefined,
          companyName: (product.company_name as string) || undefined,
          submissionType: (product.sub_submission_type_desc as string) || undefined,
          licenceDate: (product.licence_date as string) || undefined,
          productStatus: product.flag_product_status === 1 ? "active" : "non_active",
          attestedMonograph: !!product.flag_attested_monograph,
          medicinalIngredientsJson: Array.isArray(ingredients) && ingredients.length > 0 ? JSON.stringify(ingredients) : undefined,
          claimsJson: Array.isArray(purposes) && purposes.length > 0 ? JSON.stringify(purposes) : undefined,
          risksJson: Array.isArray(risks) && risks.length > 0 ? JSON.stringify(risks) : undefined,
          dosesJson: Array.isArray(doses) && doses.length > 0 ? JSON.stringify(doses) : undefined,
          importedFrom: "lnhpd_sync",
        },
      });

      synced++;
      details.push(`Synced: NPN ${lic.licenceNumber} — ${lic.productName} (lnhpd:${lnhpdId})`);

      // Rate limit: 300ms between products
      await new Promise(r => setTimeout(r, 300));

    } catch (e) {
      errors++;
      details.push(`Error ${lic.licenceNumber}: ${e instanceof Error ? e.message : "Unknown"}`);
    }
  }

  // Update last sync timestamp
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: { lnhpdLastRefresh: new Date() },
    create: { id: "default", lnhpdLastRefresh: new Date() },
  });

  return { synced, skipped, errors, details };
}
