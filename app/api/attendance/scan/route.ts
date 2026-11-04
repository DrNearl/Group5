import { GET as handleAttendanceScanGet, handleAttendanceScan, handleManualCheckout } from "@/lib/controllers/attendanceScan.controller";

export const POST = handleAttendanceScan;
export const GET = handleAttendanceScanGet;
export const PATCH = handleManualCheckout;
