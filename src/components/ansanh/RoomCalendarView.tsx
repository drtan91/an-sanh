import React, { useState, useMemo } from 'react';
import { Room, RoomBooking } from '../../types';
import { formatDate } from '../../utils/storage';
import { synthesizeBookingsFromRooms } from '../../services/bookingService';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface RoomCalendarViewProps {
  rooms: Room[];
  bookings?: RoomBooking[];
  onUpdateRoom?: (roomId: string, data: Partial<Room>) => Promise<void> | void;
  onOpenRoomModal?: (room: Room, options?: { editing?: boolean; checkInDate?: string }) => void;
  onOpenBookingModal?: (booking: RoomBooking | null, initialRoomId?: string, initialDate?: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Utility: Lấy ngày hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh: YYYY-MM-DD)
export const getVietnamTodayDateString = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

// Date math helper functions using noon to avoid daylight saving issues
const parseDateParts = (dStr: string): Date => {
  const [y, m, d] = dStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

const addDays = (dStr: string, days: number): string => {
  const dateObj = parseDateParts(dStr);
  dateObj.setDate(dateObj.getDate() + days);
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const diffInDays = (startStr: string, endStr: string): number => {
  const d1 = parseDateParts(startStr);
  const d2 = parseDateParts(endStr);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
};

const CELL_WIDTH = 44; // Độ rộng chuẩn pixel cho mỗi cột ngày

export const RoomCalendarView: React.FC<RoomCalendarViewProps> = ({
  rooms,
  bookings = [],
  onOpenRoomModal,
  onOpenBookingModal,
}) => {
  // 1. Ngày hôm nay theo chuẩn múi giờ Việt Nam
  const todayVN = useMemo(() => getVietnamTodayDateString(), []);

  // 2. Timeline state: Cột ngày đầu tiên BẮT BUỘC là ngày hiện tại (không mặc định ngày 1 của tháng)
  const [startDate, setStartDate] = useState<string>(todayVN);
  const [numberOfDays, setNumberOfDays] = useState<number>(30); // Mặc định hiển thị 30 ngày liên tục

  // 3. Effective bookings
  const effectiveBookings = useMemo(() => {
    if (bookings && bookings.length > 0) {
      return bookings;
    }
    return synthesizeBookingsFromRooms(rooms);
  }, [bookings, rooms]);

  // 4. Danh sách các ngày trong khoảng hiển thị [startDate -> startDate + numberOfDays - 1]
  const daysArray = useMemo(() => {
    const list: Array<{
      dateStr: string;
      dayNum: number;
      monthNum: number;
      yearNum: number;
      dayOfWeekVi: string;
      isWeekend: boolean;
      isToday: boolean;
    }> = [];

    const dayNamesVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let i = 0; i < numberOfDays; i++) {
      const dStr = addDays(startDate, i);
      const [y, m, d] = dStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = dateObj.getDay();

      list.push({
        dateStr: dStr,
        dayNum: d,
        monthNum: m,
        yearNum: y,
        dayOfWeekVi: dayNamesVi[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dStr === todayVN,
      });
    }

    return list;
  }, [startDate, numberOfDays, todayVN]);

  // 5. Phân nhóm 18 phòng theo 3 tầng (Tầng 2, Tầng 3, Tầng 4)
  const floorGroups = useMemo(() => {
    const floors = [2, 3, 4];
    return floors
      .map((fl) => ({
        floor: fl,
        rooms: rooms.filter((r) => r.floor === fl),
      }))
      .filter((g) => g.rooms.length > 0);
  }, [rooms]);

  // 6. Navigation Handlers (Di chuyển tự do về quá khứ và tương lai)
  const handleShiftDays = (days: number) => {
    setStartDate((prev) => addDays(prev, days));
  };

  const handleGoToday = () => {
    setStartDate(todayVN);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    // Input type="month" format YYYY-MM
    const [y, m] = e.target.value.split('-').map(Number);
    // Nếu tháng được chọn trùng tháng hiện tại, nhảy về hôm nay, ngược lại nhảy về ngày 1 của tháng đó
    const now = parseDateParts(todayVN);
    if (y === now.getFullYear() && m === now.getMonth() + 1) {
      setStartDate(todayVN);
    } else {
      setStartDate(`${y}-${String(m).padStart(2, '0')}-01`);
    }
  };

  // Tính nhãn khoảng ngày đang xem để hiển thị trên thanh tiêu đề
  const endDateStr = useMemo(() => addDays(startDate, numberOfDays - 1), [startDate, numberOfDays]);
  const rangeDisplayLabel = useMemo(() => {
    const d1 = parseDateParts(startDate);
    const d2 = parseDateParts(endDateStr);
    const str1 = `${d1.getDate()}/${d1.getMonth() + 1}/${d1.getFullYear()}`;
    const str2 = `${d2.getDate()}/${d2.getMonth() + 1}/${d2.getFullYear()}`;
    return `${str1} — ${str2}`;
  }, [startDate, endDateStr]);

  const currentMonthValue = useMemo(() => {
    const [y, m] = startDate.split('-');
    return `${y}-${m}`;
  }, [startDate]);

  const totalTrackWidth = numberOfDays * CELL_WIDTH;

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* 1. CONTROL & TIMELINE NAVIGATION BAR (TINH GỌN, TỐI ƯU KHÔNG GIAN) */}
      <div className="bg-white p-2 sm:p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Bộ điều hướng thời gian tự do */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Nút Hôm Nay */}
          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            title="Định vị lại ngày hôm nay"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Hôm nay</span>
          </button>

          {/* Cụm nút di chuyển nhanh: Lùi 30n, Lùi 7n, Tiến 7n, Tiến 30n */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleShiftDays(-30)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
              title="Lùi 30 ngày về trước"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleShiftDays(-7)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
              title="Lùi 7 ngày về trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Khoảng ngày đang hiển thị */}
            <div className="px-2.5 py-1 text-xs font-bold text-slate-800 whitespace-nowrap min-w-[130px] sm:min-w-[170px] text-center select-none">
              {rangeDisplayLabel}
            </div>

            <button
              type="button"
              onClick={() => handleShiftDays(7)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
              title="Tiến 7 ngày tới"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleShiftDays(30)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
              title="Tiến 30 ngày tới"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bộ chọn tháng nhanh */}
          <div className="relative inline-flex items-center">
            <input
              type="month"
              value={currentMonthValue}
              onChange={handleMonthChange}
              className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Chọn tháng bất kỳ để nhảy tới"
            />
          </div>
        </div>

        {/* Nút đặt phòng mới & Toggle số ngày */}
        <div className="flex items-center gap-2">
          {/* Tùy chọn xem 15 / 30 / 60 ngày */}
          <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            {[15, 30, 45].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setNumberOfDays(count)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  numberOfDays === count
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {count}n
              </button>
            ))}
          </div>

          {onOpenBookingModal && (
            <button
              type="button"
              onClick={() => onOpenBookingModal(null)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
              title="Tạo lịch đặt phòng mới"
            >
              <Plus className="w-4 h-4" />
              <span>Đặt Phòng</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TIMELINE MATRIX TABLE (GANTT VIEW) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto relative scrollbar-thin scrollbar-thumb-slate-300">
          <table className="border-collapse text-xs select-none w-full">
            {/* Header: Cột Phòng (Sticky) + Các cột Ngày */}
            <thead>
              <tr className="bg-slate-100/95 border-b border-slate-200 text-slate-700 sticky top-0 z-30">
                {/* Cột Phòng (Header tối ưu mobile: chỉ hiện chữ "Phòng") */}
                <th className="sticky left-0 top-0 z-40 bg-slate-100 px-2 py-2.5 text-center font-extrabold text-xs text-slate-800 w-[70px] min-w-[70px] sm:w-[84px] sm:min-w-[84px] border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                  Phòng
                </th>

                {/* Days Headers */}
                {daysArray.map((day) => {
                  const isFirstOfMonth = day.dayNum === 1;

                  return (
                    <th
                      key={day.dateStr}
                      className={`p-0 text-center font-semibold border-r border-slate-200/90 transition-colors ${
                        day.isToday
                          ? 'bg-emerald-100/90 text-emerald-900 border-b-2 border-b-emerald-600'
                          : day.isWeekend
                          ? 'bg-slate-200/60 text-slate-700'
                          : 'bg-slate-100/95 text-slate-700'
                      }`}
                      style={{ width: `${CELL_WIDTH}px`, minWidth: `${CELL_WIDTH}px` }}
                      title={`Ngày ${day.dayNum}/${day.monthNum}/${day.yearNum} (${day.dayOfWeekVi})`}
                    >
                      <div className="py-1 px-0.5 flex flex-col items-center justify-center">
                        <span className="text-[10px] uppercase font-semibold leading-tight opacity-75">
                          {day.dayOfWeekVi}
                        </span>
                        <span
                          className={`text-xs font-black leading-tight ${
                            day.isToday ? 'text-emerald-700' : ''
                          }`}
                        >
                          {day.dayNum}
                        </span>
                        {/* Nhãn tháng nếu là ngày 1 hoặc là ngày hôm nay */}
                        {day.isToday ? (
                          <span className="text-[8px] font-black text-emerald-700 uppercase tracking-tighter leading-none mt-0.5">
                            Nay
                          </span>
                        ) : isFirstOfMonth ? (
                          <span className="text-[8px] font-black text-blue-700 uppercase tracking-tighter leading-none mt-0.5">
                            T.{day.monthNum}
                          </span>
                        ) : (
                          <span className="text-[8px] text-transparent leading-none mt-0.5">.</span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body: Nhóm theo tầng và render các phòng */}
            <tbody className="divide-y divide-slate-100">
              {floorGroups.map((group) => (
                <React.Fragment key={group.floor}>
                  {/* Tiêu đề nhóm tầng (Gọn gàng, không làm tăng chiều rộng cột) */}
                  <tr className="bg-slate-100/80 text-slate-700 font-bold text-[11px]">
                    <td className="sticky left-0 z-20 bg-slate-100 px-2 py-1 text-center border-y border-slate-200 font-black text-[11px] text-slate-800 tracking-wider shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                      T.{group.floor}
                    </td>
                    <td
                      colSpan={daysArray.length}
                      className="px-3 py-1 border-y border-slate-200 text-slate-600 font-bold text-[11px]"
                    >
                      TẦNG {group.floor} • 6 PHÒNG (P.{group.floor}01 - P.{group.floor}06)
                    </td>
                  </tr>

                  {/* Danh sách 6 phòng trong tầng */}
                  {group.rooms.map((room) => {
                    const roomBookings = effectiveBookings.filter(
                      (b) => b.roomId === room.id && b.status !== 'Đã hủy'
                    );

                    return (
                      <tr key={room.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* Cột Phòng cố định (Sticky Left): CHỈ HIỂN THỊ MÃ PHÒNG (P.201, P.202, ...) */}
                        <td
                          onClick={() => onOpenRoomModal && onOpenRoomModal(room)}
                          className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 px-2 py-2 border-r border-slate-200 text-center shadow-[2px_0_4px_rgba(0,0,0,0.04)] cursor-pointer touch-manipulation w-[70px] min-w-[70px] sm:w-[84px] sm:min-w-[84px]"
                          title={`${room.roomNumber} • ${room.status} • Bấm xem chi tiết`}
                        >
                          <div className="flex items-center justify-between gap-1 w-full">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                              {room.roomNumber}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                room.status === 'Đã nhận'
                                  ? 'bg-indigo-600 ring-2 ring-indigo-200'
                                  : room.status === 'Đặt chỗ'
                                  ? 'bg-amber-500 ring-2 ring-amber-200'
                                  : 'bg-emerald-500 ring-2 ring-emerald-200'
                              }`}
                              title={room.status}
                            />
                          </div>
                        </td>

                        {/* Timeline Track: Chiều rộng đúng bằng số ngày * CELL_WIDTH */}
                        <td
                          colSpan={daysArray.length}
                          className="p-0 border-none relative overflow-hidden h-11"
                          style={{
                            width: `${totalTrackWidth}px`,
                            minWidth: `${totalTrackWidth}px`,
                          }}
                        >
                          {/* 1. Lưới nền các ô ngày (Background Day Cells) */}
                          <div className="absolute inset-0 flex h-full">
                            {daysArray.map((day) => (
                              <div
                                key={day.dateStr}
                                onClick={() =>
                                  onOpenBookingModal
                                    ? onOpenBookingModal(null, room.id, day.dateStr)
                                    : onOpenRoomModal &&
                                      onOpenRoomModal(room, {
                                        editing: true,
                                        checkInDate: day.dateStr,
                                      })
                                }
                                style={{
                                  width: `${CELL_WIDTH}px`,
                                  minWidth: `${CELL_WIDTH}px`,
                                }}
                                className={`h-full border-r border-slate-200/70 transition-colors cursor-pointer group/cell relative ${
                                  day.isToday
                                    ? 'bg-emerald-50/40'
                                    : day.isWeekend
                                    ? 'bg-slate-50/80'
                                    : 'bg-white'
                                } hover:bg-emerald-100/60`}
                                title={`Đặt ${room.roomNumber} từ ngày ${day.dayNum}/${day.monthNum}`}
                              >
                                {/* Dấu + hiển thị nhẹ khi hover ô trống */}
                                <div className="w-full h-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                  <Plus className="w-3.5 h-3.5 text-emerald-600/70" />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* 2. Lớp hiển thị Booking thành thanh liền mạch (Seamless Overlay Bars) */}
                          <div className="absolute inset-0 pointer-events-none overflow-hidden h-full">
                            {roomBookings.map((b) => {
                              // Quy tắc khoảng ngày [check_in_date, check_out_date):
                              // Check-in là ngày lưu trú đầu tiên.
                              // Check-out không tính là đêm lưu trú (ngày khách trả phòng).
                              const startIndex = diffInDays(startDate, b.checkInDate);
                              const endIndex = diffInDays(startDate, b.checkOutDate);

                              // Bỏ qua nếu toàn bộ booking nằm ngoài khoảng ngày đang xem
                              if (endIndex <= 0 || startIndex >= numberOfDays) {
                                return null;
                              }

                              const totalStayNights = Math.max(
                                1,
                                diffInDays(b.checkInDate, b.checkOutDate)
                              );

                              // Tọa độ pixel chính xác
                              const barLeftPx = startIndex * CELL_WIDTH;
                              const barWidthPx = (endIndex - startIndex) * CELL_WIDTH;

                              // Xử lý cắt mép vùng xem
                              const isClippedLeft = startIndex < 0;
                              const isClippedRight = endIndex > numberOfDays;

                              // Nếu booking bị cắt ở mép trái, bù padding-left để tên khách luôn nằm trong vùng nhìn thấy
                              const textOffsetPx = isClippedLeft
                                ? Math.max(0, -barLeftPx)
                                : 0;

                              const isOccupied = b.status === 'Đang ở';
                              const isReserved = b.status === 'Đặt chỗ';
                              const isFinished = b.status === 'Kết thúc';

                              return (
                                <div
                                  key={b.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenBookingModal) {
                                      onOpenBookingModal(b);
                                    } else if (onOpenRoomModal) {
                                      onOpenRoomModal(room);
                                    }
                                  }}
                                  style={{
                                    left: `${barLeftPx}px`,
                                    width: `${barWidthPx}px`,
                                  }}
                                  className={`absolute top-[6px] h-[32px] pointer-events-auto cursor-pointer transition-all flex items-center shadow-xs ring-1 ring-black/10 select-none ${
                                    isOccupied
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                      : isReserved
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                      : isFinished
                                      ? 'bg-slate-500 hover:bg-slate-600 text-white'
                                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                                  } ${
                                    isClippedLeft
                                      ? 'rounded-l-none border-l-2 border-dashed border-white/80'
                                      : 'rounded-l-lg'
                                  } ${
                                    isClippedRight
                                      ? 'rounded-r-none border-r-2 border-dashed border-white/80'
                                      : 'rounded-r-lg'
                                  }`}
                                  title={`${room.roomNumber}: ${b.guestName} (${formatDate(
                                    b.checkInDate
                                  )} → ${formatDate(b.checkOutDate)}) • ${b.status} • Bấm xem chi tiết`}
                                >
                                  {/* Nội dung thanh booking: Tên khách + Icon */}
                                  <div
                                    className="flex items-center h-full px-2 gap-1.5 overflow-hidden w-full"
                                    style={{ paddingLeft: `${textOffsetPx + 8}px` }}
                                  >
                                    {isOccupied ? (
                                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                    ) : isFinished ? (
                                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5 shrink-0" />
                                    )}

                                    <span className="font-extrabold text-xs truncate max-w-[240px] sm:max-w-[320px] leading-tight">
                                      {b.guestName}
                                    </span>

                                    <span className="text-[10px] opacity-85 shrink-0 hidden sm:inline">
                                      ({totalStayNights}n)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
