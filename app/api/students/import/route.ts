import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
import prisma from "@/lib/prisma";
import { requireStaffAuth } from "@/lib/auth-server";
import { parseVluStudentInfo } from "@/lib/vlu-student-helper";

export const dynamic = "force-dynamic";

export interface ParsedImportStudent {
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  className: string;
  existsInDb?: boolean;
}

function normalizeHeaderKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isLikelyStudentCode(token: string): boolean {
  const clean = token.trim();
  if (/^\d{7,14}$/.test(clean)) {
    // Tránh nhầm số điện thoại Việt Nam (10 số bắt đầu bằng 0) với MSSV
    if (clean.length === 10 && clean.startsWith("0")) return false;
    return true;
  }
  return /^[A-Za-z]{1,4}\d{5,12}$/.test(clean);
}

function parseExcelRows(buffer: Buffer): ParsedImportStudent[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const rows2D = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (!rows2D.length) return [];

  // Tìm dòng tiêu đề thật sự (trong 10 dòng đầu) nếu file Excel có tiêu đề trường/khoa ở trên
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rows2D.length, 10); i++) {
    const cells = rows2D[i].map((c) => normalizeHeaderKey(String(c || "")));
    const hasCodeCol = cells.some((k) =>
      ["mssv", "masv", "masinhvien", "studentcode", "ma", "code"].includes(k)
    );
    const hasNameCol = cells.some((k) =>
      ["hoten", "hovaten", "fullname", "tensinhvien", "ten", "name"].includes(k)
    );
    if (hasCodeCol || hasNameCol) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = rows2D[headerRowIdx].map((h) => normalizeHeaderKey(String(h || "")));
  const findCol = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h));

  const codeIdx = findCol(["mssv", "masv", "masinhvien", "studentcode", "code", "ma"]);
  const fullNameIdx = findCol(["hoten", "hovaten", "fullname", "tensinhvien", "name"]);
  const lastNameIdx = findCol(["ho", "holot", "hodem", "firstname"]);
  const firstNameIdx = findCol(["ten", "lastname"]);
  const emailIdx = findCol(["email", "mail", "gmail"]);
  const classIdx = findCol(["lop", "class", "classname", "malop", "khoa", "nhom"]);
  const phoneIdx = findCol(["sdt", "dienthoai", "sodienthoai", "phone", "tel"]);

  const results: ParsedImportStudent[] = [];
  for (let r = headerRowIdx + 1; r < rows2D.length; r++) {
    const row = rows2D[r];
    if (!row || row.every((c) => !String(c || "").trim())) continue;

    let studentCode = codeIdx >= 0 ? String(row[codeIdx] || "").trim() : "";
    if (!studentCode) {
      // Quét fallback từng ô trên dòng để tìm MSSV nếu tiêu đề cột đặt tên lạ
      const detected = row.map((c) => String(c || "").trim()).find(isLikelyStudentCode);
      if (detected) studentCode = detected;
    }
    if (!studentCode || !isLikelyStudentCode(studentCode)) continue;

    let fullName = fullNameIdx >= 0 ? String(row[fullNameIdx] || "").trim() : "";
    if (!fullName && (lastNameIdx >= 0 || firstNameIdx >= 0)) {
      const ho = lastNameIdx >= 0 ? String(row[lastNameIdx] || "").trim() : "";
      const ten = firstNameIdx >= 0 ? String(row[firstNameIdx] || "").trim() : "";
      fullName = `${ho} ${ten}`.trim();
    }

    const vluInfo = parseVluStudentInfo(studentCode, fullName);
    const rawEmail = emailIdx >= 0 ? String(row[emailIdx] || "").trim().toLowerCase() : "";
    const rawClass = classIdx >= 0 ? String(row[classIdx] || "").trim() : "";
    const rawPhone = phoneIdx >= 0 ? String(row[phoneIdx] || "").trim() : "";

    results.push({
      studentCode,
      fullName: fullName || vluInfo.defaultFullName,
      email: rawEmail && rawEmail.includes("@") ? rawEmail : vluInfo.defaultEmail,
      phone: rawPhone,
      className: rawClass || vluInfo.suggestedClass,
    });
  }

  return deduplicateStudents(results);
}

async function parsePdfRows(buffer: Buffer): Promise<ParsedImportStudent[]> {
  const parser = new PDFParse({ data: buffer });
  let text = "";
  try {
    const data = await parser.getText();
    text = String(data?.text || "");
  } finally {
    await parser.destroy().catch(() => {});
  }

  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const results: ParsedImportStudent[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const codeMatch = line.match(/\b(\d{7,14}|[A-Za-z]{1,4}\d{5,12})\b/g);
    const studentCode = codeMatch?.find(isLikelyStudentCode);
    if (!studentCode) continue;

    // Gom thêm dòng kế tiếp nếu PDF tách cột bảng thành nhiều dòng
    const nextLine = rawLines[i + 1] && !rawLines[i + 1].match(/\b\d{7,14}\b/) ? rawLines[i + 1] : "";
    const combined = `${line} ${nextLine}`.trim();

    const emailMatch = combined.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = combined.match(/\b0\d{8,10}\b/);
    const classMatch = combined.match(/\b(K\d{2}[A-Za-z0-9_-]{0,10}|\d{2}[A-Za-z]{2,6}\d{0,4})\b/);

    // Loại bỏ STT, MSSV, Email, SĐT, Lớp để trích ra Họ và tên
    let nameCandidate = line
      .replace(/^\d{1,3}[\s.)|-]+/, "")
      .replace(studentCode, " ");
    if (emailMatch) nameCandidate = nameCandidate.replace(emailMatch[0], " ");
    if (phoneMatch) nameCandidate = nameCandidate.replace(phoneMatch[0], " ");
    if (classMatch) nameCandidate = nameCandidate.replace(classMatch[0], " ");
    nameCandidate = nameCandidate.replace(/[|,;•]+/g, " ").replace(/\s+/g, " ").trim();

    if (nameCandidate.length < 3 && nextLine) {
      let nextCandidate = nextLine;
      if (emailMatch) nextCandidate = nextCandidate.replace(emailMatch[0], " ");
      if (phoneMatch) nextCandidate = nextCandidate.replace(phoneMatch[0], " ");
      if (classMatch) nextCandidate = nextCandidate.replace(classMatch[0], " ");
      nextCandidate = nextCandidate.replace(/[|,;•]+/g, " ").replace(/\s+/g, " ").trim();
      if (nextCandidate.length >= 3) nameCandidate = nextCandidate;
    }

    const vluInfo = parseVluStudentInfo(
      studentCode,
      nameCandidate.length >= 2 ? nameCandidate : ""
    );
    results.push({
      studentCode,
      fullName: nameCandidate.length >= 2 ? nameCandidate : vluInfo.defaultFullName,
      email: emailMatch ? emailMatch[0].toLowerCase() : vluInfo.defaultEmail,
      phone: phoneMatch ? phoneMatch[0] : "",
      className: classMatch ? classMatch[0].toUpperCase() : vluInfo.suggestedClass,
    });
  }

  return deduplicateStudents(results);
}

function deduplicateStudents(items: ParsedImportStudent[]): ParsedImportStudent[] {
  const map = new Map<string, ParsedImportStudent>();
  for (const item of items) {
    const code = item.studentCode.trim();
    if (!code) continue;
    if (!map.has(code)) {
      map.set(code, { ...item, studentCode: code });
    }
  }
  return Array.from(map.values());
}

/**
 * POST /api/students/import
 * - multipart/form-data (action="parse", file): Trích xuất danh sách sinh viên từ PDF / Excel / CSV để xem trước.
 * - application/json (action="save", students): Lưu hàng loạt sinh viên đã xác nhận vào CSDL.
 */
export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth(req);
  if (!("user" in auth)) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, message: "Vui lòng chọn tệp PDF, Excel (.xlsx) hoặc CSV!" },
          { status: 400 }
        );
      }

      const fileName = file.name.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());
      let parsed: ParsedImportStudent[] = [];

      if (fileName.endsWith(".pdf")) {
        parsed = await parsePdfRows(buffer);
      } else if (
        fileName.endsWith(".xlsx") ||
        fileName.endsWith(".xls") ||
        fileName.endsWith(".csv")
      ) {
        parsed = parseExcelRows(buffer);
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Định dạng tệp không hỗ trợ! Chỉ chấp nhận .pdf, .xlsx, .xls hoặc .csv.",
          },
          { status: 400 }
        );
      }

      if (parsed.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Không trích xuất được MSSV nào từ tệp. Nếu PDF là bản scan ảnh, hãy xuất sang Excel/PDF có text hoặc dùng file Excel mẫu!",
          },
          { status: 422 }
        );
      }

      const codes = parsed.map((s) => s.studentCode);
      const existing = await prisma.student.findMany({
        where: { studentCode: { in: codes } },
        select: { studentCode: true },
      });
      const existingSet = new Set(existing.map((e) => e.studentCode));

      const previewStudents = parsed.map((s) => ({
        ...s,
        existsInDb: existingSet.has(s.studentCode),
      }));

      return NextResponse.json({
        success: true,
        total: previewStudents.length,
        students: previewStudents,
      });
    }

    // Lưu hàng loạt danh sách đã kiểm tra (JSON)
    const body = await req.json();
    const rawStudents = Array.isArray(body?.students) ? body.students : [];
    if (rawStudents.length === 0) {
      return NextResponse.json(
        { success: false, message: "Danh sách sinh viên lưu vào rỗng!" },
        { status: 400 }
      );
    }

    const savedStudents = [];
    for (const row of rawStudents) {
      const code = String(row?.studentCode || "").trim();
      const fullName = String(row?.fullName || "").trim();
      if (!code || !fullName) continue;

      const vluInfo = parseVluStudentInfo(code, fullName);
      const email = String(row?.email || "").trim().toLowerCase() || vluInfo.defaultEmail;
      const phone = String(row?.phone || "").trim() || null;
      const className = String(row?.className || "").trim() || vluInfo.suggestedClass;

      const upserted = await prisma.student.upsert({
        where: { studentCode: code },
        create: {
          studentCode: code,
          fullName,
          email,
          phone,
          className,
          isActive: true,
        },
        update: {
          fullName,
          email,
          phone,
          className,
          isActive: true,
        },
      });

      savedStudents.push({
        id: upserted.id,
        studentCode: upserted.studentCode,
        fullName: upserted.fullName,
        email: upserted.email,
        className: upserted.className,
        qrVersion: upserted.qrVersion,
        qrSentAt: upserted.qrSentAt,
      });
    }

    return NextResponse.json({
      success: true,
      savedCount: savedStudents.length,
      students: savedStudents,
      message: `Đã lưu thành công ${savedStudents.length} sinh viên vào hệ thống!`,
    });
  } catch (error: any) {
    console.error("Students import error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý nhập danh sách: " + error.message },
      { status: 500 }
    );
  }
}
