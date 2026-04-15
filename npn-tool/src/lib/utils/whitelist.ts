/**
 * Pick only allowed fields from an object. Prevents field injection attacks.
 * Any field not in the whitelist is silently dropped.
 */
export function whitelistFields<T extends Record<string, unknown>>(
  data: T,
  allowedFields: string[]
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in data && data[field] !== undefined) {
      result[field] = data[field];
    }
  }
  return result as Partial<T>;
}

// Field whitelists per entity type

export const APPLICATION_FIELDS = [
  "productName", "brandName", "applicationClass", "applicationType",
  "status", "dosageForm", "routeOfAdmin", "trackingNumber",
  "productConcept", "classReasoning", "animalTissue", "sterile",
  "durationOfUse",
];

export const INGREDIENT_FIELDS = [
  "properName", "commonName", "scientificName", "nhpidName", "casNumber",
  "quantity", "quantityUnit", "potency", "potencyUnit", "standardization",
  "sourceMaterial", "organismPart", "extractType", "extractSolvent",
  "extractRatio", "driedHerbEquiv", "syntheticFlag", "nanomaterialFlag",
  "animalTissueFlag", "animalSource", "monographName", "monographCompliant",
  "supplierName", "coaReference", "sortOrder",
];

export const NON_MED_FIELDS = [
  "ingredientName", "purpose", "quantity", "unit",
  "animalTissueFlag", "nanomaterialFlag", "sortOrder",
];

export const CLAIM_FIELDS = [
  "claimTextEn", "claimTextFr", "fromMonograph", "monographName",
  "linkedIngredientIds", "claimType", "selected", "sortOrder",
];

export const DOSAGE_FIELDS = [
  "population", "ageRangeMin", "ageRangeMax", "minDose", "maxDose",
  "doseUnit", "frequency", "directions", "withFood", "sortOrder",
];

export const RISK_FIELDS = [
  "riskType", "textEn", "textFr", "fromMonograph", "monographName", "sortOrder",
];

export const COMPANY_FIELDS = [
  "legalName", "dbaName", "companyCode", "seniorOfficial", "seniorTitle",
  "address", "city", "province", "postalCode", "country", "phone", "email",
  "siteLicenceNumber", "qapName", "qapQualifications", "epostRegistered",
];

export const LICENCE_FIELDS = [
  "licenceNumber", "productName", "productNameFr", "dosageForm", "routeOfAdmin",
  "companyCode", "companyName", "applicationClass", "submissionType",
  "attestedMonograph", "licenceDate", "revisedDate", "productStatus",
  "renewalDate", "renewalStatus", "internalStatus", "assignedTo", "priority",
  "medicinalIngredientsJson", "nonMedIngredientsJson", "claimsJson",
  "risksJson", "dosesJson", "routesJson", "licencePdfPath", "labelTextPath",
  "notes",
];

export const DOCUMENT_FIELDS = [
  "content", "status", "approvedById", "approvedAt",
];

export const PRODUCT_FIELDS = [
  "name", "brandName", "stage", "priority", "assignedTo", "companyId",
  "targetCondition", "targetConditionDetail",
  "dosageForm", "routeOfAdmin", "productConcept", "targetMarket",
  "applicationClass", "submissionType",
  "npnNumber", "applicationId", "licenceId", "trackingNumber",
  "submissionDate", "approvalDate",
  "reviewStatus", "reviewerId", "reviewNotes",
  "reviewRequestedAt", "reviewCompletedAt",
  "ingredientCount", "claimCount", "documentCount",
  "handoffReady", "handoffDate", "handoffNotes",
  "notes", "tags",
];

export const PRODUCT_DOCUMENT_FIELDS = [
  "title", "docType", "stage", "notes",
];

export const COMPETITOR_PRODUCT_FIELDS = [
  "sourceUrl", "sourceType", "competitorName", "productName", "brand",
  "companyWebsite", "price", "dosageForm", "servingSize", "servingsPerContainer",
  "marketingStrategy", "socialPresence", "nhpComplianceNotes", "notes",
];

export const PRODUCT_INGREDIENT_SPEC_FIELDS = [
  "ingredientName", "properName", "commonName", "scientificName",
  "ingredientType", "supplierName", "supplierCountry", "coaDocumentId",
  "targetDose", "targetUnit", "doseRangeMin", "doseRangeMax",
  "standardization", "extractRatio", "sourceOrganism", "partUsed",
  "monographName", "monographCompliant", "status", "notes", "sortOrder",
];

export const CONDITION_STACK_FIELDS = [
  "condition", "conditionDetail", "stackName", "stackType",
  "primaryMolecule", "primaryDose", "primaryUnit",
  "applicationClass", "monographCoverage", "complianceNotes",
  "selected", "notes",
];

export const STAGE_DATA_FIELDS = [
  "stage", "sectionKey", "dataJson", "notes", "manualOverride",
];

export const VAULT_FIELDS = [
  "title", "category", "description",
  "accessLevel", "sharedWith",
];

// Validation helpers

export function validateApplicationClass(value: string): boolean {
  return ["I", "II", "III"].includes(value);
}

export function validateRiskType(value: string): boolean {
  return ["caution", "warning", "contraindication", "adverse_reaction"].includes(value);
}

export function validateNPN(value: string): boolean {
  return /^\d{8}$/.test(value);
}

export function validateRole(value: string): boolean {
  return ["admin", "editor", "viewer"].includes(value);
}
