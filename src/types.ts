export type CustomerCategory = 'Sản khoa' | 'An Sanh' | 'Sau sinh' | 'Khác';

export interface MedicalRecord {
  id: string;
  date: string;
  diagnoseOrCare: string;
  notes: string;
  doctorOrCaregiver: string;
}

export interface Customer {
  id: string;
  fullName: string;
  dateOfBirth: string;
  createdAt: string;
  nextAppointmentDate?: string;
  category: CustomerCategory;
  phone: string;
  address?: string;
  medicalHistory: MedicalRecord[];
  attachedImages: string[];
  notes?: string;
}

export type TaskCategory = 'Bệnh viện' | 'An Sanh' | 'Cá nhân';
export type TaskPriority = 'Thấp' | 'Trung bình' | 'Cao' | 'Khẩn cấp';
export type TaskStatus = 'Chưa làm' | 'Đang làm' | 'Hoàn thành' | 'Quá hạn';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Employee {
  id: string;
  fullName: string;
  phone: string;
  zaloPhone: string;
  position: string;
  email?: string;
  department: string;
  active: boolean;
  branchId?: string;
  branchName?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  assignedToEmployeeId?: string;
  subTasks: SubTask[];
}

export type RoomStatus = 'Trống' | 'Đặt chỗ' | 'Đã nhận';
export type BedType = '1 giường' | '2 giường';
export type ViewType = 'Cửa sổ' | 'Ban công';

export interface Room {
  id: string;
  floor: 2 | 3 | 4;
  roomNumber: string; // P.201, P.202, ...
  bedType: BedType;
  viewType: ViewType;
  pricePerDay: number; // VNĐ
  status: RoomStatus;
  guestName?: string;
  guestPhone?: string;
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string;
  image?: string;
}

export type TransactionType = 'Thu' | 'Chi';
export type TransactionScope = 'An Sanh' | 'Cá nhân';
export type PaymentSource = 'Tiền mặt' | 'Chuyển khoản VCB' | 'Chuyển khoản MB' | 'Thẻ tín dụng' | 'Khác';

export interface Transaction {
  id: string;
  scope: TransactionScope;
  type: TransactionType;
  amount: number;
  date: string;
  content: string;
  paymentSource: PaymentSource;
  category: string;
  note?: string;
}

export type AttendanceStatus = 'Có mặt' | 'Đi muộn' | 'Nghỉ có phép' | 'Nghỉ không phép';
export type ShiftType = 'Ca sáng (7h-15h)' | 'Ca chiều (14h-22h)' | 'Ca đêm (21h-7h)' | 'Hành chính (8h-17h)' | 'Ca 24h';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  shift: ShiftType;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
}
