import { Customer, CustomerCategory, MedicalRecord } from '../types';
import { supabase } from '../lib/supabase';
import { INITIAL_CUSTOMERS } from '../data/initialData';

// Helper: Ensure valid date format YYYY-MM-DD or null for postgres date column
export const toValidDateOrNull = (val?: string | null): string | null => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
};

// Helper: Ensure valid timestamptz string for postgres created_at column
export const toValidTimestamp = (val?: string | null): string => {
  if (!val || typeof val !== 'string') return new Date().toISOString();
  const trimmed = val.trim();
  if (!trimmed) return new Date().toISOString();
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }
  return new Date().toISOString();
};

// Format Supabase/PostgreSQL errors with human-friendly Vietnamese messages
export const formatCustomerSupabaseError = (error: any): string => {
  if (!error) return 'Lỗi không xác định';
  const msg = error.message || '';
  const code = error.code || '';

  if (
    code === '42501' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security policy')
  ) {
    return 'Yêu cầu đăng nhập: Bạn cần đăng nhập tài khoản nhân viên (được xác thực trên Supabase) để truy cập và thao tác dữ liệu khách hàng CRM.';
  }

  if (
    code === 'PGRST205' ||
    msg.includes("Could not find the table 'public.customers'") ||
    msg.includes('relation "public.customers" does not exist')
  ) {
    return 'Bảng "customers" chưa tồn tại trên Supabase. Vui lòng chạy đoạn mã SQL tạo bảng trong Supabase SQL Editor.';
  }

  return error.message || 'Lỗi kết nối cơ sở dữ liệu Supabase.';
};

// Map Supabase DB row to application Customer interface
export const mapRowToCustomer = (row: any): Customer => {
  let createdDateStr = '';
  if (row.created_at) {
    if (typeof row.created_at === 'string' && row.created_at.includes('T')) {
      createdDateStr = row.created_at.split('T')[0];
    } else {
      createdDateStr = String(row.created_at);
    }
  } else {
    createdDateStr = new Date().toISOString().split('T')[0];
  }

  return {
    id: row.id,
    fullName: row.full_name || 'Khách hàng',
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : '',
    createdAt: createdDateStr,
    nextAppointmentDate: row.next_appointment_date ? String(row.next_appointment_date) : undefined,
    category: (row.category as CustomerCategory) || 'An Sanh',
    phone: row.phone || '',
    address: row.address || undefined,
    notes: row.notes || undefined,
    medicalHistory: Array.isArray(row.medical_history) ? (row.medical_history as MedicalRecord[]) : [],
    attachedImages: Array.isArray(row.attached_images) ? (row.attached_images as string[]) : [],
  };
};

/**
 * Seed initial sample customers from INITIAL_CUSTOMERS into Supabase
 * Checks existing IDs to avoid duplicate rows.
 */
export const seedCustomersFromInitialData = async (): Promise<{
  total: number;
  inserted: number;
  skipped: number;
  error: string | null;
}> => {
  if (!supabase) {
    return { total: 0, inserted: 0, skipped: 0, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    // 1. Get existing customer IDs from Supabase
    const { data: existing, error: fetchErr } = await supabase
      .from('customers')
      .select('id');

    if (fetchErr) {
      return {
        total: 0,
        inserted: 0,
        skipped: 0,
        error: `Lỗi kiểm tra bảng customers: ${fetchErr.message}`,
      };
    }

    const existingIds = new Set((existing || []).map((c: any) => c.id));
    let inserted = 0;
    let skipped = 0;

    for (const cust of INITIAL_CUSTOMERS) {
      if (existingIds.has(cust.id)) {
        skipped++;
        continue;
      }

      const rowToInsert = {
        id: cust.id,
        full_name: cust.fullName,
        date_of_birth: toValidDateOrNull(cust.dateOfBirth),
        created_at: toValidTimestamp(cust.createdAt),
        next_appointment_date: toValidDateOrNull(cust.nextAppointmentDate),
        category: cust.category,
        phone: cust.phone || '',
        address: cust.address || null,
        notes: cust.notes || null,
        medical_history: cust.medicalHistory || [],
        attached_images: cust.attachedImages || [],
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase
        .from('customers')
        .insert([rowToInsert]);

      if (!insertErr) {
        inserted++;
        existingIds.add(cust.id);
      } else {
        console.error('Lỗi seed khách hàng:', cust.fullName, insertErr.message);
      }
    }

    return {
      total: INITIAL_CUSTOMERS.length,
      inserted,
      skipped,
      error: null,
    };
  } catch (err: any) {
    return {
      total: 0,
      inserted: 0,
      skipped: 0,
      error: err?.message || 'Lỗi không xác định khi seed khách hàng',
    };
  }
};

/**
 * Fetch all customers from Supabase table 'customers'.
 * If the table is empty, optionally seeds from INITIAL_CUSTOMERS.
 */
export const fetchCustomersFromSupabase = async (
  options?: { autoSeedIfEmpty?: boolean }
): Promise<{
  data: Customer[];
  error: string | null;
}> => {
  if (!supabase) {
    return { data: [], error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: formatCustomerSupabaseError(error),
      };
    }

    // If empty and auto-seed requested (default: true)
    if ((!data || data.length === 0) && options?.autoSeedIfEmpty !== false) {
      const seedResult = await seedCustomersFromInitialData();
      if (!seedResult.error && seedResult.inserted > 0) {
        // Re-query from Supabase to guarantee reading source of truth from database
        const { data: refreshed, error: refetchErr } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!refetchErr && refreshed) {
          return { data: refreshed.map(mapRowToCustomer), error: null };
        }
      }
    }

    const mapped = (data || []).map(mapRowToCustomer);
    return { data: mapped, error: null };
  } catch (err: any) {
    return {
      data: [],
      error: err?.message || 'Lỗi không xác định khi tải danh sách khách hàng',
    };
  }
};

/**
 * Insert a new customer into Supabase table 'customers'.
 */
export const addCustomerToSupabase = async (
  customerData: Partial<Customer>
): Promise<{
  data: Customer | null;
  error: string | null;
}> => {
  if (!supabase) {
    return { data: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const newId = customerData.id || `cust-${Date.now()}`;
    const row = {
      id: newId,
      full_name: customerData.fullName || 'Khách hàng mới',
      date_of_birth: toValidDateOrNull(customerData.dateOfBirth),
      created_at: toValidTimestamp(customerData.createdAt),
      next_appointment_date: toValidDateOrNull(customerData.nextAppointmentDate),
      category: customerData.category || 'An Sanh',
      phone: customerData.phone || '',
      address: customerData.address || null,
      notes: customerData.notes || null,
      medical_history: customerData.medicalHistory || [],
      attached_images: customerData.attachedImages || [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([row])
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: formatCustomerSupabaseError(error),
      };
    }

    return { data: mapRowToCustomer(data), error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'Lỗi không xác định khi thêm khách hàng',
    };
  }
};

/**
 * Update an existing customer in Supabase table 'customers'.
 */
export const updateCustomerInSupabase = async (
  id: string,
  customerData: Partial<Customer>
): Promise<{
  data: Customer | null;
  error: string | null;
}> => {
  if (!supabase) {
    return { data: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (customerData.fullName !== undefined) {
      updatePayload.full_name = customerData.fullName;
    }
    if (customerData.dateOfBirth !== undefined) {
      updatePayload.date_of_birth = toValidDateOrNull(customerData.dateOfBirth);
    }
    if (customerData.createdAt !== undefined) {
      updatePayload.created_at = toValidTimestamp(customerData.createdAt);
    }
    if (customerData.nextAppointmentDate !== undefined) {
      updatePayload.next_appointment_date = toValidDateOrNull(customerData.nextAppointmentDate);
    }
    if (customerData.category !== undefined) {
      updatePayload.category = customerData.category;
    }
    if (customerData.phone !== undefined) {
      updatePayload.phone = customerData.phone;
    }
    if (customerData.address !== undefined) {
      updatePayload.address = customerData.address || null;
    }
    if (customerData.notes !== undefined) {
      updatePayload.notes = customerData.notes || null;
    }
    if (customerData.medicalHistory !== undefined) {
      updatePayload.medical_history = customerData.medicalHistory;
    }
    if (customerData.attachedImages !== undefined) {
      updatePayload.attached_images = customerData.attachedImages;
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: formatCustomerSupabaseError(error),
      };
    }

    return { data: mapRowToCustomer(data), error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'Lỗi không xác định khi cập nhật khách hàng',
    };
  }
};

/**
 * Delete a customer from Supabase table 'customers'.
 */
export const deleteCustomerFromSupabase = async (
  id: string
): Promise<{
  success: boolean;
  error: string | null;
}> => {
  if (!supabase) {
    return { success: false, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      return {
        success: false,
        error: formatCustomerSupabaseError(error),
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: `Không tìm thấy khách hàng "${id}" để xóa hoặc tài khoản không có quyền xóa bản ghi này.`,
      };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Lỗi không xác định khi xóa khách hàng',
    };
  }
};
