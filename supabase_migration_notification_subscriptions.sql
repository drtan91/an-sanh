-- ==============================================================================
-- MIGRATION GIAI ĐOẠN 2A: BẢNG NOTIFICATION_SUBSCRIPTIONS (WEB PUSH / VAPID)
-- Hệ thống An Sanh Clinic & Care • PWA Android Push Subscriptions
-- ==============================================================================

-- 1. Tạo bảng notification_subscriptions
CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_name TEXT,
  platform TEXT DEFAULT 'android',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- 2. Chỉ mục tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_notif_subs_emp_active
ON public.notification_subscriptions(employee_id, is_active);

CREATE INDEX IF NOT EXISTS idx_notif_subs_endpoint
ON public.notification_subscriptions(endpoint);

-- 3. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Thu hồi toàn bộ quyền từ anon & public
REVOKE ALL ON TABLE public.notification_subscriptions FROM anon;
REVOKE ALL ON TABLE public.notification_subscriptions FROM PUBLIC;

-- Cấp quyền cần thiết cho authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_subscriptions TO authenticated;

-- 4. RLS POLICIES:
-- Nhân viên CHỈ được xem, đăng ký, cập nhật và xóa subscription của chính nhân sự được liên kết với auth.uid() của họ.
-- KHÔNG cho phép nhân viên đăng ký hay can thiệp subscription của người khác.

-- SELECT: Chỉ xem subscription của employee liên kết với tài khoản đang đăng nhập
DROP POLICY IF EXISTS "Nhan vien chi xem subscription cua chinh minh" ON public.notification_subscriptions;
CREATE POLICY "Nhan vien chi xem subscription cua chinh minh"
ON public.notification_subscriptions
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
  )
);

-- INSERT: Chỉ thêm subscription cho employee liên kết với tài khoản đang đăng nhập
DROP POLICY IF EXISTS "Nhan vien chi them subscription cho chinh minh" ON public.notification_subscriptions;
CREATE POLICY "Nhan vien chi them subscription cho chinh minh"
ON public.notification_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
  )
);

-- UPDATE: Chỉ cập nhật subscription của chính mình (vd: cập nhật token, last_used_at, is_active)
DROP POLICY IF EXISTS "Nhan vien chi cap nhat subscription cua chinh minh" ON public.notification_subscriptions;
CREATE POLICY "Nhan vien chi cap nhat subscription cua chinh minh"
ON public.notification_subscriptions
FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
  )
);

-- DELETE: Chỉ xóa subscription của chính mình (khi bấm Tắt thông báo)
DROP POLICY IF EXISTS "Nhan vien chi xoa subscription cua chinh minh" ON public.notification_subscriptions;
CREATE POLICY "Nhan vien chi xoa subscription cua chinh minh"
ON public.notification_subscriptions
FOR DELETE
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE auth_user_id = auth.uid()
  )
);
