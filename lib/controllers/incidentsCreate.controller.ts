import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { IncidentSeverity, IncidentStatus, EquipmentStatus } from "@prisma/client";

export async function handleIncidentsCreate(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      equipmentId,
      studentCode,
      title,
      description = "",
      severity = "MEDIUM",
    } = body;

    if (!equipmentId || !title) {
      return NextResponse.json(
        { success: false, message: "Vui lòng cung cấp mã thiết bị và tiêu đề sự cố!" },
        { status: 400 }
      );
    }

    // Tìm sinh viên báo cáo (nếu có)
    const reporter = await prisma.student.findFirst();

    // Tạo sự cố mới
    const incident = await prisma.equipmentIncident.create({
      data: {
        equipmentId,
        reportedByStudentId: reporter?.id || null,
        title,
        description,
        severity: severity as IncidentSeverity,
        incidentStatus: IncidentStatus.OPEN,
      },
      include: {
        equipment: true,
        reportedBy: true,
      },
    });

    // Cập nhật trạng thái thiết bị sang BROKEN nếu mức độ sự cố nghiêm trọng
    if (severity === "HIGH" || severity === "CRITICAL") {
      await prisma.labEquipment.update({
        where: { id: equipmentId },
        data: { status: EquipmentStatus.BROKEN },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã ghi nhận sự cố "${incident.title}" cho thiết bị ${incident.equipment.equipmentBarcode}!`,
      data: incident,
    });
  } catch (error: any) {
    console.error("POST /api/incidents/create Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tạo sự cố thiết bị" },
      { status: 500 }
    );
  }
}
