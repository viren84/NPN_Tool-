-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legalName" TEXT NOT NULL DEFAULT 'UV International Traders Inc',
    "dbaName" TEXT NOT NULL DEFAULT 'Wellnessextract',
    "companyCode" TEXT NOT NULL DEFAULT '45028',
    "seniorOfficial" TEXT NOT NULL DEFAULT 'Virender Dass',
    "seniorTitle" TEXT NOT NULL DEFAULT 'CEO',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "province" TEXT NOT NULL DEFAULT 'BC',
    "postalCode" TEXT NOT NULL DEFAULT 'V2T 6H4',
    "country" TEXT NOT NULL DEFAULT 'Canada',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "siteLicenceNumber" TEXT NOT NULL DEFAULT '',
    "qapName" TEXT NOT NULL DEFAULT '',
    "qapQualifications" TEXT NOT NULL DEFAULT '',
    "epostRegistered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Application" (
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
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicinalIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "nhpidName" TEXT NOT NULL DEFAULT '',
    "properName" TEXT NOT NULL DEFAULT '',
    "commonName" TEXT NOT NULL DEFAULT '',
    "scientificName" TEXT NOT NULL DEFAULT '',
    "casNumber" TEXT NOT NULL DEFAULT '',
    "quantity" REAL NOT NULL DEFAULT 0,
    "quantityUnit" TEXT NOT NULL DEFAULT 'mg',
    "potency" REAL,
    "potencyUnit" TEXT NOT NULL DEFAULT '',
    "sourceMaterial" TEXT NOT NULL DEFAULT '',
    "extractType" TEXT NOT NULL DEFAULT '',
    "driedHerbEquiv" TEXT NOT NULL DEFAULT '',
    "monographId" TEXT,
    "monographName" TEXT NOT NULL DEFAULT '',
    "monographCompliant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MedicinalIngredient_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NonMedicinalIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT '',
    "quantity" REAL,
    "unit" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NonMedicinalIngredient_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Monograph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nhpidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single',
    "claimsJson" TEXT NOT NULL DEFAULT '[]',
    "doseRangesJson" TEXT NOT NULL DEFAULT '{}',
    "specificationsJson" TEXT NOT NULL DEFAULT '{}',
    "contraindicationsJson" TEXT NOT NULL DEFAULT '[]',
    "warningsJson" TEXT NOT NULL DEFAULT '[]',
    "pdfPath" TEXT NOT NULL DEFAULT '',
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SupplierCOA" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "ingredientId" TEXT,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "parsedDataJson" TEXT NOT NULL DEFAULT '{}',
    "originalFilePath" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierCOA_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierCOA_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "MedicinalIngredient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "content" TEXT NOT NULL DEFAULT '',
    "filePath" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeneratedDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedDocument_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LNHPDPrecedent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "lnhpdId" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "relevanceScore" REAL NOT NULL DEFAULT 0,
    "ingredientsMatchJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LNHPDPrecedent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExistingProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "npnNumber" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "licenceStatus" TEXT NOT NULL DEFAULT 'active',
    "applicationClass" TEXT NOT NULL DEFAULT '',
    "licenceNumber" TEXT NOT NULL DEFAULT '',
    "importedFrom" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "changes" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "claudeApiKey" TEXT NOT NULL DEFAULT '',
    "nhpidLastRefresh" DATETIME,
    "autoRefreshEnabled" BOOLEAN NOT NULL DEFAULT true,
    "exportPath" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FaqCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Monograph_nhpidId_key" ON "Monograph"("nhpidId");

-- CreateIndex
CREATE UNIQUE INDEX "ExistingProduct_npnNumber_key" ON "ExistingProduct"("npnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FaqCache_question_key" ON "FaqCache"("question");
