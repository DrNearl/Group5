-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'LECTURER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "className" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LabRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "labCode" TEXT NOT NULL,
    "labName" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 45,
    "allowedIp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftName" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DutySchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "dutyDate" DATETIME NOT NULL,
    "scheduleStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DutySchedule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "DutySchedule_labId_fkey" FOREIGN KEY ("labId") REFERENCES "LabRoom" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "DutySchedule_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "scannedBarcode" TEXT NOT NULL,
    "checkInTime" DATETIME,
    "checkOutTime" DATETIME,
    "scanMethod" TEXT NOT NULL DEFAULT 'USB_SCANNER',
    "checkInSnapshot" TEXT,
    "checkOutSnapshot" TEXT,
    "clientIp" TEXT,
    "attendanceStatus" TEXT NOT NULL DEFAULT 'ON_TIME',
    "totalHours" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DutySchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabEquipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentBarcode" TEXT NOT NULL,
    "equipmentName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'PC',
    "labId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GOOD',
    "specifications" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LabEquipment_labId_fkey" FOREIGN KEY ("labId") REFERENCES "LabRoom" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "EquipmentIncident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "reportedByStudentId" TEXT,
    "scheduleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "incidentStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "EquipmentIncident_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "LabEquipment" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "EquipmentIncident_reportedByStudentId_fkey" FOREIGN KEY ("reportedByStudentId") REFERENCES "Student" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "EquipmentIncident_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DutySchedule" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentCode_key" ON "Student"("studentCode");

-- CreateIndex
CREATE INDEX "Student_studentCode_idx" ON "Student"("studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "LabRoom_labCode_key" ON "LabRoom"("labCode");

-- CreateIndex
CREATE INDEX "DutySchedule_studentId_idx" ON "DutySchedule"("studentId");

-- CreateIndex
CREATE INDEX "DutySchedule_dutyDate_idx" ON "DutySchedule"("dutyDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLog_scheduleId_key" ON "AttendanceLog"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "LabEquipment_equipmentBarcode_key" ON "LabEquipment"("equipmentBarcode");

-- CreateIndex
CREATE INDEX "LabEquipment_equipmentBarcode_idx" ON "LabEquipment"("equipmentBarcode");

