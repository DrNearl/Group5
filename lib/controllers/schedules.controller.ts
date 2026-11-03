import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function handleSchedulesGet(req: NextRequest) {
  try {
    const [schedules, labs, shifts, students] = await Promise.all([
      prisma.dutySchedule.findMany({
        include: {
          user: true,
          labRoom: {
            include: {
              equipments: {
                where: { category: "PC" },
                select: { status: true },
              },
            },
          },
          shift: true,
          attendanceLog: true,
        },
        orderBy: [{ dutyDate: "asc" }, { shift: { startTime: "asc" } }],
      }),
      prisma.labRoom.findMany(),
      prisma.shift.findMany({ orderBy: { startTime: "asc" } }),
      prisma.user.findMany({
        where: { role: "STUDENT" },
        select: { id: true, fullName: true, studentCode: true },
      }),
    ]);

    return NextResponse.json({ success: true, schedules, labs, shifts, students });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function handleSchedulesPost(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, labId, shiftId, dutyDate, note } = body;

    const date = new Date(dutyDate);
    date.setHours(0, 0, 0, 0);

    const schedule = await prisma.dutySchedule.create({
      data: {
        userId,
        labId,
        shiftId,
        dutyDate: date,
        scheduleStatus: "APPROVED",
        note,
      },
      include: {
        user: true,
        labRoom: true,
        shift: true,
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function handleSchedulesDelete(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Thiếu ID lịch phân công!" }, { status: 400 });
    }

    await prisma.dutySchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa lịch phân công thành công!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
