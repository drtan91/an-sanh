-- ==============================================================================
-- SQL BẢO MẬT BẢNG TASKS TRÊN SUPABASE (CHỈ DÀNH CHO ROLE AUTHENTICATED)
-- Hệ thống An Sanh Clinic & Care - Bảo mật dữ liệu nội bộ
-- ==============================================================================

-- 1. Tạo bảng tasks nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'An Sanh',
  priority TEXT NOT NULL DEFAULT 'Trung bình',
  status TEXT NOT NULL DEFAULT 'Chưa làm',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  assigned_to_employee_id TEXT,
  sub_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Kích hoạt Row Level Security (RLS) để bắt buộc kiểm tra phân quyền
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. Xóa sạch các policy công khai cũ (nếu có trước đây)
DROP POLICY IF EXISTS "Allow public read access on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public insert access on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public update access on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public delete access on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Cho phep nhan vien authenticated xem tasks" ON public.tasks;
DROP POLICY IF EXISTS "Cho phep nhan vien authenticated them tasks" ON public.tasks;
DROP POLICY IF EXISTS "Cho phep nhan vien authenticated sua tasks" ON public.tasks;
DROP POLICY IF EXISTS "Cho phep nhan vien authenticated xoa tasks" ON public.tasks;

-- 4. THU HỒI TOÀN BỘ QUYỀN TRÊN BẢNG tasks ĐỐI VỚI ROLE anon VÀ PUBLIC
-- (Ngăn chặn hoàn toàn việc người chưa đăng nhập truy cập dữ liệu qua anon key)
REVOKE ALL ON TABLE public.tasks FROM anon;
REVOKE ALL ON TABLE public.tasks FROM PUBLIC;

-- 5. CHỈ CẤP CÁC QUYỀN CẦN THIẾT (SELECT, INSERT, UPDATE, DELETE) CHO ROLE authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;

-- 6. TẠO CÁC RLS POLICIES CHỈ ÁP DỤNG DUY NHẤT CHO ROLE authenticated (NHÂN VIÊN ĐÃ ĐĂNG NHẬP)
CREATE POLICY "Cho phep nhan vien authenticated xem tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Cho phep nhan vien authenticated them tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Cho phep nhan vien authenticated sua tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Cho phep nhan vien authenticated xoa tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (true);

-- 7. Tạo các chỉ mục (Indexes) tối ưu hóa tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_emp ON public.tasks(assigned_to_employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
