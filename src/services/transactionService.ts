import { supabase } from '../lib/supabase';
import { Transaction, TransactionScope, TransactionType, PaymentSource } from '../types';

/**
 * Interface mapping trực tiếp cấu trúc hàng (row) của bảng public.transactions trên Supabase
 */
export interface SupabaseTransactionRow {
  id: string;
  scope: string;
  type: string;
  amount: number | string; // BIGINT Postgres
  date: string;
  content: string;
  payment_source: string;
  category: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Chuyển đổi từ Supabase Row sang Frontend Model (Transaction)
 */
export function mapRowToTransaction(row: SupabaseTransactionRow): Transaction {
  return {
    id: row.id,
    scope: (row.scope as TransactionScope) || 'An Sanh',
    type: (row.type as TransactionType) || 'Thu',
    amount: Number(row.amount) || 0,
    date: row.date,
    content: row.content || '',
    paymentSource: (row.payment_source as PaymentSource) || 'Chuyển khoản VCB',
    category: row.category || 'Thu chi chung',
    note: row.note ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Tải danh sách giao dịch thu chi từ Supabase
 * Sắp xếp theo ngày giảm dần (date DESC), sau đó theo thời điểm tạo giảm dần (created_at DESC)
 */
export async function fetchTransactions(): Promise<{
  data: Transaction[];
  error: string | null;
}> {
  if (!supabase) {
    return {
      data: [],
      error: 'Chưa cấu hình Supabase Client.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetchTransactions error:', error);
      return {
        data: [],
        error: 'Không thể tải dữ liệu thu chi. Vui lòng thử lại.',
      };
    }

    const transactions = (data || []).map((row) =>
      mapRowToTransaction(row as SupabaseTransactionRow)
    );

    return { data: transactions, error: null };
  } catch (err) {
    console.error('Unexpected error in fetchTransactions:', err);
    return {
      data: [],
      error: 'Không thể tải dữ liệu thu chi. Vui lòng kiểm tra kết nối mạng.',
    };
  }
}

/**
 * Thêm mới một giao dịch vào Supabase public.transactions
 * Tự động gắn created_by từ user hiện tại nếu có
 */
export async function createTransaction(
  txData: Partial<Transaction>
): Promise<{
  data: Transaction | null;
  error: string | null;
}> {
  if (!supabase) {
    return { data: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    // 1. Kiểm tra session xác thực
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Validate dữ liệu cơ bản
    const amountNum = Math.round(Number(txData.amount) || 0);
    if (amountNum <= 0) {
      return { data: null, error: 'Số tiền giao dịch phải lớn hơn 0đ.' };
    }

    const contentStr = (txData.content || '').trim();
    if (!contentStr) {
      return { data: null, error: 'Vui lòng nhập nội dung thu chi.' };
    }

    // 3. Chuẩn bị payload khớp với schema Supabase
    const payload: {
      scope: string;
      type: string;
      amount: number;
      date: string;
      content: string;
      payment_source: string;
      category: string;
      note: string | null;
      created_by?: string;
    } = {
      scope: txData.scope || 'An Sanh',
      type: txData.type || 'Thu',
      amount: amountNum,
      date: txData.date || new Date().toISOString().split('T')[0],
      content: contentStr,
      payment_source: txData.paymentSource || 'Chuyển khoản VCB',
      category: (txData.category || 'Thu chi chung').trim(),
      note: txData.note ? txData.note.trim() : null,
    };

    // Chỉ gán created_by nếu có user.id thật từ Supabase Auth (không tạo uuid giả)
    if (user && user.id) {
      payload.created_by = user.id;
    }

    // 4. Gọi INSERT vào Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase createTransaction error:', error);
      return {
        data: null,
        error: 'Không thể lưu giao dịch. Vui lòng kiểm tra kết nối.',
      };
    }

    if (!data) {
      return {
        data: null,
        error: 'Không nhận được dữ liệu phản hồi sau khi lưu giao dịch.',
      };
    }

    const createdTx = mapRowToTransaction(data as SupabaseTransactionRow);
    return { data: createdTx, error: null };
  } catch (err) {
    console.error('Unexpected error in createTransaction:', err);
    return {
      data: null,
      error: 'Không thể lưu giao dịch. Vui lòng thử lại sau.',
    };
  }
}

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Xóa một giao dịch khỏi Supabase
 */
export async function deleteTransaction(
  id: string
): Promise<{
  success: boolean;
  error: string | null;
}> {
  if (!id) {
    return { success: false, error: 'Mã giao dịch không hợp lệ.' };
  }

  // Nếu là ID mock/demo cũ không phải UUID (ví dụ tx-1), xóa trên client thành công
  if (!isUuid(id)) {
    return { success: true, error: null };
  }

  if (!supabase) {
    return { success: false, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase deleteTransaction error:', error);
      return {
        success: false,
        error: error.message || 'Không thể xóa giao dịch. Vui lòng kiểm tra quyền hoặc kết nối.',
      };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Unexpected error in deleteTransaction:', err);
    return {
      success: false,
      error: err?.message || 'Không thể xóa giao dịch. Vui lòng thử lại.',
    };
  }
}

/**
 * Sửa/Cập nhật một giao dịch (chuẩn bị sẵn cho checkpoint nâng cấp tiếp theo)
 */
export async function updateTransaction(
  id: string,
  txData: Partial<Transaction>
): Promise<{
  data: Transaction | null;
  error: string | null;
}> {
  if (!supabase) {
    return { data: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    if (!id) {
      return { data: null, error: 'Mã giao dịch không hợp lệ.' };
    }

    const updatePayload: Record<string, unknown> = {};

    if (txData.scope !== undefined) updatePayload.scope = txData.scope;
    if (txData.type !== undefined) updatePayload.type = txData.type;
    if (txData.amount !== undefined) {
      const amt = Math.round(Number(txData.amount) || 0);
      if (amt <= 0) {
        return { data: null, error: 'Số tiền giao dịch phải lớn hơn 0đ.' };
      }
      updatePayload.amount = amt;
    }
    if (txData.date !== undefined) updatePayload.date = txData.date;
    if (txData.content !== undefined) {
      const cnt = txData.content.trim();
      if (!cnt) {
        return { data: null, error: 'Nội dung giao dịch không được để trống.' };
      }
      updatePayload.content = cnt;
    }
    if (txData.paymentSource !== undefined) {
      updatePayload.payment_source = txData.paymentSource;
    }
    if (txData.category !== undefined) {
      updatePayload.category = txData.category.trim();
    }
    if (txData.note !== undefined) {
      updatePayload.note = txData.note ? txData.note.trim() : null;
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase updateTransaction error:', error);
      return {
        data: null,
        error: 'Không thể cập nhật giao dịch. Vui lòng thử lại.',
      };
    }

    if (!data) {
      return {
        data: null,
        error: 'Không tìm thấy giao dịch cần cập nhật.',
      };
    }

    const updated = mapRowToTransaction(data as SupabaseTransactionRow);
    return { data: updated, error: null };
  } catch (err) {
    console.error('Unexpected error in updateTransaction:', err);
    return {
      data: null,
      error: 'Không thể cập nhật giao dịch. Vui lòng thử lại.',
    };
  }
}
