/*
  Warnings:

  - You are about to drop the column `type` on the `Monograph` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "lnhpdLastRefresh" DATETIME;

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nhpidId" TEXT,
    "nhpidName" TEXT NOT NULL DEFAULT '',
    "ingredientType" TEXT NOT NULL DEFAULT 'medicinal',
    "category" TEXT NOT NULL DEFAULT '',
    "subCategory" TEXT NOT NULL DEFAULT '',
    "casNumber" TEXT NOT NULL DEFAULT '',
    "unii" TEXT NOT NULL DEFAULT '',
    "schedule1" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "properNameEn" TEXT NOT NULL DEFAULT '',
    "properNameFr" TEXT NOT NULL DEFAULT '',
    "commonNameEn" TEXT NOT NULL DEFAULT '',
    "commonNameFr" TEXT NOT NULL DEFAULT '',
    "scientificName" TEXT NOT NULL DEFAULT '',
    "synonyms" TEXT NOT NULL DEFAULT '[]',
    "molecularFormula" TEXT NOT NULL DEFAULT '',
    "molecularWeight" REAL,
    "chemicalClass" TEXT NOT NULL DEFAULT '',
    "chemicalSubclass" TEXT NOT NULL DEFAULT '',
    "smiles" TEXT NOT NULL DEFAULT '',
    "inchi" TEXT NOT NULL DEFAULT '',
    "physicalForm" TEXT NOT NULL DEFAULT '',
    "solubility" TEXT NOT NULL DEFAULT '',
    "storageConditions" TEXT NOT NULL DEFAULT '',
    "organismType" TEXT NOT NULL DEFAULT '',
    "genus" TEXT NOT NULL DEFAULT '',
    "species" TEXT NOT NULL DEFAULT '',
    "family" TEXT NOT NULL DEFAULT '',
    "authorCitation" TEXT NOT NULL DEFAULT '',
    "partsUsed" TEXT NOT NULL DEFAULT '[]',
    "preparationTypes" TEXT NOT NULL DEFAULT '[]',
    "geographicalOrigin" TEXT NOT NULL DEFAULT '',
    "regulatoryStatusJson" TEXT NOT NULL DEFAULT '{}',
    "grasStatus" TEXT NOT NULL DEFAULT '',
    "safetyDataJson" TEXT NOT NULL DEFAULT '[]',
    "dosingDataJson" TEXT NOT NULL DEFAULT '[]',
    "nmiPurposes" TEXT NOT NULL DEFAULT '[]',
    "allergenFlag" BOOLEAN NOT NULL DEFAULT false,
    "allergenType" TEXT NOT NULL DEFAULT '',
    "suppliersJson" TEXT NOT NULL DEFAULT '[]',
    "importedFrom" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IngredientMonographLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredientId" TEXT NOT NULL,
    "monographId" TEXT NOT NULL,
    "isCompliant" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IngredientMonographLink_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IngredientMonographLink_monographId_fkey" FOREIGN KEY ("monographId") REFERENCES "Monograph" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductLicence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lnhpdId" TEXT,
    "licenceNumber" TEXT NOT NULL,
    "licenceType" TEXT NOT NULL DEFAULT 'npn',
    "productName" TEXT NOT NULL,
    "productNameFr" TEXT NOT NULL DEFAULT '',
    "dosageForm" TEXT NOT NULL DEFAULT '',
    "routeOfAdmin" TEXT NOT NULL DEFAULT '',
    "companyCode" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "applicationClass" TEXT NOT NULL DEFAULT '',
    "submissionType" TEXT NOT NULL DEFAULT '',
    "attestedMonograph" BOOLEAN NOT NULL DEFAULT false,
    "hypothetical" BOOLEAN NOT NULL DEFAULT false,
    "licenceDate" TEXT NOT NULL DEFAULT '',
    "revisedDate" TEXT NOT NULL DEFAULT '',
    "receiptDate" TEXT NOT NULL DEFAULT '',
    "productStatus" TEXT NOT NULL DEFAULT 'active',
    "renewalDate" TEXT NOT NULL DEFAULT '',
    "renewalStatus" TEXT NOT NULL DEFAULT 'current',
    "internalStatus" TEXT NOT NULL DEFAULT 'active',
    "assignedTo" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "medicinalIngredientsJson" TEXT NOT NULL DEFAULT '[]',
    "nonMedIngredientsJson" TEXT NOT NULL DEFAULT '[]',
    "claimsJson" TEXT NOT NULL DEFAULT '[]',
    "risksJson" TEXT NOT NULL DEFAULT '[]',
    "dosesJson" TEXT NOT NULL DEFAULT '[]',
    "routesJson" TEXT NOT NULL DEFAULT '[]',
    "licencePdfPath" TEXT NOT NULL DEFAULT '',
    "labelTextPath" TEXT NOT NULL DEFAULT '',
    "importedFrom" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LicenceAmendment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "licenceId" TEXT NOT NULL,
    "amendmentType" TEXT NOT NULL,
    "changeType" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submissionDate" TEXT NOT NULL DEFAULT '',
    "approvalDate" TEXT NOT NULL DEFAULT '',
    "documentPath" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LicenceAmendment_licenceId_fkey" FOREIGN KEY ("licenceId") REFERENCES "ProductLicence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IngredientSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "ingredientName" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL DEFAULT '',
    "casNumber" TEXT NOT NULL DEFAULT '',
    "molecularFormula" TEXT NOT NULL DEFAULT '',
    "molecularWeight" REAL,
    "classification" TEXT NOT NULL DEFAULT 'medicinal',
    "schedule" TEXT NOT NULL DEFAULT '',
    "sourceOrganism" TEXT NOT NULL DEFAULT '',
    "sourceOrganismLatin" TEXT NOT NULL DEFAULT '',
    "sourcePart" TEXT NOT NULL DEFAULT '',
    "extractionMethod" TEXT NOT NULL DEFAULT '',
    "proposedProperName" TEXT NOT NULL DEFAULT '',
    "proposedCommonName" TEXT NOT NULL DEFAULT '',
    "grasStatus" TEXT NOT NULL DEFAULT '',
    "otherJurisdictions" TEXT NOT NULL DEFAULT '{}',
    "evidencePackageJson" TEXT NOT NULL DEFAULT '[]',
    "precedentIngredientsJson" TEXT NOT NULL DEFAULT '[]',
    "nhpidRequestDate" TEXT NOT NULL DEFAULT '',
    "nhpidExpectedDate" TEXT NOT NULL DEFAULT '',
    "nhpidApprovalDate" TEXT NOT NULL DEFAULT '',
    "nhpidId" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IngredientSubmission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductStrategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'single',
    "applicationClass" TEXT NOT NULL DEFAULT 'III',
    "dosageForm" TEXT NOT NULL DEFAULT '',
    "dosageAmount" TEXT NOT NULL DEFAULT '',
    "combinationIngredients" TEXT NOT NULL DEFAULT '[]',
    "proposedClaims" TEXT NOT NULL DEFAULT '[]',
    "targetTimeline" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "applicationId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductStrategy_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "IngredientSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Monograph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nhpidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL DEFAULT '',
    "monographType" TEXT NOT NULL DEFAULT 'single',
    "version" TEXT NOT NULL DEFAULT '',
    "effectiveDate" TEXT NOT NULL DEFAULT '',
    "lastRevised" TEXT NOT NULL DEFAULT '',
    "submissionClass" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'current',
    "claimsJson" TEXT NOT NULL DEFAULT '[]',
    "doseRangesJson" TEXT NOT NULL DEFAULT '{}',
    "specificationsJson" TEXT NOT NULL DEFAULT '{}',
    "cautionsJson" TEXT NOT NULL DEFAULT '[]',
    "warningsJson" TEXT NOT NULL DEFAULT '[]',
    "contraindicationsJson" TEXT NOT NULL DEFAULT '[]',
    "adverseReactionsJson" TEXT NOT NULL DEFAULT '[]',
    "sourceRequirements" TEXT NOT NULL DEFAULT '',
    "preparationRequirements" TEXT NOT NULL DEFAULT '',
    "pdfPath" TEXT NOT NULL DEFAULT '',
    "pdfUrl" TEXT NOT NULL DEFAULT '',
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Monograph" ("adverseReactionsJson", "cautionsJson", "claimsJson", "contraindicationsJson", "createdAt", "doseRangesJson", "id", "lastUpdated", "name", "nhpidId", "pdfPath", "specificationsJson", "warningsJson") SELECT "adverseReactionsJson", "cautionsJson", "claimsJson", "contraindicationsJson", "createdAt", "doseRangesJson", "id", "lastUpdated", "name", "nhpidId", "pdfPath", "specificationsJson", "warningsJson" FROM "Monograph";
DROP TABLE "Monograph";
ALTER TABLE "new_Monograph" RENAME TO "Monograph";
CREATE UNIQUE INDEX "Monograph_nhpidId_key" ON "Monograph"("nhpidId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_nhpidId_key" ON "Ingredient"("nhpidId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLicence_lnhpdId_key" ON "ProductLicence"("lnhpdId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLicence_licenceNumber_key" ON "ProductLicence"("licenceNumber");
