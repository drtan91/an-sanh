import React, { useState, useEffect, useCallback } from 'react';
import { Customer, Employee, Room, Task, Transaction, AttendanceRecord } from './types';
import { loadStoredData, saveStoredData } from './utils/storage';
import { INITIAL_TASKS } from './data/initialData';
import { User } from '@supabase/supabase-js';
import { subscribeToAuthChanges, signOutStaff, getStaffSession } from './services/authService';
import { LoginScreen } from './components/auth/LoginScreen';
import {
  fetchCustomersFromSupabase,
  addCustomerToSupabase,
  updateCustomerInSupabase,
  deleteCustomerFromSupabase,
} from './services/customerService';
import {
  fetchTasksFromSupabase,
  addTaskToSupabase,
  updateTaskInSupabase,
  deleteTaskFromSupabase,
  seedTasksToSupabase,
} from './services/taskService';
import { CustomerList } from './components/crm/CustomerList';
import { TaskManager } from './components/tasks/TaskManager';
import { RoomManager } from './components/ansanh/RoomManager';
import { FinanceManager } from './components/ansanh/FinanceManager';
import { AttendanceManager } from './components/ansanh/AttendanceManager';
import { RevenueCharts } from './components/dashboard/RevenueCharts';
import { ProgressReport } from './components/dashboard/ProgressReport';
import {
  BarChart3,
  Users2,
  CheckSquare,
  Building2,
  RefreshCw,
  BedDouble,
  DollarSign,
  CalendarCheck,
  TrendingUp,
  FileCheck2,
  HeartHandshake,
  LogIn,
  LogOut,
  Lock,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  // Supabase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Main Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState<boolean>(true);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState<boolean>(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // Navigation States
  // 1: crm, 2: tasks, 3: ansanh, overview: dashboard
  const [mainTab, setMainTab] = useState<'overview' | 'crm' | 'tasks' | 'ansanh'>('overview');
  
  // Subtab for Overview
  const [overviewSubTab, setOverviewSubTab] = useState<'charts' | 'report'>('charts');

  // Subtab for An Sanh (a: rooms, b: finance, c: attendance)
  const [ansanhSubTab, setAnsanhSubTab] = useState<'rooms' | 'finance' | 'attendance'>('rooms');

  // Load CRM customers from Supabase (Source of Truth - requires authenticated staff session)
  const loadCustomers = useCallback(async () => {
    if (!currentUser) {
      setCustomers([]);
      setIsCustomersLoading(false);
      setCustomersError(null);
      return;
    }

    setIsCustomersLoading(true);
    setCustomersError(null);
    try {
      const { data, error } = await fetchCustomersFromSupabase({ autoSeedIfEmpty: true });
      if (error) {
        setCustomersError(error);
      } else {
        setCustomers(data);
      }
    } catch (err: any) {
      setCustomersError(err?.message || 'Lỗi không xác định khi tải khách hàng');
    } finally {
      setIsCustomersLoading(false);
    }
  }, [currentUser]);

  // Listen for Supabase Auth state changes
  useEffect(() => {
    getStaffSession().then((session) => {
      setCurrentUser(session?.user || null);
      setIsAuthChecking(false);
    });

    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);
      if (!user) {
        // Immediate state clearing when session ends
        setCustomers([]);
        setTasks([]);
        setEmployees([]);
        setRooms([]);
        setTransactions([]);
        setAttendance([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load Tasks from Supabase (Source of Truth - requires authenticated staff session)
  const loadTasks = useCallback(async () => {
    if (!currentUser) {
      setTasks([]);
      setIsTasksLoading(false);
      setTasksError(null);
      return;
    }

    setIsTasksLoading(true);
    setTasksError(null);
    try {
      const localData = loadStoredData();
      const fallbackTasks = localData.tasks && localData.tasks.length > 0 ? localData.tasks : INITIAL_TASKS;

      const { data, error } = await fetchTasksFromSupabase({
        autoSeedIfEmpty: true,
        localTasksFallback: fallbackTasks,
      });

      if (error) {
        setTasksError(error);
      } else {
        setTasks(data);
        saveStoredData.tasks(data);
      }
    } catch (err: any) {
      setTasksError(err?.message || 'Lỗi không xác định khi tải công việc từ Supabase');
    } finally {
      setIsTasksLoading(false);
    }
  }, [currentUser]);

  // When auth changes, fetch tasks & customers & operational data if logged in, or clear if logged out
  useEffect(() => {
    if (currentUser) {
      // 1. Load internal operational data from local storage
      const data = loadStoredData();
      setEmployees(data.employees);
      setRooms(data.rooms);
      setTransactions(data.transactions);
      setAttendance(data.attendance);

      // 2. Load Supabase data
      loadCustomers();
      loadTasks();
    } else {
      // Clear all internal data from state when logged out
      setCustomers([]);
      setTasks([]);
      setEmployees([]);
      setRooms([]);
      setTransactions([]);
      setAttendance([]);
      setIsCustomersLoading(false);
      setIsTasksLoading(false);
    }
  }, [currentUser, loadCustomers, loadTasks]);

  // Logout handler: sign out and wipe state
  const handleLogout = async () => {
    await signOutStaff();
    setCurrentUser(null);
    setCustomers([]);
    setTasks([]);
    setEmployees([]);
    setRooms([]);
    setTransactions([]);
    setAttendance([]);
    setMainTab('overview');
    setCustomersError(null);
    setTasksError(null);
  };

  const updateEmployees = (updater: (prev: Employee[]) => Employee[]) => {
    setEmployees((prev) => {
      const updated = updater(prev);
      saveStoredData.employees(updated);
      return updated;
    });
  };

  const updateRooms = (updater: (prev: Room[]) => Room[]) => {
    setRooms((prev) => {
      const updated = updater(prev);
      saveStoredData.rooms(updated);
      return updated;
    });
  };

  const updateTransactions = (updater: (prev: Transaction[]) => Transaction[]) => {
    setTransactions((prev) => {
      const updated = updater(prev);
      saveStoredData.transactions(updated);
      return updated;
    });
  };

  const updateAttendance = (newRecords: AttendanceRecord[]) => {
    setAttendance(newRecords);
    saveStoredData.attendance(newRecords);
  };

  // Reset demo data handler
  const handleResetData = async () => {
    if (window.confirm('Bạn có muốn khôi phục dữ liệu mẫu chuẩn ban đầu của hệ thống An Sanh không?')) {
      saveStoredData.resetAll();
      const fresh = loadStoredData();
      setTasks(fresh.tasks);
      setEmployees(fresh.employees);
      setRooms(fresh.rooms);
      setTransactions(fresh.transactions);
      setAttendance(fresh.attendance);
      await loadCustomers();
      await loadTasks();
    }
  };

  // Handlers for CRM (Supabase integration)
  const handleAddCustomer = async (cData: Partial<Customer>) => {
    setCustomersError(null);
    const { data, error } = await addCustomerToSupabase(cData);
    if (error) {
      setCustomersError(error);
      return;
    }
    if (data) {
      setCustomers((prev) => [data, ...prev.filter((c) => c.id !== data.id)]);
    }
  };

  const handleUpdateCustomer = async (id: string, cData: Partial<Customer>) => {
    setCustomersError(null);
    const { data, error } = await updateCustomerInSupabase(id, cData);
    if (error) {
      setCustomersError(error);
      return;
    }
    if (data) {
      setCustomers((prev) => prev.map((c) => (c.id === id ? data : c)));
    }
  };

  const handleDeleteCustomer = async (
    id: string
  ): Promise<{ success: boolean; error: string | null }> => {
    setCustomersError(null);
    const { success, error } = await deleteCustomerFromSupabase(id);
    if (error || !success) {
      const errMsg = error || 'Không thể xóa khách hàng trên Supabase';
      setCustomersError(errMsg);
      return { success: false, error: errMsg };
    }
    // Only update customer list in UI after Supabase confirms deletion
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    return { success: true, error: null };
  };

  // Handlers for Tasks (Supabase integration)
  const handleAddTask = async (
    tData: Partial<Task>
  ): Promise<{ success: boolean; error: string | null }> => {
    setTasksError(null);
    const { data, error } = await addTaskToSupabase(tData);
    if (error || !data) {
      const errMsg = error || 'Không thể tạo công việc trên Supabase';
      setTasksError(errMsg);
      return { success: false, error: errMsg };
    }
    // Only update state after Supabase confirms creation
    setTasks((prev) => {
      const updated = [data, ...prev.filter((t) => t.id !== data.id)];
      saveStoredData.tasks(updated);
      return updated;
    });
    return { success: true, error: null };
  };

  const handleUpdateTask = async (
    id: string,
    tData: Partial<Task>
  ): Promise<{ success: boolean; error: string | null }> => {
    setTasksError(null);
    const { data, error } = await updateTaskInSupabase(id, tData);
    if (error || !data) {
      const errMsg = error || 'Không thể cập nhật công việc trên Supabase';
      setTasksError(errMsg);
      return { success: false, error: errMsg };
    }
    // Only update state after Supabase confirms update
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? data : t));
      saveStoredData.tasks(updated);
      return updated;
    });
    return { success: true, error: null };
  };

  const handleDeleteTask = async (
    id: string
  ): Promise<{ success: boolean; error: string | null }> => {
    setTasksError(null);
    const { success, error } = await deleteTaskFromSupabase(id);
    if (error || !success) {
      const errMsg = error || 'Không thể xóa công việc trên Supabase';
      setTasksError(errMsg);
      return { success: false, error: errMsg };
    }
    // Only update state after Supabase confirms deletion
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveStoredData.tasks(updated);
      return updated;
    });
    return { success: true, error: null };
  };

  const handleSyncLocalTasks = async () => {
    setIsTasksLoading(true);
    setTasksError(null);
    try {
      const localData = loadStoredData();
      const tasksToSync = localData.tasks && localData.tasks.length > 0 ? localData.tasks : tasks;
      const res = await seedTasksToSupabase(tasksToSync);
      if (res.error) {
        setTasksError(res.error);
      } else {
        await loadTasks();
      }
    } catch (err: any) {
      setTasksError(err?.message || 'Lỗi khi đồng bộ công việc lên Supabase');
    } finally {
      setIsTasksLoading(false);
    }
  };

  // Handlers for Employees
  const handleAddEmployee = (empData: Partial<Employee>) => {
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      fullName: empData.fullName || 'Nhân viên mới',
      phone: empData.phone || empData.zaloPhone || '',
      zaloPhone: empData.zaloPhone || '',
      position: empData.position || 'Nhân viên',
      department: empData.department || 'An Sanh',
      email: empData.email,
      active: empData.active !== undefined ? empData.active : true,
    };
    updateEmployees((prev) => [...prev, newEmp]);
  };

  const handleUpdateEmployee = (id: string, empData: Partial<Employee>) => {
    updateEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...empData } : e))
    );
  };

  const handleDeleteEmployee = (id: string) => {
    updateEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  // Handlers for Rooms
  const handleUpdateRoom = (roomId: string, data: Partial<Room>) => {
    updateRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...data } : r))
    );
  };

  // Handlers for Finance
  const handleAddTransaction = (txData: Partial<Transaction>) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      scope: txData.scope || 'An Sanh',
      type: txData.type || 'Thu',
      amount: txData.amount || 0,
      date: txData.date || new Date().toISOString().split('T')[0],
      content: txData.content || '',
      paymentSource: txData.paymentSource || 'Chuyển khoản VCB',
      category: txData.category || 'Chung',
      note: txData.note,
    };
    updateTransactions((prev) => [newTx, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    updateTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Loading state while checking Supabase session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20 animate-pulse">
          <HeartHandshake className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-200">Đang kiểm tra phiên xác thực hệ thống...</p>
      </div>
    );
  }

  // 2. Unauthenticated: Render dedicated LoginScreen (zero internal data loaded or displayed)
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          // Handled via onAuthStateChange listener
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-tight">
                  AN SANH - Dr.Tan
                </h1>
              </div>
            </div>

            {/* Quick Actions, Auth Status & Reset Demo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200/80 px-2.5 py-1 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[130px] md:max-w-[180px]">
                    {currentUser.email}
                  </span>
                  <span className="text-[10px] text-blue-700 font-semibold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3 text-blue-600 inline" /> Đã xác thực
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleResetData}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                title="Khôi phục dữ liệu demo ban đầu"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Dữ liệu mẫu
              </button>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <div className="flex space-x-1 sm:space-x-3 overflow-x-auto scrollbar-none border-t border-slate-100 pt-1">
            <button
              onClick={() => setMainTab('overview')}
              className={`py-3 px-3.5 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                mainTab === 'overview'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Tổng Quan
            </button>

            <button
              onClick={() => setMainTab('crm')}
              className={`py-3 px-3.5 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                mainTab === 'crm'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users2 className="w-4 h-4" />
              1. CRM ({customers.length})
            </button>

            <button
              onClick={() => setMainTab('tasks')}
              className={`py-3 px-3.5 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                mainTab === 'tasks'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              2. Task ({tasks.length})
            </button>

            <button
              onClick={() => setMainTab('ansanh')}
              className={`py-3 px-3.5 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                mainTab === 'ansanh'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              3. An Sanh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
        {/* VIEW 1: OVERVIEW & AUTOMATED REPORTS */}
        {mainTab === 'overview' && (
          <div className="space-y-3.5 sm:space-y-6">
            {/* Overview Sub-navigation */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs w-fit">
              <button
                onClick={() => setOverviewSubTab('charts')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  overviewSubTab === 'charts'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Biểu Đồ Doanh Thu & Buồng Phòng
              </button>
              <button
                onClick={() => setOverviewSubTab('report')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  overviewSubTab === 'report'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" /> Báo Cáo Tiến Độ Tự Động
              </button>
            </div>

            {overviewSubTab === 'charts' ? (
              <RevenueCharts transactions={transactions} rooms={rooms} />
            ) : (
              <ProgressReport
                customers={customers}
                tasks={tasks}
                employees={employees}
                rooms={rooms}
                transactions={transactions}
                attendance={attendance}
              />
            )}
          </div>
        )}

        {/* VIEW 2: CRM CUSTOMERS */}
        {mainTab === 'crm' && (
          <CustomerList
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            isLoading={isCustomersLoading}
            error={customersError}
            onRefresh={loadCustomers}
          />
        )}

        {/* VIEW 3: TASKS, SUBTASKS, ZALO & EMPLOYEES */}
        {mainTab === 'tasks' && (
          <TaskManager
            tasks={tasks}
            employees={employees}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            isLoading={isTasksLoading}
            error={tasksError}
            onRefresh={loadTasks}
            onSyncLocalTasks={handleSyncLocalTasks}
          />
        )}

        {/* VIEW 4: AN SANH CENTER (3 MAIN TABLES: ROOMS, FINANCE, ATTENDANCE) */}
        {mainTab === 'ansanh' && (
          <div className="space-y-3.5 sm:space-y-6">
            {/* Sub-nav for 3 core tables of An Sanh */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAnsanhSubTab('rooms')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  ansanhSubTab === 'rooms'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BedDouble className="w-4 h-4" />
                a. Quản Lý Đặt Phòng (Tầng 2, 3, 4)
              </button>

              <button
                onClick={() => setAnsanhSubTab('finance')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  ansanhSubTab === 'finance'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                b. Quản Lý Thu Chi (An Sanh & Cá Nhân)
              </button>

              <button
                onClick={() => setAnsanhSubTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  ansanhSubTab === 'attendance'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                c. Quản Lý Chấm Công Nhân Viên
              </button>
            </div>

            {/* Table a: Room Manager */}
            {ansanhSubTab === 'rooms' && (
              <RoomManager rooms={rooms} onUpdateRoom={handleUpdateRoom} />
            )}

            {/* Table b: Finance Manager */}
            {ansanhSubTab === 'finance' && (
              <FinanceManager
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {/* Table c: Attendance Manager */}
            {ansanhSubTab === 'attendance' && (
              <AttendanceManager
                employees={employees}
                attendance={attendance}
                onSaveAttendance={updateAttendance}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 <b>Trung Tâm Ở Cữ & Chăm Sóc Sản Khoa An Sanh</b> • Hệ thống quản lý điều hành tích hợp
          </span>
          <span className="text-slate-400">
            Hỗ trợ kết nối Zalo tự động • Báo cáo tiến độ thời gian thực
          </span>
        </div>
      </footer>
    </div>
  );
}
