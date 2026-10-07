import { Task, TaskCategory, TaskPriority, TaskStatus, SubTask } from '../types';
import { supabase } from '../lib/supabase';
import { INITIAL_TASKS } from '../data/initialData';

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

// Map Supabase DB row to application Task interface
export const mapRowToTask = (row: any): Task => {
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

  let dueDateStr = '';
  if (row.due_date) {
    if (typeof row.due_date === 'string' && row.due_date.includes('T')) {
      dueDateStr = row.due_date.split('T')[0];
    } else {
      dueDateStr = String(row.due_date);
    }
  } else {
    dueDateStr = createdDateStr;
  }

  return {
    id: row.id,
    title: row.title || 'Công việc',
    description: row.description || '',
    category: (row.category as TaskCategory) || 'An Sanh',
    priority: (row.priority as TaskPriority) || 'Trung bình',
    status: (row.status as TaskStatus) || 'Chưa làm',
    dueDate: dueDateStr,
    createdAt: createdDateStr,
    assignedToEmployeeId: row.assigned_to_employee_id || undefined,
    subTasks: Array.isArray(row.sub_tasks) ? (row.sub_tasks as SubTask[]) : [],
  };
};

// Map application Task to Supabase DB row
export const mapTaskToRow = (task: Partial<Task>): any => {
  const row: any = {};

  if (task.id) row.id = task.id;
  if (task.title !== undefined) row.title = task.title.trim();
  if (task.description !== undefined) row.description = task.description.trim();
  if (task.category !== undefined) row.category = task.category;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.status !== undefined) row.status = task.status;
  if (task.dueDate !== undefined) row.due_date = toValidDateOrNull(task.dueDate);
  if (task.createdAt !== undefined) row.created_at = toValidTimestamp(task.createdAt);
  if (task.assignedToEmployeeId !== undefined) {
    row.assigned_to_employee_id = task.assignedToEmployeeId ? task.assignedToEmployeeId.trim() : null;
  }
  if (task.subTasks !== undefined) {
    row.sub_tasks = Array.isArray(task.subTasks) ? task.subTasks : [];
  }

  return row;
};

/**
 * Fetch tasks from Supabase.
 * If empty and autoSeedIfEmpty is true, seeds initial tasks (preserving localStorage tasks if available).
 */
export const fetchTasksFromSupabase = async (options?: {
  autoSeedIfEmpty?: boolean;
  localTasksFallback?: Task[];
}): Promise<{
  data: Task[];
  error: string | null;
  isTableMissing?: boolean;
}> => {
  if (!supabase) {
    return {
      data: [],
      error: 'Chưa cấu hình biến môi trường Supabase (VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY).',
    };
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const isMissing =
        error.code === 'PGRST205' ||
        error.message?.includes("Could not find the table 'public.tasks'") ||
        error.message?.includes('relation "public.tasks" does not exist');

      return {
        data: [],
        error: isMissing
          ? 'Bảng "tasks" chưa tồn tại trên Supabase. Vui lòng chạy câu lệnh SQL tạo bảng trong Supabase SQL Editor.'
          : `Lỗi truy vấn danh sách công việc từ Supabase: ${error.message}`,
        isTableMissing: isMissing,
      };
    }

    // If table is empty and autoSeedIfEmpty is enabled
    if ((!data || data.length === 0) && options?.autoSeedIfEmpty) {
      const seedSource = (options.localTasksFallback && options.localTasksFallback.length > 0)
        ? options.localTasksFallback
        : INITIAL_TASKS;

      const seedResult = await seedTasksToSupabase(seedSource);
      if (seedResult.error) {
        return {
          data: [],
          error: `Không thể nạp dữ liệu công việc ban đầu: ${seedResult.error}`,
        };
      }

      // Re-fetch after seeding
      const { data: reData, error: reErr } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (reErr) {
        return {
          data: [],
          error: `Lỗi tải lại sau khi nạp dữ liệu: ${reErr.message}`,
        };
      }

      return {
        data: (reData || []).map(mapRowToTask),
        error: null,
      };
    }

    return {
      data: (data || []).map(mapRowToTask),
      error: null,
    };
  } catch (err: any) {
    return {
      data: [],
      error: `Lỗi kết nối Supabase: ${err?.message || 'Không xác định'}`,
    };
  }
};

/**
 * Seed or migrate an array of tasks into Supabase.
 * Checks existing IDs to avoid duplicates.
 */
export const seedTasksToSupabase = async (
  tasksToSeed: Task[]
): Promise<{
  total: number;
  inserted: number;
  skipped: number;
  error: string | null;
}> => {
  if (!supabase) {
    return { total: 0, inserted: 0, skipped: 0, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('tasks')
      .select('id');

    if (fetchErr) {
      return {
        total: 0,
        inserted: 0,
        skipped: 0,
        error: `Lỗi kiểm tra bảng tasks: ${fetchErr.message}`,
      };
    }

    const existingIds = new Set((existing || []).map((t: any) => t.id));
    let inserted = 0;
    let skipped = 0;

    for (const t of tasksToSeed) {
      if (existingIds.has(t.id)) {
        skipped++;
        continue;
      }

      const row = {
        id: t.id,
        title: t.title || 'Công việc',
        description: t.description || '',
        category: t.category || 'An Sanh',
        priority: t.priority || 'Trung bình',
        status: t.status || 'Chưa làm',
        due_date: toValidDateOrNull(t.dueDate),
        created_at: toValidTimestamp(t.createdAt),
        assigned_to_employee_id: t.assignedToEmployeeId || null,
        sub_tasks: Array.isArray(t.subTasks) ? t.subTasks : [],
        updated_at: new Date().toISOString(),
      };

      const { error: insErr } = await supabase.from('tasks').insert([row]);
      if (insErr) {
        return {
          total: tasksToSeed.length,
          inserted,
          skipped,
          error: `Lỗi chèn công việc "${t.title}": ${insErr.message}`,
        };
      }
      inserted++;
    }

    return {
      total: tasksToSeed.length,
      inserted,
      skipped,
      error: null,
    };
  } catch (err: any) {
    return {
      total: 0,
      inserted: 0,
      skipped: 0,
      error: `Lỗi khi lưu dữ liệu vào Supabase: ${err?.message || 'Không xác định'}`,
    };
  }
};

/**
 * Add a new task to Supabase
 */
export const addTaskToSupabase = async (
  taskData: Partial<Task>
): Promise<{ data: Task | null; error: string | null }> => {
  if (!supabase) {
    return { data: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const taskId = taskData.id || `task-${Date.now()}`;
    const row = {
      id: taskId,
      title: taskData.title?.trim() || 'Công việc mới',
      description: taskData.description?.trim() || '',
      category: taskData.category || 'An Sanh',
      priority: taskData.priority || 'Trung bình',
      status: taskData.status || 'Chưa làm',
      due_date: toValidDateOrNull(taskData.dueDate) || new Date().toISOString().split('T')[0],
      created_at: toValidTimestamp(taskData.createdAt),
      assigned_to_employee_id: taskData.assignedToEmployeeId ? taskData.assignedToEmployeeId.trim() : null,
      sub_tasks: Array.isArray(taskData.subTasks) ? taskData.subTasks : [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([row])
      .select('*')
      .single();

    if (error) {
      return {
        data: null,
        error: `Không thể thêm công việc trên Supabase: ${error.message}`,
      };
    }

    return {
      data: mapRowToTask(data),
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: `Lỗi ngoài ý muốn: ${err?.message || 'Không xác định'}`,
    };
  }
};

/**
 * Update an existing task in Supabase
 */
export const updateTaskInSupabase = async (
  id: string,
  taskData: Partial<Task>
): Promise<{ data: Task | null; error: string | null }> => {
  if (!supabase) {
    return { data: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const row = mapTaskToRow(taskData);
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('tasks')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return {
        data: null,
        error: `Không thể cập nhật công việc trên Supabase: ${error.message}`,
      };
    }

    return {
      data: mapRowToTask(data),
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: `Lỗi ngoài ý muốn: ${err?.message || 'Không xác định'}`,
    };
  }
};

/**
 * Delete a task from Supabase
 */
export const deleteTaskFromSupabase = async (
  id: string
): Promise<{ success: boolean; error: string | null }> => {
  if (!supabase) {
    return { success: false, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      return {
        success: false,
        error: `Không thể xóa công việc trên Supabase: ${error.message}`,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: `Không tìm thấy công việc "${id}" để xóa hoặc tài khoản không có quyền xóa.`,
      };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: `Lỗi khi xóa công việc: ${err?.message || 'Không xác định'}`,
    };
  }
};
