import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Employee, AttendanceRecord, AttendanceStatus, ShiftType } from '../../types';
import { formatDate } from '../../utils/storage';
import { supabase } from '../../lib/supabase';
import { fetchEmployeesFromSupabase } from '../../services/employeeService';
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Save,
  UserCheck
} from 'lucide-react';

interface AttendanceManagerProps {
  employees?: Employee[];
  attendance?: AttendanceRecord[];
  onSaveAttendance?: (records: AttendanceRecord[]) => void;
}

interface SupabaseAttendanceRow {
  id: string;
  employee_id: string;
  attendance_date: string;
  status: string;
  shift: string;
  check_in?: string | null;
  check_out?: string | null;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  onSaveAttendance,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allAttendance, setAllAttendance] = useState<SupabaseAttendanceRow[]>([]);
  const [todayRecords, setTodayRecords] = useState<Record<string, { status: AttendanceStatus; shift: ShiftType; checkIn: string; notes: string }>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Fetch employees and attendance data directly from Supabase
  const loadDataFromSupabase = useCallback(async () => {
    if (!supabase) {
      setSupabaseError('Chưa khởi tạo được Supabase client. Vui lòng kiểm tra biến môi trường.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSupabaseError(null);

    try {
      // 1. Fetch employees from Supabase table 'employees'
      const { data: mappedEmps, error: empErr } = await fetchEmployeesFromSupabase();

      if (empErr) {
        setSupabaseError(empErr);
        setIsLoading(false);
        return;
      }

      setEmployees(mappedEmps);

      // 2. Fetch attendance from Supabase table 'attendance'
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .order('attendance_date', { ascending: false });

      if (attErr) {
        setSupabaseError(`Lỗi đọc bảng attendance từ Supabase: ${attErr.message} (Mã: ${attErr.code})`);
        setIsLoading(false);
        return;
      }

      setAllAttendance((attData as SupabaseAttendanceRow[]) || []);
    } catch (err: any) {
      setSupabaseError(`Lỗi ngoại lệ khi kết nối Supabase: ${err?.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDataFromSupabase();
  }, [loadDataFromSupabase]);

  // Sync records for selectedDate from Supabase attendance state
  useEffect(() => {
    const dayRecords = allAttendance.filter((a) => a.attendance_date === selectedDate);
    const map: Record<string, { status: AttendanceStatus; shift: ShiftType; checkIn: string; notes: string }> = {};

    employees.forEach((emp) => {
      const record = dayRecords.find((r) => r.employee_id === emp.id);
      if (record) {
        map[emp.id] = {
          status: (record.status as AttendanceStatus) || 'Có mặt',
          shift: (record.shift as ShiftType) || 'Hành chính (8h-17h)',
          checkIn: record.check_in ? record.check_in.slice(0, 5) : '08:00',
          notes: record.note || '',
        };
      } else {
        map[emp.id] = {
          status: 'Có mặt',
          shift: 'Hành chính (8h-17h)',
          checkIn: '08:00',
          notes: '',
        };
      }
    });

    setTodayRecords(map);
  }, [selectedDate, allAttendance, employees]);

  const handleStatusChange = (empId: string, status: AttendanceStatus) => {
    setTodayRecords((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status,
      },
    }));
  };

  const handleShiftChange = (empId: string, shift: ShiftType) => {
    setTodayRecords((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        shift,
      },
    }));
  };

  const handleCheckInChange = (empId: string, checkIn: string) => {
    setTodayRecords((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        checkIn,
      },
    }));
  };

  const handleNotesChange = (empId: string, notes: string) => {
    setTodayRecords((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        notes,
      },
    }));
  };

  // Save to Supabase attendance table with UPSERT
  const handleSaveAll = async () => {
    if (!supabase) {
      setSupabaseError('Chưa cấu hình Supabase Client.');
      return;
    }

    if (employees.length === 0) {
      setSupabaseError('Bảng employees hiện chưa có nhân viên nào để lưu bảng công.');
      return;
    }

    setIsSaving(true);
    setSupabaseError(null);

    try {
      const recordsToUpsert = employees.map((emp) => {
        const current = todayRecords[emp.id] || {
          status: 'Có mặt' as AttendanceStatus,
          shift: 'Hành chính (8h-17h)' as ShiftType,
          checkIn: '08:00',
          notes: '',
        };

        return {
          employee_id: emp.id,
          attendance_date: selectedDate,
          status: current.status,
          shift: current.shift,
          check_in: current.checkIn ? `${current.checkIn}:00`.slice(0, 8) : '08:00:00',
          note: current.notes || null,
          updated_at: new Date().toISOString(),
        };
      });

      // Upsert into Supabase attendance table with onConflict
      const { error: upsertErr } = await supabase
        .from('attendance')
        .upsert(recordsToUpsert, { onConflict: 'employee_id,attendance_date' });

      if (upsertErr) {
        setSupabaseError(`Lỗi lưu bảng công vào Supabase: ${upsertErr.message} (Mã: ${upsertErr.code})`);
        return;
      }

      // Re-fetch all attendance from Supabase to ensure single source of truth
      const { data: refreshed, error: refreshErr } = await supabase
        .from('attendance')
        .select('*')
        .order('attendance_date', { ascending: false });

      if (refreshErr) {
        setSupabaseError(`Bảng công đã lưu nhưng có lỗi làm mới dữ liệu: ${refreshErr.message}`);
      } else if (refreshed) {
        setAllAttendance(refreshed as SupabaseAttendanceRow[]);
        if (onSaveAttendance) {
          onSaveAttendance(
            refreshed.map((r: any) => ({
              id: r.id,
              employeeId: r.employee_id,
              date: r.attendance_date,
              status: r.status as AttendanceStatus,
              shift: r.shift as ShiftType,
              checkInTime: r.check_in,
              checkOutTime: r.check_out,
              notes: r.note,
            }))
          );
        }
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setSupabaseError(`Lỗi ngoại lệ khi lưu bảng công: ${err?.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Staff summary stats computed from real Supabase attendance data
  const staffStats = useMemo(() => {
    return employees.map((emp) => {
      const empRecords = allAttendance.filter((a) => a.employee_id === emp.id);
      const totalDays = empRecords.length;
      const presentCount = empRecords.filter((a) => a.status === 'Có mặt').length;
      const lateCount = empRecords.filter((a) => a.status === 'Đi muộn').length;
      const leaveCount = empRecords.filter((a) => a.status && a.status.includes('Nghỉ')).length;
      const rate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;

      return {
        emp,
        totalDays,
        presentCount,
        lateCount,
        leaveCount,
        rate,
      };
    });
  }, [employees, allAttendance]);

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Supabase Error Alert Banner */}
      {supabaseError && (
        <div className="bg-rose-50 border border-rose-200 p-3 sm:p-4 rounded-2xl flex items-start justify-between gap-3 text-rose-800 text-xs shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Lỗi từ máy chủ Supabase:</div>
              <div className="mt-0.5 text-rose-700">{supabaseError}</div>
            </div>
          </div>
          <button
            onClick={() => setSupabaseError(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
            title="Đóng thông báo"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Date Header & Quick Save Bar */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Bảng Chấm Công Nhân Viên An Sanh</h3>
            <p className="text-xs text-slate-500">Ghi nhận chuyên cần, ca trực và giờ điểm danh</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-slate-500 font-medium">Ngày chấm:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-75"
          >
            <Save className="w-4 h-4" />
            {savedSuccess ? 'Đã Lưu Thành Công!' : 'Lưu Bảng Công Ngày'}
          </button>
        </div>
      </div>

      {/* Today Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-600">
            Điểm Danh Ngày: {formatDate(selectedDate)}
          </span>
          <span className="text-xs text-slate-500">
            {isLoading
              ? 'Đang đồng bộ từ Supabase...'
              : `Tổng ${employees.length} nhân sự đăng ký`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Nhân Viên</th>
                <th className="px-4 py-3">Vị Trí & Số Zalo</th>
                <th className="px-4 py-3">Ca Làm Việc</th>
                <th className="px-4 py-3">Giờ Đến</th>
                <th className="px-4 py-3">Trạng Thái Điểm Danh</th>
                <th className="px-4 py-3">Ghi Chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      Đang tải danh sách nhân viên từ Supabase...
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500">
                    Chưa có nhân viên nào trong bảng <span className="font-mono font-semibold text-slate-700">employees</span> trên Supabase.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const rec = todayRecords[emp.id] || {
                    status: 'Có mặt',
                    shift: 'Hành chính (8h-17h)',
                    checkIn: '08:00',
                    notes: '',
                  };

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{emp.fullName}</div>
                            <div className="text-[11px] text-slate-400">{emp.department}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div>{emp.position}</div>
                        <div className="font-mono text-[11px] text-slate-400">{emp.zaloPhone}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <select
                          value={rec.shift}
                          onChange={(e) => handleShiftChange(emp.id, e.target.value as ShiftType)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                        >
                          <option value="Ca sáng (7h-15h)">Ca sáng (7h-15h)</option>
                          <option value="Ca chiều (14h-22h)">Ca chiều (14h-22h)</option>
                          <option value="Ca đêm (21h-7h)">Ca đêm (21h-7h)</option>
                          <option value="Hành chính (8h-17h)">Hành chính (8h-17h)</option>
                          <option value="Ca 24h">Ca 24h</option>
                        </select>
                      </td>

                      <td className="px-4 py-3.5">
                        <input
                          type="time"
                          value={rec.checkIn}
                          onChange={(e) => handleCheckInChange(emp.id, e.target.value)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                        >
                        </input>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(['Có mặt', 'Đi muộn', 'Nghỉ có phép', 'Nghỉ không phép'] as AttendanceStatus[]).map((st) => {
                            const isSelected = rec.status === st;
                            let activeClass = 'bg-indigo-600 text-white border-indigo-600';
                            if (st === 'Có mặt') activeClass = 'bg-emerald-600 text-white border-emerald-600';
                            if (st === 'Đi muộn') activeClass = 'bg-amber-500 text-white border-amber-500';
                            if (st === 'Nghỉ không phép') activeClass = 'bg-rose-600 text-white border-rose-600';

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(emp.id, st)}
                                className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                                  isSelected
                                    ? activeClass
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <input
                          type="text"
                          placeholder="Ghi chú (đổi ca, xin về sớm...)"
                          value={rec.notes}
                          onChange={(e) => handleNotesChange(emp.id, e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Attendance Summary Cards */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 sm:space-y-4">
        <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-600" />
          Tổng Hợp Chuyên Cần Nhân Viên
        </h4>

        {isLoading ? (
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-center text-xs text-slate-400">
            Đang tổng hợp dữ liệu chuyên cần từ Supabase...
          </div>
        ) : staffStats.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
            Chưa có nhân viên trong cơ sở dữ liệu
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {staffStats.map((item) => (
              <div key={item.emp.id} className="p-2.5 sm:p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{item.emp.fullName}</span>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    {item.rate}% chuyên cần
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{item.emp.position}</p>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Điểm danh: <b>{item.presentCount}</b> ngày</span>
                  <span>Đi muộn: <b>{item.lateCount}</b></span>
                  <span>Nghỉ: <b>{item.leaveCount}</b></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
