import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Customer, Employee, Room, Task, Transaction, AttendanceRecord, RoomBooking } from './types';
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
import {
  fetchRoomsFromSupabase,
  updateRoomInSupabase,
} from './services/roomService';
import {
  fetchBookingsFromSupabase,
  createBookingInSupabase,
  updateBookingInSupabase,
  checkoutBookingInSupabase,
  cancelBookingInSupabase,
  deleteBookingFromSupabase,
  syncAllRoomsFromBookings,
} from './services/bookingService';
import {
  fetchTransactions as fetchTransactionsFromSupabase,
  createTransaction as createTransactionInSupabase,
  deleteTransaction as deleteTransactionInSupabase,
} from './services/transactionService';
import { CustomerList } from './components/crm/CustomerList';
import { TaskManager } from './components/tasks/TaskManager';
import { RoomManager } from './components/ansanh/RoomManager';
import { FinanceManager } from './components/ansanh/FinanceManager';
import { AttendanceManager } from './components/ansanh/AttendanceManager';
import { RevenueCharts } from './components/dashboard/RevenueCharts';
import { ProgressReport } from './components/dashboard/ProgressReport';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { MobileBottomNav } from './components/common/MobileBottomNav';
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
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X
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
  const roomsRef = useRef<Room[]>(rooms);
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);
  const [isRoomsLoading, setIsRoomsLoading] = useState<boolean>(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState<boolean>(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState<boolean>(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // Global Sync Coordination States
  const [isGlobalSyncing, setIsGlobalSyncing] = useState<boolean>(false);
  const [syncNotification, setSyncNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
    let isMounted = true;
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setIsAuthChecking(false);
      }
    }, 2500);

    getStaffSession()
      .then((session) => {
        if (isMounted) {
          setCurrentUser(session?.user || null);
          setIsAuthChecking(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      });

    const unsubscribe = subscribeToAuthChanges((user) => {
      if (isMounted) {
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
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
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

  // Load Bookings from Supabase
  const loadBookings = useCallback(async (currentRoomsList?: Room[]) => {
    if (!currentUser) {
      setBookings([]);
      setIsBookingsLoading(false);
      setBookingsError(null);
      return;
    }

    const roomsToSync = currentRoomsList && currentRoomsList.length > 0 ? currentRoomsList : roomsRef.current;

    setIsBookingsLoading(true);
    setBookingsError(null);
    try {
      const { data, error } = await fetchBookingsFromSupabase(roomsToSync);
      if (error && (!data || data.length === 0)) {
        setBookingsError(error);
      }
      const fetchedBookings = data || [];
      setBookings(fetchedBookings);

      // YÊU CẦU 3: ROOM STATUS PHẢI ĐƯỢC TÍNH LẠI KHI APP MỞ/REFRESH
      // Khi App load hoặc refresh rooms/bookings: Gọi syncAllRoomsFromBookings
      // để xác định trạng thái phòng theo CURRENT_DATE ([check_in, check_out)).
      // Booking ngày [10/10 -> 15/10): ngày 15/10 không còn active, rooms = Trống (nếu ko có booking khác).
      if (roomsToSync && roomsToSync.length > 0) {
        const { updatedRooms, hasChanges } = await syncAllRoomsFromBookings(roomsToSync, fetchedBookings);
        if (hasChanges) {
          setRooms(updatedRooms);
          saveStoredData.rooms(updatedRooms);
        }
      }
    } catch (err: any) {
      setBookingsError(err?.message || 'Lỗi không xác định khi tải lịch đặt phòng');
    } finally {
      setIsBookingsLoading(false);
    }
  }, [currentUser]);

  // Load Rooms from Supabase (Source of Truth - shared across all devices & environments)
  const loadRooms = useCallback(async () => {
    if (!currentUser) {
      setRooms([]);
      setIsRoomsLoading(false);
      setRoomsError(null);
      return;
    }

    setIsRoomsLoading(true);
    setRoomsError(null);
    try {
      const { data, error } = await fetchRoomsFromSupabase({ autoSeedIfEmpty: true });
      if (error) {
        setRoomsError(error);
      } else {
        setRooms(data);
        saveStoredData.rooms(data);
        loadBookings(data);
      }
    } catch (err: any) {
      setRoomsError(err?.message || 'Lỗi không xác định khi tải buồng phòng từ Supabase');
    } finally {
      setIsRoomsLoading(false);
    }
  }, [currentUser, loadBookings]);

  // Load Transactions from Supabase (Source of Truth - public.transactions)
  const loadTransactions = useCallback(async () => {
    if (!currentUser) {
      setTransactions([]);
      setIsTransactionsLoading(false);
      setTransactionsError(null);
      return;
    }

    setIsTransactionsLoading(true);
    setTransactionsError(null);
    try {
      const { data, error } = await fetchTransactionsFromSupabase();
      if (error) {
        setTransactionsError(error);
        // Fallback tạm thời từ localStorage nếu gặp lỗi mạng
        const localData = loadStoredData();
        if (localData.transactions && localData.transactions.length > 0) {
          setTransactions(localData.transactions);
        }
      } else {
        // Nguồn dữ liệu chính từ Supabase
        setTransactions(data);
        // Backup an toàn vào localStorage
        saveStoredData.transactions(data);
      }
    } catch (err: any) {
      setTransactionsError(err?.message || 'Không thể tải dữ liệu thu chi. Vui lòng thử lại.');
    } finally {
      setIsTransactionsLoading(false);
    }
  }, [currentUser]);

  // Điều phối đồng bộ toàn bộ dữ liệu hệ thống từ thanh tiêu đề
  const handleGlobalSync = useCallback(async () => {
    if (isGlobalSyncing || !currentUser) return;
    setIsGlobalSyncing(true);
    setSyncNotification(null);

    const failedModules: string[] = [];

    // 1. Đồng bộ CRM (Khách hàng)
    try {
      const { data, error } = await fetchCustomersFromSupabase({ autoSeedIfEmpty: false });
      if (error) {
        failedModules.push('CRM');
        setCustomersError(error);
      } else {
        setCustomers(data);
        setCustomersError(null);
      }
    } catch (err: any) {
      failedModules.push('CRM');
      setCustomersError(err?.message || 'Lỗi tải CRM');
    }

    // 2. Đồng bộ Tasks (Công việc)
    try {
      const { data, error } = await fetchTasksFromSupabase({ autoSeedIfEmpty: false });
      if (error) {
        failedModules.push('Công việc');
        setTasksError(error);
      } else {
        setTasks(data);
        saveStoredData.tasks(data);
        setTasksError(null);
      }
    } catch (err: any) {
      failedModules.push('Công việc');
      setTasksError(err?.message || 'Lỗi tải công việc');
    }

    // 3. Đồng bộ Rooms & Bookings (Buồng phòng & Lịch đặt)
    try {
      const { data: roomsData, error: roomsErr } = await fetchRoomsFromSupabase({ autoSeedIfEmpty: false });
      if (roomsErr) {
        failedModules.push('Buồng phòng');
        setRoomsError(roomsErr);
      } else {
        setRooms(roomsData);
        saveStoredData.rooms(roomsData);
        setRoomsError(null);

        const { data: bookingsData, error: bookingsErr } = await fetchBookingsFromSupabase(roomsData);
        if (bookingsErr) {
          failedModules.push('Lịch đặt phòng');
          setBookingsError(bookingsErr);
        } else {
          const fetchedBookings = bookingsData || [];
          setBookings(fetchedBookings);
          setBookingsError(null);

          if (roomsData && roomsData.length > 0) {
            const { updatedRooms, hasChanges } = await syncAllRoomsFromBookings(roomsData, fetchedBookings);
            if (hasChanges) {
              setRooms(updatedRooms);
              saveStoredData.rooms(updatedRooms);
            }
          }
        }
      }
    } catch (err: any) {
      failedModules.push('Phòng & Đặt phòng');
      setRoomsError(err?.message || 'Lỗi tải phòng');
    }

    // 4. Đồng bộ Thu Chi (Transactions)
    try {
      const { data: txData, error: txErr } = await fetchTransactionsFromSupabase();
      if (txErr) {
        failedModules.push('Thu Chi');
        setTransactionsError(txErr);
      } else {
        setTransactions(txData);
        saveStoredData.transactions(txData);
        setTransactionsError(null);
      }
    } catch (err: any) {
      failedModules.push('Thu Chi');
      setTransactionsError(err?.message || 'Lỗi tải thu chi');
    }

    // 5. Đồng bộ Dữ liệu vận hành (Nhân viên & Chấm công từ localStorage)
    try {
      const localData = loadStoredData();
      setEmployees(localData.employees);
      setAttendance(localData.attendance);
    } catch {
      failedModules.push('Dữ liệu vận hành');
    }

    setIsGlobalSyncing(false);

    if (failedModules.length === 0) {
      setSyncNotification({
        type: 'success',
        message: 'Đồng bộ toàn bộ dữ liệu hệ thống từ Supabase thành công!',
      });
    } else {
      setSyncNotification({
        type: 'error',
        message: `Đồng bộ chưa hoàn tất: lỗi tải dữ liệu tại [${failedModules.join(', ')}].`,
      });
    }

    setTimeout(() => {
      setSyncNotification((prev) => (prev?.type === 'success' ? null : prev));
    }, 4500);
  }, [isGlobalSyncing, currentUser]);

  // When auth changes, fetch tasks & customers & rooms & operational data if logged in, or clear if logged out
  useEffect(() => {
    if (currentUser) {
      // 1. Load internal operational data from local storage (employees, attendance)
      const data = loadStoredData();
      setEmployees(data.employees);
      setAttendance(data.attendance);

      // 2. Load Supabase data (single source of truth for customers, tasks, rooms, bookings, transactions)
      loadCustomers();
      loadTasks();
      loadRooms();
      loadTransactions();
    } else {
      // Clear all internal data from state when logged out
      setCustomers([]);
      setTasks([]);
      setEmployees([]);
      setRooms([]);
      setBookings([]);
      setTransactions([]);
      setAttendance([]);
      setIsCustomersLoading(false);
      setIsTasksLoading(false);
      setIsRoomsLoading(false);
      setIsBookingsLoading(false);
      setIsTransactionsLoading(false);
    }
  }, [currentUser, loadCustomers, loadTasks, loadRooms, loadTransactions]);

  // Logout handler: sign out and wipe state
  const handleLogout = async () => {
    await signOutStaff();
    setCurrentUser(null);
    setCustomers([]);
    setTasks([]);
    setEmployees([]);
    setRooms([]);
    setBookings([]);
    setTransactions([]);
    setAttendance([]);
    setMainTab('overview');
    setCustomersError(null);
    setTasksError(null);
    setRoomsError(null);
    setBookingsError(null);
  };

  const updateEmployees = (updater: (prev: Employee[]) => Employee[]) => {
    setEmployees((prev) => {
      const updated = updater(prev);
      saveStoredData.employees(updated);
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
      setTransactions(fresh.transactions);
      setAttendance(fresh.attendance);
      await loadCustomers();
      await loadTasks();
      await loadRooms();
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

  // Handlers for Rooms (Supabase integration)
  const handleUpdateRoom = async (roomId: string, data: Partial<Room>) => {
    // 1. Optimistic UI update so interaction feels instantaneous
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...data } : r))
    );

    // 2. Persist to Supabase
    setRoomsError(null);
    const { data: updatedRoom, error } = await updateRoomInSupabase(roomId, data);
    if (error) {
      setRoomsError(error);
      // Revert/refresh to ensure consistency with database
      await loadRooms();
      return;
    }

    if (updatedRoom) {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? updatedRoom : r))
      );
      saveStoredData.rooms(rooms.map((r) => (r.id === roomId ? updatedRoom : r)));
    }
  };

  // Handlers for Bookings (Public.room_bookings & Room auto-sync)
  const handleCreateBooking = async (
    bookingData: Omit<RoomBooking, 'id'>
  ): Promise<{ success: boolean; error?: string | null }> => {
    setBookingsError(null);
    const { data, error } = await createBookingInSupabase(bookingData, bookings, rooms);
    if (error || !data) {
      setBookingsError(error);
      return { success: false, error: error || 'Lỗi khi tạo lịch đặt phòng' };
    }
    setBookings((prev) => [...prev, data]);
    await loadRooms();
    return { success: true, error: null };
  };

  const handleUpdateBooking = async (
    bookingId: string,
    updatedData: Partial<RoomBooking>
  ): Promise<{ success: boolean; error?: string | null }> => {
    setBookingsError(null);
    const { data, error } = await updateBookingInSupabase(bookingId, updatedData, bookings, rooms);
    if (error || !data) {
      setBookingsError(error);
      return { success: false, error: error || 'Lỗi khi cập nhật lịch đặt phòng' };
    }
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? data : b)));
    await loadRooms();
    return { success: true, error: null };
  };

  const handleCheckoutBooking = async (
    bookingId: string,
    actualEndDate?: string
  ): Promise<{ success: boolean; error?: string | null }> => {
    setBookingsError(null);
    const { data, error } = await checkoutBookingInSupabase(bookingId, actualEndDate, bookings, rooms);
    if (error) {
      setBookingsError(error);
      return { success: false, error };
    }
    if (data) {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? data : b)));
    }
    await loadRooms();
    return { success: true, error: null };
  };

  const handleCancelBooking = async (
    bookingId: string
  ): Promise<{ success: boolean; error?: string | null }> => {
    setBookingsError(null);
    const { data, error } = await cancelBookingInSupabase(bookingId, bookings, rooms);
    if (error) {
      setBookingsError(error);
      return { success: false, error };
    }
    if (data) {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? data : b)));
    }
    await loadRooms();
    return { success: true, error: null };
  };

  const handleDeleteBooking = async (
    bookingId: string,
    roomId: string
  ): Promise<{ success: boolean; error?: string | null }> => {
    setBookingsError(null);
    const { success, error } = await deleteBookingFromSupabase(bookingId, roomId, bookings, rooms);
    if (!success) {
      setBookingsError(error);
      return { success: false, error: error || 'Lỗi khi xóa đặt phòng' };
    }
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    await loadRooms();
    return { success: true, error: null };
  };

  // Handlers for Finance (Supabase public.transactions)
  const handleAddTransaction = async (
    txData: Partial<Transaction>
  ): Promise<boolean> => {
    setTransactionsError(null);
    const { data, error } = await createTransactionInSupabase(txData);
    if (error || !data) {
      const errMsg = error || 'Không thể lưu giao dịch. Vui lòng kiểm tra kết nối.';
      setTransactionsError(errMsg);
      return false;
    }

    // Chỉ cập nhật UI sau khi Supabase INSERT thành công
    setTransactions((prev) => {
      const updated = [data, ...prev];
      saveStoredData.transactions(updated); // Sync backup
      return updated;
    });
    return true;
  };

  const handleDeleteTransaction = async (id: string): Promise<boolean> => {
    setTransactionsError(null);
    const { success, error } = await deleteTransactionInSupabase(id);
    if (!success || error) {
      const errMsg = error || 'Không thể xóa giao dịch.';
      setTransactionsError(errMsg);
      return false;
    }

    // Chỉ xóa khỏi UI sau khi Supabase DELETE thành công
    setTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveStoredData.transactions(updated); // Sync backup
      return updated;
    });
    return true;
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
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div className="shrink-0">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-tight">
                  AN SANH - Dr.Tan
                </h1>
              </div>

              {/* Nút Đồng Bộ Chung Toàn Hệ Thống */}
              <button
                type="button"
                onClick={handleGlobalSync}
                disabled={isGlobalSyncing}
                className="ml-1 sm:ml-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 transition-all shadow-xs flex items-center gap-1.5 shrink-0 disabled:opacity-60 active:scale-95"
                title="Đồng bộ dữ liệu toàn hệ thống từ Supabase"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-emerald-700 ${
                    isGlobalSyncing ? 'animate-spin text-emerald-800' : ''
                  }`}
                />
                <span className="hidden sm:inline font-bold">Đồng bộ</span>
              </button>
            </div>

            {/* Quick Actions, Auth Status, PWA Install & Reset Demo */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* PWA Install App Button */}
              <PWAInstallButton />

              <div className="flex items-center gap-1.5 sm:gap-2 bg-blue-50/80 border border-blue-200/80 px-2 sm:px-2.5 py-1 rounded-xl">
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
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-0.5"
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

      {/* Global Sync Notification */}
      {syncNotification && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          <div
            className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              syncNotification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{syncNotification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotification(null)}
              className="p-1 hover:bg-black/5 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
        {/* VIEW 1: OVERVIEW & AUTOMATED REPORTS */}
        {mainTab === 'overview' && (
          <div className="space-y-3.5 sm:space-y-6">
            {/* Overview Sub-navigation */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white p-1 sm:p-1.5 rounded-2xl border border-slate-200 shadow-xs w-full sm:w-fit overflow-x-auto no-scrollbar">
              <button
                onClick={() => setOverviewSubTab('charts')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 touch-manipulation ${
                  overviewSubTab === 'charts'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Biểu Đồ & Buồng Phòng
              </button>
              <button
                onClick={() => setOverviewSubTab('report')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 touch-manipulation ${
                  overviewSubTab === 'report'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" /> Báo Cáo Tự Động
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
            onRefresh={handleGlobalSync}
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
            onRefresh={handleGlobalSync}
            onSyncLocalTasks={handleSyncLocalTasks}
          />
        )}

        {/* VIEW 4: AN SANH CENTER (3 MAIN TABLES: ROOMS, FINANCE, ATTENDANCE) */}
        {mainTab === 'ansanh' && (
          <div className="space-y-3.5 sm:space-y-6">
            {/* Sub-nav for 3 core tables of An Sanh */}
            <div className="bg-white p-1 sm:p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setAnsanhSubTab('rooms')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 touch-manipulation ${
                  ansanhSubTab === 'rooms'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BedDouble className="w-4 h-4 shrink-0" />
                a. Đặt Phòng
              </button>

              <button
                onClick={() => setAnsanhSubTab('finance')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 touch-manipulation ${
                  ansanhSubTab === 'finance'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4 shrink-0" />
                b. Thu Chi
              </button>

              <button
                onClick={() => setAnsanhSubTab('attendance')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 touch-manipulation ${
                  ansanhSubTab === 'attendance'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="w-4 h-4 shrink-0" />
                c. Chấm Công
              </button>
            </div>

            {/* Table a: Room Manager */}
            {ansanhSubTab === 'rooms' && (
              <RoomManager
                rooms={rooms}
                bookings={bookings}
                onUpdateRoom={handleUpdateRoom}
                onCreateBooking={handleCreateBooking}
                onUpdateBooking={handleUpdateBooking}
                onCheckoutBooking={handleCheckoutBooking}
                onCancelBooking={handleCancelBooking}
                onDeleteBooking={handleDeleteBooking}
                isLoading={isRoomsLoading || isBookingsLoading}
                error={roomsError || bookingsError}
                onRefresh={handleGlobalSync}
              />
            )}

            {/* Table b: Finance Manager */}
            {ansanhSubTab === 'finance' && (
              <FinanceManager
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                isLoading={isTransactionsLoading}
                error={transactionsError}
                onRefresh={handleGlobalSync}
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
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 text-center text-xs text-slate-500 pb-16 sm:pb-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 <b>Trung Tâm Ở Cữ & Chăm Sóc Sản Khoa An Sanh</b> • Hệ thống quản lý điều hành tích hợp
          </span>
          <span className="text-slate-400">
            Hỗ trợ kết nối Zalo tự động • Báo cáo tiến độ thời gian thực
          </span>
        </div>
      </footer>

      {/* Network connectivity status indicator for PWA */}
      <OfflineIndicator />

      {/* Mobile Bottom Navigation Bar (Android & iOS handheld ergonomics) */}
      <MobileBottomNav
        currentTab={mainTab}
        onSelectTab={setMainTab}
        crmCount={customers.length}
        taskCount={tasks.length}
      />
    </div>
  );
}
