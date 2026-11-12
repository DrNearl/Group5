// Prisma Database Seed Script (an toàn khi chạy lặp lại, không xóa dữ liệu)
// Trường Đại học Văn Lang - Khoa Công nghệ Thông tin
// Hệ quản trị cơ sở dữ liệu: SQLite

import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";
import { getValidStudentCode } from "../lib/studentCode";

const scrypt = promisify(scryptCallback);
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

const prisma = new PrismaClient();

async function main() {
  const studentCodes = ["2373401010100", "2174802010708", "2373401010001", "2374802010491"].map((code) => {
    const validCode = getValidStudentCode(code);
    if (!validCode) throw new Error(`MSSV seed không hợp lệ: ${code}`);
    return validCode;
  });
  console.log("🚀 Bổ sung dữ liệu mẫu còn thiếu cho Khoa CNTT - Đại học Văn Lang...");

  // 2. TÀI KHOẢN ĐĂNG NHẬP: CHỈ CÓ ADMIN DUY NHẤT (TOÀN QUYỀN HỆ THỐNG)
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "Quản trị viên Hệ thống (Admin)",
      email: "admin@vlu.edu.vn",
      passwordHash: await hashPassword("admin"),
      phone: "0909999999",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`✅ Đã tạo tài khoản quản trị duy nhất: admin / admin (Toàn quyền hệ thống).`);

  // 3. TẠO DANH SÁCH SINH VIÊN TRỰC LAB
  // Sinh viên 1: Nguyễn Thiện Đức
  const svDuc = await prisma.student.upsert({
    where: { studentCode: studentCodes[0] },
    update: {},
    create: {
      studentCode: studentCodes[0], // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Nguyễn Thiện Đức",
      email: "duc.2373401010100@vanlanguni.vn",
      className: "23DTH01",
      phone: "0912345678",
      profileStatus: "VERIFIED",
      source: "MANUAL",
      isActive: true,
    },
  });

  // Sinh viên 2: Nguyễn Bảo Thiên
  const svThien = await prisma.student.upsert({
    where: { studentCode: studentCodes[1] },
    update: {},
    create: {
      studentCode: studentCodes[1], // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Nguyễn Bảo Thiên",
      email: "thien.2174802010708@vanlanguni.vn",
      className: "21CNTT02",
      phone: "0923456789",
      profileStatus: "VERIFIED",
      source: "MANUAL",
      isActive: true,
    },
  });

  // Sinh viên 3: Trần Thái Thuận
  const svThuan = await prisma.student.upsert({
    where: { studentCode: studentCodes[2] },
    update: {},
    create: {
      studentCode: studentCodes[2], // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Trần Thái Thuận",
      email: "thuan.2373401010001@vanlanguni.vn",
      className: "23DTH01",
      phone: "0934567890",
      profileStatus: "VERIFIED",
      source: "MANUAL",
      isActive: true,
    },
  });

  await prisma.student.upsert({
    where: { studentCode: studentCodes[3] },
    update: {},
    create: {
      studentCode: studentCodes[3],
      fullName: null,
      email: null,
      phone: null,
      className: null,
      profileStatus: "PENDING",
      source: "SCAN_AUTO",
      firstSeenAt: new Date(),
      isActive: true,
    },
  });

  console.log(`✅ Đã nạp 3 Sinh viên trực Lab chính thức: Nguyễn Thiện Đức, Nguyễn Bảo Thiên, Trần Thái Thuận.`);

  // 4. TẠO PHÒNG LAB
  const lab801 = await prisma.labRoom.upsert({
    where: { labCode: "LAB-CS3-G801" },
    update: {},
    create: {
      labCode: "LAB-CS3-G801",
      labName: "Phòng Lab Mạng máy tính & An ninh mạng 8.01",
      building: "Cơ sở 3 - Tòa nhà G, Tầng 8",
      capacity: 45,
      allowedIp: "10.20.80.1",
      status: "ACTIVE",
    },
  });

  await prisma.labRoom.upsert({
    where: { labCode: "LAB-CS3-G802" },
    update: {},
    create: {
      labCode: "LAB-CS3-G802",
      labName: "Phòng Lab Trí tuệ nhân tạo & Khoa học dữ liệu 8.02",
      building: "Cơ sở 3 - Tòa nhà G, Tầng 8",
      capacity: 45,
      allowedIp: "10.20.80.2",
      status: "ACTIVE",
    },
  });

  console.log(`✅ Đã tạo các Phòng Thực hành Lab chính thức tại Cơ sở 3 VLU.`);

  // 5. TẠO CÁC KHUNG CA TRỰC CHUẨN THEO QUY ĐỊNH LÀM VIỆC VĂN LANG
  const shiftMorningExisting = await prisma.shift.findFirst({ where: { shiftName: "Ca Sáng (08:00 - 11:30)" } });
  const shiftMorning = shiftMorningExisting || await prisma.shift.create({
    data: {
      shiftName: "Ca Sáng (08:00 - 11:30)",
      startTime: "08:00",
      endTime: "11:30",
      gracePeriodMinutes: 15,
    },
  });

  const shiftAfternoonExisting = await prisma.shift.findFirst({ where: { shiftName: "Ca Chiều (13:00 - 17:00)" } });
  const shiftAfternoon = shiftAfternoonExisting || await prisma.shift.create({
    data: {
      shiftName: "Ca Chiều (13:00 - 17:00)",
      startTime: "13:00",
      endTime: "17:00",
      gracePeriodMinutes: 15,
    },
  });

  const saturdayShift = await prisma.shift.findFirst({ where: { shiftName: "Ca Thứ Bảy (08:00 - 11:00)" } });
  if (!saturdayShift) await prisma.shift.create({
    data: {
      shiftName: "Ca Thứ Bảy (08:00 - 11:00)",
      startTime: "08:00",
      endTime: "11:00",
      gracePeriodMinutes: 15,
    },
  });

  console.log(`✅ Đã tạo Khung ca trực chuẩn theo quy định làm việc VLU.`);

  // 6. LỊCH PHÂN CÔNG HÔM NAY (MẪU)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const morningSchedule = await prisma.dutySchedule.findFirst({
    where: { studentId: svDuc.id, labId: lab801.id, shiftId: shiftMorning.id, dutyDate: today },
  });
  if (!morningSchedule) await prisma.dutySchedule.create({
    data: {
      studentId: svDuc.id,
      labId: lab801.id,
      shiftId: shiftMorning.id,
      dutyDate: today,
      scheduleStatus: "APPROVED",
      note: "Trực phòng Lab Mạng máy tính 8.01 đầu giờ",
    },
  });

  const afternoonSchedule = await prisma.dutySchedule.findFirst({
    where: { studentId: svThien.id, labId: lab801.id, shiftId: shiftAfternoon.id, dutyDate: today },
  });
  if (!afternoonSchedule) await prisma.dutySchedule.create({
    data: {
      studentId: svThien.id,
      labId: lab801.id,
      shiftId: shiftAfternoon.id,
      dutyDate: today,
      scheduleStatus: "APPROVED",
      note: "Hỗ trợ phòng thực hành",
    },
  });

  console.log("🎉 Hoàn tất bổ sung dữ liệu mẫu, dữ liệu hiện có được giữ nguyên.");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi nạp dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
