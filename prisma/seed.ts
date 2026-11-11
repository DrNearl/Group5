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

  // 2. TÀI KHOẢN ĐĂNG NHẬP
  // 2.1 Tài khoản Quản trị viên hệ thống (Admin)
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

  // 2.2 Tài khoản Giảng viên / Cán bộ quản lý ca trực thực tế
  await prisma.user.create({
    data: {
      username: "gv.khoacntt",
      fullName: "ThS. Nguyễn Văn A",
      email: "nguyenvana@vanlanguni.vn",
      passwordHash: await hashPassword("123456"),
      phone: "0981234567",
      role: "LECTURER",
      isActive: true,
    },
  });

  console.log(`✅ Đã tạo tài khoản quản trị hệ thống và tài khoản Giảng viên mẫu (gv.khoacntt / 123456).`);

  // 3. TẠO DANH SÁCH SINH VIÊN TRỰC LAB (THEO DANH SÁCH THỰC TẾ)
  // Sinh viên 1: Nguyễn Thiện Đức
  const svDuc = await prisma.student.create({
    data: {
      studentCode: "2373401010100", // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Nguyễn Thiện Đức",
      email: "duc.2373401010100@vanlanguni.vn",
      className: "K29CNTT16",
      phone: "0981331007",
      isActive: true,
    },
  });

  // Sinh viên 2: Trần Thái Thuận
  const svThuan = await prisma.student.create({
    data: {
      studentCode: "2374802010490", // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Trần Thái Thuận",
      email: "thuan.2374802010490@vanlanguni.vn",
      className: "K29CNTT16",
      phone: "0985820170",
      isActive: true,
    },
  });

  // Sinh viên 3: Nguyễn Bảo Thiên
  const svThien = await prisma.student.create({
    data: {
      studentCode: "2174802010708", // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Nguyễn Bảo Thiên",
      email: "thien.2174802010708@vanlanguni.vn",
      className: "K27CNTT25",
      phone: "0898437282",
      isActive: true,
    },
  });

  console.log(`✅ Đã nạp 3 Sinh viên trực Lab chính thức: Nguyễn Thiện Đức, Trần Thái Thuận, Nguyễn Bảo Thiên.`);

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

  // 5. TẠO CÁC KHUNG CA LÀM VIỆC CHUẨN XƯỞNG THỰC TẬP KHOA CNTT
  const shiftMorning = await prisma.shift.create({
    data: {
      shiftName: "Ca Sáng (08:00 - 12:00)",
      startTime: "08:00",
      endTime: "12:00",
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

  console.log(`✅ Đã tạo Khung ca trực chuẩn Xưởng Thực tập (Sáng: 08:00 - 12:00, Chiều: 13:00 - 17:00).`);

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
