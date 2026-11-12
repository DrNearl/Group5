ALTER TABLE "Student" ADD COLUMN "deactivatedAt" DATETIME;
ALTER TABLE "Student" ADD COLUMN "deactivatedBy" TEXT;
ALTER TABLE "Student" ADD COLUMN "reactivatedAt" DATETIME;

CREATE TABLE "RejectedScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rawCode" TEXT NOT NULL,
    "studentId" TEXT,
    "reason" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "device" TEXT,
    "clientIp" TEXT,
    CONSTRAINT "RejectedScan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "RejectedScan_studentId_reason_scannedAt_idx" ON "RejectedScan"("studentId", "reason", "scannedAt");
