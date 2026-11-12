# Database ERD & CRUD Matrix — VLU Lab QR Attendance System

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    User {
        string id PK
        string username UK
        string fullName
        string email UK
        string passwordHash
        string phone
        string role
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Student {
        string id PK
        string studentCode UK
        string fullName
        string email
        string phone
        string className
        int qrVersion
        datetime qrSentAt
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    LabRoom {
        string id PK
        string labCode UK
        string labName
        string building
        int capacity
        string allowedIp
        string status
        datetime createdAt
        datetime updatedAt
    }

    Shift {
        string id PK
        string shiftName
        string startTime
        string endTime
        int gracePeriodMinutes
        datetime createdAt
        datetime updatedAt
    }

    DutySchedule {
        string id PK
        string studentId FK
        string labId FK
        string shiftId FK
        datetime dutyDate
        string scheduleStatus
        string note
        datetime createdAt
        datetime updatedAt
    }

    AttendanceLog {
        string id PK
        string scheduleId FK
        string scannedBarcode
        datetime checkInTime
        datetime checkOutTime
        string scanMethod
        string checkInSnapshot
        string checkOutSnapshot
        string clientIp
        string attendanceStatus
        float totalHours
        datetime createdAt
        datetime updatedAt
    }

    LabEquipment {
        string id PK
        string equipmentBarcode UK
        string equipmentName
        string category
        string labId FK
        string status
        string specifications
        datetime createdAt
        datetime updatedAt
    }

    EquipmentIncident {
        string id PK
        string equipmentId FK
        string reportedByStudentId FK
        string scheduleId FK
        string title
        string description
        string severity
        string incidentStatus
        datetime createdAt
        datetime resolvedAt
    }

    AuditLog {
        string id PK
        string actorId
        string actorName
        string actorRole
        string action
        string target
        string detail
        datetime createdAt
    }

    Student ||--o{ DutySchedule : "registers / assigned"
    LabRoom ||--o{ DutySchedule : "hosts"
    Shift ||--o{ DutySchedule : "defines window"
    DutySchedule ||--o| AttendanceLog : "records 1-to-1"
    LabRoom ||--o{ LabEquipment : "contains"
    LabEquipment ||--o{ EquipmentIncident : "has incidents"
    Student ||--o{ EquipmentIncident : "reports"
    DutySchedule ||--o{ EquipmentIncident : "during session"
```

---

## 2. CRUD & API Permission Matrix

| Entity (Table) | Create (C) | Read (R) | Update (U) | Delete (D) | Roles / Access |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User** | `POST /api/users` | `GET /api/users`, `GET /api/auth/me` | `POST /api/auth/change-password` | `DELETE /api/users?id=...` | `ADMIN` (quản lý tài khoản); `ADMIN / LECTURER` (tự đổi mật khẩu) |
| **Student** | `POST /api/students`, `POST /api/students/import` | `GET /api/students`, `GET /api/students/qr` | `PUT /api/students`, `POST /api/students/qr` (thu hồi/cấp lại QR, gửi mail) | `DELETE /api/students` | `ADMIN / LECTURER` |
| **DutySchedule & AttendanceLog** | `POST /api/attendance/scan` (quét QR tại trạm), `POST /api/dashboard` (điểm danh thủ công) | `GET /api/dashboard`, `GET /api/attendance/scan` | `POST /api/attendance/scan` (Check-out), `PATCH /api/attendance/scan` (Check-out hộ) | — *(lưu lịch sử đối soát)* | Trạm quét công khai (`POST/GET /api/attendance/scan`), `ADMIN / LECTURER` (Dashboard & bổ sung) |
| **AuditLog** | Tự động ghi qua `recordAuditLog()` khi có thao tác quản trị | `GET /api/audit-logs` | — *(bất biến để đối soát)* | — *(bất biến để đối soát)* | Chỉ `ADMIN` xem |
| **LabEquipment & Incident** | `POST /api/equipments`, `POST /api/incidents/create` | `GET /api/equipments`, `GET /api/incidents` | `PATCH` / xử lý trạng thái | — | `ADMIN / LECTURER` |
