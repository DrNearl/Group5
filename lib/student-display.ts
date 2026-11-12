const LEGACY_UNKNOWN_STUDENT_NAME = /^Sinh viên VLU(?:\s*\([^)]*\))?$/i;

export function getStudentDisplayName(fullName: string | null | undefined): string {
  const normalizedName = fullName?.trim();
  if (!normalizedName || LEGACY_UNKNOWN_STUDENT_NAME.test(normalizedName)) return "Chưa có tên";
  return normalizedName;
}
