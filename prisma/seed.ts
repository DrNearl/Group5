// Prisma Database Seed Script (DỮ LIỆU THỰC TẾ 100%)
// Trường Đại học Văn Lang - Khoa Công nghệ Thông tin
// Đề tài: Xây dựng website quản lý và điểm danh trực phòng LAB Khoa CNTT bằng Barcode
// GVHD: ThS. Lý Thị Huyền Châu

import { PrismaClient, Role, LabStatus, ScheduleStatus, EquipmentCategory, EquipmentStatus } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Bắt đầu nạp dữ liệu thực tế cho Khoa CNTT - Đại học Văn Lang...");

  // 1. Dọn dẹp dữ liệu cũ theo thứ tự ràng buộc khóa ngoại
  await prisma.attendanceLog.deleteMany();
  await prisma.equipmentIncident.deleteMany();
  await prisma.labEquipment.deleteMany();
  await prisma.dutySchedule.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.labRoom.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Đã làm sạch cơ sở dữ liệu.");

  // 2. TẠO TÀI KHOẢN THẬT: GVHD & 3 SINH VIÊN THỰC TẬP
  // Mật khẩu demo: "123456". Tài khoản thật nên đổi mật khẩu sau lần đăng nhập đầu.

  // GVHD: ThS. Lý Thị Huyền Châu (Giảng viên Khoa CNTT - VLU)
  const gvhd = await prisma.user.create({
    data: {
      studentCode: "GV001",
      fullName: "ThS. Lý Thị Huyền Châu",
      email: "chau.lth@vlu.edu.vn",
      passwordHash: await hashPassword("123456"),
      phone: "0908123456",
      role: Role.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      studentCode: "GV002",
      fullName: "Nguyễn Minh Anh",
      email: "minhanh.gv002@vanlanguni.vn",
      passwordHash: await hashPassword("123456"),
      phone: "0908000002",
      role: Role.LECTURER,
      isActive: true,
    },
  });

  // Sinh viên 1: Nguyễn Thiện Đức (Core Barcode & Anti-Cheat)
  const svDuc = await prisma.user.create({
    data: {
      studentCode: "2373401010100", // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Nguyễn Thiện Đức",
      email: "duc.2373401010100@vanlanguni.vn",
      passwordHash: await hashPassword("123456"),
      phone: "0912345678",
      role: Role.STUDENT,
      isActive: true,
    },
  });

  // Sinh viên 2: Nguyễn Bảo Thiên (Backend API & Database)
  const svThien = await prisma.user.create({
    data: {
      studentCode: "2174802010708", // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Nguyễn Bảo Thiên",
      email: "thien.2174802010708@vanlanguni.vn",
      passwordHash: await hashPassword("123456"),
      phone: "0923456789",
      role: Role.STUDENT,
      isActive: true,
    },
  });

  // Sinh viên 3: Trần Thái Thuận (Frontend UI/UX & Thiết bị)
  const svThuan = await prisma.user.create({
    data: {
      studentCode: "2374802010490", // Chuỗi barcode thực tế in trên thẻ SV VLU
      fullName: "Trần Thái Thuận",
      email: "thuan.2374802010490@vanlanguni.vn",
      passwordHash: await hashPassword("123456"),
      phone: "0934567890",
      role: Role.STUDENT,
      isActive: true,
    },
  });

  console.log(`✅ Đã tạo tài khoản thật: GVHD ThS. Lý Thị Huyền Châu và 3 Sinh viên nhóm.`);

  // 3. TẠO DANH SÁCH PHÒNG LAB THỰC TẾ TẠI CƠ SỞ 3 VLU (69/68 ĐẶNG THÙY TRÂM, P.13, Q.BÌNH THẠNH)
  const lab801 = await prisma.labRoom.create({
    data: {
      labCode: "LAB-CS3-G801",
      labName: "Phòng Lab Mạng máy tính & An ninh mạng 8.01",
      building: "Cơ sở 3 - Tòa nhà G, Tầng 8",
      capacity: 45,
      allowedIp: "10.20.80.1",
      status: LabStatus.ACTIVE,
    },
  });

  const lab802 = await prisma.labRoom.create({
    data: {
      labCode: "LAB-CS3-G802",
      labName: "Phòng Lab Trí tuệ nhân tạo & Khoa học dữ liệu 8.02",
      building: "Cơ sở 3 - Tòa nhà G, Tầng 8",
      capacity: 45,
      allowedIp: "10.20.80.2",
      status: LabStatus.ACTIVE,
    },
  });

  const lab803 = await prisma.labRoom.create({
    data: {
      labCode: "LAB-CS3-G803",
      labName: "Phòng Lab Công nghệ phần mềm & Hệ thống thông tin 8.03",
      building: "Cơ sở 3 - Tòa nhà G, Tầng 8",
      capacity: 45,
      allowedIp: "10.20.80.3",
      status: LabStatus.ACTIVE,
    },
  });

  const lab804 = await prisma.labRoom.create({
    data: {
      labCode: "LAB-CS3-G804",
      labName: "Phòng Lab Internet of Things (IoT) & Hệ thống nhúng 8.04",
      building: "Cơ sở 3 - Tòa nhà G, Tầng 8",
      capacity: 40,
      allowedIp: "10.20.80.4",
      status: LabStatus.ACTIVE,
    },
  });

  console.log(`✅ Đã tạo 4 Phòng Thực hành Lab chính thức tại Cơ sở 3 VLU.`);

  // 4. TẠO CÁC KHUNG CA TRỰC CHUẨN THEO THỜI KHÓA BIỂU TIẾT HỌC ĐẠI HỌC VĂN LANG
  const shiftMorning = await prisma.shift.create({
    data: {
      shiftName: "Ca 1 (Sáng: Tiết 1 - 6)",
      startTime: "07:00",
      endTime: "11:30",
      gracePeriodMinutes: 15,
    },
  });

  const shiftAfternoon = await prisma.shift.create({
    data: {
      shiftName: "Ca 2 (Chiều: Tiết 7 - 12)",
      startTime: "13:00",
      endTime: "17:30",
      gracePeriodMinutes: 15,
    },
  });

  const shiftEvening = await prisma.shift.create({
    data: {
      shiftName: "Ca 3 (Tối: Tiết 13 - 16)",
      startTime: "18:00",
      endTime: "21:15",
      gracePeriodMinutes: 15,
    },
  });

  console.log(`✅ Đã tạo 3 Khung ca trực chuẩn theo Thời khóa biểu tiết học VLU.`);

  // 5. TẠO DANH SÁCH 40 MÁY TÍNH TRẠM THỰC TẾ PHÒNG LAB 8.01 GẮN MÃ VẠCH CODE 128
  const realSpecs =
    "Dell OptiPlex 7010 Tower / HP ProDesk 400 G9 (Intel Core i7-13700 16 Cores, RAM 32GB DDR5 4800MHz, SSD 512GB NVMe PCIe Gen4, GPU NVIDIA RTX 3060 12GB, LCD Dell UltraSharp 24 inch FHD)";

  const labEquipments = [];
  for (let i = 1; i <= 40; i++) {
    const pcNumber = i < 10 ? `0${i}` : `${i}`;
    labEquipments.push({
      equipmentBarcode: `EQ-LAB801-PC${pcNumber}`,
      equipmentName: `Máy trạm PC ${pcNumber} - Phòng Lab 8.01`,
      category: EquipmentCategory.PC,
      labId: lab801.id,
      status: i === 12 ? EquipmentStatus.BROKEN : EquipmentStatus.GOOD,
      specifications: realSpecs,
    });
  }

  await prisma.labEquipment.createMany({
    data: labEquipments,
  });

  console.log(`✅ Đã khởi tạo 40 Máy trạm PC thực tế có mã vạch EQ-LAB801-PC01 -> PC40.`);

  // 6. PHÂN CÔNG LỊCH TRỰC THỰC TẾ TRONG TUẦN HIỆN TẠI (TỪ HÔM NAY)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sinh viên Nguyễn Thiện Đức trực Ca 1 Sáng hôm nay
  await prisma.dutySchedule.create({
    data: {
      userId: svDuc.id,
      labId: lab801.id,
      shiftId: shiftMorning.id,
      dutyDate: today,
      scheduleStatus: ScheduleStatus.APPROVED,
      note: "Trực phòng Lab Mạng máy tính 8.01 - Kiểm tra kết nối Switch & Router mạng đầu giờ",
    },
  });

  // Sinh viên Nguyễn Bảo Thiên trực Ca 2 Chiều hôm nay
  await prisma.dutySchedule.create({
    data: {
      userId: svThien.id,
      labId: lab801.id,
      shiftId: shiftAfternoon.id,
      dutyDate: today,
      scheduleStatus: ScheduleStatus.APPROVED,
      note: "Hỗ trợ lớp thực hành Hệ quản trị cơ sở dữ liệu nâng cao",
    },
  });

  // Sinh viên Trần Thái Thuận trực Ca 3 Tối hôm nay
  await prisma.dutySchedule.create({
    data: {
      userId: svThuan.id,
      labId: lab802.id,
      shiftId: shiftEvening.id,
      dutyDate: today,
      scheduleStatus: ScheduleStatus.APPROVED,
      note: "Kiểm tra tắt toàn bộ máy tính trạm và ngắt cầu dao điện cuối ngày",
    },
  });

  console.log(`✅ Đã phân công 3 Lịch trực thật trong ngày hôm nay cho 3 Sinh viên nhóm.`);
  console.log("🎉 Hoàn tất nạp dữ liệu thực tế 100% cho Khoa CNTT VLU!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi nạp dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
