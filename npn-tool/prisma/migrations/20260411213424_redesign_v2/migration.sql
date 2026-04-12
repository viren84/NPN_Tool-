-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "claimTextEn" TEXT NOT NULL,
    "claimTextFr" TEXT NOT NULL DEFAULT '',
    "fromMonograph" BOOLEAN NOT NULL DEFAULT false,
    "monographName" TEXT NOT NULL DEFAULT '',
    "linkedIngredientIds" TEXT NOT NULL DEFAULT '[]',
    "claimType" TEXT NOT NULL DEFAULT 'health',
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Claim_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DosageGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "population" TEXT NOT NULL,
    "ageRangeMin" INTEGER,
    "ageRangeMax" INTEGER,
    "minDose" REAL,
    "maxDose" REAL,
    "doseUnit" TEXT NOT NULL DEFAULT '',
    "frequency" TEXT NOT NULL DEFAULT '',
    "directions" TEXT NOT NULL DEFAULT '',
    "withFood" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DosageGroup_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "riskType" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "textFr" TEXT NOT NULL DEFAULT '',
    "fromMonograph" BOOLEAN NOT NULL DEFAULT false,
    "monographName" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RiskInfo_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL DEFAULT '',
    "applicationClass" TEXT NOT NULL DEFAULT 'I',
    "applicationType" TEXT NOT NULL DEFAULT 'Compendial',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dosageForm" TEXT NOT NULL DEFAULT '',
    "routeOfAdmin" TEXT NOT NULL DEFAULT '',
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "productConcept" TEXT NOT NULL DEFAULT '',
    "classReasoning" TEXT NOT NULL DEFAULT '',
    "animalTissue" BOOLEAN NOT NULL DEFAULT false,
    "sterile" BOOLEAN NOT NULL DEFAULT false,
    "durationOfUse" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Application" ("animalTissue", "applicationClass", "applicationType", "brandName", "classReasoning", "createdAt", "createdById", "dosageForm", "id", "productConcept", "productName", "routeOfAdmin", "status", "sterile", "trackingNumber", "updatedAt", "version") SELECT "animalTissue", "applicationClass", "applicationType", "brandName", "classReasoning", "createdAt", "createdById", "dosageForm", "id", "productConcept", "productName", "routeOfAdmin", "status", "sterile", "trackingNumber", "updatedAt", "version" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE TABLE "new_MedicinalIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "nhpidName" TEXT NOT NULL DEFAULT '',
    "properName" TEXT NOT NULL DEFAULT '',
    "commonName" TEXT NOT NULL DEFAULT '',
    "scientificName" TEXT NOT NULL DEFAULT '',
    "casNumber" TEXT NOT NULL DEFAULT '',
    "quantity" REAL NOT NULL DEFAULT 0,
    "quantityUnit" TEXT NOT NULL DEFAULT 'mg',
    "potency" REAL,
    "potencyUnit" TEXT NOT NULL DEFAULT '',
    "standardization" TEXT NOT NULL DEFAULT '',
    "sourceMaterial" TEXT NOT NULL DEFAULT '',
    "organismPart" TEXT NOT NULL DEFAULT '',
    "extractType" TEXT NOT NULL DEFAULT '',
    "extractSolvent" TEXT NOT NULL DEFAULT '',
    "extractRatio" TEXT NOT NULL DEFAULT '',
    "driedHerbEquiv" TEXT NOT NULL DEFAULT '',
    "syntheticFlag" BOOLEAN NOT NULL DEFAULT false,
    "nanomaterialFlag" BOOLEAN NOT NULL DEFAULT false,
    "animalTissueFlag" BOOLEAN NOT NULL DEFAULT false,
    "animalSource" TEXT NOT NULL DEFAULT '',
    "monographId" TEXT,
    "monographName" TEXT NOT NULL DEFAULT '',
    "monographCompliant" BOOLEAN NOT NULL DEFAULT false,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "coaReference" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MedicinalIngredient_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MedicinalIngredient" ("applicationId", "casNumber", "commonName", "createdAt", "driedHerbEquiv", "extractType", "id", "monographCompliant", "monographId", "monographName", "nhpidName", "potency", "potencyUnit", "properName", "quantity", "quantityUnit", "scientificName", "sourceMaterial", "updatedAt") SELECT "applicationId", "casNumber", "commonName", "createdAt", "driedHerbEquiv", "extractType", "id", "monographCompliant", "monographId", "monographName", "nhpidName", "potency", "potencyUnit", "properName", "quantity", "quantityUnit", "scientificName", "sourceMaterial", "updatedAt" FROM "MedicinalIngredient";
DROP TABLE "MedicinalIngredient";
ALTER TABLE "new_MedicinalIngredient" RENAME TO "MedicinalIngredient";
CREATE TABLE "new_Monograph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nhpidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single',
    "claimsJson" TEXT NOT NULL DEFAULT '[]',
    "doseRangesJson" TEXT NOT NULL DEFAULT '{}',
    "specificationsJson" TEXT NOT NULL DEFAULT '{}',
    "contraindicationsJson" TEXT NOT NULL DEFAULT '[]',
    "warningsJson" TEXT NOT NULL DEFAULT '[]',
    "cautionsJson" TEXT NOT NULL DEFAULT '[]',
    "adverseReactionsJson" TEXT NOT NULL DEFAULT '[]',
    "pdfPath" TEXT NOT NULL DEFAULT '',
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Monograph" ("claimsJson", "contraindicationsJson", "createdAt", "doseRangesJson", "id", "lastUpdated", "name", "nhpidId", "pdfPath", "specificationsJson", "type", "warningsJson") SELECT "claimsJson", "contraindicationsJson", "createdAt", "doseRangesJson", "id", "lastUpdated", "name", "nhpidId", "pdfPath", "specificationsJson", "type", "warningsJson" FROM "Monograph";
DROP TABLE "Monograph";
ALTER TABLE "new_Monograph" RENAME TO "Monograph";
CREATE UNIQUE INDEX "Monograph_nhpidId_key" ON "Monograph"("nhpidId");
CREATE TABLE "new_NonMedicinalIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "ingredientName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "quantity" REAL,
    "unit" TEXT NOT NULL DEFAULT '',
    "animalTissueFlag" BOOLEAN NOT NULL DEFAULT false,
    "nanomaterialFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NonMedicinalIngredient_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NonMedicinalIngredient" ("applicationId", "createdAt", "id", "ingredientName", "purpose", "quantity", "unit", "updatedAt") SELECT "applicationId", "createdAt", "id", "ingredientName", "purpose", "quantity", "unit", "updatedAt" FROM "NonMedicinalIngredient";
DROP TABLE "NonMedicinalIngredient";
ALTER TABLE "new_NonMedicinalIngredient" RENAME TO "NonMedicinalIngredient";
CREATE TABLE "new_SupplierCOA" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "ingredientId" TEXT,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "parsedDataJson" TEXT NOT NULL DEFAULT '{}',
    "originalFilePath" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierCOA_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierCOA_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "MedicinalIngredient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SupplierCOA" ("applicationId", "createdAt", "id", "ingredientId", "originalFilePath", "parsedDataJson", "supplierName") SELECT "applicationId", "createdAt", "id", "ingredientId", "originalFilePath", "parsedDataJson", "supplierName" FROM "SupplierCOA";
DROP TABLE "SupplierCOA";
ALTER TABLE "new_SupplierCOA" RENAME TO "SupplierCOA";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
