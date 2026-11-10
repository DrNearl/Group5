// Prisma Database Seed Script (DỮ LIỆU THỰC TẾ 100%)
// Trường Đại học Văn Lang - Khoa Công nghệ Thông tin
// Hệ quản trị cơ sở dữ liệu: Microsoft SQL Server (MSSQL)

import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Bắt đầu nạp dữ liệu thực tế cho Khoa CNTT - Đại học Văn Lang vào SQL Server...");

  // 1. Dọn dẹp dữ liệu cũ theo thứ tự ràng buộc khóa ngoại
  await prisma.attendanceLog.deleteMany();
  await prisma.equipmentIncident.deleteMany();
  await prisma.labEquipment.deleteMany();
  await prisma.dutySchedule.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.labRoom.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Đã làm sạch cơ sở dữ liệu SQL Server.");

  // 2. TÀI KHOẢN ĐĂNG NHẬP: CHỈ CÓ ADMIN DUY NHẤT (TOÀN QUYỀN HỆ THỐNG)
  await prisma.user.create({
    data: {
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
  const svDuc = await prisma.student.create({
    data: {
      studentCode: "2373401010100", // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Nguyễn Thiện Đức",
      email: "duc.2373401010100@vanlanguni.vn",
      className: "23DTH01",
      phone: "0912345678",
      isActive: true,
    },
  });

  // Sinh viên 2: Nguyễn Bảo Thiên
  const svThien = await prisma.student.create({
    data: {
      studentCode: "2174802010708", // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Nguyễn Bảo Thiên",
      email: "thien.2174802010708@vanlanguni.vn",
      className: "21CNTT02",
      phone: "0923456789",
      isActive: true,
    },
  });

  // Sinh viên 3: Trần Thái Thuận
  const svThuan = await prisma.student.create({
    data: {
      studentCode: "2373401010001", // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Trần Thái Thuận",
      email: "thuan.2373401010001@vanlanguni.vn",
      className: "23DTH01",
      phone: "0934567890",
      isActive: true,
    },
  });

  console.log(`✅ Đã nạp 3 Sinh viên trực Lab chính thức: Nguyễn Thiện Đức, Nguyễn Bảo Thiên, Trần Thái Thuận.`);

  // 4. TẠO PHÒNG LAB
  const lab801 = await prisma.labRoom.create({
    data: {
      labCode: "LAB-CS3-G801",
      labName: "Phòng Lab Mạng máy tính & An ninh mạng 8.01",
      building: "Cơ sở 3 - Tòa nhà G, Tầng 8",
      capacity: 45,
      allowedIp: "10.20.80.1",
      status: "ACTIVE",
    },
  });

  const lab802 = await prisma.labRoom.create({
    data: {
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
  const shiftMorning = await prisma.shift.create({
    data: {
      shiftName: "Ca Sáng (08:00 - 11:30)",
      startTime: "08:00",
      endTime: "11:30",
      gracePeriodMinutes: 15,
    },
  });

  const shiftAfternoon = await prisma.shift.create({
    data: {
      shiftName: "Ca Chiều (13:00 - 17:00)",
      startTime: "13:00",
      endTime: "17:00",
      gracePeriodMinutes: 15,
    },
  });

  await prisma.shift.create({
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

  await prisma.dutySchedule.create({
    data: {
      studentId: svDuc.id,
      labId: lab801.id,
      shiftId: shiftMorning.id,
      dutyDate: today,
      scheduleStatus: "APPROVED",
      note: "Trực phòng Lab Mạng máy tính 8.01 đầu giờ",
    },
  });

  await prisma.dutySchedule.create({
    data: {
      studentId: svThien.id,
      labId: lab801.id,
      shiftId: shiftAfternoon.id,
      dutyDate: today,
      scheduleStatus: "APPROVED",
      note: "Hỗ trợ phòng thực hành",
    },
  });

  console.log("🎉 Hoàn tất nạp dữ liệu sạch vào SQL Server (Chỉ Admin, không data máy trạm)!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi nạp dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
