-- ==============================================================================
-- SQL BẢNG ROOMS TRÊN SUPABASE - HỆ THỐNG AN SANH CLINIC & CARE
-- Đồng bộ quản lý 18 buồng phòng dùng chung giữa AI Studio Preview, Vercel & các thiết bị
-- ==============================================================================

-- 1. Tạo bảng rooms nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  floor INTEGER NOT NULL CHECK (floor IN (2, 3, 4)),
  room_number TEXT NOT NULL UNIQUE,
  bed_type TEXT NOT NULL DEFAULT '1 giường',
  view_type TEXT NOT NULL DEFAULT 'Cửa sổ',
  price_per_day NUMERIC NOT NULL DEFAULT 2500000,
  status TEXT NOT NULL DEFAULT 'Trống' CHECK (status IN ('Trống', 'Đặt chỗ', 'Đã nhận')),
  guest_name TEXT,
  guest_phone TEXT,
  check_in_date DATE,
  check_out_date DATE,
  notes TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 3. Tạo function và trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rooms_updated_at ON public.rooms;
CREATE TRIGGER trigger_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_rooms_updated_at();

-- 4. Xóa các policy cũ nếu có để tránh xung đột
DROP POLICY IF EXISTS "Cho phep tat ca xem rooms" ON public.rooms;
DROP POLICY IF EXISTS "Cho phep authenticated them rooms" ON public.rooms;
DROP POLICY IF EXISTS "Cho phep authenticated sua rooms" ON public.rooms;
DROP POLICY IF EXISTS "Cho phep authenticated xoa rooms" ON public.rooms;
DROP POLICY IF EXISTS "Cho phep anon xem rooms" ON public.rooms;
DROP POLICY IF EXISTS "Cho phep anon sua rooms" ON public.rooms;

-- 5. Cấp quyền truy cập cho role authenticated và anon
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.rooms TO anon;

-- 6. Tạo RLS Policies
-- Quyền đọc: Cho phép cả authenticated và anon đọc danh sách phòng
CREATE POLICY "Cho phep tat ca xem rooms"
  ON public.rooms
  FOR SELECT
  USING (true);

-- Quyền thêm mới
CREATE POLICY "Cho phep them rooms"
  ON public.rooms
  FOR INSERT
  WITH CHECK (true);

-- Quyền cập nhật (đổi trạng thái, giá, thông tin khách, check-in, check-out)
CREATE POLICY "Cho phep sua rooms"
  ON public.rooms
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Quyền xóa
CREATE POLICY "Cho phep xoa rooms"
  ON public.rooms
  FOR DELETE
  TO authenticated
  USING (true);

-- 7. Chỉ mục (Indexes) tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON public.rooms(floor);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_number ON public.rooms(room_number);

-- ==============================================================================
-- 8. SEED DỮ LIỆU BAN ĐẦU: CHÍNH XÁC 18 PHÒNG TỪ initialData.ts
-- (Chỉ chèn nếu chưa tồn tại để bảo toàn thay đổi thực tế nếu bảng đã có dữ liệu)
-- ==============================================================================

INSERT INTO public.rooms (
  id, floor, room_number, bed_type, view_type, price_per_day, status, guest_name, guest_phone, check_in_date, check_out_date, notes, image
) VALUES
  -- TẦNG 2 (P.201 -> P.206)
  (
    'room-201', 2, 'P.201', '1 giường', 'Ban công', 2500000, 'Đã nhận',
    'Mẹ Lê Hồng Nhung (Bé Bắp)', '0901234789', '2026-09-15', '2026-10-15',
    'Gói chăm sóc Toàn diện 30 ngày. Đang ăn chế độ lợi sữa giàu dinh dưỡng.',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-202', 2, 'P.202', '1 giường', 'Ban công', 2500000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-203', 2, 'P.203', '2 giường', 'Cửa sổ', 3200000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-204', 2, 'P.204', '1 giường', 'Ban công', 2500000, 'Đã nhận',
    'Mẹ Vũ Minh Trang (Bé Đậu)', '0933445566', '2026-09-18', '2026-10-02',
    'Gói phục hồi 14 ngày. Cần lưu ý bé hơi vàng da sinh lý nhẹ.',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-205', 2, 'P.205', '1 giường', 'Cửa sổ', 2500000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-206', 2, 'P.206', '2 giường', 'Cửa sổ', 3200000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=80'
  ),

  -- TẦNG 3 (P.301 -> P.306)
  (
    'room-301', 3, 'P.301', '1 giường', 'Ban công', 2500000, 'Đặt chỗ',
    'Mẹ Nguyễn Phương Thảo', '0918112233', '2026-09-25', '2026-10-23',
    'Đã cọc 30%. Chuẩn bị phòng sạch sẽ đón mẹ ngày 25/09.',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-302', 3, 'P.302', '1 giường', 'Ban công', 2500000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-303', 3, 'P.303', '2 giường', 'Cửa sổ', 3200000, 'Đã nhận',
    'Mẹ Trần Kim Oanh', '0988776655', '2026-09-10', '2026-10-10',
    'Phòng 2 giường dành cho mẹ và bà ngoại ở cùng chăm sóc.',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-304', 3, 'P.304', '1 giường', 'Ban công', 2500000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-305', 3, 'P.305', '1 giường', 'Cửa sổ', 2500000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-306', 3, 'P.306', '2 giường', 'Cửa sổ', 3200000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80'
  ),

  -- TẦNG 4 (P.401 -> P.406)
  (
    'room-401', 4, 'P.401', '1 giường', 'Ban công', 2500000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-402', 4, 'P.402', '1 giường', 'Ban công', 2500000, 'Đặt chỗ',
    'Mẹ Phạm Thu Hằng', '0912233445', '2026-09-28', '2026-10-28',
    'Sinh mổ tại BV Từ Dũ, chuyển sang An Sanh ngày thứ 4 sau sinh.',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-403', 4, 'P.403', '2 giường', 'Cửa sổ', 3200000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-404', 4, 'P.404', '1 giường', 'Ban công', 2500000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-405', 4, 'P.405', '1 giường', 'Cửa sổ', 2500000, 'Đã nhận',
    'Mẹ Bùi Lan Anh', '0966554433', '2026-09-08', '2026-10-06',
    'Bé bú sữa mẹ hoàn toàn. Sử dụng gói ngâm chân thảo dược mỗi tối.',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop&q=80'
  ),
  (
    'room-406', 4, 'P.406', '2 giường', 'Cửa sổ', 3200000, 'Trống',
    NULL, NULL, NULL, NULL,
    'Trang bị tivi 55 inch, nôi sưởi cho bé, ghế thư giãn cho mẹ.',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&auto=format&fit=crop&q=80'
  )
ON CONFLICT (room_number) DO NOTHING;
