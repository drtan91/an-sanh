-- ==============================================================================
-- MIGRATION GIAI ĐOẠN 2A: LIÊN KẾT NHÂN VIÊN VỚI TÀI KHOẢN AUTH (auth_user_id)
-- Hệ thống An Sanh Clinic & Care • An toàn tuyệt đối - Không làm mất dữ liệu
-- ==============================================================================

-- 1. Thêm cột auth_user_id vào bảng employees (liên kết với auth.users)
-- NULLABLE để không ảnh hưởng dữ liệu nhân sự hiện tại
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Thêm chỉ mục UNIQUE có điều kiện (Partial Unique Index):
-- Một tài khoản Supabase Auth chỉ được liên kết tối đa 1 nhân viên
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_auth_user_id
ON public.employees(auth_user_id)
WHERE auth_user_id IS NOT NULL;

-- 3. Cập nhật Policy RLS cho bảng employees:
-- Đảm bảo tất cả nhân viên authenticated đọc được danh sách nhân sự (để phân công task),
-- nhưng chỉ Admin hoặc chính nhân viên đó mới cập nhật thông tin cá nhân.
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phep nhan vien authenticated xem employees" ON public.employees;
CREATE POLICY "Cho phep nhan vien authenticated xem employees"
ON public.employees
FOR SELECT
TO authenticated
USING (true);

-- (Tùy chọn: Policy cho phép nhân viên tự sửa profile của mình nếu có auth_user_id)
DROP POLICY IF EXISTS "Cho phep nhan vien tu sua thong tin" ON public.employees;
CREATE POLICY "Cho phep nhan vien tu sua thong tin"
ON public.employees
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());
