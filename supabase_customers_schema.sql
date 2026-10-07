-- ==============================================================================
-- SQL BẢO MẬT BẢNG CUSTOMERS TRÊN SUPABASE (CHỈ DÀNH CHO ROLE AUTHENTICATED)
-- Hệ thống An Sanh Clinic & Care - Bảo vệ dữ liệu khách hàng CRM
-- ==============================================================================

-- 1. Tạo bảng customers nếu chưa tồn tại (Bảo toàn dữ liệu hiện có nếu bảng đã tồn tại)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  next_appointment_date DATE,
  category TEXT NOT NULL DEFAULT 'An Sanh',
  phone TEXT,
  address TEXT,
  notes TEXT,
  medical_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  attached_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Kích hoạt Row Level Security (RLS) để bắt buộc kiểm soát quyền truy cập
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 3. Xóa các policy công khai cũ (nếu có trước đây đối với anon hoặc public)
DROP POLICY IF EXISTS "Allow public read access on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public insert access on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public update access on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public delete access on customers" ON public.customers;
DROP POLICY IF EXISTS "Cho phep nhan vien authenticated xem customers" ON public.customers;
DROP POLICY IF EXISTS "Cho phep nhan vien authenticated them customers" ON public.customers;
DROP POLICY IF EXISTS "Cho phep nhan vien authenticated sua customers" ON public.customers;
DROP POLICY IF EXISTS "Cho phep nhan vien authenticated xoa customers" ON public.customers;

-- 4. THU HỒI TOÀN BỘ QUYỀN TRÊN BẢNG customers ĐỐI VỚI ROLE anon VÀ PUBLIC
-- (Ngăn chặn triệt để mọi truy cập dữ liệu khách hàng khi chưa đăng nhập qua anon key)
REVOKE ALL ON TABLE public.customers FROM anon;
REVOKE ALL ON TABLE public.customers FROM PUBLIC;

-- 5. CHỈ CẤP CÁC QUYỀN CẦN THIẾT (SELECT, INSERT, UPDATE, DELETE) CHO ROLE authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customers TO authenticated;

-- 6. TẠO CÁC RLS POLICIES CHỈ ÁP DỤNG DUY NHẤT CHO ROLE authenticated (NHÂN VIÊN ĐÃ ĐĂNG NHẬP)
CREATE POLICY "Cho phep nhan vien authenticated xem customers"
ON public.customers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Cho phep nhan vien authenticated them customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Cho phep nhan vien authenticated sua customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Cho phep nhan vien authenticated xoa customers"
ON public.customers
FOR DELETE
TO authenticated
USING (true);

-- 7. Tạo các chỉ mục (Indexes) tối ưu hóa truy vấn và tìm kiếm CRM
CREATE INDEX IF NOT EXISTS idx_customers_category ON public.customers(category);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_next_apt ON public.customers(next_appointment_date);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);
