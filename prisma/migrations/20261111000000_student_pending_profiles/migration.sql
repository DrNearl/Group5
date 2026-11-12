-- Additive profile metadata and nullable name, while copying every existing Student row.
-- This rebuild preserves IDs, MSSV, contact details, activity state, and timestamps.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentCode" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "className" TEXT,
    "profileStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "firstSeenAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Student" ("className", "createdAt", "email", "fullName", "id", "isActive", "phone", "studentCode", "updatedAt")
SELECT "className", "createdAt", "email", "fullName", "id", "isActive", "phone", "studentCode", "updatedAt" FROM "Student";

DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_studentCode_key" ON "Student"("studentCode");
CREATE INDEX "Student_studentCode_idx" ON "Student"("studentCode");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
