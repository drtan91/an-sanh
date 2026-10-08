-- ==============================================================================
-- SQL MIGRATION: BẢNG ROOM_BOOKINGS TRÊN SUPABASE (PHIÊN BẢN PRODUCTION CHUẨN)
-- HỆ THỐNG QUẢN LÝ AN SANH CLINIC & CARE
-- 
-- 4 ĐIỂM CỐT LÕI ĐÃ ĐƯỢC CẬP NHẬT CHUẨN XÁC:
-- 1. BỎ HOÀN TOÀN LOGIC TỰ ĐOÁN CHECK-OUT (+28 ngày). Chỉ migrate record có check_out > check_in.
--    Báo cáo số record bị bỏ qua bằng khối PL/pgSQL RAISE NOTICE.
-- 2. SỬA TRIGGER ĐỔI PHÒNG: Nếu UPDATE và OLD.room_id <> NEW.room_id, sync CẢ HAI phòng:
--    cả phòng cũ và phòng mới, tránh để phòng cũ giữ trạng thái sai.
-- 3. ĐỒNG BỘ TRẠNG THÁI PHÒNG THEO CURRENT_DATE theo khoảng nửa mở [check_in, check_out).
--    Ngày check-out là ngày trả phòng nên phòng KHÔNG còn tính là active.
-- 4. BẢO MẬT: Bổ sung "SET search_path = public" cho các function SECURITY DEFINER.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BƯỚC 1: KÍCH HOẠT EXTENSION BTREE_GIST ĐỂ HỖ TRỢ EXCLUSION CONSTRAINT TRÊN CỘT TEXT/DATERANGE
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------------------------
-- BƯỚC 2: TẠO BẢNG ROOM_BOOKINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_bookings (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Đặt chỗ' CHECK (status IN ('Đặt chỗ', 'Đang ở', 'Kết thúc', 'Đã hủy')),
  total_price NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ràng buộc: Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày (check_out > check_in)
  CONSTRAINT check_booking_dates CHECK (check_out_date > check_in_date)
);

-- ------------------------------------------------------------------------------
-- BƯỚC 3: DATABASE-LEVEL EXCLUSION CONSTRAINT CHỐNG TRÙNG LỊCH (OVERLAP PROTECTION)
-- 
-- Nguyên tắc:
-- - Cùng room_id: không cho phép 2 booking giao thoa nhau trong khoảng [check_in, check_out)
-- - Booking 08/10 -> 12/10 và 10/10 -> 15/10: && trả về true => BỊ CHẶN BỞI DATABASE
-- - Booking 08/10 -> 12/10 và 12/10 -> 15/10: && trả về false => HỢP LỆ (check-out sáng / check-in chiều)
-- - Chỉ áp dụng cho booking đang có hiệu lực (status IN ('Đặt chỗ', 'Đang ở'))
-- - Booking 'Kết thúc' hoặc 'Đã hủy' nằm ngoài mệnh đề WHERE nên KHÔNG chặn lịch mới
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exclude_overlapping_room_bookings'
  ) THEN
    ALTER TABLE public.room_bookings
      ADD CONSTRAINT exclude_overlapping_room_bookings
      EXCLUDE USING gist (
        room_id WITH =,
        (daterange(check_in_date, check_out_date, '[)')) WITH &&
      )
      WHERE (status IN ('Đặt chỗ', 'Đang ở'));
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- BƯỚC 4: KÍCH HOẠT ROW LEVEL SECURITY (RLS) VÀ CẤP QUYỀN
-- ------------------------------------------------------------------------------
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

-- Thu hồi mọi quyền từ anon
REVOKE ALL ON TABLE public.room_bookings FROM anon;

-- Phân quyền rõ ràng:
-- - anon: CHỈ ĐƯỢC SELECT (đọc), KHÔNG ĐƯỢC INSERT, UPDATE, DELETE
-- - authenticated: TOÀN QUYỀN CRUD (SELECT, INSERT, UPDATE, DELETE)
GRANT SELECT ON TABLE public.room_bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.room_bookings TO authenticated;

-- Xóa các policies cũ nếu có
DROP POLICY IF EXISTS "Cho phep tat ca xem room_bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Cho phep them room_bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Cho phep sua room_bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Cho phep xoa room_bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Cho phep doc room_bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Cho phep authenticated them room_bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Cho phep authenticated sua room_bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Cho phep authenticated xoa room_bookings" ON public.room_bookings;

-- 1. Policy Đọc (SELECT): Cho phép public (authenticated và anon) đọc
CREATE POLICY "Cho phep doc room_bookings"
  ON public.room_bookings
  FOR SELECT
  TO public
  USING (true);

-- 2. Policy Thêm (INSERT): CHỈ authenticated mới được tạo booking mới (ANON KHÔNG ĐƯỢC GHI)
CREATE POLICY "Cho phep authenticated them room_bookings"
  ON public.room_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Policy Sửa (UPDATE): CHỈ authenticated mới được sửa booking (ANON KHÔNG ĐƯỢC SỬA)
CREATE POLICY "Cho phep authenticated sua room_bookings"
  ON public.room_bookings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Policy Xóa (DELETE): CHỈ authenticated mới được xóa booking (ANON KHÔNG ĐƯỢC XÓA)
CREATE POLICY "Cho phep authenticated xoa room_bookings"
  ON public.room_bookings
  FOR DELETE
  TO authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- BƯỚC 5: TỰ ĐỘNG CẬP NHẬT UPDATED_AT CHO ROOM_BOOKINGS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_room_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_room_bookings_updated_at ON public.room_bookings;
CREATE TRIGGER trigger_room_bookings_updated_at
  BEFORE UPDATE ON public.room_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_room_bookings_updated_at();

-- ------------------------------------------------------------------------------
-- BƯỚC 6: TRIGGER TỰ ĐỘNG ĐỒNG BỘ TRẠNG THÁI PHÒNG (ROOMS TABLE) THEO ROOM_BOOKINGS
-- 
-- Khi có INSERT, UPDATE, DELETE trên room_bookings:
-- - Nếu UPDATE đổi phòng (OLD.room_id <> NEW.room_id), tự động tính lại CẢ HAI phòng:
--   cả phòng cũ (OLD.room_id) và phòng mới (NEW.room_id)
-- - Tính theo khoảng [check_in_date, check_out_date) của CURRENT_DATE:
--   + 'Đang ở' hôm nay => rooms.status = 'Đã nhận', cập nhật khách & ngày
--   + 'Đặt chỗ' hôm nay => rooms.status = 'Đặt chỗ', cập nhật khách & ngày
--   + Không có khách hoặc booking đã 'Kết thúc'/'Đã hủy' => rooms.status = 'Trống'
-- - An toàn bảo mật: SECURITY DEFINER kết hợp SET search_path = public
-- ------------------------------------------------------------------------------

-- Helper Function: Đồng bộ trạng thái cho 1 phòng cụ thể
CREATE OR REPLACE FUNCTION public.sync_single_room_status(p_room_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_stay RECORD;
  active_res RECORD;
  today_date DATE := CURRENT_DATE;
BEGIN
  IF p_room_id IS NULL THEN
    RETURN;
  END IF;

  -- 1. Tìm booking Đang ở bao gồm ngày hôm nay: check_in <= today < check_out
  SELECT * INTO active_stay
  FROM public.room_bookings
  WHERE room_id = p_room_id
    AND status = 'Đang ở'
    AND check_in_date <= today_date
    AND check_out_date > today_date
  ORDER BY check_in_date ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.rooms
    SET status = 'Đã nhận',
        guest_name = active_stay.guest_name,
        guest_phone = active_stay.guest_phone,
        check_in_date = active_stay.check_in_date,
        check_out_date = active_stay.check_out_date,
        notes = COALESCE(active_stay.notes, notes),
        updated_at = now()
    WHERE id = p_room_id;
    RETURN;
  END IF;

  -- 2. Tìm booking Đặt chỗ bao gồm ngày hôm nay: check_in <= today < check_out
  SELECT * INTO active_res
  FROM public.room_bookings
  WHERE room_id = p_room_id
    AND status = 'Đặt chỗ'
    AND check_in_date <= today_date
    AND check_out_date > today_date
  ORDER BY check_in_date ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.rooms
    SET status = 'Đặt chỗ',
        guest_name = active_res.guest_name,
        guest_phone = active_res.guest_phone,
        check_in_date = active_res.check_in_date,
        check_out_date = active_res.check_out_date,
        notes = COALESCE(active_res.notes, notes),
        updated_at = now()
    WHERE id = p_room_id;
    RETURN;
  END IF;

  -- 3. Không có booking nào đang ở hoặc đặt chỗ hôm nay: Phòng về TRỐNG
  UPDATE public.rooms
  SET status = 'Trống',
      guest_name = NULL,
      guest_phone = NULL,
      check_in_date = NULL,
      check_out_date = NULL,
      updated_at = now()
  WHERE id = p_room_id;
END;
$$;

-- Trigger Function: Xử lý các thao tác INSERT, UPDATE, DELETE
CREATE OR REPLACE FUNCTION public.sync_room_status_from_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.sync_single_room_status(OLD.room_id);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Nếu đổi phòng (OLD.room_id <> NEW.room_id), tính lại cho CẢ HAI phòng:
    -- Phòng cũ (OLD.room_id) và phòng mới (NEW.room_id)
    IF OLD.room_id IS DISTINCT FROM NEW.room_id THEN
      PERFORM public.sync_single_room_status(OLD.room_id);
    END IF;
    PERFORM public.sync_single_room_status(NEW.room_id);
    RETURN NEW;
  ELSE -- INSERT
    PERFORM public.sync_single_room_status(NEW.room_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_room_status ON public.room_bookings;
CREATE TRIGGER trigger_sync_room_status
  AFTER INSERT OR UPDATE OR DELETE ON public.room_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_room_status_from_booking();

-- ------------------------------------------------------------------------------
-- BƯỚC 7: TẠO CHỈ MỤC (INDEXES) TỐI ƯU TRUY VẤN
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON public.room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_dates ON public.room_bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_room_bookings_status ON public.room_bookings(status);
CREATE INDEX IF NOT EXISTS idx_room_bookings_lookup ON public.room_bookings(room_id, status, check_in_date, check_out_date);

-- ------------------------------------------------------------------------------
-- BƯỚC 8: MIGRATE DỮ LIỆU BAN ĐẦU AN TOÀN TỪ BẢNG ROOMS SANG ROOM_BOOKINGS
-- 
-- Quy tắc chuẩn xác:
-- - BỎ HOÀN TOÀN việc tự đoán check-out (+28 ngày).
-- - Chỉ tạo booking khi check_out_date IS NOT NULL VÀ check_out_date > check_in_date.
-- - Nếu check_out_date IS NULL hoặc check_out_date <= check_in_date: BỎ QUA, không tạo booking.
-- - Không xóa hoặc sửa bất kỳ record nào trong bảng rooms.
-- - Báo cáo số lượng bản ghi được tạo và số lượng bản ghi bị bỏ qua qua RAISE NOTICE.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_migrated_count INT := 0;
  v_skipped_count INT := 0;
BEGIN
  -- 1. Đếm số lượng record có khách/đặt chỗ trong rooms nhưng bị bỏ qua
  -- vì thiếu ngày trả phòng hoặc ngày trả <= ngày nhận
  SELECT COUNT(*) INTO v_skipped_count
  FROM public.rooms r
  WHERE r.status IN ('Đã nhận', 'Đặt chỗ')
    AND (
      r.guest_name IS NULL
      OR r.check_in_date IS NULL
      OR r.check_out_date IS NULL
      OR r.check_out_date <= r.check_in_date
    );

  -- 2. Chỉ migrate các record hợp lệ có đủ thông tin và check_out_date > check_in_date
  INSERT INTO public.room_bookings (
    id, room_id, room_number, guest_name, guest_phone, check_in_date, check_out_date, status, notes
  )
  SELECT
    'bk-init-' || r.id,
    r.id,
    r.room_number,
    r.guest_name,
    r.guest_phone,
    r.check_in_date,
    r.check_out_date,
    CASE 
      WHEN r.status = 'Đã nhận' THEN 'Đang ở'
      WHEN r.status = 'Đặt chỗ' THEN 'Đặt chỗ'
      ELSE 'Đặt chỗ'
    END,
    r.notes
  FROM public.rooms r
  WHERE r.status IN ('Đã nhận', 'Đặt chỗ')
    AND r.guest_name IS NOT NULL
    AND r.check_in_date IS NOT NULL
    AND r.check_out_date IS NOT NULL
    AND r.check_out_date > r.check_in_date
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'BÁO CÁO MIGRATION DỮ LIỆU ROOM_BOOKINGS:';
  RAISE NOTICE ' - Số booking hợp lệ được tạo: %', v_migrated_count;
  RAISE NOTICE ' - Số phòng có khách/đặt chỗ bị bỏ qua (do thiếu check_out_date hoặc check_out <= check_in): %', v_skipped_count;
  RAISE NOTICE '==================================================';
END $$;
