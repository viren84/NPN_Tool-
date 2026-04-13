import { prisma } from "../db/prisma";

const BASE = "https://health-products.canada.ca/api/natural-licences";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    console.warn(`[LNHPD] ${res.status} ${res.statusText} — ${url.split("?")[0]}`);
    return [];
  }
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
      const [ingredientsRaw, nonMedRaw, purposesRaw, risksRaw, dosesRaw, routesRaw] = await Promise.all([
        fetchJson(`${BASE}/medicinalingredient/?lang=en&type=json&id=${lnhpdId}`),
        fetchJson(`${BASE}/nonmedicinalingredient/?lang=en&type=json&id=${lnhpdId}`),
        fetchJson(`${BASE}/productpurpose/?lang=en&type=json&id=${lnhpdId}`),
        fetchJson(`${BASE}/productrisk/?lang=en&type=json&id=${lnhpdId}`),
        fetchJson(`${BASE}/productdose/?lang=en&type=json&id=${lnhpdId}`),
        fetchJson(`${BASE}/productroute/?lang=en&type=json&id=${lnhpdId}`),
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
      const nonMed = normalize(nonMedRaw);
      const purposes = normalize(purposesRaw);
      const risks = normalize(risksRaw);
      const doses = normalize(dosesRaw);
      const routes = normalize(routesRaw);

      // Derive route and class from HC data
      const routeOfAdmin = routes.length > 0
        ? routes.map((r) => ((r as Record<string, unknown>).route_type_desc || "") as string).filter(Boolean).join(", ")
        : undefined;
      const subType = (product.sub_submission_type_desc as string) || "";
      const applicationClass = subType.toLowerCase().includes("compendial") ? "I"
        : subType.toLowerCase().includes("traditional") ? "II"
        : subType.toLowerCase().includes("non-traditional") ? "III"
        : undefined;

      // Update our local record with enriched data
      await prisma.productLicence.update({
        where: { id: lic.id },
        data: {
          lnhpdId,
          productName: (product.product_name as string) || lic.productName,
          dosageForm: (product.dosage_form as string) || undefined,
          routeOfAdmin: routeOfAdmin || undefined,
          companyName: (product.company_name as string) || undefined,
          companyCode: String(product.company_id || "") || undefined,
          applicationClass: applicationClass || undefined,
          submissionType: (product.sub_submission_type_desc as string) || undefined,
          licenceDate: (product.licence_date as string) || undefined,
          revisedDate: (product.revised_date as string) || undefined,
          receiptDate: (product.time_receipt as string) || undefined,
          productStatus: product.flag_product_status === 1 ? "active" : "non_active",
          attestedMonograph: !!product.flag_attested_monograph,
          medicinalIngredientsJson: ingredients.length > 0 ? JSON.stringify(ingredients) : undefined,
          nonMedIngredientsJson: nonMed.length > 0 ? JSON.stringify(nonMed) : undefined,
          claimsJson: purposes.length > 0 ? JSON.stringify(purposes) : undefined,
          risksJson: risks.length > 0 ? JSON.stringify(risks) : undefined,
          dosesJson: doses.length > 0 ? JSON.stringify(doses) : undefined,
          routesJson: routes.length > 0 ? JSON.stringify(routes) : undefined,
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

/**
 * Sync LNHPD data for a SINGLE licence by its DB id.
 * Fetches all data from HC API and enriches the local record.
 * Returns the updated licence data or null if not found.
 */
export async function syncSingleLicence(licenceId: string): Promise<{
  success: boolean; message: string; data?: Record<string, unknown>;
}> {
  const lic = await prisma.productLicence.findUnique({
    where: { id: licenceId },
    select: { id: true, licenceNumber: true, productName: true, lnhpdId: true },
  });

  if (!lic) return { success: false, message: "Licence not found" };
  if (!lic.licenceNumber) return { success: false, message: "No NPN number" };

  try {
    // Search LNHPD by NPN
    const products = await fetchJson(`${BASE}/productlicence/?lang=en&type=json&id=${lic.licenceNumber}`) as Array<Record<string, unknown>>;

    const normalize = (raw: unknown): unknown[] => {
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
        const d = (raw as Record<string, unknown>).data;
        return Array.isArray(d) ? d : [];
      }
      return [];
    };

    const productArr = normalize(products);
    if (productArr.length === 0) return { success: false, message: `NPN ${lic.licenceNumber} not found in LNHPD` };

    const product = productArr[0] as Record<string, unknown>;
    const lnhpdId = String(product.lnhpd_id || "");
    if (!lnhpdId) return { success: false, message: "No lnhpd_id returned" };

    // Fetch all detail endpoints (6 — including routes)
    const [ingredientsRaw, nonMedRaw, purposesRaw, risksRaw, dosesRaw, routesRaw] = await Promise.all([
      fetchJson(`${BASE}/medicinalingredient/?lang=en&type=json&id=${lnhpdId}`),
      fetchJson(`${BASE}/nonmedicinalingredient/?lang=en&type=json&id=${lnhpdId}`),
      fetchJson(`${BASE}/productpurpose/?lang=en&type=json&id=${lnhpdId}`),
      fetchJson(`${BASE}/productrisk/?lang=en&type=json&id=${lnhpdId}`),
      fetchJson(`${BASE}/productdose/?lang=en&type=json&id=${lnhpdId}`),
      fetchJson(`${BASE}/productroute/?lang=en&type=json&id=${lnhpdId}`),
    ]);

    const ingredients = normalize(ingredientsRaw);
    const nonMed = normalize(nonMedRaw);
    const purposes = normalize(purposesRaw);
    const risks = normalize(risksRaw);
    const doses = normalize(dosesRaw);
    const routes = normalize(routesRaw);

    // Derive route of administration from routes data
    const routeOfAdmin = routes.length > 0
      ? routes.map((r) => ((r as Record<string, unknown>).route_type_desc || "") as string).filter(Boolean).join(", ")
      : undefined;

    // Derive application class from submission type
    const subType = (product.sub_submission_type_desc as string) || "";
    const applicationClass = subType.toLowerCase().includes("compendial") ? "I"
      : subType.toLowerCase().includes("traditional") ? "II"
      : subType.toLowerCase().includes("non-traditional") ? "III"
      : undefined;

    // Check if another record already owns this lnhpdId (UNIQUE constraint)
    const existingOwner = await prisma.productLicence.findFirst({
      where: { lnhpdId, id: { not: lic.id } },
      select: { id: true, licenceNumber: true, productName: true },
    });

    if (existingOwner) {
      return {
        success: false,
        message: `Duplicate NPN: another record (${existingOwner.productName}) already has lnhpdId ${lnhpdId}. Delete the duplicate first.`,
      };
    }

    const updated = await prisma.productLicence.update({
      where: { id: lic.id },
      data: {
        lnhpdId,
        productName: (product.product_name as string) || lic.productName,
        dosageForm: (product.dosage_form as string) || undefined,
        routeOfAdmin: routeOfAdmin || undefined,
        companyName: (product.company_name as string) || undefined,
        companyCode: String(product.company_id || "") || undefined,
        applicationClass: applicationClass || undefined,
        submissionType: (product.sub_submission_type_desc as string) || undefined,
        licenceDate: (product.licence_date as string) || undefined,
        revisedDate: (product.revised_date as string) || undefined,
        receiptDate: (product.time_receipt as string) || undefined,
        productStatus: product.flag_product_status === 1 ? "active" : "non_active",
        attestedMonograph: !!product.flag_attested_monograph,
        medicinalIngredientsJson: ingredients.length > 0 ? JSON.stringify(ingredients) : undefined,
        nonMedIngredientsJson: nonMed.length > 0 ? JSON.stringify(nonMed) : undefined,
        claimsJson: purposes.length > 0 ? JSON.stringify(purposes) : undefined,
        risksJson: risks.length > 0 ? JSON.stringify(risks) : undefined,
        dosesJson: doses.length > 0 ? JSON.stringify(doses) : undefined,
        routesJson: routes.length > 0 ? JSON.stringify(routes) : undefined,
        importedFrom: "lnhpd_sync",
      },
    });

    return {
      success: true,
      message: `Synced NPN ${lic.licenceNumber} — ${ingredients.length} ings, ${nonMed.length} non-med, ${purposes.length} claims, ${risks.length} risks, ${doses.length} doses`,
      data: updated as unknown as Record<string, unknown>,
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Sync failed" };
  }
}
