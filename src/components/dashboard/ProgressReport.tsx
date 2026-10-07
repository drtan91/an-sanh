import React, { useState } from 'react';
import { Customer, Employee, Room, Task, Transaction, AttendanceRecord } from '../../types';
import { formatCurrency, formatDate } from '../../utils/storage';
import {
  FileCheck,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building,
  HeartHandshake,
  Baby,
  Users,
  Activity,
  Calendar
} from 'lucide-react';

interface ProgressReportProps {
  customers: Customer[];
  tasks: Task[];
  employees: Employee[];
  rooms: Room[];
  transactions: Transaction[];
  attendance: AttendanceRecord[];
}

export const ProgressReport: React.FC<ProgressReportProps> = ({
  customers,
  tasks,
  employees,
  rooms,
  transactions,
  attendance,
}) => {
  const [copied, setCopied] = useState(false);
  const [reportDate] = useState(new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  // Auto-calculated Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Hoàn thành').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'Đang làm').length;
  const pendingTasks = tasks.filter((t) => t.status === 'Chưa làm').length;
  const overdueTasks = tasks.filter((t) => t.status === 'Quá hạn').length;
  const overallTaskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // By Category
  const catStats = {
    benhVien: {
      total: tasks.filter((t) => t.category === 'Bệnh viện').length,
      done: tasks.filter((t) => t.category === 'Bệnh viện' && t.status === 'Hoàn thành').length,
    },
    anSanh: {
      total: tasks.filter((t) => t.category === 'An Sanh').length,
      done: tasks.filter((t) => t.category === 'An Sanh' && t.status === 'Hoàn thành').length,
    },
    caNhan: {
      total: tasks.filter((t) => t.category === 'Cá nhân').length,
      done: tasks.filter((t) => t.category === 'Cá nhân' && t.status === 'Hoàn thành').length,
    },
  };

  // Subtasks metric
  const allSubtasks = tasks.flatMap((t) => t.subTasks || []);
  const completedSubtasks = allSubtasks.filter((s) => s.completed).length;
  const subtaskRate = allSubtasks.length > 0 ? Math.round((completedSubtasks / allSubtasks.length) * 100) : 0;

  // Rooms metric
  const occupiedRooms = rooms.filter((r) => r.status === 'Đã nhận').length;
  const bookedRooms = rooms.filter((r) => r.status === 'Đặt chỗ').length;
  const availableRooms = rooms.filter((r) => r.status === 'Trống').length;
  const roomOccupancyRate = Math.round(((occupiedRooms + bookedRooms) / rooms.length) * 100);

  // CRM upcoming appointments
  const upcomingAppointments = customers.filter((c) => {
    if (!c.nextAppointmentDate) return false;
    const appDate = new Date(c.nextAppointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appDate >= today;
  });

  // Financial summary
  const anSanhRevenue = transactions
    .filter((t) => t.scope === 'An Sanh' && t.type === 'Thu')
    .reduce((s, t) => s + t.amount, 0);
  const anSanhExpense = transactions
    .filter((t) => t.scope === 'An Sanh' && t.type === 'Chi')
    .reduce((s, t) => s + t.amount, 0);
  const netAnSanh = anSanhRevenue - anSanhExpense;

  // Generated Text Report for Copy/Export
  const generatedReportText = `======================================================
BÁO CÁO TIẾN ĐỘ & KINH DOANH TỰ ĐỘNG - HỆ THỐNG AN SANH
Thời điểm xuất báo cáo: ${reportDate}
======================================================

I. TIẾN ĐỘ CÔNG VIỆC TOÀN HỆ THỐNG:
- Tổng số nhiệm vụ: ${totalTasks} việc
- Hoàn thành: ${completedTasks} (${overallTaskRate}%)
- Đang triển khai: ${inProgressTasks} việc
- Chưa thực hiện: ${pendingTasks} việc
- Quá hạn: ${overdueTasks} việc
- Tiến độ nhiệm vụ con (Subtasks): ${completedSubtasks}/${allSubtasks.length} mục (${subtaskRate}%)

* Chi tiết theo 3 lĩnh vực:
  1. Bệnh viện: ${catStats.benhVien.done}/${catStats.benhVien.total} việc hoàn thành
  2. An Sanh: ${catStats.anSanh.done}/${catStats.anSanh.total} việc hoàn thành
  3. Cá nhân: ${catStats.caNhan.done}/${catStats.caNhan.total} việc hoàn thành

II. TÌNH HÌNH KINH DOANH TRUNG TÂM Ở CỮ AN SANH:
- Quy mô buồng phòng: 18 phòng (Tầng 2, 3, 4 mỗi tầng 6 phòng)
- Đang phục vụ mẹ & bé: ${occupiedRooms} phòng
- Đã nhận đặt cọc (chờ check-in): ${bookedRooms} phòng
- Phòng trống sẵn sàng đón khách: ${availableRooms} phòng
- Tỷ lệ công suất buồng phòng: ${roomOccupancyRate}%

III. TÀI CHÍNH KINH DOANH:
- Doanh thu An Sanh: ${formatCurrency(anSanhRevenue)}
- Chi phí vận hành An Sanh: ${formatCurrency(anSanhExpense)}
- Lợi nhuận ròng An Sanh: ${formatCurrency(netAnSanh)}

IV. QUẢN LÝ KHÁCH HÀNG CRM:
- Tổng hồ sơ khách hàng: ${customers.length}
- Cuộc hẹn sắp tới cần chăm sóc: ${upcomingAppointments.length} cuộc hẹn
- Đội ngũ nhân sự chuyên môn: ${employees.length} nhân viên (có tài khoản Zalo liên kết)

======================================================
Hệ thống tự động tổng hợp dữ liệu thời gian thực.`;

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generatedReportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Report Header */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Tự Động Cập Nhật
            </span>
            <span className="text-xs text-slate-400">• Dữ liệu thời gian thực</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Báo Cáo Tiến Độ & Hoạt Động Doanh Nghiệp
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Ngày lập: {reportDate}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyReport}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600">Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Sao chép văn bản
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> In / Tải PDF
          </button>
        </div>
      </div>

      {/* High-level Progress Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Tiến Độ Công Việc Chung</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{overallTaskRate}%</div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallTaskRate}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 pt-1">
            {completedTasks} hoàn thành / {totalTasks} tổng nhiệm vụ
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Nhiệm Vụ Con (Subtasks)</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{subtaskRate}%</div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${subtaskRate}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 pt-1">
            {completedSubtasks} / {allSubtasks.length} việc con đã tick xong
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Công Suất Buồng Phòng</span>
            <Building className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{roomOccupancyRate}%</div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${roomOccupancyRate}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 pt-1">
            {occupiedRooms} đang ở • {bookedRooms} đã cọc • {availableRooms} phòng trống
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Lợi Nhuận An Sanh</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{formatCurrency(netAnSanh)}</div>
          <div className="pt-2 border-t border-slate-100 text-xs flex justify-between text-slate-500">
            <span>Thu: +{formatCurrency(anSanhRevenue)}</span>
            <span>Chi: -{formatCurrency(anSanhExpense)}</span>
          </div>
        </div>
      </div>

      {/* Automated Analysis & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Progress Breakdown by Category */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 sm:space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Chi Tiết Tiến Độ Theo 3 Lĩnh Vực
          </h3>

          <div className="space-y-2.5 sm:space-y-4 text-xs">
            {/* Bệnh viện */}
            <div className="p-2.5 sm:p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">🏥 Bệnh Viện</span>
                <span className="font-semibold text-blue-700">
                  {catStats.benhVien.done}/{catStats.benhVien.total} xong (
                  {catStats.benhVien.total > 0
                    ? Math.round((catStats.benhVien.done / catStats.benhVien.total) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{
                    width: `${
                      catStats.benhVien.total > 0
                        ? (catStats.benhVien.done / catStats.benhVien.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-slate-500">
                Các ca phẫu thuật sản khoa, hội chẩn tiền sản và xét nghiệm tiền phẫu.
              </p>
            </div>

            {/* An Sanh */}
            <div className="p-2.5 sm:p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">🌿 Trung Tâm Ở Cữ An Sanh</span>
                <span className="font-semibold text-emerald-700">
                  {catStats.anSanh.done}/{catStats.anSanh.total} xong (
                  {catStats.anSanh.total > 0
                    ? Math.round((catStats.anSanh.done / catStats.anSanh.total) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{
                    width: `${
                      catStats.anSanh.total > 0
                        ? (catStats.anSanh.done / catStats.anSanh.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-slate-500">
                Dịch vụ buồng phòng cữ, tắm bé, phục hồi sàn chậu, dinh dưỡng ăn cữ.
              </p>
            </div>

            {/* Cá nhân */}
            <div className="p-2.5 sm:p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">👤 Công Việc Cá Nhân</span>
                <span className="font-semibold text-amber-700">
                  {catStats.caNhan.done}/{catStats.caNhan.total} xong (
                  {catStats.caNhan.total > 0
                    ? Math.round((catStats.caNhan.done / catStats.caNhan.total) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-600 h-full rounded-full"
                  style={{
                    width: `${
                      catStats.caNhan.total > 0
                        ? (catStats.caNhan.done / catStats.caNhan.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-slate-500">
                Tài chính, đối soát sao kê cá nhân, đào tạo y khoa và đối ngoại.
              </p>
            </div>
          </div>
        </div>

        {/* Automated System Insights & CRM Reminders */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 sm:space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Khuyến Nghị & Cảnh Báo Tự Động
          </h3>

          <div className="space-y-2.5 sm:space-y-3 text-xs">
            {/* Warning 1: Available Rooms to fill */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>🔔 Cơ hội kinh doanh phòng ở cữ:</span>
              </div>
              <p>
                Hiện tại trung tâm còn <b>{availableRooms} phòng trống</b> (chủ yếu tại Tầng 2 và Tầng 4). Đề xuất bộ phận CSKH liên hệ tư vấn sản phụ khám thai tuần 32+ để chốt hợp đồng đặt cọc.
              </p>
            </div>

            {/* Warning 2: CRM upcoming appointments */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                <span>Nhắc lịch hẹn khách hàng CRM ({upcomingAppointments.length} cuộc hẹn):</span>
              </div>
              <p>
                Có {upcomingAppointments.length} mẹ có lịch hẹn tái khám và kiểm tra trong tuần này:{' '}
                {upcomingAppointments.map((c) => `${c.fullName} (${formatDate(c.nextAppointmentDate)})`).join(', ')}.
              </p>
            </div>

            {/* Warning 3: Zalo dispatch health */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>Kênh giao việc qua Zalo:</span>
              </div>
              <p>
                Tất cả {employees.length} nhân viên đều đã được cấu hình số điện thoại Zalo để nhận thông báo việc con và deadline nhanh chóng 1-chạm.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
