"use client";

import React, { useState, useEffect } from "react";
import BarcodeLabel from "@/components/BarcodeLabel";
import {
  Printer,
  Plus,
  Laptop,
  CheckCircle2,
  AlertOctagon,
  Wrench,
  Search,
  Filter,
  Barcode,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

function EquipmentsContent() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Modal in hàng loạt tem Barcode
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState("EQ-LAB801-PC");
  const [batchStart, setBatchStart] = useState(1);
  const [batchCount, setBatchCount] = useState(40);

  const fetchEquipments = async () => {
    setLoading(true);
    try {
      const url = selectedLabId !== "ALL" ? `/api/equipments?labId=${selectedLabId}` : `/api/equipments`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEquipments(data.equipments || []);
        setLabs(data.labs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, [selectedLabId]);

  const filteredEquipments = equipments.filter((eq) => {
    const matchesSearch =
      eq.equipmentBarcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.equipmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || eq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "GOOD" ? "BROKEN" : currentStatus === "BROKEN" ? "REPAIRING" : "GOOD";
    try {
      const res = await fetch("/api/equipments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchEquipments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Kích hoạt hộp thoại in ấn của trình duyệt
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* THANH HEADER ĐIỀU HƯỚNG (Ẩn khi in ấn) */}
      <header className="print:hidden border-b border-gray-200 bg-white/95 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Barcode className="h-6 w-6 text-red-600" />
              QUẢN LÝ THIẾT BỊ & IN NHÃN BARCODE PHÒNG LAB
            </h1>
            <p className="text-xs text-gray-500">
              In tem Code 128 dán CPU máy tính trạm và kiểm tra trạng thái hoạt động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-sm transition"
          >
            <Plus className="h-4 w-4 text-emerald-600" />
            Tạo Tem Barcode Hàng Loạt
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Printer className="h-4 w-4" />
            In Bảng Tem Barcode (Print PDF / A4)
          </button>
        </div>
      </header>

      {/* VÙNG LỌC & TÌM KIẾM (Ẩn khi in ấn) */}
      <div className="print:hidden max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo mã Barcode (VD: EQ-LAB801...) hoặc tên máy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300 text-xs shadow-sm">
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="bg-transparent text-gray-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả phòng Lab</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.labCode} - {l.labName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded font-semibold transition ${
                statusFilter === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tất cả ({equipments.length})
            </button>
            <button
              onClick={() => setStatusFilter("GOOD")}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${
                statusFilter === "GOOD"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm"
                  : "text-gray-600 hover:text-emerald-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Tốt ({equipments.filter((e) => e.status === "GOOD").length})
            </button>
            <button
              onClick={() => setStatusFilter("BROKEN")}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${
                statusFilter === "BROKEN"
                  ? "bg-rose-50 text-rose-800 border border-rose-200 shadow-sm"
                  : "text-gray-600 hover:text-rose-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              Hỏng ({equipments.filter((e) => e.status === "BROKEN").length})
            </button>
            <button
              onClick={() => setStatusFilter("REPAIRING")}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${
                statusFilter === "REPAIRING"
                  ? "bg-amber-50 text-amber-800 border border-amber-200 shadow-sm"
                  : "text-gray-600 hover:text-amber-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              Sửa ({equipments.filter((e) => e.status === "REPAIRING").length})
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Hiển thị: <span className="font-bold text-gray-900">{filteredEquipments.length}</span> / {equipments.length} thiết bị
        </div>
      </div>

      {/* VÙNG HIỂN THỊ TEM BARCODE (HIỂN THỊ WEB VÀ SẴN SÀNG IN ẤN A4) */}
      <main className="max-w-7xl mx-auto px-6 pb-12">
        {/* Banner hướng dẫn in tem */}
        <div className="print:hidden mb-6 p-4 rounded-xl bg-white border border-gray-200 text-xs text-gray-600 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-gray-900">Chế độ in tem dán Chuẩn A4 Decal</div>
              <div className="text-gray-500 text-[11px]">
                Nhấn nút &ldquo;In Bảng Tem Barcode&rdquo; ở góc trên. Trình duyệt sẽ tự động xếp các tem vừa vặn 3 cột trên khổ giấy A4 để dán lên vỏ máy tính trạm.
              </div>
            </div>
          </div>
        </div>

        {/* LƯỚI TEM BARCODE (GRID CHO BẢNG IN VÀ VIEW) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 gap-5 print:gap-4 justify-items-center">
          {filteredEquipments.map((eq) => (
            <div key={eq.id} className="flex flex-col items-center">
              <BarcodeLabel
                value={eq.equipmentBarcode}
                title={eq.equipmentName}
                subtitle={eq.labRoom?.labName || "KHOA CNTT - ĐH VĂN LANG"}
                footerText={`Cơ sở 3 - ${eq.labRoom?.building || "Tòa G"}`}
              />

              {/* Badges trạng thái chỉ hiển thị trên màn hình Web */}
              <div className="print:hidden mt-2 flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => handleToggleStatus(eq.id, eq.status)}
                  title="Nhấn để đổi trạng thái thiết bị (Tốt -> Hỏng -> Đang sửa)"
                  className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer hover:opacity-85 shadow-sm active:scale-95 ${
                    eq.status === "GOOD"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : eq.status === "BROKEN"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  ● {eq.status === "GOOD" ? "Hoạt động tốt" : eq.status === "BROKEN" ? "Hỏng hóc" : "Đang sửa"}
                </button>

                {eq.incidents?.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-semibold border border-rose-200">
                    {eq.incidents.length} sự cố mở
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredEquipments.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            Không tìm thấy thiết bị nào khớp với từ khóa tìm kiếm.
          </div>
        )}
      </main>

      {/* MODAL TẠO BATCH TEM BARCODE HÀNG LOẠT */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Barcode className="h-5 w-5 text-red-600" />
              TẠO TEM BARCODE HÀNG LOẠT (BATCH)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Tạo nhanh chuỗi mã vạch từ PC01 đến PC40 cho toàn bộ phòng máy Lab.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-600 block mb-1">Tiền tố mã vạch (Barcode Prefix):</label>
                <input
                  type="text"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-red-500"
                  placeholder="EQ-LAB801-PC"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">Bắt đầu từ số:</label>
                  <input
                    type="number"
                    value={batchStart}
                    onChange={(e) => setBatchStart(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">Số lượng máy (Count):</label>
                  <input
                    type="number"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-[11px] text-gray-700">
                <span className="text-gray-500">Mẫu mã vạch sẽ tạo:</span>
                <div className="text-emerald-700 font-mono font-bold mt-1">
                  {batchPrefix}01 &rarr; {batchPrefix}
                  {batchCount < 10 ? `0${batchCount}` : batchCount}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  alert(
                    `Đã tạo cấu hình lô ${batchCount} tem Barcode từ ${batchPrefix}01 đến ${batchPrefix}${batchCount}!`
                  );
                  setShowBatchModal(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-sm"
              >
                Xác nhận tạo lô tem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EquipmentsPageView() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <EquipmentsContent />
    </ProtectedRoute>
  );
}
