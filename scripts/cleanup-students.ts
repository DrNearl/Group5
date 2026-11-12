import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { getValidStudentCode } from "../lib/studentCode";

loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

function getDatabasePath() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:")) throw new Error("Chỉ hỗ trợ SQLite file: DATABASE_URL.");
  const file = decodeURIComponent(url.slice("file:".length).split("?")[0]);
  return path.isAbsolute(file) ? file : path.resolve(process.cwd(), "prisma", file);
}

async function main() {
  const students = await prisma.student.findMany({
    include: {
      dutySchedules: { include: { attendanceLog: true, incidents: { select: { id: true } } } },
      reportedIncidents: { select: { id: true } },
    },
  });

  const tasks = students.flatMap((student) => {
    const logs = student.dutySchedules.flatMap((schedule) => schedule.attendanceLog ? [schedule.attendanceLog] : []);
    const invalidCode = !getValidStudentCode(student.studentCode);
    const pendingDefaults = student.profileStatus === "PENDING" && (
      student.className === "DTH-CNTT" || student.email === `${student.studentCode}@vanlanguni.vn`
    );
    const references = student.reportedIncidents.length + student.dutySchedules.reduce((count, schedule) => count + schedule.incidents.length, 0);
    const action = invalidCode
      ? logs.length ? "NGỪNG HOẠT ĐỘNG, GIỮ LỊCH SỬ" : references ? "BỎ QUA: CÓ SỰ CỐ LIÊN QUAN" : "XÓA HỒ SƠ VÀ LỊCH TRỰC"
      : pendingDefaults ? "ĐẶT LỚP / EMAIL / SĐT VỀ NULL" : null;
    if (!action) return [];
    return [{ student, logs: logs.length, schedules: student.dutySchedules.length, action, pendingDefaults: pendingDefaults && !invalidCode, invalidCode, references }];
  });

  console.log(apply ? "CHẾ ĐỘ APPLY" : "DRY-RUN (mặc định; chưa ghi dữ liệu)");
  if (!tasks.length) console.log("Không có hồ sơ cần xử lý.");
  for (const task of tasks) {
    console.log(JSON.stringify({
      id: task.student.id,
      studentCode: task.student.studentCode,
      studentCodeHex: Buffer.from(task.student.studentCode, "utf8").toString("hex").toUpperCase(),
      profileStatus: task.student.profileStatus,
      action: task.action,
      attendanceLogs: task.logs,
      dutySchedules: task.schedules,
    }));
  }

  if (!apply || !tasks.length) return;
  const databasePath = getDatabasePath();
  if (!existsSync(databasePath)) throw new Error(`Không tìm thấy database để backup: ${databasePath}`);
  const backupPath = `${databasePath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  copyFileSync(databasePath, backupPath);
  console.log(`Backup tạo xong: ${backupPath}`);

  await prisma.$transaction(async (tx) => {
    for (const task of tasks) {
      const student = task.student;
      if (task.invalidCode && task.logs > 0) {
        await tx.student.update({ where: { id: student.id }, data: { isActive: false, deactivatedAt: student.deactivatedAt || new Date() } });
      } else if (task.invalidCode && !task.logs && !task.references) {
        await tx.dutySchedule.deleteMany({ where: { studentId: student.id } });
        await tx.student.delete({ where: { id: student.id } });
      } else if (task.pendingDefaults) {
        await tx.student.update({ where: { id: student.id }, data: { className: null, email: null, phone: null } });
      }
    }
  });
  console.log("Đã áp dụng các thao tác được liệt kê.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
