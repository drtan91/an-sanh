import React, { useState, useMemo } from 'react';
import { Room, RoomStatus, RoomBooking } from '../../types';
import { formatCurrency, formatDate } from '../../utils/storage';
import { synthesizeBookingsFromRooms } from '../../services/bookingService';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  UserCheck,
  BedDouble,
  Search,
  Filter,
  Eye,
  Plus,
  ArrowRight,
  Sparkles,
  Phone,
  User,
  RotateCcw,
  SlidersHorizontal,
  X,
  CheckCircle,
  CalendarDays,
  Layers,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface RoomCalendarViewProps {
  rooms: Room[];
  bookings?: RoomBooking[];
  onUpdateRoom: (roomId: string, data: Partial<Room>) => Promise<void> | void;
  onOpenRoomModal: (room: Room, options?: { editing?: boolean; checkInDate?: string }) => void;
  onOpenBookingModal?: (booking: RoomBooking | null, initialRoomId?: string, initialDate?: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const RoomCalendarView: React.FC<RoomCalendarViewProps> = ({
  rooms,
  bookings = [],
  onUpdateRoom,
  onOpenRoomModal,
  onOpenBookingModal,
  onRefresh,
  isLoading = false,
}) => {
  // Calendar month state: initialized to current date
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarSubMode, setCalendarSubMode] = useState<'timeline' | 'monthGrid'>('timeline');
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed (0 to 11)

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  // Array of day numbers: [1, 2, ..., daysInMonth]
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // First day of week for the month (0 = Sun, 1 = Mon ... 6 = Sat)
  const firstDayOfWeek = useMemo(() => {
    const day = new Date(year, month, 1).getDay();
    // In Vietnam calendar, Monday is first day of week: Mon=0, Tue=1 ... Sun=6
    return (day + 6) % 7;
  }, [year, month]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Helper format day to YYYY-MM-DD
  const formatDayString = (d: number): string => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  // Day names abbreviation in Vietnamese (Mon to Sun)
  const dayNamesVi = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const getDayOfWeekName = (d: number): string => {
    const dayOfWeek = new Date(year, month, d).getDay();
    const viIndex = (dayOfWeek + 6) % 7;
    return dayNamesVi[viIndex];
  };

  const isWeekend = (d: number): boolean => {
    const dayOfWeek = new Date(year, month, d).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  // Filtered rooms based on floor, status, search
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Floor filter
      if (selectedFloor !== 'all' && room.floor !== selectedFloor) return false;

      // Status filter
      if (selectedStatus !== 'all' && room.status !== selectedStatus) return false;

      // Search query (by room number or guest name or phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = room.roomNumber.toLowerCase().includes(q);
        const matchGuest = (room.guestName || '').toLowerCase().includes(q);
        const matchPhone = (room.guestPhone || '').includes(q);
        if (!matchNumber && !matchGuest && !matchPhone) return false;
      }

      return true;
    });
  }, [rooms, selectedFloor, selectedStatus, searchQuery]);

  // Effective bookings: use bookings prop if populated, otherwise synthesize from rooms
  const effectiveBookings = useMemo(() => {
    if (bookings && bookings.length > 0) {
      return bookings;
    }
    return synthesizeBookingsFromRooms(rooms);
  }, [bookings, rooms]);

  // Check if room has active booking overlapping this month
  const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Monthly stats
  const monthlyMetrics = useMemo(() => {
    let checkInsCount = 0;
    let checkOutsCount = 0;
    let occupiedCount = 0;
    let bookedCount = 0;
    let availableCount = 0;

    rooms.forEach((room) => {
      if (room.status === 'Đã nhận') occupiedCount++;
      else if (room.status === 'Đặt chỗ') bookedCount++;
      else availableCount++;
    });

    effectiveBookings.forEach((b) => {
      if (b.status === 'Đã hủy') return;
      if (b.checkInDate >= monthStartStr && b.checkInDate <= monthEndStr) {
        checkInsCount++;
      }
      if (b.checkOutDate >= monthStartStr && b.checkOutDate <= monthEndStr) {
        checkOutsCount++;
      }
    });

    const occupancyRate = rooms.length > 0 ? Math.round(((occupiedCount + bookedCount) / rooms.length) * 100) : 0;

    return {
      total: rooms.length,
      occupied: occupiedCount,
      booked: bookedCount,
      available: availableCount,
      checkInsThisMonth: checkInsCount,
      checkOutsThisMonth: checkOutsCount,
      occupancyRate,
    };
  }, [rooms, effectiveBookings, monthStartStr, monthEndStr]);

  // Map of daily events for Month Grid View
  const dailyEventMap = useMemo(() => {
    const map = new Map<string, {
      checkIns: RoomBooking[];
      checkOuts: RoomBooking[];
      staying: RoomBooking[];
      available: Room[];
    }>();

    daysArray.forEach((d) => {
      const dateStr = formatDayString(d);
      const checkIns: RoomBooking[] = [];
      const checkOuts: RoomBooking[] = [];
      const staying: RoomBooking[] = [];

      effectiveBookings.forEach((b) => {
        if (b.status === 'Đã hủy') return;

        if (b.checkInDate === dateStr) {
          checkIns.push(b);
        }
        if (b.checkOutDate === dateStr) {
          checkOuts.push(b);
        }
        // Active staying on this date
        if (b.checkInDate <= dateStr && b.checkOutDate >= dateStr && b.status !== 'Kết thúc') {
          staying.push(b);
        }
      });

      // A room is available on dateStr if it has NO active stay/reservation on dateStr
      const occupiedRoomIds = new Set(
        effectiveBookings
          .filter((b) => b.checkInDate <= dateStr && b.checkOutDate >= dateStr && b.status !== 'Đã hủy' && b.status !== 'Kết thúc')
          .map((b) => b.roomId)
      );

      const available = rooms.filter((r) => !occupiedRoomIds.has(r.id));

      map.set(dateStr, { checkIns, checkOuts, staying, available });
    });

    return map;
  }, [rooms, effectiveBookings, daysArray, year, month]);

  // Group rooms by floor (Tầng 2, Tầng 3, Tầng 4)
  const floorGroups = useMemo(() => {
    const floors = selectedFloor === 'all' ? [2, 3, 4] : [selectedFloor];
    return floors.map((fl) => ({
      floor: fl,
      rooms: filteredRooms.filter((r) => r.floor === fl),
    }));
  }, [filteredRooms, selectedFloor]);

  // Selected Day Details for Modal
  const dayDetailData = useMemo(() => {
    if (!selectedDayDetail) return null;
    return dailyEventMap.get(selectedDayDetail) || null;
  }, [selectedDayDetail, dailyEventMap]);

  return (
    <div className="space-y-4">
      {/* 1. TOP STATS BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Tổng 18 Buồng Phòng
          </span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{monthlyMetrics.total} phòng</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tầng 2, 3, 4 An Sanh</div>
        </div>

        <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">
              Đang Ở Cữ
            </span>
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-700 mt-0.5">{monthlyMetrics.occupied}</div>
          <div className="text-[11px] text-indigo-600/90 mt-0.5">Phòng đã nhận</div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
              Đặt Giữ Chỗ
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-0.5">{monthlyMetrics.booked}</div>
          <div className="text-[11px] text-amber-600/90 mt-0.5">Chờ ngày sinh & nhận</div>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
              Phòng Trống
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{monthlyMetrics.available}</div>
          <div className="text-[11px] text-emerald-600/90 mt-0.5">Sẵn sàng nhận khách</div>
        </div>

        <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">
              Check-in Tháng Này
            </span>
            <ArrowDownLeft className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-700 mt-0.5">{monthlyMetrics.checkInsThisMonth}</div>
          <div className="text-[11px] text-blue-600/90 mt-0.5">Lượt khách nhận phòng</div>
        </div>

        <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
              Check-out Tháng Này
            </span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700 mt-0.5">{monthlyMetrics.checkOutsThisMonth}</div>
          <div className="text-[11px] text-rose-600/90 mt-0.5">Lượt khách trả phòng</div>
        </div>
      </div>

      {/* 2. CALENDAR CONTROL & NAVIGATION BAR */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:text-emerald-700 transition-colors"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 py-1 font-bold text-sm text-slate-900 tracking-tight flex items-center gap-1.5 min-w-[130px] justify-center">
                <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tháng {month + 1} / {year}</span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:text-emerald-700 transition-colors"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoToday}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors"
            >
              Hôm nay
            </button>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
                title="Làm mới từ Supabase"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            )}
          </div>

          {/* Sub-mode Switcher & New Booking Button */}
          <div className="flex items-center gap-2">
            {onOpenBookingModal && (
              <button
                type="button"
                onClick={() => onOpenBookingModal(null)}
                className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Đặt Phòng Mới</span>
              </button>
            )}

            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCalendarSubMode('timeline')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  calendarSubMode === 'timeline'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Bảng Timeline 18 Phòng</span>
              </button>

              <button
                type="button"
                onClick={() => setCalendarSubMode('monthGrid')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  calendarSubMode === 'monthGrid'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Lịch Tháng Tổng Quát</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters: Floor, Status, Search Input */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Floor selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSelectedFloor('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  selectedFloor === 'all'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả tầng
              </button>
              {[2, 3, 4].map((fl) => (
                <button
                  key={fl}
                  type="button"
                  onClick={() => setSelectedFloor(fl)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    selectedFloor === fl
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tầng {fl}
                </button>
              ))}
            </div>

            {/* Status selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="Đã nhận">🔵 Đang ở cữ (Đã nhận)</option>
              <option value="Đặt chỗ">🟡 Đặt trước (Chờ nhận)</option>
              <option value="Trống">🟢 Phòng trống sẵn sàng</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm số phòng hoặc tên mẹ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN DISPLAY: TIMELINE MATRIX VS MONTH GRID */}
      {calendarSubMode === 'timeline' ? (
        /* ========================================================================= */
        /* MODE A: TIMELINE MATRIX VIEW (ROOM GANTT)                                 */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Legend Banner */}
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /> Chú thích trạng thái:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-600 inline-block shadow-2xs" />
                <span className="text-slate-700 font-medium">Đang ở cữ (Đã nhận)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block shadow-2xs" />
                <span className="text-slate-700 font-medium">Đặt giữ chỗ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300 inline-block" />
                <span className="text-slate-500">Phòng trống</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              💡 Bấm vào thanh đặt phòng hoặc ô trống để xem chi tiết / tùy chỉnh / nhận & trả phòng
            </div>
          </div>

          {/* Timeline Table Container */}
          <div className="overflow-x-auto relative">
            <table className="w-full border-collapse text-xs select-none">
              {/* Header Days Row */}
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700">
                  {/* Sticky left Room column header */}
                  <th className="sticky left-0 z-20 bg-slate-100 px-3 py-3 text-left font-bold text-slate-800 min-w-[170px] sm:min-w-[200px] border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="w-4 h-4 text-emerald-700" />
                      <span>Buồng Phòng (18)</span>
                    </div>
                  </th>

                  {/* Days headers 1 -> N */}
                  {daysArray.map((dayNum) => {
                    const dayStr = formatDayString(dayNum);
                    const isToday = dayStr === todayStr;
                    const weekend = isWeekend(dayNum);
                    const dayName = getDayOfWeekName(dayNum);

                    return (
                      <th
                        key={dayNum}
                        onClick={() => setSelectedDayDetail(dayStr)}
                        className={`p-1 text-center min-w-[34px] sm:min-w-[40px] font-semibold border-r border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors ${
                          isToday
                            ? 'bg-emerald-100/80 text-emerald-900 border-b-2 border-b-emerald-600'
                            : weekend
                            ? 'bg-slate-200/50 text-slate-600'
                            : 'text-slate-700'
                        }`}
                        title={`Xem chi tiết ngày ${dayNum}/${month + 1}/${year}`}
                      >
                        <div className="text-[10px] uppercase opacity-75">{dayName}</div>
                        <div className={`text-xs font-bold leading-tight ${isToday ? 'text-emerald-700' : ''}`}>
                          {dayNum}
                        </div>
                        {isToday && (
                          <span className="block text-[8px] font-black tracking-tighter text-emerald-700 uppercase">
                            Hôm nay
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Rows grouped by Floor */}
              <tbody className="divide-y divide-slate-100">
                {floorGroups.map((group) => {
                  if (group.rooms.length === 0) return null;

                  return (
                    <React.Fragment key={group.floor}>
                      {/* Floor Header separator */}
                      <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px]">
                        <td
                          colSpan={daysInMonth + 1}
                          className="px-3 py-1.5 border-y border-slate-200 sticky left-0 z-10 bg-slate-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>TẦNG {group.floor} ({group.rooms.length} phòng: P.{group.floor}01 - P.{group.floor}06)</span>
                          </div>
                        </td>
                      </tr>

                      {/* Rooms in this floor */}
                      {group.rooms.map((room) => {
                        const roomBookings = effectiveBookings.filter(
                          (b) => b.roomId === room.id && b.status !== 'Đã hủy'
                        );

                        return (
                          <tr key={room.id} className="hover:bg-slate-50/50 transition-colors group">
                            {/* Sticky Left Room Card */}
                            <td
                              onClick={() => onOpenRoomModal(room)}
                              className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 px-3 py-2.5 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.03)] cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
                                    {room.roomNumber}
                                  </span>
                                  <div>
                                    <div className="text-[11px] text-slate-500 font-medium leading-none">
                                      {room.bedType}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 leading-none">
                                      {formatCurrency(room.pricePerDay)}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                                    room.status === 'Đã nhận'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : room.status === 'Đặt chỗ'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {room.status}
                                </span>
                              </div>
                            </td>

                            {/* Timeline Cells for Day 1..N */}
                            {daysArray.map((dayNum) => {
                              const dayStr = formatDayString(dayNum);
                              const isToday = dayStr === todayStr;
                              const weekend = isWeekend(dayNum);

                              // Find any booking of this room covering this day
                              const activeBooking = roomBookings.find(
                                (b) => b.checkInDate <= dayStr && b.checkOutDate >= dayStr
                              );

                              if (activeBooking) {
                                const isFirstCell = dayStr === activeBooking.checkInDate || dayNum === 1;
                                const isLastCell = dayStr === activeBooking.checkOutDate || dayNum === daysInMonth;
                                const isOccupied = activeBooking.status === 'Đang ở';
                                const isReserved = activeBooking.status === 'Đặt chỗ';
                                const isFinished = activeBooking.status === 'Kết thúc';

                                const totalDays = Math.max(
                                  1,
                                  Math.round(
                                    (new Date(activeBooking.checkOutDate).getTime() -
                                      new Date(activeBooking.checkInDate).getTime()) /
                                      (1000 * 3600 * 24)
                                  )
                                );

                                return (
                                  <td
                                    key={dayNum}
                                    onClick={() =>
                                      onOpenBookingModal
                                        ? onOpenBookingModal(activeBooking)
                                        : onOpenRoomModal(room)
                                    }
                                    className={`p-0 h-10 border-r border-slate-200 relative cursor-pointer ${
                                      isToday ? 'bg-emerald-50/30' : weekend ? 'bg-slate-100/30' : ''
                                    }`}
                                    title={`${room.roomNumber}: ${activeBooking.guestName} (${formatDate(
                                      activeBooking.checkInDate
                                    )} - ${formatDate(activeBooking.checkOutDate)}) [${activeBooking.status}]`}
                                  >
                                    <div
                                      className={`h-7 my-1.5 mx-0 flex items-center px-1.5 transition-all text-white text-[11px] font-medium shadow-2xs ${
                                        isOccupied
                                          ? 'bg-indigo-600 hover:bg-indigo-700'
                                          : isReserved
                                          ? 'bg-amber-500 hover:bg-amber-600'
                                          : isFinished
                                          ? 'bg-slate-400 hover:bg-slate-500 opacity-75'
                                          : 'bg-emerald-600 hover:bg-emerald-700'
                                      } ${isFirstCell ? 'rounded-l-lg ml-0.5' : ''} ${
                                        isLastCell ? 'rounded-r-lg mr-0.5' : ''
                                      }`}
                                    >
                                      {/* Only display label on first cell of the bar */}
                                      {isFirstCell && (
                                        <div className="truncate whitespace-nowrap flex items-center gap-1 max-w-[280px]">
                                          {isOccupied ? (
                                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                          ) : isFinished ? (
                                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                          ) : (
                                            <Clock className="w-3.5 h-3.5 shrink-0" />
                                          )}
                                          <span className="font-bold truncate">
                                            {activeBooking.guestName}
                                          </span>
                                          <span className="text-[9px] opacity-80 shrink-0 hidden sm:inline">
                                            ({totalDays} ngày)
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              }

                              // Empty / Available cell
                              return (
                                <td
                                  key={dayNum}
                                  onClick={() =>
                                    onOpenBookingModal
                                      ? onOpenBookingModal(null, room.id, dayStr)
                                      : onOpenRoomModal(room, {
                                          editing: true,
                                          checkInDate: dayStr,
                                        })
                                  }
                                  className={`p-0 h-10 border-r border-slate-200 text-center relative cursor-pointer hover:bg-emerald-50/70 transition-colors group/cell ${
                                    isToday
                                      ? 'bg-emerald-50/40'
                                      : weekend
                                      ? 'bg-slate-50/70'
                                      : 'bg-white'
                                  }`}
                                  title={`Đặt ${room.roomNumber} từ ngày ${dayNum}/${month + 1}/${year}`}
                                >
                                  <div className="w-full h-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MODE B: MONTH GRID CALENDAR (7 COLUMNS / WEEK)                            */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-xs font-bold text-slate-700">
            {dayNamesVi.map((name, idx) => (
              <div
                key={name}
                className={`py-2.5 border-r border-slate-200 last:border-r-0 ${
                  idx >= 5 ? 'text-rose-700 bg-slate-200/40' : ''
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 border-collapse">
            {/* Blank cells for offset before 1st of month */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div
                key={`blank-${idx}`}
                className="min-h-[105px] sm:min-h-[125px] bg-slate-50/60 border-r border-b border-slate-200"
              />
            ))}

            {/* Days 1 -> daysInMonth */}
            {daysArray.map((dayNum) => {
              const dayStr = formatDayString(dayNum);
              const isToday = dayStr === todayStr;
              const events = dailyEventMap.get(dayStr);
              const checkIns = events?.checkIns || [];
              const checkOuts = events?.checkOuts || [];
              const staying = events?.staying || [];
              const available = events?.available || [];

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDayDetail(dayStr)}
                  className={`min-h-[105px] sm:min-h-[125px] p-1.5 sm:p-2 border-r border-b border-slate-200 hover:bg-slate-50/80 transition-colors flex flex-col justify-between cursor-pointer group ${
                    isToday ? 'bg-emerald-50/40' : 'bg-white'
                  }`}
                >
                  {/* Day number header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
                        isToday
                          ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                          : 'text-slate-800'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Stay count pill */}
                    {staying.length > 0 && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded-md">
                        {staying.length} đang ở
                      </span>
                    )}
                  </div>

                  {/* Day Badges */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {/* Check-ins on this date */}
                    {checkIns.slice(0, 2).map((bk) => (
                      <div
                        key={`in-${bk.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenBookingModal) onOpenBookingModal(bk);
                        }}
                        className="px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-200 text-[10px] font-semibold truncate flex items-center gap-1 transition-colors"
                        title={`Check-in: ${bk.roomNumber} - ${bk.guestName}`}
                      >
                        <ArrowDownLeft className="w-3 h-3 text-blue-700 shrink-0" />
                        <span className="font-bold">{bk.roomNumber}:</span>
                        <span className="truncate">{bk.guestName}</span>
                      </div>
                    ))}

                    {/* Check-outs on this date */}
                    {checkOuts.slice(0, 2).map((bk) => (
                      <div
                        key={`out-${bk.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenBookingModal) onOpenBookingModal(bk);
                        }}
                        className="px-1.5 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-200 text-[10px] font-semibold truncate flex items-center gap-1 transition-colors"
                        title={`Check-out: ${bk.roomNumber} - ${bk.guestName}`}
                      >
                        <ArrowUpRight className="w-3 h-3 text-rose-700 shrink-0" />
                        <span className="font-bold">{bk.roomNumber}:</span>
                        <span className="truncate">{bk.guestName}</span>
                      </div>
                    ))}

                    {/* More counter if multiple */}
                    {checkIns.length + checkOuts.length > 4 && (
                      <span className="text-[9px] text-slate-500 font-bold block pl-1">
                        +{checkIns.length + checkOuts.length - 4} lượt nhận/trả khác...
                      </span>
                    )}
                  </div>

                  {/* Footer status: available rooms */}
                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-emerald-700 font-medium">
                      {available.length} phòng trống
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-emerald-600 font-bold transition-opacity">
                      Chi tiết ➔
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. DAY BREAKDOWN MODAL */}
      {selectedDayDetail && dayDetailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base">
                    Lịch Buồng Phòng Ngày {formatDate(selectedDayDetail)}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Chi tiết nhận phòng, trả phòng và phòng trống ngày {selectedDayDetail}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Daily KPI */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Check-in</span>
                  <span className="text-lg font-bold text-blue-900">{dayDetailData.checkIns.length} lượt</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Check-out</span>
                  <span className="text-lg font-bold text-rose-900">{dayDetailData.checkOuts.length} lượt</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Phòng Trống</span>
                  <span className="text-lg font-bold text-emerald-900">{dayDetailData.available.length} phòng</span>
                </div>
              </div>

              {/* Check-ins List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                  Khách Nhận Phòng Trong Ngày ({dayDetailData.checkIns.length})
                </h4>
                {dayDetailData.checkIns.length > 0 ? (
                  <div className="space-y-1.5">
                    {dayDetailData.checkIns.map((bk) => (
                      <div
                        key={bk.id}
                        onClick={() => {
                          setSelectedDayDetail(null);
                          if (onOpenBookingModal) onOpenBookingModal(bk);
                        }}
                        className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {bk.roomNumber} • {bk.guestName}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {bk.guestPhone && `SĐT: ${bk.guestPhone} • `}
                            Từ {formatDate(bk.checkInDate)} đến {formatDate(bk.checkOutDate)}
                          </div>
                        </div>
                        <button className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px]">
                          Chi tiết
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Không có khách nhận phòng vào ngày này.</p>
                )}
              </div>

              {/* Check-outs List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  Khách Trả Phòng Trong Ngày ({dayDetailData.checkOuts.length})
                </h4>
                {dayDetailData.checkOuts.length > 0 ? (
                  <div className="space-y-1.5">
                    {dayDetailData.checkOuts.map((bk) => (
                      <div
                        key={bk.id}
                        onClick={() => {
                          setSelectedDayDetail(null);
                          if (onOpenBookingModal) onOpenBookingModal(bk);
                        }}
                        className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {bk.roomNumber} • {bk.guestName}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {bk.guestPhone && `SĐT: ${bk.guestPhone} • `}
                            Check-in từ: {formatDate(bk.checkInDate)}
                          </div>
                        </div>
                        <button className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px]">
                          Chi tiết
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Không có khách trả phòng vào ngày này.</p>
                )}
              </div>

              {/* Currently Staying List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Khách Đang Lưu Trú Ở Cữ ({dayDetailData.staying.length})
                </h4>
                {dayDetailData.staying.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dayDetailData.staying.map((bk) => (
                      <div
                        key={bk.id}
                        onClick={() => {
                          setSelectedDayDetail(null);
                          if (onOpenBookingModal) onOpenBookingModal(bk);
                        }}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-indigo-50/70 hover:border-indigo-200 transition-colors cursor-pointer"
                      >
                        <div className="font-bold text-slate-900">{bk.roomNumber}</div>
                        <div className="text-slate-700 truncate">{bk.guestName}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatDate(bk.checkInDate)} - {formatDate(bk.checkOutDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Không có khách lưu trú vào ngày này.</p>
                )}
              </div>

              {/* Available Rooms List on this day */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Phòng Trống Sẵn Sàng Ngày Này ({dayDetailData.available.length})
                </h4>
                {dayDetailData.available.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                    {dayDetailData.available.map((rm) => (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => {
                          setSelectedDayDetail(null);
                          if (onOpenBookingModal) {
                            onOpenBookingModal(null, rm.id, selectedDayDetail);
                          }
                        }}
                        className="p-1.5 bg-emerald-50/60 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors"
                      >
                        <span className="font-bold text-emerald-900">{rm.roomNumber}</span>
                        <span className="text-[10px] text-emerald-700 font-semibold">+ Đặt</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Tất cả các phòng đều đã kín lịch vào ngày này.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
