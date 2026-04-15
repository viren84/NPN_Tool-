# LNHPD Integration Guide — NPN Filing Tool

> Last updated: 2026-04-13
> Core file: `src/lib/sync/lnhpd-sync.ts`
> Agent owner: API (agents/api.md)

---

## 1. What is LNHPD?

The **Licensed Natural Health Products Database (LNHPD)** is Health Canada's public API that contains information about all licensed natural health products in Canada. The NPN Filing Tool uses this API to enrich local licence records with official government data.

**Key facts:**
- Public API — no authentication required
- Read-only — we only consume data, never write
- Free — no rate limits published, but we self-throttle at 300ms
- Returns JSON data for products, ingredients, claims, risks, dosage, and routes

---

## 2. Base URL and Endpoints

**Base URL:** `https://health-products.canada.ca/api/natural-licences`

### 7 Endpoints Used

| # | Endpoint | Purpose | Parameter |
|---|---|---|---|
| 1 | `/productlicence/` | Search by NPN number | `?lang=en&type=json&id={NPN}` |
| 2 | `/medicinalingredient/` | Active ingredients | `?lang=en&type=json&id={lnhpdId}` |
| 3 | `/nonmedicinalingredient/` | Excipients, fillers | `?lang=en&type=json&id={lnhpdId}` |
| 4 | `/productpurpose/` | Health claims | `?lang=en&type=json&id={lnhpdId}` |
| 5 | `/productrisk/` | Cautions, warnings, contraindications | `?lang=en&type=json&id={lnhpdId}` |
| 6 | `/productdose/` | Dosage groups | `?lang=en&type=json&id={lnhpdId}` |
| 7 | `/productroute/` | Routes of administration | `?lang=en&type=json&id={lnhpdId}` |

**Two-step process:**
1. Search by NPN number → get `lnhpdId`
2. Use `lnhpdId` to fetch all 6 detail endpoints in parallel

---

## 3. How Sync Works

### Single Licence Sync
```
1. User clicks "Sync" on a licence
2. POST /api/sync/lnhpd/[id] triggers
3. Fetch productlicence by NPN number → get lnhpdId
4. Fetch 6 detail endpoints in PARALLEL (ingredients, non-med, purposes, risks, doses, routes)
5. normalize() each response (handles format differences)
6. Derive applicationClass from submissionType
7. Update local ProductLicence record with enriched data
8. Log in AuditLog
```

### Bulk Sync
```
1. Admin triggers bulk sync
2. POST /api/sync/lnhpd triggers
3. Get ALL local ProductLicence records
4. For EACH licence:
   a. Skip if no licenceNumber
   b. Search LNHPD by NPN
   c. If found → fetch 6 detail endpoints
   d. normalize() + derive class
   e. Update local record
   f. 300ms throttle before next licence
5. Return { synced, skipped, errors, details[] }
```

---

## 4. The normalize() Function

Health Canada's API returns data in **two different formats** depending on the endpoint and data availability:

### Format 1: Flat Array
```json
[
  { "ingredient_name": "Turmeric", "potency_amount": "500" },
  { "ingredient_name": "Ginger", "potency_amount": "250" }
]
```

### Format 2: Wrapped Object
```json
{
  "metadata": { "count": 2, "page": 1 },
  "data": [
    { "ingredient_name": "Turmeric", "potency_amount": "500" },
    { "ingredient_name": "Ginger", "potency_amount": "250" }
  ]
}
```

### normalize() handles both:
```typescript
const normalize = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;                    // Format 1: use as-is
  if (raw && typeof raw === "object" && "data" in raw) {
    const d = (raw as Record<string, unknown>).data;
    return Array.isArray(d) ? d : [];                    // Format 2: extract .data
  }
  return [];                                              // Fallback: empty array
};
```

**Why this matters:** Without normalize(), some syncs would silently fail because the code would try to iterate over `{metadata, data}` as if it were an array.

---

## 5. Application Class Derivation

The LNHPD API returns a field called `sub_submission_type_desc` which indicates the product's submission pathway. The tool derives the HC application class from this:

```typescript
const subType = product.sub_submission_type_desc || "";

const applicationClass =
  subType.toLowerCase().includes("compendial") ? "I" :       // Class I — monograph-based
  subType.toLowerCase().includes("traditional") ? "II" :      // Class II — traditional use
  subType.toLowerCase().includes("non-traditional") ? "III" : // Class III — full evidence
  undefined;                                                   // Unknown — leave as-is
```

### What the classes mean:
| Class | Submission Type | Risk Level | Evidence Required |
|---|---|---|---|
| I | Compendial | Lowest | Monograph ingredients + attestation |
| II | Traditional | Moderate | Historical/traditional use evidence |
| III | Non-traditional | Highest | Full safety and efficacy data |

---

## 6. Data Mapping

When LNHPD data is fetched, it maps to ProductLicence fields:

| LNHPD Field | Local Field | Notes |
|---|---|---|
| `lnhpd_id` | `lnhpdId` | Unique LNHPD identifier |
| `product_name` | `productName` | Only updates if local is empty |
| `dosage_form` | `dosageForm` | Capsule, Tablet, etc. |
| `route_type_desc` | `routeOfAdmin` | Joined from routes endpoint |
| `company_name` | `companyName` | Company from LNHPD |
| `company_id` | `companyCode` | HC company code |
| `sub_submission_type_desc` | `submissionType` + `applicationClass` | Text + derived class |
| `licence_date` | `licenceDate` | Date of licence |
| `revised_date` | `revisedDate` | Last revision |
| `time_receipt` | `receiptDate` | Receipt date |
| `product_status` | `productStatus` | active/non_active/etc. |
| (medicinal ingredients array) | `medicinalIngredientsJson` | Full JSON array |
| (non-med ingredients array) | `nonMedIngredientsJson` | Full JSON array |
| (purposes/claims array) | `claimsJson` | Full JSON array |
| (risks array) | `risksJson` | Full JSON array |
| (doses array) | `dosesJson` | Full JSON array |
| (routes array) | `routesJson` | Full JSON array |

---

## 7. Rate Limiting

### Self-Imposed Throttle
- **300ms delay** between licence syncs (bulk mode)
- No delay between the 6 parallel detail requests per licence (they're for the same product)

### Why
- Health Canada doesn't publish rate limits, but overwhelming a government API is bad practice
- 300ms per licence means ~200 licences per minute — more than enough

### Implementation
The 300ms throttle is implemented in the bulk sync loop. Each licence sync completes all 6 detail fetches, then waits 300ms before the next licence.

---

## 8. Error Handling

| Scenario | Response | User Impact |
|---|---|---|
| LNHPD returns 404 | `warn()` logged, licence skipped | "Not found in LNHPD" in details |
| LNHPD returns 500 | `warn()` logged, licence skipped | Error count incremented |
| Network timeout | `fetchJson()` returns `[]` | Licence skipped, can retry |
| No lnhpdId found | Licence skipped | "skipped" count incremented |
| normalize() gets unexpected format | Returns `[]` | Data fields remain empty |

### fetchJson() Error Handling
```typescript
async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    console.warn(`[LNHPD] ${res.status} ${res.statusText} — ${url.split("?")[0]}`);
    return [];
  }
  return res.json();
}
```
- Non-OK responses return empty array (graceful degradation)
- Warning logged to console with status code and URL
- Does NOT throw — sync continues to next licence

---

## 9. Sync Results Format

Both single and bulk sync return:
```json
{
  "synced": 45,      // Successfully enriched
  "skipped": 3,      // No NPN, not found, or no lnhpdId
  "errors": 1,       // Exceptions during sync
  "details": [       // Human-readable messages
    "Not found in LNHPD: 80099999 — Unknown Product",
    "Synced: 80000123 — Turmeric Capsules (Class I)"
  ]
}
```

---

## 10. Known Limitations

| Limitation | Impact | Workaround |
|---|---|---|
| LNHPD API can be slow (2-5s per request) | Bulk sync takes minutes for many licences | Run during off-hours |
| French data not fetched (lang=en only) | Missing French product names | Could add `lang=fr` parallel fetch |
| No webhook/push from HC | Must manually trigger sync | Could add scheduled auto-sync |
| Some products not in LNHPD | Recently approved or cancelled products | Manual data entry required |
| API response format inconsistent | normalize() handles this | But new formats could break |
| No retry on failure | Single attempt per licence | Re-run bulk sync to catch missed |

---

## 11. Future Improvements (from VISION.md)

| Item | Vision # | Status | Description |
|---|---|---|---|
| Monthly NHPID monograph sync | #5 | Not started | Sync monograph data from NHPID (different API) |
| Auto-scheduled sync | — | Not planned | Automatically sync on a schedule |
| French language parallel fetch | — | Not planned | Fetch `lang=fr` alongside `lang=en` |
| Retry with exponential backoff | — | Not planned | Retry failed syncs with increasing delay |

---

## 12. Testing

Sync tests use the `#sync` tag in `docs/TEST_JOURNEYS.md`:
- `/test-sync` — run all sync tests
- Tests cover: single sync, bulk sync, normalize(), class derivation, error handling
