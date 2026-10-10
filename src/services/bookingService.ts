import { RoomBooking, BookingStatus, Room, RoomStatus } from '../types';
import { supabase } from '../lib/supabase';
import { updateRoomInSupabase } from './roomService';

/**
 * Format Supabase error for room_bookings
 */
export const formatBookingSupabaseError = (error: any): string => {
  if (!error) return 'Lỗi không xác định';
  const msg = error.message || '';
  const code = error.code || '';

  // 1. Vi phạm Database Exclusion Constraint: Trùng lịch đặt phòng
  if (
    code === '23P01' ||
    msg.includes('exclude_overlapping_room_bookings') ||
    msg.includes('exclusion_violation') ||
    msg.includes('conflicting key value violates exclusion constraint')
  ) {
    return 'Trùng lịch đặt phòng! Phòng này đã có lịch đặt hoặc khách đang ở trong khoảng thời gian được chọn.';
  }

  // 2. Vi phạm Check Constraint ngày đặt phòng
  if (code === '23514' || msg.includes('check_booking_dates')) {
    return 'Ngày trả phòng không hợp lệ: Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày.';
  }

  if (
    code === '42501' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security policy')
  ) {
    return 'Quyền truy cập: Cần quyền xác thực (authenticated) hoặc phân quyền RLS cho bảng "room_bookings" trên Supabase.';
  }

  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes("Could not find the table 'public.room_bookings'") ||
    msg.includes('relation "public.room_bookings" does not exist')
  ) {
    return 'Bảng "room_bookings" chưa được tạo trên Supabase. Vui lòng mở Supabase SQL Editor và chạy nội dung file supabase_room_bookings_schema.sql.';
  }

  return error.message || 'Lỗi kết nối cơ sở dữ liệu Supabase khi thao tác lịch đặt phòng.';
};

/**
 * Map DB row to RoomBooking
 */
export const mapRowToBooking = (row: any): RoomBooking => {
  return {
    id: row.id,
    roomId: row.room_id,
    roomNumber: row.room_number || '',
    guestName: row.guest_name || '',
    guestPhone: row.guest_phone || undefined,
    checkInDate: row.check_in_date ? String(row.check_in_date).substring(0, 10) : '',
    checkOutDate: row.check_out_date ? String(row.check_out_date).substring(0, 10) : '',
    status: (row.status as BookingStatus) || 'Đặt chỗ',
    totalPrice: row.total_price !== null && row.total_price !== undefined ? Number(row.total_price) : undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Map RoomBooking to DB row
 */
export const mapBookingToRow = (data: Partial<RoomBooking>): Record<string, any> => {
  const row: Record<string, any> = {};

  if (data.id !== undefined) row.id = data.id;
  if (data.roomId !== undefined) row.room_id = data.roomId;
  if (data.roomNumber !== undefined) row.room_number = data.roomNumber;
  if (data.guestName !== undefined) row.guest_name = data.guestName.trim();
  if ('guestPhone' in data) row.guest_phone = data.guestPhone ? data.guestPhone.trim() : null;
  if (data.checkInDate !== undefined) row.check_in_date = data.checkInDate;
  if (data.checkOutDate !== undefined) row.check_out_date = data.checkOutDate;
  if (data.status !== undefined) row.status = data.status;
  if ('totalPrice' in data) row.total_price = data.totalPrice !== undefined ? Number(data.totalPrice) : null;
  if ('notes' in data) row.notes = data.notes ? data.notes.trim() : null;

  return row;
};

/**
 * OVERLAP CHECK LOGIC:
 * Kiểm tra xem khoảng ngày [checkInDate, checkOutDate] có bị trùng với booking nào của cùng phòng hay không.
 * Điều kiện trùng giữa 2 khoảng [A_in, A_out] và [B_in, B_out]:
 *   A_in < B_out && A_out > B_in
 * Chỉ kiểm tra các booking có trạng thái hiệu lực ('Đặt chỗ', 'Đang ở').
 * Các booking có trạng thái 'Kết thúc' hoặc 'Đã hủy' không chặn lịch.
 */
export const checkBookingOverlap = (
  roomId: string,
  checkInDate: string,
  checkOutDate: string,
  excludeBookingId?: string,
  bookingsList: RoomBooking[] = []
): { hasOverlap: boolean; conflictingBooking?: RoomBooking } => {
  if (!roomId || !checkInDate || !checkOutDate) {
    return { hasOverlap: false };
  }

  const conflicting = bookingsList.find((b) => {
    // Chỉ kiểm tra cùng phòng
    if (b.roomId !== roomId) return false;

    // Loại trừ chính booking đang sửa (nếu có)
    if (excludeBookingId && b.id === excludeBookingId) return false;

    // Chỉ xét các booking đang có hiệu lực (chưa kết thúc, chưa hủy)
    if (b.status === 'Kết thúc' || b.status === 'Đã hủy') return false;

    const bIn = b.checkInDate;
    const bOut = b.checkOutDate;

    if (!bIn || !bOut) return false;

    // Khoảng thời gian giao nhau: startA < endB && endA > startB
    const isOverlap = checkInDate < bOut && checkOutDate > bIn;
    return isOverlap;
  });

  return {
    hasOverlap: Boolean(conflicting),
    conflictingBooking: conflicting,
  };
};

/**
 * Fetch all bookings from Supabase
 */
export const fetchBookingsFromSupabase = async (
  fallbackRooms: Room[] = []
): Promise<{ data: RoomBooking[]; error: string | null }> => {
  if (!supabase) {
    return { data: [], error: 'Chưa cấu hình Supabase Client.' };
  }

  try {
    const { data: rows, error } = await supabase
      .from('room_bookings')
      .select('*')
      .order('check_in_date', { ascending: true });

    if (error) {
      // Nếu bảng chưa tạo trên Supabase, chuyển đổi an toàn từ dữ liệu phòng hiện tại để không gián đoạn UI
      const isTableMissing =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        (error.message && error.message.includes('room_bookings'));

      if (isTableMissing) {
        const synthesized = synthesizeBookingsFromRooms(fallbackRooms);
        return {
          data: synthesized,
          error: formatBookingSupabaseError(error),
        };
      }

      return { data: [], error: formatBookingSupabaseError(error) };
    }

    // Nếu bảng rỗng nhưng phòng đang có dữ liệu, tự động đồng bộ sang room_bookings
    if ((!rows || rows.length === 0) && fallbackRooms.length > 0) {
      const initialBookings = synthesizeBookingsFromRooms(fallbackRooms);
      if (initialBookings.length > 0) {
        // Cố gắng insert vào Supabase nếu được
        try {
          const toInsert = initialBookings.map((b) => mapBookingToRow(b));
          await supabase.from('room_bookings').insert(toInsert);
        } catch {
          // Bỏ qua lỗi insert nếu có
        }
        return { data: initialBookings, error: null };
      }
    }

    const bookings = (rows || []).map(mapRowToBooking);
    return { data: bookings, error: null };
  } catch (err: any) {
    return {
      data: synthesizeBookingsFromRooms(fallbackRooms),
      error: err?.message || 'Lỗi ngoại lệ khi tải danh sách booking từ Supabase.',
    };
  }
};

/**
 * Chuyển các phòng đang có khách/đặt chỗ từ bảng rooms thành danh sách RoomBooking.
 * QUY TẮC CHUẨN: BỎ HOÀN TOÀN việc tự đoán +28 ngày.
 * Nếu checkOutDate IS NULL hoặc checkOutDate <= checkInDate thì BỎ QUA, không tạo booking.
 */
export const synthesizeBookingsFromRooms = (rooms: Room[]): RoomBooking[] => {
  const result: RoomBooking[] = [];
  rooms.forEach((r) => {
    if (r.status !== 'Trống' && r.checkInDate && r.guestName && r.checkOutDate) {
      const inDate = r.checkInDate;
      const outDate = r.checkOutDate;
      // Bỏ qua nếu ngày trả không hợp lệ hoặc <= ngày nhận
      if (outDate <= inDate) {
        return;
      }
      result.push({
        id: `bk-init-${r.id}`,
        roomId: r.id,
        roomNumber: r.roomNumber,
        guestName: r.guestName,
        guestPhone: r.guestPhone,
        checkInDate: inDate,
        checkOutDate: outDate,
        status: r.status === 'Đã nhận' ? 'Đang ở' : 'Đặt chỗ',
        notes: r.notes,
        createdAt: new Date().toISOString(),
      });
    }
  });
  return result;
};

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo giờ địa phương hiện tại của trình duyệt/hệ thống
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Tính toán trạng thái một phòng tại CURRENT_DATE dựa theo bookings hiệu lực.
 * Tuân thủ quy tắc khoảng nửa mở [check_in_date, check_out_date):
 * - Booking Đang ở và hôm nay nằm trong [check_in, check_out) -> rooms.status = "Đã nhận"
 * - Booking Đặt chỗ và hôm nay nằm trong [check_in, check_out) -> rooms.status = "Đặt chỗ"
 * - Không có booking hiệu lực hôm nay -> rooms.status = "Trống"
 * - Ngày check-out không còn tính là đang ở (phòng giải phóng, trở về "Trống" nếu ko có booking mới).
 * - Booking tương lai không được làm phòng hiện tại thành "Đã nhận" hay "Đặt chỗ".
 */
export const computeRoomStatusForToday = (
  room: Room,
  bookingsList: RoomBooking[],
  targetDateStr: string = getTodayDateString()
): Partial<Room> => {
  const roomBookings = bookingsList
    .filter((b) => b.roomId === room.id && b.status !== 'Đã hủy' && b.status !== 'Kết thúc')
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

  // 1. Tìm booking Đang ở hôm nay: check_in <= today < check_out
  const activeStay = roomBookings.find(
    (b) => b.status === 'Đang ở' && b.checkInDate <= targetDateStr && b.checkOutDate > targetDateStr
  );

  if (activeStay) {
    return {
      status: 'Đã nhận',
      guestName: activeStay.guestName,
      guestPhone: activeStay.guestPhone || undefined,
      checkInDate: activeStay.checkInDate,
      checkOutDate: activeStay.checkOutDate,
      notes: activeStay.notes || room.notes,
    };
  }

  // 2. Tìm booking Đặt chỗ hôm nay: check_in <= today < check_out
  const activeReservation = roomBookings.find(
    (b) => b.status === 'Đặt chỗ' && b.checkInDate <= targetDateStr && b.checkOutDate > targetDateStr
  );

  if (activeReservation) {
    return {
      status: 'Đặt chỗ',
      guestName: activeReservation.guestName,
      guestPhone: activeReservation.guestPhone || undefined,
      checkInDate: activeReservation.checkInDate,
      checkOutDate: activeReservation.checkOutDate,
      notes: activeReservation.notes || room.notes,
    };
  }

  // 3. Không có booking nào hôm nay: Phòng là TRỐNG!
  // (Ngày check-out, booking tương lai hoặc booking đã hủy/kết thúc đều cho ra trạng thái Trống)
  return {
    status: 'Trống',
    guestName: undefined,
    guestPhone: undefined,
    checkInDate: undefined,
    checkOutDate: undefined,
  };
};

/**
 * Tự động tính toán và đồng bộ trạng thái của phòng trong bảng rooms
 * dựa trên các booking hiệu lực của phòng đó vào ngày hiện tại
 */
export const syncRoomStateFromBookings = async (
  roomId: string,
  bookingsList: RoomBooking[],
  roomsList: Room[]
): Promise<Partial<Room>> => {
  const targetRoom = roomsList.find((r) => r.id === roomId);
  if (!targetRoom) return {};

  const payload = computeRoomStatusForToday(targetRoom, bookingsList);
  await updateRoomInSupabase(roomId, payload);
  return payload;
};

/**
 * Đồng bộ toàn bộ danh sách phòng theo CURRENT_DATE khi App mở hoặc reload/refresh.
 * Duyệt qua tất cả các phòng, nếu trạng thái tính theo CURRENT_DATE khác với trạng thái
 * hiện tại của phòng thì cập nhật lại DB và trả về danh sách phòng đồng bộ mới.
 */
export const syncAllRoomsFromBookings = async (
  roomsList: Room[],
  bookingsList: RoomBooking[]
): Promise<{ updatedRooms: Room[]; hasChanges: boolean }> => {
  if (!roomsList || roomsList.length === 0) {
    return { updatedRooms: roomsList, hasChanges: false };
  }

  let hasChanges = false;
  const updatedRooms: Room[] = [];

  for (const r of roomsList) {
    const computed = computeRoomStatusForToday(r, bookingsList);
    const isStatusDiff = r.status !== computed.status;
    const isGuestDiff = (r.guestName || '') !== (computed.guestName || '');
    const isInDateDiff = (r.checkInDate || '') !== (computed.checkInDate || '');
    const isOutDateDiff = (r.checkOutDate || '') !== (computed.checkOutDate || '');

    if (isStatusDiff || isGuestDiff || isInDateDiff || isOutDateDiff) {
      hasChanges = true;
      const merged: Room = {
        ...r,
        status: computed.status as RoomStatus,
        guestName: computed.guestName,
        guestPhone: computed.guestPhone,
        checkInDate: computed.checkInDate,
        checkOutDate: computed.checkOutDate,
      };
      updatedRooms.push(merged);
      try {
        await updateRoomInSupabase(r.id, computed);
      } catch (e) {
        // Ignored
      }
    } else {
      updatedRooms.push(r);
    }
  }

  return { updatedRooms, hasChanges };
};

/**
 * Tạo Booking mới với kiểm tra trùng lịch (Overlap Validation)
 */
export const createBookingInSupabase = async (
  bookingData: Omit<RoomBooking, 'id'>,
  existingBookings: RoomBooking[] = [],
  roomsList: Room[] = []
): Promise<{ data: RoomBooking | null; error: string | null }> => {
  // 1. Validate ngày hợp lệ
  if (!bookingData.roomId || !bookingData.checkInDate || !bookingData.checkOutDate || !bookingData.guestName.trim()) {
    return { data: null, error: 'Vui lòng điền đầy đủ: Phòng, Tên khách, Ngày nhận và Ngày trả phòng.' };
  }

  if (bookingData.checkOutDate <= bookingData.checkInDate) {
    return { data: null, error: 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày.' };
  }

  // 2. Overlap Validation
  const overlap = checkBookingOverlap(
    bookingData.roomId,
    bookingData.checkInDate,
    bookingData.checkOutDate,
    undefined,
    existingBookings
  );

  if (overlap.hasOverlap && overlap.conflictingBooking) {
    const cb = overlap.conflictingBooking;
    return {
      data: null,
      error: `Trùng lịch đặt phòng! Phòng ${bookingData.roomNumber} đã có lịch của khách "${cb.guestName}" từ ${cb.checkInDate} đến ${cb.checkOutDate} (Trạng thái: ${cb.status}). Vui lòng chọn khoảng ngày khác.`,
    };
  }

  const newBooking: RoomBooking = {
    ...bookingData,
    id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!supabase) {
    const updatedBookings = [...existingBookings, newBooking];
    await syncRoomStateFromBookings(newBooking.roomId, updatedBookings, roomsList);
    return { data: newBooking, error: null };
  }

  try {
    const row = mapBookingToRow(newBooking);
    const { data, error } = await supabase.from('room_bookings').insert([row]).select().single();

    if (error) {
      // Nếu bảng chưa có trên DB, vẫn cập nhật local và sync trạng thái phòng
      if (error.code === 'PGRST205' || error.code === '42P01') {
        const updatedBookings = [...existingBookings, newBooking];
        await syncRoomStateFromBookings(newBooking.roomId, updatedBookings, roomsList);
        return { data: newBooking, error: null };
      }
      return { data: null, error: formatBookingSupabaseError(error) };
    }

    const createdBooking = data ? mapRowToBooking(data) : newBooking;

    // Tự động đồng bộ trạng thái phòng tương ứng trong bảng rooms
    const updatedBookings = [...existingBookings, createdBooking];
    await syncRoomStateFromBookings(createdBooking.roomId, updatedBookings, roomsList);

    return { data: createdBooking, error: null };
  } catch (err: any) {
    return { data: newBooking, error: null };
  }
};

/**
 * Cập nhật Booking có kiểm tra trùng lịch
 */
export const updateBookingInSupabase = async (
  bookingId: string,
  updatedData: Partial<RoomBooking>,
  existingBookings: RoomBooking[] = [],
  roomsList: Room[] = []
): Promise<{ data: RoomBooking | null; error: string | null }> => {
  const current = existingBookings.find((b) => b.id === bookingId);
  if (!current) {
    return { data: null, error: 'Không tìm thấy thông tin booking cần sửa.' };
  }

  const roomId = updatedData.roomId || current.roomId;
  const inDate = updatedData.checkInDate || current.checkInDate;
  const outDate = updatedData.checkOutDate || current.checkOutDate;
  const status = updatedData.status || current.status;

  if (outDate <= inDate) {
    return { data: null, error: 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày.' };
  }

  // Overlap Validation (nếu trạng thái vẫn là Đặt chỗ hoặc Đang ở)
  if (status !== 'Kết thúc' && status !== 'Đã hủy') {
    const overlap = checkBookingOverlap(roomId, inDate, outDate, bookingId, existingBookings);
    if (overlap.hasOverlap && overlap.conflictingBooking) {
      const cb = overlap.conflictingBooking;
      return {
        data: null,
        error: `Trùng lịch đặt phòng! Phòng ${current.roomNumber} đã có lịch của khách "${cb.guestName}" từ ${cb.checkInDate} đến ${cb.checkOutDate} (Trạng thái: ${cb.status}).`,
      };
    }
  }

  const merged: RoomBooking = {
    ...current,
    ...updatedData,
    updatedAt: new Date().toISOString(),
  };

  if (!supabase) {
    const updatedBookings = existingBookings.map((b) => (b.id === bookingId ? merged : b));
    if (current.roomId && merged.roomId && current.roomId !== merged.roomId) {
      await syncRoomStateFromBookings(current.roomId, updatedBookings, roomsList);
      await syncRoomStateFromBookings(merged.roomId, updatedBookings, roomsList);
    } else {
      await syncRoomStateFromBookings(roomId, updatedBookings, roomsList);
    }
    return { data: merged, error: null };
  }

  try {
    const row = mapBookingToRow(merged);
    delete row.id;

    const { data, error } = await supabase
      .from('room_bookings')
      .update(row)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return { data: merged, error: null };
      }
      return { data: null, error: formatBookingSupabaseError(error) };
    }

    const updated = data ? mapRowToBooking(data) : merged;

    // Tự động đồng bộ trạng thái phòng tương ứng trong bảng rooms:
    // Nếu đổi phòng (current.roomId !== updated.roomId), đồng bộ CẢ HAI phòng:
    // cả phòng cũ và phòng mới, không để phòng cũ giữ trạng thái 'Đã nhận'!
    const updatedBookings = existingBookings.map((b) => (b.id === bookingId ? updated : b));
    if (current.roomId && updated.roomId && current.roomId !== updated.roomId) {
      await syncRoomStateFromBookings(current.roomId, updatedBookings, roomsList);
      await syncRoomStateFromBookings(updated.roomId, updatedBookings, roomsList);
    } else {
      await syncRoomStateFromBookings(roomId, updatedBookings, roomsList);
    }

    return { data: updated, error: null };
  } catch (err: any) {
    return { data: merged, error: null };
  }
};

/**
 * KẾT THÚC BOOKING (CHECKOUT SỚM / ĐÚNG HẠN)
 * Khi một booking "Kết thúc":
 * 1. Chuyển status = 'Kết thúc'
 * 2. Cập nhật check_out_date = ngày thực tế kết thúc (mặc định hôm nay)
 * 3. Ngay lập tức giải phóng phòng từ ngày tiếp theo: Phòng trở về 'Trống' trên Sơ đồ buồng phòng & Calendar!
 */
export const checkoutBookingInSupabase = async (
  bookingId: string,
  actualEndDate?: string,
  existingBookings: RoomBooking[] = [],
  roomsList: Room[] = []
): Promise<{ data: RoomBooking | null; error: string | null }> => {
  const current = existingBookings.find((b) => b.id === bookingId);
  if (!current) {
    return { data: null, error: 'Không tìm thấy thông tin đặt phòng cần kết thúc.' };
  }

  const todayStr = getTodayDateString();
  const targetEnd = actualEndDate || todayStr;
  // Đảm bảo không vi phạm ràng buộc CHECK (check_out_date > check_in_date) trên Postgres
  const end = targetEnd > current.checkInDate ? targetEnd : current.checkOutDate;

  return updateBookingInSupabase(
    bookingId,
    {
      status: 'Kết thúc',
      checkOutDate: end,
    },
    existingBookings,
    roomsList
  );
};

/**
 * HỦY BOOKING (CANCEL)
 */
export const cancelBookingInSupabase = async (
  bookingId: string,
  existingBookings: RoomBooking[] = [],
  roomsList: Room[] = []
): Promise<{ data: RoomBooking | null; error: string | null }> => {
  return updateBookingInSupabase(
    bookingId,
    { status: 'Đã hủy' },
    existingBookings,
    roomsList
  );
};

/**
 * XÓA HẲN BOOKING KHỎI SUPABASE
 */
export const deleteBookingFromSupabase = async (
  bookingId: string,
  roomId: string,
  existingBookings: RoomBooking[] = [],
  roomsList: Room[] = []
): Promise<{ success: boolean; error: string | null }> => {
  if (!supabase) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.from('room_bookings').delete().eq('id', bookingId);
    if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
      return { success: false, error: formatBookingSupabaseError(error) };
    }

    // Đồng bộ lại phòng
    const remainingBookings = existingBookings.filter((b) => b.id !== bookingId);
    await syncRoomStateFromBookings(roomId, remainingBookings, roomsList);

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi khi xóa đặt phòng từ Supabase' };
  }
};
