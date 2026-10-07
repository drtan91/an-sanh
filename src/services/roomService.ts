import { Room, RoomStatus, BedType, ViewType } from '../types';
import { supabase } from '../lib/supabase';
import { generateInitialRooms } from '../data/initialData';

/**
 * Format Supabase/PostgreSQL errors with human-friendly Vietnamese messages
 */
export const formatRoomSupabaseError = (error: any): string => {
  if (!error) return 'Lỗi không xác định';
  const msg = error.message || '';
  const code = error.code || '';

  if (
    code === '42501' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security policy')
  ) {
    return 'Quyền truy cập: Bạn cần đăng nhập tài khoản nhân viên hoặc cấu hình RLS cho bảng "rooms" trên Supabase để thực hiện thao tác này.';
  }

  if (
    code === 'PGRST205' ||
    msg.includes("Could not find the table 'public.rooms'") ||
    msg.includes('relation "public.rooms" does not exist')
  ) {
    return 'Bảng "rooms" chưa tồn tại trên Supabase. Vui lòng chạy đoạn mã SQL trong file supabase_rooms_schema.sql trong Supabase SQL Editor.';
  }

  return error.message || 'Lỗi kết nối cơ sở dữ liệu Supabase khi thao tác dữ liệu phòng.';
};

/**
 * Map Supabase DB row (snake_case) to application Room interface (camelCase)
 */
export const mapRowToRoom = (row: any): Room => {
  return {
    id: row.id,
    floor: (Number(row.floor) as 2 | 3 | 4) || 2,
    roomNumber: row.room_number || '',
    bedType: (row.bed_type as BedType) || '1 giường',
    viewType: (row.view_type as ViewType) || 'Cửa sổ',
    pricePerDay: Number(row.price_per_day) || 2500000,
    status: (row.status as RoomStatus) || 'Trống',
    guestName: row.guest_name || undefined,
    guestPhone: row.guest_phone || undefined,
    checkInDate: row.check_in_date ? String(row.check_in_date) : undefined,
    checkOutDate: row.check_out_date ? String(row.check_out_date) : undefined,
    notes: row.notes || undefined,
    image: row.image || undefined,
  };
};

/**
 * Map application Room object (camelCase) to Supabase DB columns (snake_case)
 */
export const mapRoomToRow = (data: Partial<Room>): Record<string, any> => {
  const row: Record<string, any> = {};

  if (data.id !== undefined) row.id = data.id;
  if (data.floor !== undefined) row.floor = data.floor;
  if (data.roomNumber !== undefined) row.room_number = data.roomNumber;
  if (data.bedType !== undefined) row.bed_type = data.bedType;
  if (data.viewType !== undefined) row.view_type = data.viewType;
  if (data.pricePerDay !== undefined) row.price_per_day = data.pricePerDay;
  if (data.status !== undefined) row.status = data.status;

  // Nullable fields: explicitly set null if undefined or empty string to clear previous values in DB
  if ('guestName' in data) row.guest_name = data.guestName ? data.guestName.trim() : null;
  if ('guestPhone' in data) row.guest_phone = data.guestPhone ? data.guestPhone.trim() : null;
  if ('checkInDate' in data) row.check_in_date = data.checkInDate || null;
  if ('checkOutDate' in data) row.check_out_date = data.checkOutDate || null;
  if ('notes' in data) row.notes = data.notes ? data.notes.trim() : null;
  if ('image' in data) row.image = data.image ? data.image.trim() : null;

  return row;
};

/**
 * Seed initial 18 rooms from initialData.ts into Supabase if empty
 */
export const seedRoomsToSupabase = async (
  roomsToSeed?: Room[]
): Promise<{
  total: number;
  inserted: number;
  skipped: number;
  error: string | null;
}> => {
  if (!supabase) {
    return { total: 0, inserted: 0, skipped: 0, error: 'Chưa cấu hình Supabase Client.' };
  }

  const initialList = roomsToSeed && roomsToSeed.length > 0 ? roomsToSeed : generateInitialRooms();

  try {
    // 1. Check existing rooms in database
    const { data: existingRows, error: checkError } = await supabase
      .from('rooms')
      .select('id, room_number');

    if (checkError) {
      return {
        total: initialList.length,
        inserted: 0,
        skipped: 0,
        error: formatRoomSupabaseError(checkError),
      };
    }

    const existingNumbers = new Set((existingRows || []).map((r) => r.room_number));
    const toInsert = initialList
      .filter((r) => !existingNumbers.has(r.roomNumber))
      .map((r) => mapRoomToRow(r));

    if (toInsert.length === 0) {
      return {
        total: initialList.length,
        inserted: 0,
        skipped: initialList.length,
        error: null,
      };
    }

    const { error: insertError } = await supabase.from('rooms').insert(toInsert);

    if (insertError) {
      return {
        total: initialList.length,
        inserted: 0,
        skipped: existingNumbers.size,
        error: formatRoomSupabaseError(insertError),
      };
    }

    return {
      total: initialList.length,
      inserted: toInsert.length,
      skipped: existingNumbers.size,
      error: null,
    };
  } catch (err: any) {
    return {
      total: initialList.length,
      inserted: 0,
      skipped: 0,
      error: err?.message || 'Lỗi ngoại lệ khi khởi tạo dữ liệu phòng vào Supabase.',
    };
  }
};

/**
 * Fetch all rooms from Supabase, ordered by room_number
 */
export const fetchRoomsFromSupabase = async (
  options: { autoSeedIfEmpty?: boolean } = { autoSeedIfEmpty: true }
): Promise<{ data: Room[]; error: string | null }> => {
  if (!supabase) {
    return {
      data: [],
      error: 'Chưa cấu hình Supabase Client. Vui lòng kiểm tra biến môi trường VITE_SUPABASE_URL.',
    };
  }

  try {
    const { data: rows, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number', { ascending: true });

    if (error) {
      return { data: [], error: formatRoomSupabaseError(error) };
    }

    // Auto-seed if table exists but has 0 records
    if ((!rows || rows.length === 0) && options.autoSeedIfEmpty) {
      const seedResult = await seedRoomsToSupabase();
      if (!seedResult.error && seedResult.inserted > 0) {
        // Re-fetch after seed
        const { data: seededRows, error: reError } = await supabase
          .from('rooms')
          .select('*')
          .order('room_number', { ascending: true });

        if (!reError && seededRows && seededRows.length > 0) {
          return { data: seededRows.map(mapRowToRoom), error: null };
        }
      }
    }

    const mappedRooms = (rows || []).map(mapRowToRoom);
    return { data: mappedRooms, error: null };
  } catch (err: any) {
    return {
      data: [],
      error: err?.message || 'Lỗi kết nối ngoại lệ khi tải danh sách phòng từ Supabase.',
    };
  }
};

/**
 * Update an existing room in Supabase (status, price, guest, dates, notes, image)
 */
export const updateRoomInSupabase = async (
  roomId: string,
  updatedData: Partial<Room>
): Promise<{ data: Room | null; error: string | null }> => {
  if (!supabase) {
    return { data: null, error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const payload = mapRoomToRow(updatedData);
    delete payload.id; // Do not update primary key id

    const { data, error } = await supabase
      .from('rooms')
      .update(payload)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      return { data: null, error: formatRoomSupabaseError(error) };
    }

    return { data: data ? mapRowToRoom(data) : null, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'Lỗi ngoại lệ khi cập nhật thông tin phòng trên Supabase.',
    };
  }
};
