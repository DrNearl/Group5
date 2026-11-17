import { NextRequest } from "next/server";
import { handleAttendanceAdjustPatch } from "@/lib/controllers/attendanceAdjust.controller";

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  return handleAttendanceAdjustPatch(req, context);
}
