const base = "http://localhost:3001/absproxy/3000";
const codes = ["\u0010: \u0006\u001a8", "237480201049", "23748020104900", "23748020104A0"];
const routes = [
  ["/api/attendance/scan", (code) => ({ barcode: code })],
  ["/api/students", (code) => ({ studentCode: code, fullName: "Test" })],
  ["/api/auth/signup", (code) => ({ studentCode: code, fullName: "Test", email: "test@example.invalid", password: "12345678", role: "LECTURER" })],
  ["/api/users", (code) => ({ studentCode: code, fullName: "Test", email: "test@example.invalid" })],
  ["/api/qr/verify", (code) => ({ studentCode: code, token: "invalid" })],
  ["/api/dashboard", (code) => ({ studentCode: code, dutyDate: "2026-11-11", checkInTimeStr: "08:00" })],
  ["/api/incidents/create", (code) => ({ studentCode: code, equipmentId: "invalid", title: "test" })],
];

(async () => {
  const results = [];
  for (const [route, createBody] of routes) {
    for (const code of codes) {
      const response = await fetch(base + route, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createBody(code)),
      });
      const body = await response.json().catch(() => ({}));
      results.push({ route, input: JSON.stringify(code), status: response.status, rejected: body.success === false });
    }
  }
  const directoryResponse = await fetch(base + "/api/students?activity=ALL");
  const directory = await directoryResponse.json();
  console.log(JSON.stringify({ results, directory: { status: directoryResponse.status, students: directory.students?.length, summary: directory.summary } }, null, 2));
  if (results.some((result) => !result.rejected)) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
