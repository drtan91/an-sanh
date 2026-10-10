-- ==============================================================================
-- SCHEMA MIGRATION: MODULE QUẢN LÝ THU CHI (TRANSACTIONS)
-- Phiên bản: Checkpoint 1 - Khởi tạo bảng public.transactions và RLS bảo mật
-- ==============================================================================

-- 1. Đảm bảo extension pgcrypto sẵn sàng cho gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tạo bảng transactions nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL CHECK (scope IN ('An Sanh', 'Cá nhân')),
    type TEXT NOT NULL CHECK (type IN ('Thu', 'Chi')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    content TEXT NOT NULL,
    payment_source TEXT NOT NULL DEFAULT 'Chuyển khoản VCB',
    category TEXT NOT NULL DEFAULT 'Thu chi chung',
    note TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Bỏ các policy cũ nếu có để đảm bảo chạy lại script an toàn (Idempotent)
DROP POLICY IF EXISTS "Allow authenticated users to read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to delete transactions" ON public.transactions;

-- 5. Thiết lập Policies:
-- CHẶN TOÀN BỘ ANON (Không cấp bất kỳ policy nào cho role anon)
-- CHỈ CHO PHÉP AUTHENTICATED USERS THỰC HIỆN CRUD

-- 5.1. Quyền SELECT cho người dùng đã đăng nhập
CREATE POLICY "Allow authenticated users to read transactions"
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (true);

-- 5.2. Quyền INSERT cho người dùng đã đăng nhập
CREATE POLICY "Allow authenticated users to insert transactions"
    ON public.transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 5.3. Quyền UPDATE cho người dùng đã đăng nhập
CREATE POLICY "Allow authenticated users to update transactions"
    ON public.transactions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5.4. Quyền DELETE cho người dùng đã đăng nhập
CREATE POLICY "Allow authenticated users to delete transactions"
    ON public.transactions
    FOR DELETE
    TO authenticated
    USING (true);

-- 6. Thiết lập các Indexes tối ưu hiệu năng truy vấn và thống kê
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_scope ON public.transactions (scope);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions (created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_scope_type_date ON public.transactions (scope, type, date DESC);

-- 7. Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_transactions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_transactions_updated_at();

-- Ghi chú kiểm toán:
COMMENT ON TABLE public.transactions IS 'Bảng lưu trữ giao dịch thu chi An Sanh và Cá nhân';
COMMENT ON COLUMN public.transactions.amount IS 'Số tiền thu hoặc chi bằng VNĐ (kiểu BIGINT nguyên dương)';
