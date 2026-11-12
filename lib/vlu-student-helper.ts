/**
 * Helper phân tích mã số sinh viên (MSSV) và niên khóa Trường Đại học Văn Lang.
 * 
 * Quy ước 2 số đầu của MSSV:
 * 21... -> Khóa K27 (2021)
 * 22... -> Khóa K28 (2022)
 * 23... -> Khóa K29 (2023)
 * 24... -> Khóa K30 (2024)
 * 25... -> Khóa K31 (2025)
 * 26... -> Khóa K32 (2026)
 */

export interface ParsedVluInfo {
  isVluStudent: boolean;
  cohort: "K27" | "K28" | "K29" | "K30" | "K31" | "K32" | "OTHER";
  cohortLabel: string;
  suggestedClass: string;
  defaultFullName: string;
  defaultEmail: string;
}

const COHORT_MAP: Record<string, { cohort: ParsedVluInfo["cohort"]; label: string }> = {
  "21": { cohort: "K27", label: "Khóa K27" },
  "22": { cohort: "K28", label: "Khóa K28" },
  "23": { cohort: "K29", label: "Khóa K29" },
  "24": { cohort: "K30", label: "Khóa K30" },
  "25": { cohort: "K31", label: "Khóa K31" },
  "26": { cohort: "K32", label: "Khóa K32" },
};

function extractGivenNameSlug(fullName?: string | null): string {
  const raw = (fullName || "").trim();
  if (!raw || raw.startsWith("Sinh viên ") || raw.startsWith("Khách ")) return "";

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

  const words = normalized
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);

  return words.length > 0 ? words[words.length - 1] : "";
}

export function parseVluStudentInfo(rawBarcode: string, fullName?: string | null): ParsedVluInfo {
  const code = (rawBarcode || "").trim();

  // Kiểm tra nếu là dạng số sinh viên VLU (từ 7 đến 14 ký tự số)
  const isNumeric = /^\d{7,14}$/.test(code);

  if (isNumeric) {
    const prefix = code.slice(0, 2);
    const mapped = COHORT_MAP[prefix];

    if (mapped) {
      const nameSlug = extractGivenNameSlug(fullName);
      return {
        isVluStudent: true,
        cohort: mapped.cohort,
        cohortLabel: mapped.label,
        suggestedClass: `${mapped.cohort}-CNTT`,
        defaultFullName: `Sinh viên ${mapped.cohort} (${code})`,
        defaultEmail: nameSlug
          ? `${nameSlug}.${code}@vanlanguni.vn`
          : `${code}@vanlanguni.vn`,
      };
    }
  }

  // Trường hợp mã ngoài trường hoặc khách vãng lai
  return {
    isVluStudent: false,
    cohort: "OTHER",
    cohortLabel: "Khách / Ngoài khoa",
    suggestedClass: "KHACH-VLANGLAI",
    defaultFullName: `Khách vãng lai (${code})`,
    defaultEmail: `${code}@guest.vlu.edu.vn`,
  };
}

/**
 * Trích xuất khóa từ className hoặc studentCode
 */
export function extractCohort(className?: string | null, studentCode?: string | null): string {
  if (className) {
    const match = className.toUpperCase().match(/K(2[1-9]|3[0-2])/);
    if (match) return `K${match[1]}`;
  }
  if (studentCode) {
    const info = parseVluStudentInfo(studentCode);
    if (info.cohort !== "OTHER") return info.cohort;
  }
  return "OTHER";
}
