import { askClaude } from "./claude";

const READER_SYSTEM = `You are an expert at extracting structured data from Health Canada regulatory documents.
You extract data precisely, never fabricate information, and indicate confidence levels.
Always respond in valid JSON format. If a field cannot be determined, use null.`;

export interface ExtractionResult {
  documentType: string;
  confidence: number; // 0-1
  extractedData: Record<string, unknown>;
  warnings: string[];
}

/**
 * Classify a document and extract structured data based on its content
 */
export async function extractFromDocument(
  textContent: string,
  fileName: string,
  context?: string // hint about what type of document this is
): Promise<ExtractionResult> {
  const contextHint = context ? `\nUser indicated this is: ${context}` : "";

  const classifyPrompt = `Analyze this document and extract all structured data.
File name: ${fileName}${contextHint}

Document content (first 8000 chars):
${textContent.slice(0, 8000)}

First, classify the document type. Then extract ALL relevant data fields.

Return JSON:
{
  "documentType": "licence_pdf" | "coa" | "study" | "ingredient_spec" | "monograph" | "hc_correspondence" | "unknown",
  "confidence": 0.0-1.0,
  "extractedData": { ... type-specific fields ... },
  "warnings": ["any concerns about extraction accuracy"]
}

For licence_pdf, extract: licenceNumber, productName, productNameFr, dosageForm, routeOfAdmin, companyName, companyCode, licenceDate, revisedDate, applicationClass, medicinalIngredients (array of {name, quantity, unit, source, potency}), nonMedicinalIngredients (array of {name, purpose}), claims (array of strings), risks (array of {type, text}), doses (array of {population, dose, frequency, directions})

For coa, extract: supplierName, ingredientName, lotNumber, manufactureDate, expiryDate, testResults (array of {parameter, method, specification, result, passFail})

For study, extract: title, authors, journal, year, pmid, doi, studyType, population, sampleSize, keyFindings, safetyData, efficacyData, relevance

For ingredient_spec, extract: properName, commonName, scientificName, casNumber, molecularFormula, molecularWeight, source, partsUsed, storageConditions, specifications (array of {parameter, method, limit})

Return ONLY valid JSON.`;

  const response = await askClaude(READER_SYSTEM, classifyPrompt, { maxTokens: 4096, temperature: 0.1 });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ExtractionResult;
  } catch {
    return {
      documentType: "unknown",
      confidence: 0,
      extractedData: { rawText: textContent.slice(0, 2000) },
      warnings: ["Failed to parse AI extraction. Raw text preserved for manual review."],
    };
  }
}

/**
 * Extract data specifically for a known document type (higher accuracy)
 */
export async function extractLicencePDF(textContent: string): Promise<Record<string, unknown>> {
  const prompt = `Extract ALL data from this Health Canada Product Licence document.

Document text:
${textContent.slice(0, 10000)}

Return JSON with these exact fields:
{
  "licenceNumber": "8-digit NPN",
  "productName": "product name in English",
  "productNameFr": "product name in French or empty string",
  "dosageForm": "Tablet/Capsule/Softgel/etc",
  "routeOfAdmin": "Oral/Topical/etc",
  "companyName": "licence holder company name",
  "companyCode": "HC company code if visible",
  "licenceDate": "YYYY-MM-DD or empty",
  "revisedDate": "YYYY-MM-DD or empty",
  "applicationClass": "I/II/III or empty if not stated",
  "submissionType": "Compendial/Traditional/Non-traditional or empty",
  "medicinalIngredients": [{"name":"","quantity":0,"unit":"mg","source":"","potency":"","potencyUnit":""}],
  "nonMedicinalIngredients": [{"name":"","purpose":""}],
  "claims": ["recommended use text"],
  "risks": [{"type":"caution|warning|contraindication|adverse_reaction","text":""}],
  "doses": [{"population":"adults","dose":"","frequency":"","directions":""}]
}

Return ONLY valid JSON. Use null for fields that cannot be determined.`;

  const response = await askClaude(READER_SYSTEM, prompt, { maxTokens: 4096, temperature: 0.1 });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { error: "Failed to extract licence data", rawText: textContent.slice(0, 2000) };
  }
}

/**
 * Extract COA data
 */
export async function extractCOA(textContent: string): Promise<Record<string, unknown>> {
  const prompt = `Extract ALL data from this Certificate of Analysis (COA) document.

Document text:
${textContent.slice(0, 10000)}

Return JSON:
{
  "supplierName": "",
  "ingredientName": "",
  "lotNumber": "",
  "manufactureDate": "YYYY-MM-DD or empty",
  "expiryDate": "YYYY-MM-DD or empty",
  "retestDate": "YYYY-MM-DD or empty",
  "testResults": [
    {"parameter": "test name", "method": "test method", "specification": "limit/criteria", "result": "actual result", "passFail": "pass|fail"}
  ]
}

Return ONLY valid JSON.`;

  const response = await askClaude(READER_SYSTEM, prompt, { maxTokens: 3000, temperature: 0.1 });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim());
  } catch {
    return { error: "Failed to extract COA data" };
  }
}

/**
 * Extract study/paper data
 */
export async function extractStudy(textContent: string): Promise<Record<string, unknown>> {
  const prompt = `Extract bibliographic and scientific data from this research paper/study.

Document text:
${textContent.slice(0, 12000)}

Return JSON:
{
  "title": "",
  "authors": "",
  "journal": "",
  "year": 0,
  "pmid": "",
  "doi": "",
  "studyType": "RCT|animal|in_vitro|review|meta_analysis|case_report|pilot",
  "population": "description of study population",
  "sampleSize": 0,
  "keyFindings": "summary of main results",
  "safetyData": "any safety/adverse event data",
  "efficacyData": "any efficacy/endpoint data",
  "relevance": "how this relates to ingredient safety/efficacy"
}

Return ONLY valid JSON.`;

  const response = await askClaude(READER_SYSTEM, prompt, { maxTokens: 2000, temperature: 0.1 });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim());
  } catch {
    return { error: "Failed to extract study data" };
  }
}
