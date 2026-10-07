import React, { useState, useMemo } from 'react';
import { Task, TaskCategory, TaskStatus, Employee } from '../../types';
import { formatDate } from '../../utils/storage';
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  AlertTriangle,
  Building,
  HeartHandshake,
  UserCheck,
  ListTodo,
  Users,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { TaskModal } from './TaskModal';
import { ZaloShareModal } from './ZaloShareModal';
import { EmployeeManager } from './EmployeeManager';

interface TaskManagerProps {
  tasks: Task[];
  employees: Employee[];
  onAddTask: (task: Partial<Task>) => Promise<{ success: boolean; error?: string | null } | void> | void;
  onUpdateTask: (id: string, task: Partial<Task>) => Promise<{ success: boolean; error?: string | null } | void> | void;
  onDeleteTask: (id: string) => Promise<{ success: boolean; error?: string | null } | void> | void;
  onAddEmployee: (emp: Partial<Employee>) => void;
  onUpdateEmployee: (id: string, emp: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onSyncLocalTasks?: () => Promise<void>;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  employees,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  isLoading = false,
  error = null,
  onRefresh,
  onSyncLocalTasks,
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'employees'>('tasks');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sharingTask, setSharingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Today formatted as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Category filter
      const matchCat = selectedCategory === 'all' || t.category === selectedCategory;

      // 2. Status filter (including due today & overdue logic)
      let matchStat = true;
      if (selectedStatus === 'all') {
        matchStat = true;
      } else if (selectedStatus === 'dueToday') {
        matchStat = t.status !== 'Hoàn thành' && t.status !== 'Quá hạn' && t.dueDate === todayStr;
      } else if (selectedStatus === 'Quá hạn') {
        matchStat = t.status === 'Quá hạn' || (t.status !== 'Hoàn thành' && !!t.dueDate && t.dueDate < todayStr);
      } else {
        matchStat = t.status === selectedStatus;
      }

      // 3. Priority filter
      const matchPriority = selectedPriority === 'all' || t.priority === selectedPriority;

      // 4. Employee filter
      let matchEmployee = true;
      if (selectedEmployeeId === 'all') {
        matchEmployee = true;
      } else if (selectedEmployeeId === 'unassigned') {
        matchEmployee = !t.assignedToEmployeeId;
      } else {
        matchEmployee = t.assignedToEmployeeId === selectedEmployeeId;
      }

      // 5. Search query (title, description, subtask content)
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.subTasks && t.subTasks.some((st) => st.title.toLowerCase().includes(q)));

      return matchCat && matchStat && matchPriority && matchEmployee && matchSearch;
    });
  }, [tasks, selectedCategory, selectedStatus, selectedPriority, selectedEmployeeId, searchQuery, todayStr]);

  // Quick stats by Category and Status & Deadlines
  const stats = useMemo(() => {
    const total = tasks.length;
    const benhVien = tasks.filter((t) => t.category === 'Bệnh viện').length;
    const anSanh = tasks.filter((t) => t.category === 'An Sanh').length;
    const caNhan = tasks.filter((t) => t.category === 'Cá nhân').length;

    const completed = tasks.filter((t) => t.status === 'Hoàn thành').length;
    const inProgress = tasks.filter((t) => t.status === 'Đang làm').length;
    const pending = tasks.filter((t) => t.status === 'Chưa làm').length;

    // Overdue: status === 'Quá hạn' OR (dueDate < todayStr AND status !== 'Hoàn thành')
    const overdue = tasks.filter(
      (t) => t.status !== 'Hoàn thành' && (t.status === 'Quá hạn' || (!!t.dueDate && t.dueDate < todayStr))
    ).length;

    // Due today: status !== 'Hoàn thành' AND status !== 'Quá hạn' AND dueDate === todayStr
    const dueToday = tasks.filter(
      (t) => t.status !== 'Hoàn thành' && t.status !== 'Quá hạn' && t.dueDate === todayStr
    ).length;

    return {
      total,
      benhVien,
      anSanh,
      caNhan,
      completed,
      inProgress,
      pending,
      overdue,
      dueToday,
    };
  }, [tasks, todayStr]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedPriority !== 'all' ||
    selectedEmployeeId !== 'all' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedPriority('all');
    setSelectedEmployeeId('all');
    setSearchQuery('');
  };

  const toggleExpand = (id: string) => {
    setExpandedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updatedSubtasks = task.subTasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    // If all subtasks completed, option to mark task complete
    const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.completed);
    await onUpdateTask(taskId, {
      subTasks: updatedSubtasks,
      status: allDone ? 'Hoàn thành' : task.status === 'Hoàn thành' ? 'Đang làm' : task.status,
    });
  };

  const getCategoryBadgeClass = (category: TaskCategory) => {
    switch (category) {
      case 'Bệnh viện':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'An Sanh':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cá nhân':
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'Khẩn cấp':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Cao':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Trung bình':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case 'Hoàn thành':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Đang làm':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Quá hạn':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getAssignedEmployee = (empId?: string) => {
    if (!empId) return null;
    return employees.find((e) => e.id === empId) || null;
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Tab Switcher: Tasks vs Employee Management */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              activeTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ListTodo className="w-4 h-4" /> Bảng Chi Tiết Công Việc ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              activeTab === 'employees'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" /> Quản Lý Nhân Viên & Zalo ({employees.length})
          </button>
        </div>

        {activeTab === 'tasks' && (
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
                title="Tải lại từ Supabase"
              >
                <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            {onSyncLocalTasks && (
              <button
                type="button"
                onClick={async () => {
                  setIsSyncing(true);
                  try {
                    await onSyncLocalTasks();
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing || isLoading}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title="Đồng bộ các công việc từ bộ nhớ máy lên Supabase"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Supabase'}</span>
              </button>
            )}

            <button
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Thêm Nhiệm Vụ Mới
            </button>
          </div>
        )}
      </div>

      {/* Supabase Error / Status Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900 mb-0.5">Thông báo kết nối Supabase:</p>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl font-bold shrink-0 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Thử lại
            </button>
          )}
        </div>
      )}

      {activeTab === 'employees' ? (
        <EmployeeManager
          employees={employees}
          tasks={tasks}
          onAddEmployee={onAddEmployee}
          onUpdateEmployee={onUpdateEmployee}
          onDeleteEmployee={onDeleteEmployee}
        />
      ) : (
        <>
          {/* Quick Metrics Bar by Category */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <div
              onClick={() => setSelectedCategory('all')}
              className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border-blue-600'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Tất cả nhiệm vụ</span>
              <div className="text-2xl font-bold mt-0.5 sm:mt-1">{stats.total}</div>
              <div className="text-xs mt-0.5 sm:mt-1 opacity-80">
                {stats.completed} đã hoàn thành ({Math.round((stats.completed / (stats.total || 1)) * 100)}%)
              </div>
            </div>

            <div
              onClick={() => setSelectedCategory('Bệnh viện')}
              className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedCategory === 'Bệnh viện'
                  ? 'bg-blue-700 text-white shadow-md border-blue-700'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Bệnh viện</span>
                <Building className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold mt-0.5 sm:mt-1">{stats.benhVien}</div>
              <div className="text-xs mt-0.5 sm:mt-1 opacity-70">Khám thai, mổ, hội chẩn</div>
            </div>

            <div
              onClick={() => setSelectedCategory('An Sanh')}
              className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedCategory === 'An Sanh'
                  ? 'bg-emerald-600 text-white shadow-md border-emerald-600'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">An Sanh</span>
                <HeartHandshake className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold mt-0.5 sm:mt-1">{stats.anSanh}</div>
              <div className="text-xs mt-0.5 sm:mt-1 opacity-70">Buồng phòng & chăm sóc cữ</div>
            </div>

            <div
              onClick={() => setSelectedCategory('Cá nhân')}
              className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedCategory === 'Cá nhân'
                  ? 'bg-amber-600 text-white shadow-md border-amber-600'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Cá nhân</span>
                <UserCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold mt-0.5 sm:mt-1">{stats.caNhan}</div>
              <div className="text-xs mt-0.5 sm:mt-1 opacity-70">Tài chính, học tập, đối ngoại</div>
            </div>
          </div>

          {/* Status & Deadline Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2.5">
            {/* Tất cả trạng thái */}
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-75">Tất cả</div>
              <div className="text-xl font-bold mt-0.5">{stats.total}</div>
              <div className="text-[11px] opacity-75">nhiệm vụ</div>
            </button>

            {/* Chưa làm */}
            <button
              type="button"
              onClick={() => setSelectedStatus('Chưa làm')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'Chưa làm'
                  ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-75">Chưa làm</div>
              <div className="text-xl font-bold mt-0.5">{stats.pending}</div>
              <div className="text-[11px] opacity-75">chờ xử lý</div>
            </button>

            {/* Đang làm */}
            <button
              type="button"
              onClick={() => setSelectedStatus('Đang làm')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'Đang làm'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-75">Đang làm</div>
              <div className={`text-xl font-bold mt-0.5 ${selectedStatus === 'Đang làm' ? 'text-white' : 'text-blue-600'}`}>
                {stats.inProgress}
              </div>
              <div className="text-[11px] opacity-75">đang thực hiện</div>
            </button>

            {/* Hoàn thành */}
            <button
              type="button"
              onClick={() => setSelectedStatus('Hoàn thành')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'Hoàn thành'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider opacity-75">Hoàn thành</div>
              <div className={`text-xl font-bold mt-0.5 ${selectedStatus === 'Hoàn thành' ? 'text-white' : 'text-emerald-600'}`}>
                {stats.completed}
              </div>
              <div className="text-[11px] opacity-75">đã xong</div>
            </button>

            {/* Đến hạn hôm nay */}
            <button
              type="button"
              onClick={() => setSelectedStatus('dueToday')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'dueToday'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider opacity-75">Hôm nay</span>
                <Clock className={`w-3.5 h-3.5 ${selectedStatus === 'dueToday' ? 'text-white' : 'text-amber-500'}`} />
              </div>
              <div className={`text-xl font-bold mt-0.5 ${selectedStatus === 'dueToday' ? 'text-white' : 'text-amber-600'}`}>
                {stats.dueToday}
              </div>
              <div className="text-[11px] opacity-75">hạn trong ngày</div>
            </button>

            {/* Quá hạn */}
            <button
              type="button"
              onClick={() => setSelectedStatus('Quá hạn')}
              className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedStatus === 'Quá hạn'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : stats.overdue > 0
                  ? 'bg-rose-50/70 text-rose-800 border-rose-300 hover:border-rose-400'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider opacity-75">Quá hạn</span>
                <AlertTriangle className={`w-3.5 h-3.5 ${selectedStatus === 'Quá hạn' ? 'text-white' : 'text-rose-600'}`} />
              </div>
              <div className={`text-xl font-bold mt-0.5 ${selectedStatus === 'Quá hạn' ? 'text-white' : 'text-rose-600'}`}>
                {stats.overdue}
              </div>
              <div className="text-[11px] opacity-75">cần xử lý gấp</div>
            </button>
          </div>

          {/* Overdue Warning Alert Banner */}
          {stats.overdue > 0 && selectedStatus !== 'Quá hạn' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Hệ thống ghi nhận <strong>{stats.overdue}</strong> công việc đã quá hạn hoàn thành cần kiểm tra và đôn đốc.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStatus('Quá hạn')}
                className="text-rose-700 font-bold hover:underline shrink-0 text-xs"
              >
                Xem danh sách quá hạn &rarr;
              </button>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm công việc theo tên, mô tả, nội dung nhiệm vụ con..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Filter: Nhân viên phụ trách */}
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Lọc theo nhân viên phụ trách"
                >
                  <option value="all">Tất cả nhân sự ({employees.length})</option>
                  <option value="unassigned">Chưa phân công</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter: Mức ưu tiên */}
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Lọc theo mức ưu tiên"
                >
                  <option value="all">Tất cả ưu tiên</option>
                  <option value="Khẩn cấp">Khẩn cấp</option>
                  <option value="Cao">Cao</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Thấp">Thấp</option>
                </select>
              </div>

              {/* Filter: Trạng thái & Hạn chót */}
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Lọc theo trạng thái"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Chưa làm">Chưa làm ({stats.pending})</option>
                  <option value="Đang làm">Đang làm ({stats.inProgress})</option>
                  <option value="Hoàn thành">Hoàn thành ({stats.completed})</option>
                  <option value="dueToday">Hạn chót hôm nay ({stats.dueToday})</option>
                  <option value="Quá hạn">Quá hạn ({stats.overdue})</option>
                </select>
              </div>

              {/* Reset filter button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
                  title="Đặt lại bộ lọc về mặc định"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đặt lại</span>
                </button>
              )}
            </div>
          </div>

          {/* Tasks Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Nhiệm Vụ & Phân Loại</th>
                    <th className="px-4 py-3.5">Ưu Tiên</th>
                    <th className="px-4 py-3.5">Tiến Độ Việc Con (Subtasks)</th>
                    <th className="px-4 py-3.5">Nhân Sự Phụ Trách</th>
                    <th className="px-4 py-3.5">Hạn Chót</th>
                    <th className="px-4 py-3.5">Trạng Thái</th>
                    <th className="px-4 py-3.5 text-right">Giao Zalo & Tùy Chọn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => {
                      const emp = getAssignedEmployee(task.assignedToEmployeeId);
                      const isExpanded = !!expandedTaskIds[task.id];
                      const totalSub = task.subTasks?.length || 0;
                      const doneSub = task.subTasks?.filter((s) => s.completed).length || 0;
                      const subtaskPct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;

                      // Check Overdue / Due Today recognition
                      const isOverdue =
                        task.status !== 'Hoàn thành' &&
                        (task.status === 'Quá hạn' || (!!task.dueDate && task.dueDate < todayStr));
                      const isDueToday =
                        task.status !== 'Hoàn thành' &&
                        task.status !== 'Quá hạn' &&
                        task.dueDate === todayStr;

                      return (
                        <React.Fragment key={task.id}>
                          <tr
                            className={`hover:bg-slate-50/70 transition-colors ${
                              isOverdue
                                ? 'bg-rose-50/20 border-l-4 border-l-rose-500'
                                : isDueToday
                                ? 'bg-amber-50/20 border-l-4 border-l-amber-500'
                                : ''
                            }`}
                          >
                            <td className="px-5 py-4 max-w-sm">
                              <div className="flex items-start gap-2.5">
                                {totalSub > 0 && (
                                  <button
                                    onClick={() => toggleExpand(task.id)}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 mt-0.5"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getCategoryBadgeClass(
                                        task.category
                                      )}`}
                                    >
                                      {task.category}
                                    </span>
                                    <span className="font-bold text-slate-900 text-sm">{task.title}</span>
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadgeClass(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              {totalSub > 0 ? (
                                <div className="w-36">
                                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                    <span>
                                      {doneSub}/{totalSub} việc
                                    </span>
                                    <span className="font-semibold text-blue-600">{subtaskPct}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${subtaskPct}%` }}
                                    />
                                  </div>
                                  <button
                                    onClick={() => toggleExpand(task.id)}
                                    className="text-[11px] text-blue-600 hover:underline mt-1 block"
                                  >
                                    {isExpanded ? 'Ẩn việc con' : 'Xem việc con'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsTaskModalOpen(true);
                                  }}
                                  className="text-xs text-slate-400 hover:text-blue-600 italic"
                                >
                                  + Thêm việc con
                                </button>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {emp ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                                    {emp.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-xs text-slate-800">{emp.fullName}</div>
                                    <div className="text-[11px] text-slate-400 font-mono">{emp.zaloPhone}</div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Chưa phân công</span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{formatDate(task.dueDate)}</span>
                                </div>

                                {/* Overdue / Due Today status pills */}
                                {task.status === 'Hoàn thành' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã hoàn thành
                                  </span>
                                ) : isOverdue ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200 w-fit">
                                    <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" /> Quá hạn
                                  </span>
                                ) : isDueToday ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 w-fit">
                                    <Clock className="w-3 h-3 text-amber-600 shrink-0" /> Đến hạn hôm nay
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  onUpdateTask(task.id, { status: e.target.value as TaskStatus })
                                }
                                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border cursor-pointer focus:outline-none ${getStatusBadgeClass(
                                  task.status
                                )}`}
                              >
                                <option value="Chưa làm">Chưa làm</option>
                                <option value="Đang làm">Đang làm</option>
                                <option value="Hoàn thành">Hoàn thành</option>
                                <option value="Quá hạn">Quá hạn</option>
                              </select>
                            </td>

                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Zalo Share Button */}
                                <button
                                  onClick={() => setSharingTask(task)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 transition-colors shadow-xs"
                                  title="Giao việc trực tiếp qua Zalo"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Gửi Zalo</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsTaskModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                  title="Sửa công việc"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteErrorMessage(null);
                                    setTaskToDelete(task);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Xóa công việc"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Subtasks Row */}
                          {isExpanded && totalSub > 0 && (
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                              <td colSpan={7} className="px-10 py-3">
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Nhiệm vụ con cần hoàn thành ({doneSub}/{totalSub}):
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {task.subTasks.map((st) => (
                                      <div
                                        key={st.id}
                                        onClick={() => handleToggleSubtask(task.id, st.id)}
                                        className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-blue-50/50 cursor-pointer transition-colors text-xs"
                                      >
                                        {st.completed ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        ) : (
                                          <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                                        )}
                                        <span
                                          className={`truncate ${
                                            st.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'
                                          }`}
                                        >
                                          {st.title}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="text-sm font-medium">Không tìm thấy công việc nào phù hợp với bộ lọc</p>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={handleResetFilters}
                              className="mt-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Xóa bộ lọc & Hiển thị tất cả
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Task Create/Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={async (data) => {
          if (editingTask) {
            return await onUpdateTask(editingTask.id, data);
          } else {
            return await onAddTask(data);
          }
        }}
        initialTask={editingTask}
        employees={employees}
      />

      {/* Zalo Share Modal */}
      <ZaloShareModal
        isOpen={!!sharingTask}
        onClose={() => setSharingTask(null)}
        task={sharingTask}
        employee={sharingTask ? getAssignedEmployee(sharingTask.assignedToEmployeeId) : null}
      />

      {/* Delete Confirmation Modal (Preview-compatible, no window.confirm) */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Xác nhận xóa công việc
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa nhiệm vụ <strong className="text-slate-800">"{taskToDelete.title}"</strong> khỏi cơ sở dữ liệu Supabase không? Thao tác này sẽ xóa toàn bộ các nhiệm vụ con liên quan.
            </p>

            {deleteErrorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{deleteErrorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isDeletingTask}
                onClick={() => {
                  setTaskToDelete(null);
                  setDeleteErrorMessage(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingTask}
                onClick={async () => {
                  setIsDeletingTask(true);
                  setDeleteErrorMessage(null);
                  try {
                    const res = await onDeleteTask(taskToDelete.id);
                    if (res && typeof res === 'object' && 'success' in res && !res.success) {
                      setDeleteErrorMessage(res.error || 'Xóa công việc thất bại trên Supabase');
                      setIsDeletingTask(false);
                      return;
                    }
                    setTaskToDelete(null);
                  } catch (err: any) {
                    setDeleteErrorMessage(err?.message || 'Lỗi khi xóa công việc trên Supabase');
                  } finally {
                    setIsDeletingTask(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingTask ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  'Xác nhận xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
