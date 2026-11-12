export interface StudentProfileFields {
  fullName: unknown;
  email: unknown;
  phone: unknown;
  className: unknown;
}

export function getStudentProfileStatus(profile: StudentProfileFields): "PENDING" | "VERIFIED" {
  const fields: Array<keyof StudentProfileFields> = ["fullName", "phone", "email", "className"];
  return fields.every((field) => {
    const value = profile[field];
    return typeof value === "string" && Boolean(value.trim());
  }) ? "VERIFIED" : "PENDING";
}
