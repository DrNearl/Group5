export type StudentInputField = "studentCode" | "fullName" | "className" | "phone" | "email";
export type StudentInputErrors = Partial<Record<StudentInputField, string>>;
export type StudentValidationMode = "create" | "edit";

export interface StudentInputValues {
  studentCode?: unknown;
  fullName?: unknown;
  className?: unknown;
  phone?: unknown;
  email?: unknown;
}

function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateStudentInput(
  input: StudentInputValues,
  mode: StudentValidationMode
): StudentInputErrors {
  const errors: StudentInputErrors = {};
  const studentCode = trimmedString(input.studentCode);
  const fullName = trimmedString(input.fullName).normalize("NFC");
  const className = trimmedString(input.className);
  const phone = trimmedString(input.phone);
  const email = trimmedString(input.email);

  if ((!studentCode && mode === "edit") || (studentCode && !/^[a-z\d]{4,20}$/i.test(studentCode))) {
    errors.studentCode = studentCode
      ? "Mã số chỉ gồm chữ và số, dài 4–20 ký tự."
      : "Vui lòng nhập mã số sinh viên.";
  }

  if (!fullName) {
    errors.fullName = "Vui lòng nhập họ và tên.";
  } else if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName = "Họ tên phải dài 2–100 ký tự.";
  } else if (!/^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF ]+$/.test(fullName)) {
    errors.fullName = "Họ tên chỉ gồm chữ cái và khoảng trắng, không nhập số hoặc ký tự đặc biệt.";
  } else if (fullName.trim().split(/\s+/).length < 2) {
    errors.fullName = "Vui lòng nhập ít nhất hai từ trong họ tên.";
  }

  if (className.length > 30) {
    errors.className = "Tên lớp tối đa 30 ký tự.";
  } else if (className && !/^[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u1E00-\u1EFF_ -]+$/.test(className)) {
    errors.className = "Lớp chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.";
  }

  if (phone) {
    const normalizedPhone = phone.replace(/[ .-]/g, "");
    if (!/^[\d+ .-]+$/.test(phone) || !/^(0|\+84)\d{9}$/.test(normalizedPhone)) {
      errors.phone = "Số điện thoại chỉ gồm chữ số (vd: 0912345678 hoặc +84912345678).";
    }
  }

  if (email) {
    const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.length > 120) {
      errors.email = "Email tối đa 120 ký tự.";
    } else if (!basicEmailPattern.test(email)) {
      errors.email = "Email không hợp lệ (vd: ten@vidu.vn).";
    } else if (!email.toLowerCase().endsWith("@vanlanguni.vn")) {
      errors.email = "Email phải sử dụng tên miền @vanlanguni.vn.";
    }
  }

  return errors;
}
