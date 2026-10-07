import { Customer, Employee, Room, Task, Transaction, AttendanceRecord } from '../types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    fullName: 'BS. Nguyễn Thị Mai',
    phone: '0912345678',
    zaloPhone: '0912345678',
    position: 'Bác sĩ Sản phụ khoa',
    department: 'Bệnh viện',
    email: 'mai.nguyen@ansanh.vn',
    active: true,
  },
  {
    id: 'emp-2',
    fullName: 'Lê Hoàng Yến',
    phone: '0987654321',
    zaloPhone: '0987654321',
    position: 'Điều dưỡng trưởng - Quản lý CSKH',
    department: 'An Sanh',
    email: 'yen.le@ansanh.vn',
    active: true,
  },
  {
    id: 'emp-3',
    fullName: 'Trần Thu Trang',
    phone: '0903123456',
    zaloPhone: '0903123456',
    position: 'Chuyên viên Tắm & Massage Bé',
    department: 'An Sanh',
    email: 'trang.tran@ansanh.vn',
    active: true,
  },
  {
    id: 'emp-4',
    fullName: 'Phạm Minh Tuấn',
    phone: '0978999888',
    zaloPhone: '0978999888',
    position: 'Kế toán & Thu ngân',
    department: 'An Sanh',
    email: 'tuan.pham@ansanh.vn',
    active: true,
  },
  {
    id: 'emp-5',
    fullName: 'Ngô Bảo Ngọc',
    phone: '0934567890',
    zaloPhone: '0934567890',
    position: 'Lễ tân & Điều phối buồng phòng',
    department: 'An Sanh',
    email: 'ngoc.ngo@ansanh.vn',
    active: true,
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    fullName: 'Nguyễn Phương Thảo',
    dateOfBirth: '1995-04-12',
    createdAt: '2026-08-15',
    nextAppointmentDate: '2026-09-25',
    category: 'An Sanh',
    phone: '0918112233',
    address: 'Vinhomes Central Park, Q. Bình Thạnh, TP.HCM',
    medicalHistory: [
      {
        id: 'med-1',
        date: '2026-08-15',
        diagnoseOrCare: 'Đăng ký gói chăm sóc ở cữ 28 ngày VIP (Phòng P.301)',
        notes: 'Mẹ mang thai tuần 32, dự sinh cuối tháng 9. Thích phòng có ban công nhiều ánh sáng.',
        doctorOrCaregiver: 'Lê Hoàng Yến',
      },
      {
        id: 'med-2',
        date: '2026-09-10',
        diagnoseOrCare: 'Khám thai định kỳ tuần 36 & tư vấn dinh dưỡng sau sinh',
        notes: 'Thai nhi phát triển tốt 2.8kg. Mẹ huyết áp ổn định 115/75 mmHg. Đã chốt thực đơn ăn cữ kiêng đồ cay nóng.',
        doctorOrCaregiver: 'BS. Nguyễn Thị Mai',
      }
    ],
    attachedImages: [
      'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=600&auto=format&fit=crop&q=80'
    ],
    notes: 'Khách VIP, gia đình yêu cầu chuyên viên tắm bé giàu kinh nghiệm.'
  },
  {
    id: 'cust-2',
    fullName: 'Trần Thị Mỹ Linh',
    dateOfBirth: '1992-11-20',
    createdAt: '2026-09-01',
    nextAppointmentDate: '2026-09-24',
    category: 'Sản khoa',
    phone: '0909456789',
    address: 'Quận 1, TP.HCM',
    medicalHistory: [
      {
        id: 'med-3',
        date: '2026-09-01',
        diagnoseOrCare: 'Khám thai 24 tuần - Siêu âm 4D hình thái học',
        notes: 'Chỉ số bình thường, thai đơn, bánh rau bám mặt sau nhóm 1.',
        doctorOrCaregiver: 'BS. Nguyễn Thị Mai',
      }
    ],
    attachedImages: [
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80'
    ],
    notes: 'Có tiền sử nghén nặng 3 tháng đầu, hiện ổn định.'
  },
  {
    id: 'cust-3',
    fullName: 'Đặng Thùy Dương',
    dateOfBirth: '1998-07-08',
    createdAt: '2026-09-12',
    nextAppointmentDate: '2026-09-26',
    category: 'Sau sinh',
    phone: '0977223344',
    address: 'Thảo Điền, TP. Thủ Đức',
    medicalHistory: [
      {
        id: 'med-4',
        date: '2026-09-12',
        diagnoseOrCare: 'Kiểm tra vết mổ lấy thai ngày thứ 7 & thông tắc tia sữa',
        notes: 'Vết mổ khô tốt, không sưng đỏ. Thông tia sữa bên ngực phải thành công, bé bú tốt.',
        doctorOrCaregiver: 'Trần Thu Trang',
      }
    ],
    attachedImages: [
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&auto=format&fit=crop&q=80'
    ],
    notes: 'Đang theo dõi phản xạ bú của bé và kích sữa mẹ.'
  },
  {
    id: 'cust-4',
    fullName: 'Hoàng Bích Hạnh',
    dateOfBirth: '1990-02-14',
    createdAt: '2026-09-18',
    category: 'Khác',
    phone: '0938887766',
    address: 'Quận 7, TP.HCM',
    medicalHistory: [
      {
        id: 'med-5',
        date: '2026-09-18',
        diagnoseOrCare: 'Tư vấn gói phục hồi sàn chậu & xông hơi thảo mộc',
        notes: 'Hẹn bắt đầu liệu trình sau khi kết thúc tháng đầu sau sinh.',
        doctorOrCaregiver: 'Lê Hoàng Yến',
      }
    ],
    attachedImages: [],
    notes: 'Khách quan tâm tới gói gội đầu dưỡng sinh và massage đá nóng.'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Hội chẩn ca sinh mổ khó ca 39 tuần vết mổ cũ',
    description: 'Chuẩn bị hồ sơ tiền phẫu, xét nghiệm đông máu và dự trù máu cho sản phụ P.402',
    category: 'Bệnh viện',
    priority: 'Khẩn cấp',
    status: 'Đang làm',
    dueDate: '2026-09-23',
    createdAt: '2026-09-21',
    assignedToEmployeeId: 'emp-1',
    subTasks: [
      { id: 'sub-1', title: 'Kiểm tra kết quả sinh hóa & đông máu', completed: true },
      { id: 'sub-2', title: 'Khám tim mạch và tiền mê', completed: true },
      { id: 'sub-3', title: 'Giải thích người nhà và ký cam kết', completed: false }
    ]
  },
  {
    id: 'task-2',
    title: 'Setup phòng P.301 đón mẹ Thảo và bé nhập viện ở cữ',
    description: 'Khử khuẩn buồng phòng, chuẩn bị nôi em bé, máy hút sữa Medela, tinh dầu sả chanh',
    category: 'An Sanh',
    priority: 'Cao',
    status: 'Chưa làm',
    dueDate: '2026-09-24',
    createdAt: '2026-09-22',
    assignedToEmployeeId: 'emp-2',
    subTasks: [
      { id: 'sub-4', title: 'Khử khuẩn bằng tia UV và thay drap giường cao cấp', completed: false },
      { id: 'sub-5', title: 'Bàn giao giỏ quà đón chào và hoa tươi', completed: false },
      { id: 'sub-6', title: 'Kiểm tra điều hòa hai chiều và máy lọc không khí', completed: false }
    ]
  },
  {
    id: 'task-3',
    title: 'Liệu trình massage kích sữa & tắm bé phòng P.204',
    description: 'Chăm sóc mẹ sau sinh ngày thứ 4, chiếu đèn hồng ngoại giảm đau vết may',
    category: 'An Sanh',
    priority: 'Trung bình',
    status: 'Hoàn thành',
    dueDate: '2026-09-22',
    createdAt: '2026-09-22',
    assignedToEmployeeId: 'emp-3',
    subTasks: [
      { id: 'sub-7', title: 'Massage lưng và đắp thảo dược giảm đau', completed: true },
      { id: 'sub-8', title: 'Tắm bé & vệ sinh rốn chuẩn y khoa', completed: true }
    ]
  },
  {
    id: 'task-4',
    title: 'Nộp báo cáo tài chính quý III & quyết toán thuế phòng khám',
    description: 'Tổng hợp chi phí vận hành cá nhân và doanh thu dịch vụ',
    category: 'Cá nhân',
    priority: 'Trung bình',
    status: 'Đang làm',
    dueDate: '2026-09-28',
    createdAt: '2026-09-20',
    assignedToEmployeeId: 'emp-4',
    subTasks: [
      { id: 'sub-9', title: 'Đối soát sao kê ngân hàng VCB & MBBank', completed: true },
      { id: 'sub-10', title: 'Ký biên bản kiểm kê quỹ tiền mặt', completed: false }
    ]
  },
  {
    id: 'task-5',
    title: 'Bảo trì hệ thống lọc không khí và nước nóng Tầng 4',
    description: 'Kiểm tra bơm nhiệt trung tâm và hệ thống lọc nước RO cho các phòng tầng 4',
    category: 'An Sanh',
    priority: 'Thấp',
    status: 'Chưa làm',
    dueDate: '2026-09-26',
    createdAt: '2026-09-22',
    assignedToEmployeeId: 'emp-5',
    subTasks: [
      { id: 'sub-11', title: 'Liên hệ kỹ thuật viên hãng bảo dưỡng', completed: false },
      { id: 'sub-12', title: 'Thay lõi lọc thô số 1, 2, 3', completed: false }
    ]
  }
];

export const generateInitialRooms = (): Room[] => {
  const rooms: Room[] = [];
  const floors: (2 | 3 | 4)[] = [2, 3, 4];

  floors.forEach((floor) => {
    for (let i = 1; i <= 6; i++) {
      const roomNumber = `P.${floor}0${i}`;
      // default config
      const isTwoBeds = i === 3 || i === 6;
      const isBalcony = i === 1 || i === 2 || i === 4;
      const basePrice = isTwoBeds ? 3200000 : 2500000;
      
      let status: 'Trống' | 'Đặt chỗ' | 'Đã nhận' = 'Trống';
      let guestName: string | undefined = undefined;
      let guestPhone: string | undefined = undefined;
      let checkInDate: string | undefined = undefined;
      let checkOutDate: string | undefined = undefined;
      let notes = 'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.';

      if (floor === 2 && i === 1) {
        status = 'Đã nhận';
        guestName = 'Mẹ Lê Hồng Nhung (Bé Bắp)';
        guestPhone = '0901234789';
        checkInDate = '2026-09-15';
        checkOutDate = '2026-10-15';
        notes = 'Gói chăm sóc Toàn diện 30 ngày. Đang ăn chế độ lợi sữa giàu dinh dưỡng.';
      } else if (floor === 2 && i === 4) {
        status = 'Đã nhận';
        guestName = 'Mẹ Vũ Minh Trang (Bé Đậu)';
        guestPhone = '0933445566';
        checkInDate = '2026-09-18';
        checkOutDate = '2026-10-02';
        notes = 'Gói phục hồi 14 ngày. Cần lưu ý bé hơi vàng da sinh lý nhẹ.';
      } else if (floor === 3 && i === 1) {
        status = 'Đặt chỗ';
        guestName = 'Mẹ Nguyễn Phương Thảo';
        guestPhone = '0918112233';
        checkInDate = '2026-09-25';
        checkOutDate = '2026-10-23';
        notes = 'Đã cọc 30%. Chuẩn bị phòng sạch sẽ đón mẹ ngày 25/09.';
      } else if (floor === 3 && i === 3) {
        status = 'Đã nhận';
        guestName = 'Mẹ Trần Kim Oanh';
        guestPhone = '0988776655';
        checkInDate = '2026-09-10';
        checkOutDate = '2026-10-10';
        notes = 'Phòng 2 giường dành cho mẹ và bà ngoại ở cùng chăm sóc.';
      } else if (floor === 4 && i === 2) {
        status = 'Đặt chỗ';
        guestName = 'Mẹ Phạm Thu Hằng';
        guestPhone = '0912233445';
        checkInDate = '2026-09-28';
        checkOutDate = '2026-10-28';
        notes = 'Sinh mổ tại BV Từ Dũ, chuyển sang An Sanh ngày thứ 4 sau sinh.';
      } else if (floor === 4 && i === 5) {
        status = 'Đã nhận';
        guestName = 'Mẹ Bùi Lan Anh';
        guestPhone = '0966554433';
        checkInDate = '2026-09-08';
        checkOutDate = '2026-10-06';
        notes = 'Bé bú sữa mẹ hoàn toàn. Sử dụng gói ngâm chân thảo dược mỗi tối.';
      }

      const roomImages = [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&auto=format&fit=crop&q=80'
      ];
      const image = roomImages[(floor + i) % roomImages.length];

      rooms.push({
        id: `room-${floor}0${i}`,
        floor,
        roomNumber,
        bedType: isTwoBeds ? '2 giường' : '1 giường',
        viewType: isBalcony ? 'Ban công' : 'Cửa sổ',
        pricePerDay: basePrice,
        status,
        guestName,
        guestPhone,
        checkInDate,
        checkOutDate,
        notes,
        image
      });
    }
  });

  return rooms;
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    scope: 'An Sanh',
    type: 'Thu',
    amount: 68000000,
    date: '2026-09-10',
    content: 'Thu tiền trọn gói ở cữ VIP 30 ngày mẹ Lê Hồng Nhung (P.201)',
    paymentSource: 'Chuyển khoản VCB',
    category: 'Doanh thu phòng ở cữ',
    note: 'Đã xuất hóa đơn VAT điện tử'
  },
  {
    id: 'tx-2',
    scope: 'An Sanh',
    type: 'Thu',
    amount: 25000000,
    date: '2026-09-15',
    content: 'Thu đặt cọc 30% gói ở cữ mẹ Nguyễn Phương Thảo (P.301)',
    paymentSource: 'Chuyển khoản MB',
    category: 'Tiền cọc đặt phòng',
    note: 'Còn lại thanh toán khi check-in'
  },
  {
    id: 'tx-3',
    scope: 'An Sanh',
    type: 'Chi',
    amount: 14500000,
    date: '2026-09-16',
    content: 'Nhập khẩu thảo dược xông hơi, tinh dầu trị liệu và dầu massage cữ',
    paymentSource: 'Chuyển khoản VCB',
    category: 'Vật tư & Dược liệu',
    note: 'Công ty Dược liệu Thiên Nhiên'
  },
  {
    id: 'tx-4',
    scope: 'An Sanh',
    type: 'Chi',
    amount: 9200000,
    date: '2026-09-18',
    content: 'Thực phẩm dinh dưỡng hữu cơ và yến sào bồi bổ cho các mẹ',
    paymentSource: 'Tiền mặt',
    category: 'Thực phẩm ăn cữ',
    note: 'Siêu thị thực phẩm sạch Organica'
  },
  {
    id: 'tx-5',
    scope: 'An Sanh',
    type: 'Thu',
    amount: 72000000,
    date: '2026-09-20',
    content: 'Thu phí dịch vụ phòng 2 giường mẹ Trần Kim Oanh (P.303)',
    paymentSource: 'Chuyển khoản VCB',
    category: 'Doanh thu phòng ở cữ',
  },
  {
    id: 'tx-6',
    scope: 'Cá nhân',
    type: 'Thu',
    amount: 35000000,
    date: '2026-09-12',
    content: 'Thù lao phẫu thuật sản khoa ca sinh mổ theo yêu cầu tại BV',
    paymentSource: 'Chuyển khoản VCB',
    category: 'Thu nhập chuyên môn',
  },
  {
    id: 'tx-7',
    scope: 'Cá nhân',
    type: 'Chi',
    amount: 8500000,
    date: '2026-09-19',
    content: 'Đăng ký khóa đào tạo cập nhật kỹ thuật siêu âm thai nâng cao FMF',
    paymentSource: 'Thẻ tín dụng',
    category: 'Học tập & Hội thảo',
  },
  {
    id: 'tx-8',
    scope: 'Cá nhân',
    type: 'Chi',
    amount: 5200000,
    date: '2026-09-21',
    content: 'Bảo dưỡng xe ô tô cá nhân & chi phí di chuyển công tác',
    paymentSource: 'Tiền mặt',
    category: 'Đi lại & Phương tiện',
  },
  {
    id: 'tx-9',
    scope: 'An Sanh',
    type: 'Chi',
    amount: 42000000,
    date: '2026-09-05',
    content: 'Chi trả lương đợt 1 và phụ cấp chuyên cần nhân viên điều dưỡng',
    paymentSource: 'Chuyển khoản VCB',
    category: 'Lương nhân viên',
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    employeeId: 'emp-1',
    date: '2026-09-22',
    status: 'Có mặt',
    shift: 'Hành chính (8h-17h)',
    checkInTime: '07:55',
    notes: 'Khám thai và hội chẩn đúng giờ'
  },
  {
    id: 'att-2',
    employeeId: 'emp-2',
    date: '2026-09-22',
    status: 'Có mặt',
    shift: 'Ca sáng (7h-15h)',
    checkInTime: '06:50',
    notes: 'Bàn giao ca điều dưỡng tầng 2 và tầng 3'
  },
  {
    id: 'att-3',
    employeeId: 'emp-3',
    date: '2026-09-22',
    status: 'Có mặt',
    shift: 'Ca sáng (7h-15h)',
    checkInTime: '07:05',
    notes: 'Tắm bé 4 phòng buổi sáng'
  },
  {
    id: 'att-4',
    employeeId: 'emp-4',
    date: '2026-09-22',
    status: 'Đi muộn',
    shift: 'Hành chính (8h-17h)',
    checkInTime: '08:20',
    notes: 'Kẹt xe đường Ung Văn Khiêm, đã báo trước'
  },
  {
    id: 'att-5',
    employeeId: 'emp-5',
    date: '2026-09-22',
    status: 'Có mặt',
    shift: 'Ca sáng (7h-15h)',
    checkInTime: '06:45',
    notes: 'Kiểm tra vệ sinh buồng phòng trước giờ nhận phòng'
  }
];
