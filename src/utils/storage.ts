import { Customer, Employee, Room, Task, Transaction, AttendanceRecord } from '../types';
import {
  INITIAL_CUSTOMERS,
  INITIAL_EMPLOYEES,
  INITIAL_TASKS,
  INITIAL_TRANSACTIONS,
  INITIAL_ATTENDANCE,
  generateInitialRooms
} from '../data/initialData';

const STORAGE_KEYS = {
  CUSTOMERS: 'ansanh_customers_v1',
  TASKS: 'ansanh_tasks_v1',
  EMPLOYEES: 'ansanh_employees_v1',
  ROOMS: 'ansanh_rooms_v1',
  TRANSACTIONS: 'ansanh_transactions_v1',
  ATTENDANCE: 'ansanh_attendance_v1',
};

export const loadStoredData = () => {
  const get = <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  return {
    customers: get<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
    tasks: get<Task[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS),
    employees: get<Employee[]>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES),
    rooms: get<Room[]>(STORAGE_KEYS.ROOMS, generateInitialRooms()),
    transactions: get<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS),
    attendance: get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE),
  };
};

export const saveStoredData = {
  customers: (data: Customer[]) => localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data)),
  tasks: (data: Task[]) => localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data)),
  employees: (data: Employee[]) => localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(data)),
  rooms: (data: Room[]) => localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(data)),
  transactions: (data: Transaction[]) => localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data)),
  attendance: (data: AttendanceRecord[]) => localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(data)),
  resetAll: () => {
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.ROOMS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateString;
  }
};

export const createZaloMessageUrl = (phone: string, message: string): string => {
  // Format phone to Zalo: 0912... or 84912...
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // Zalo me URL
  return `https://zalo.me/${cleanPhone}`;
};

export const formatTaskZaloText = (task: Task, employeeName?: string): string => {
  const subtaskList = task.subTasks && task.subTasks.length > 0
    ? task.subTasks.map((st, idx) => `  ${idx + 1}. [${st.completed ? 'x' : ' '}] ${st.title}`).join('\n')
    : '  (Không có việc con)';

  return `[GIAO VIỆC AN SANH]
Kính gửi: ${employeeName || 'Nhân sự phụ trách'}
Nhiệm vụ: ${task.title}
Phân loại: [${task.category}] | Mức ưu tiên: ${task.priority}
Hạn hoàn thành: ${formatDate(task.dueDate)}
Nội dung chi tiết:
${task.description || 'Theo phân công quản lý'}
Danh sách việc con:
${subtaskList}
-------------------
Vui lòng kiểm tra và phản hồi tiến độ qua hệ thống!`;
};
