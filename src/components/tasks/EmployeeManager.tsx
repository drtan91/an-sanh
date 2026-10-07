import React, { useState, useEffect, useCallback } from 'react';
import { Employee, Task } from '../../types';
import {
  fetchEmployeesFromSupabase,
  addEmployeeToSupabase,
  updateEmployeeInSupabase,
  deactivateEmployeeInSupabase,
  seedEmployeesFromInitialData
} from '../../services/employeeService';
import {
  UserPlus,
  Briefcase,
  Building2,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ExternalLink,
  Search,
  X,
  AlertCircle,
  Database
} from 'lucide-react';

interface EmployeeManagerProps {
  employees?: Employee[];
  tasks?: Task[];
  onAddEmployee?: (emp: Partial<Employee>) => void;
  onUpdateEmployee?: (id: string, emp: Partial<Employee>) => void;
  onDeleteEmployee?: (id: string) => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees: propEmployees = [],
  tasks = [],
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [zaloPhone, setZaloPhone] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState<string>('An Sanh');
  const [email, setEmail] = useState('');
  const [active, setActive] = useState(true);

  // Load employees from Supabase table 'employees' (Requirement 6)
  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setSupabaseError(null);
    const { data, error } = await fetchEmployeesFromSupabase();

    if (error) {
      setSupabaseError(error);
      // Fallback to propEmployees if Supabase fetch failed (Requirement 11)
      if (propEmployees.length > 0) {
        setEmployees(propEmployees);
      }
    } else {
      setEmployees(data);
      // If table is empty, do not destroy propEmployees (Requirement 11)
      if (data.length === 0 && propEmployees.length > 0) {
        // Keep prop employees for display while informing user to seed
      }
    }
    setIsLoading(false);
  }, [propEmployees]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const openCreateModal = () => {
    setEditingEmp(null);
    setFullName('');
    setPhone('');
    setZaloPhone('');
    setPosition('');
    setDepartment('An Sanh');
    setEmail('');
    setActive(true);
    setSupabaseError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setFullName(emp.fullName);
    setPhone(emp.phone);
    setZaloPhone(emp.zaloPhone);
    setPosition(emp.position);
    setDepartment(emp.department);
    setEmail(emp.email || '');
    setActive(emp.active);
    setSupabaseError(null);
    setIsModalOpen(true);
  };

  // Add (Requirement 7) & Update (Requirement 8)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !zaloPhone.trim() || !position.trim()) {
      alert('Vui lòng điền Họ tên, Số Zalo và Vị trí công việc');
      return;
    }

    setIsSubmitting(true);
    setSupabaseError(null);

    const payload: Partial<Employee> = {
      fullName: fullName.trim(),
      phone: phone.trim() || zaloPhone.trim(),
      zaloPhone: zaloPhone.trim(),
      position: position.trim(),
      department,
      email: email.trim() || undefined,
      active,
    };

    if (editingEmp) {
      // Update employee on Supabase
      const { data, error } = await updateEmployeeInSupabase(editingEmp.id, payload);
      if (error) {
        setSupabaseError(error);
        setIsSubmitting(false);
        return;
      }
      if (data) {
        setSuccessMessage(`Đã cập nhật nhân viên "${data.fullName}" thành công!`);
        setTimeout(() => setSuccessMessage(null), 2500);
        onUpdateEmployee?.(editingEmp.id, data);
      }
    } else {
      // Add employee to Supabase
      const { data, error } = await addEmployeeToSupabase(payload);
      if (error) {
        setSupabaseError(error);
        setIsSubmitting(false);
        return;
      }
      if (data) {
        setSuccessMessage(`Đã thêm nhân viên "${data.fullName}" vào Supabase thành công!`);
        setTimeout(() => setSuccessMessage(null), 2500);
        onAddEmployee?.(data);
      }
    }

    await loadEmployees();
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  // Deactivate employee by is_active = false instead of hard delete (Requirement 9)
  const handleDeactivate = async (emp: Employee) => {
    const confirmText = emp.active
      ? `Bạn có chắc muốn ngừng hoạt động nhân viên "${emp.fullName}"? (Cập nhật is_active = false trong cơ sở dữ liệu)`
      : `Nhân viên "${emp.fullName}" đã ở trạng thái ngừng hoạt động.`;

    if (window.confirm(confirmText)) {
      setSupabaseError(null);
      const { success, error } = await deactivateEmployeeInSupabase(emp.id);
      if (!success && error) {
        setSupabaseError(error);
        return;
      }
      setSuccessMessage(`Đã chuyển nhân viên "${emp.fullName}" sang trạng thái Nghỉ việc (is_active = false).`);
      setTimeout(() => setSuccessMessage(null), 2500);
      await loadEmployees();
      onDeleteEmployee?.(emp.id);
    }
  };

  // Dedicated Seed/Migrate function (Requirement 12, 13, 14, 15)
  const handleSeed = async () => {
    if (
      !window.confirm(
        'Bạn có muốn đồng bộ danh sách 5 nhân sự từ dữ liệu mẫu (initialData.ts) vào bảng employees trên Supabase?\n\nHệ thống sẽ tự động đối chiếu số điện thoại để đảm bảo không tạo bản ghi trùng.'
      )
    ) {
      return;
    }

    setIsLoading(true);
    setSupabaseError(null);
    const result = await seedEmployeesFromInitialData();

    if (result.error) {
      setSupabaseError(result.error);
    } else {
      setSuccessMessage(
        `Đồng bộ Supabase hoàn tất! Thêm mới: ${result.inserted} nhân viên | Đã có sẵn (bỏ qua): ${result.skipped} nhân viên.`
      );
      setTimeout(() => setSuccessMessage(null), 3500);
      await loadEmployees();
    }
    setIsLoading(false);
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    return (
      emp.fullName.toLowerCase().includes(q) ||
      emp.position.toLowerCase().includes(q) ||
      emp.zaloPhone.includes(q) ||
      emp.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Supabase Error Alert Banner */}
      {supabaseError && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start justify-between gap-3 text-rose-800 text-xs shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Lỗi máy chủ Supabase:</div>
              <div className="mt-0.5 text-rose-700">{supabaseError}</div>
            </div>
          </div>
          <button
            onClick={() => setSupabaseError(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
            title="Đóng"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between gap-2.5 text-emerald-800 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên nhân viên, vị trí chuyên môn, số điện thoại Zalo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          {/* Seed/Migrate Button (Requirement 12) */}
          <button
            onClick={handleSeed}
            type="button"
            title="Đồng bộ 5 nhân sự từ initialData vào Supabase (không trùng lặp)"
            className="w-full md:w-auto px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Database className="w-4 h-4 text-slate-500" />
            Nạp Dữ Liệu Mẫu (Seed)
          </button>

          <button
            onClick={openCreateModal}
            className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Thêm Nhân Viên Mới
          </button>
        </div>
      </div>

      {/* Employees Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <div>Đang tải danh sách nhân viên từ cơ sở dữ liệu Supabase...</div>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-base">Chưa có nhân viên nào trên Supabase</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Bảng <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">employees</code> trên cơ sở dữ liệu hiện đang trống. Bạn có thể nhấn nút "Nạp Dữ Liệu Mẫu (Seed)" để chuyển 5 nhân sự ban đầu vào Supabase hoặc nhấn "Thêm Nhân Viên Mới".
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={handleSeed}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" /> Nạp Dữ Liệu Mẫu Lên Supabase
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Thêm Thủ Công
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const empTasks = tasks.filter((t) => t.assignedToEmployeeId === emp.id);
            const pendingTasks = empTasks.filter((t) => t.status !== 'Hoàn thành').length;

            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                        {emp.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{emp.fullName}</h4>
                        <p className="text-xs text-slate-500 font-medium">{emp.position}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        emp.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {emp.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {emp.active ? 'Đang làm' : 'Nghỉ việc'}
                    </span>
                  </div>

                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                        Số Zalo giao việc:
                      </span>
                      <a
                        href={`https://zalo.me/${emp.zaloPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1"
                      >
                        {emp.zaloPhone}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Bộ phận:
                      </span>
                      <span className="font-medium text-slate-800">{emp.department}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        Việc đang phụ trách:
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full ${
                          pendingTasks > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pendingTasks} việc đang làm ({empTasks.length} tổng)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-2 flex items-center justify-between">
                  <a
                    href={`https://zalo.me/${emp.zaloPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat Zalo
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(emp)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                      title="Chỉnh sửa nhân sự"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {/* Deactivate button: sets is_active = false (Requirement 9) */}
                    <button
                      onClick={() => handleDeactivate(emp)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                      title="Ngừng hoạt động nhân viên (is_active = false)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Employee Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingEmp ? 'Sửa Thông Tin Nhân Viên' : 'Thêm Nhân Viên Mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3.5 text-slate-800 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Thị Mai"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Số Điện Thoại Zalo (Giao việc) *</label>
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  value={zaloPhone}
                  onChange={(e) => {
                    setZaloPhone(e.target.value);
                    if (!phone) setPhone(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Vị Trí Công Việc *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Bác sĩ Sản, Điều dưỡng trưởng, Chuyên viên tắm bé..."
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Bộ Phận / Lĩnh Vực</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="An Sanh">Trung tâm An Sanh</option>
                    <option value="Bệnh viện">Bệnh viện</option>
                    <option value="Chung">Dùng chung</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Trạng Thái</label>
                  <select
                    value={active ? 'active' : 'inactive'}
                    onChange={(e) => setActive(e.target.value === 'active')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="active">Đang làm việc</option>
                    <option value="inactive">Đã nghỉ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Email Liên Hệ</label>
                <input
                  type="email"
                  placeholder="mai.nguyen@ansanh.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  {editingEmp ? 'Lưu Thay Đổi' : 'Thêm Nhân Viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
