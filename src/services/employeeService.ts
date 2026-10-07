import { Employee } from '../types';
import { supabase } from '../lib/supabase';
import { INITIAL_EMPLOYEES } from '../data/initialData';

export const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
};

// Find or create branch by name
export const getOrCreateBranch = async (branchName: string): Promise<string | null> => {
  if (!supabase || !branchName) return null;
  const trimmed = branchName.trim();
  if (!trimmed) return null;

  try {
    const { data: existing, error: findErr } = await supabase
      .from('branches')
      .select('id, name')
      .ilike('name', trimmed)
      .limit(1);

    if (!findErr && existing && existing.length > 0) {
      return existing[0].id;
    }

    // Insert new branch
    const { data: created, error: insertErr } = await supabase
      .from('branches')
      .insert([{ name: trimmed, is_active: true }])
      .select('id')
      .single();

    if (!insertErr && created) {
      return created.id;
    }
    return null;
  } catch {
    return null;
  }
};

// Fetch employees from Supabase table 'employees'
export const fetchEmployeesFromSupabase = async (): Promise<{
  data: Employee[];
  error: string | null;
}> => {
  if (!supabase) {
    return { data: [], error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        full_name,
        position,
        phone,
        zalo,
        branch_id,
        shift,
        is_active,
        created_at,
        branches (
          id,
          name
        )
      `)
      .order('full_name', { ascending: true });

    if (error) {
      return { data: [], error: `Lỗi đọc bảng employees: ${error.message} (${error.code || ''})` };
    }

    const mapped: Employee[] = (data || []).map((row: any) => ({
      id: row.id,
      fullName: row.full_name || 'Chưa đặt tên',
      phone: row.phone || '',
      zaloPhone: row.zalo || row.phone || '',
      position: row.position || 'Nhân viên',
      department: row.branches?.name || 'An Sanh',
      active: row.is_active ?? true,
      branchId: row.branch_id,
      branchName: row.branches?.name,
    }));

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Lỗi không xác định khi tải nhân viên' };
  }
};

// Add employee to Supabase table 'employees'
export const addEmployeeToSupabase = async (
  empData: Partial<Employee>
): Promise<{ data: Employee | null; error: string | null }> => {
  if (!supabase) {
    return { data: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  const phone = normalizePhone(empData.phone || empData.zaloPhone);
  if (!empData.fullName?.trim()) {
    return { data: null, error: 'Họ và tên nhân viên là bắt buộc.' };
  }

  // Check duplicate phone (Requirement 14 & 15)
  if (phone) {
    const { data: existing, error: checkErr } = await supabase
      .from('employees')
      .select('id, full_name, phone')
      .eq('phone', phone);

    if (!checkErr && existing && existing.length > 0) {
      return {
        data: null,
        error: `Số điện thoại "${phone}" đã được sử dụng bởi nhân viên "${existing[0].full_name}". Không thể tạo bản ghi trùng.`,
      };
    }
  }

  // Handle branch
  let branchId: string | null = null;
  if (empData.department) {
    branchId = await getOrCreateBranch(empData.department);
  }

  const payload = {
    full_name: empData.fullName.trim(),
    position: empData.position?.trim() || 'Nhân viên',
    phone: phone || null,
    zalo: normalizePhone(empData.zaloPhone) || phone || null,
    branch_id: branchId,
    shift: 'Hành chính (8h-17h)',
    is_active: empData.active !== false,
  };

  const { data, error } = await supabase
    .from('employees')
    .insert([payload])
    .select('*, branches(id, name)')
    .single();

  if (error) {
    return { data: null, error: `Lỗi thêm nhân viên vào Supabase: ${error.message} (${error.code || ''})` };
  }

  const mapped: Employee = {
    id: data.id,
    fullName: data.full_name,
    phone: data.phone || '',
    zaloPhone: data.zalo || data.phone || '',
    position: data.position || 'Nhân viên',
    department: data.branches?.name || empData.department || 'An Sanh',
    active: data.is_active ?? true,
    branchId: data.branch_id,
    branchName: data.branches?.name,
  };

  return { data: mapped, error: null };
};

// Update employee on Supabase table 'employees'
export const updateEmployeeInSupabase = async (
  id: string,
  empData: Partial<Employee>
): Promise<{ data: Employee | null; error: string | null }> => {
  if (!supabase) {
    return { data: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  // If phone changed, check collision with other employee
  const newPhone = normalizePhone(empData.phone || empData.zaloPhone);
  if (newPhone) {
    const { data: existing, error: checkErr } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('phone', newPhone)
      .neq('id', id);

    if (!checkErr && existing && existing.length > 0) {
      return {
        data: null,
        error: `Số điện thoại "${newPhone}" đã thuộc về nhân sự "${existing[0].full_name}". Không thể cập nhật trùng.`,
      };
    }
  }

  let branchId: string | null | undefined = undefined;
  if (empData.department) {
    branchId = await getOrCreateBranch(empData.department);
  }

  const updatePayload: any = {};
  if (empData.fullName !== undefined) updatePayload.full_name = empData.fullName.trim();
  if (empData.position !== undefined) updatePayload.position = empData.position.trim();
  if (newPhone) updatePayload.phone = newPhone;
  if (empData.zaloPhone !== undefined) updatePayload.zalo = normalizePhone(empData.zaloPhone);
  if (empData.active !== undefined) updatePayload.is_active = empData.active;
  if (branchId !== undefined) updatePayload.branch_id = branchId;

  const { data, error } = await supabase
    .from('employees')
    .update(updatePayload)
    .eq('id', id)
    .select('*, branches(id, name)')
    .single();

  if (error) {
    return { data: null, error: `Lỗi cập nhật nhân viên trên Supabase: ${error.message} (${error.code || ''})` };
  }

  const mapped: Employee = {
    id: data.id,
    fullName: data.full_name,
    phone: data.phone || '',
    zaloPhone: data.zalo || data.phone || '',
    position: data.position || 'Nhân viên',
    department: data.branches?.name || empData.department || 'An Sanh',
    active: data.is_active ?? true,
    branchId: data.branch_id,
    branchName: data.branches?.name,
  };

  return { data: mapped, error: null };
};

// Deactivate employee on Supabase (is_active = false) instead of hard delete (Requirement 9)
export const deactivateEmployeeInSupabase = async (
  id: string
): Promise<{ success: boolean; error: string | null }> => {
  if (!supabase) {
    return { success: false, error: 'Chưa cấu hình Supabase Client.' };
  }

  const { error } = await supabase
    .from('employees')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return { success: false, error: `Lỗi ngừng hoạt động nhân viên trên Supabase: ${error.message} (${error.code || ''})` };
  }

  return { success: true, error: null };
};

// Seed/Migrate employees from initialData into Supabase (Requirement 12, 13, 14, 15)
export const seedEmployeesFromInitialData = async (): Promise<{
  total: number;
  inserted: number;
  skipped: number;
  error: string | null;
}> => {
  if (!supabase) {
    return { total: 0, inserted: 0, skipped: 0, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    // 1. Get existing employees to avoid duplicates
    const { data: existing, error: fetchErr } = await supabase.from('employees').select('id, phone, full_name');
    if (fetchErr) {
      return { total: 0, inserted: 0, skipped: 0, error: `Lỗi đọc bảng employees: ${fetchErr.message}` };
    }

    const existingPhones = new Set((existing || []).map((e) => normalizePhone(e.phone)).filter(Boolean));

    let inserted = 0;
    let skipped = 0;

    for (const emp of INITIAL_EMPLOYEES) {
      const cleanPhone = normalizePhone(emp.phone || emp.zaloPhone);

      // Check if employee with this phone already exists (Requirement 14, 15)
      if (cleanPhone && existingPhones.has(cleanPhone)) {
        skipped++;
        continue;
      }

      // Find or create branch
      const branchId = await getOrCreateBranch(emp.department);

      const { error: insertErr } = await supabase.from('employees').insert([
        {
          full_name: emp.fullName,
          position: emp.position,
          phone: cleanPhone || null,
          zalo: normalizePhone(emp.zaloPhone) || cleanPhone || null,
          branch_id: branchId,
          shift: 'Hành chính (8h-17h)',
          is_active: emp.active !== false,
        },
      ]);

      if (!insertErr) {
        inserted++;
        if (cleanPhone) existingPhones.add(cleanPhone);
      } else {
        console.error('Lỗi insert nhân viên mẫu:', emp.fullName, insertErr.message);
      }
    }

    return {
      total: INITIAL_EMPLOYEES.length,
      inserted,
      skipped,
      error: null,
    };
  } catch (err: any) {
    return { total: 0, inserted: 0, skipped: 0, error: err?.message || 'Lỗi khi seed nhân viên' };
  }
};
