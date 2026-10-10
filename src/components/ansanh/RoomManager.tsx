import React, { useState, useMemo } from 'react';
import { Room, RoomStatus, RoomBooking } from '../../types';
import { formatCurrency, formatDate } from '../../utils/storage';
import {
  BedDouble,
  Building,
  CheckCircle2,
  Clock,
  UserCheck,
  Calendar,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  Phone,
  Sun,
  Eye,
  RotateCcw,
  AlertCircle,
  Plus
} from 'lucide-react';
import { RoomDetailModal } from './RoomDetailModal';
import { RoomCalendarView } from './RoomCalendarView';
import { BookingModal } from './BookingModal';

interface RoomManagerProps {
  rooms: Room[];
  bookings?: RoomBooking[];
  onUpdateRoom: (roomId: string, data: Partial<Room>) => Promise<void> | void;
  onCreateBooking?: (
    bookingData: Omit<RoomBooking, 'id'>
  ) => Promise<{ success: boolean; error?: string | null }>;
  onUpdateBooking?: (
    bookingId: string,
    data: Partial<RoomBooking>
  ) => Promise<{ success: boolean; error?: string | null }>;
  onCheckoutBooking?: (bookingId: string, actualEndDate?: string) => Promise<{ success: boolean; error?: string | null } | void>;
  onCancelBooking?: (bookingId: string) => Promise<{ success: boolean; error?: string | null } | void>;
  onDeleteBooking?: (bookingId: string, roomId: string) => Promise<{ success: boolean; error?: string | null } | void>;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const RoomManager: React.FC<RoomManagerProps> = ({
  rooms,
  bookings = [],
  onUpdateRoom,
  onCreateBooking,
  onUpdateBooking,
  onCheckoutBooking,
  onCancelBooking,
  onDeleteBooking,
  isLoading = false,
  error = null,
  onRefresh,
}) => {
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [modalOptions, setModalOptions] = useState<{ editing?: boolean; checkInDate?: string }>({});

  // Booking Modal States
  const [selectedBooking, setSelectedBooking] = useState<RoomBooking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingModalInitialRoomId, setBookingModalInitialRoomId] = useState<string | undefined>();
  const [bookingModalInitialDate, setBookingModalInitialDate] = useState<string | undefined>();

  const handleOpenRoomModal = (room: Room, options?: { editing?: boolean; checkInDate?: string }) => {
    setSelectedRoom(room);
    setModalOptions(options || {});
  };

  const handleCloseRoomModal = () => {
    setSelectedRoom(null);
    setModalOptions({});
  };

  const handleOpenBookingModal = (
    booking: RoomBooking | null,
    initialRoomId?: string,
    initialDate?: string
  ) => {
    setSelectedBooking(booking);
    setBookingModalInitialRoomId(initialRoomId);
    setBookingModalInitialDate(initialDate);
    setIsBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setSelectedBooking(null);
    setBookingModalInitialRoomId(undefined);
    setBookingModalInitialDate(undefined);
    setIsBookingModalOpen(false);
  };

  const handleSaveBooking = async (
    bookingData: Partial<RoomBooking>,
    bookingId?: string
  ): Promise<{ success: boolean; error?: string | null }> => {
    if (bookingId && onUpdateBooking) {
      return onUpdateBooking(bookingId, bookingData);
    }
    if (!bookingId && onCreateBooking) {
      return onCreateBooking(bookingData as Omit<RoomBooking, 'id'>);
    }
    return { success: true };
  };

  // Statistics
  const stats = useMemo(() => {
    const total = rooms.length; // 18 rooms
    const available = rooms.filter((r) => r.status === 'Trống').length;
    const booked = rooms.filter((r) => r.status === 'Đặt chỗ').length;
    const occupied = rooms.filter((r) => r.status === 'Đã nhận').length;
    const occupancyRate = total > 0 ? Math.round(((occupied + booked) / total) * 100) : 0;
    return { total, available, booked, occupied, occupancyRate };
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchFloor = selectedFloor === 'all' || r.floor === selectedFloor;
      const matchStatus = selectedStatus === 'all' || r.status === selectedStatus;
      return matchFloor && matchStatus;
    });
  }, [rooms, selectedFloor, selectedStatus]);

  const getStatusBadge = (st: RoomStatus) => {
    switch (st) {
      case 'Trống':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Đặt chỗ':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Đã nhận':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    }
  };

  const floors = [2, 3, 4] as const;

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Error alert banner from Supabase */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Thử lại
            </button>
          )}
        </div>
      )}

      {/* Main View Mode Selector: Lịch Phòng | Hiện trạng */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 whitespace-nowrap touch-manipulation ${
              viewMode === 'calendar'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Lịch Phòng</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 whitespace-nowrap touch-manipulation ${
              viewMode === 'grid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Hiện trạng</span>
          </button>
        </div>
      </div>

      {/* Render CALENDAR view if selected */}
      {viewMode === 'calendar' ? (
        <RoomCalendarView
          rooms={rooms}
          bookings={bookings}
          onUpdateRoom={onUpdateRoom}
          onOpenRoomModal={handleOpenRoomModal}
          onOpenBookingModal={handleOpenBookingModal}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />
      ) : (
        <>
          {/* Top Metric Cards for Grid and Table */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tổng Số Phòng Ở Cữ
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{stats.total} phòng</div>
              <div className="text-xs text-slate-500 mt-0.5 sm:mt-1">3 tầng (Tầng 2, 3, 4)</div>
            </div>

            <div className="p-2.5 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Phòng Trống
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-0.5 sm:mt-1">{stats.available}</div>
              <div className="text-xs text-emerald-700 mt-0.5 sm:mt-1">Sẵn sàng đón mẹ & bé</div>
            </div>

            <div className="p-2.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Phòng Đã Đặt Chỗ
                </span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-0.5 sm:mt-1">{stats.booked}</div>
              <div className="text-xs text-amber-700 mt-0.5 sm:mt-1">Chờ ngày mẹ sinh & nhận</div>
            </div>

            <div className="p-2.5 sm:p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-800">
                  Phòng Đang Ở (Đã nhận)
                </span>
                <UserCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-indigo-700 mt-0.5 sm:mt-1">{stats.occupied}</div>
              <div className="text-xs text-indigo-700 mt-0.5 sm:mt-1">Mẹ & bé đang dưỡng cữ</div>
            </div>

            <div className="p-2.5 sm:p-4 rounded-2xl bg-teal-50/70 border border-teal-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">
                  Công Suất Khai Thác
                </span>
                <Sparkles className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-teal-700 mt-0.5 sm:mt-1">{stats.occupancyRate}%</div>
              <div className="text-xs text-teal-700 mt-0.5 sm:mt-1">Tỷ lệ sử dụng buồng phòng</div>
            </div>
          </div>

          {/* Control Bar: Floor filter & Status filter */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Floor selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
              <button
                onClick={() => setSelectedFloor('all')}
                className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFloor === 'all'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả (18 phòng)
              </button>
              {floors.map((fl) => (
                <button
                  key={fl}
                  onClick={() => setSelectedFloor(fl)}
                  className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedFloor === fl
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tầng {fl} (6 phòng)
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Tất cả tình trạng</option>
                <option value="Trống">🟢 Phòng Trống</option>
                <option value="Đặt chỗ">🟡 Đặt Chỗ</option>
                <option value="Đã nhận">🔵 Đã Nhận Phòng</option>
              </select>
            </div>
          </div>

          {/* Hiện trạng: Grid View */}
          <div className="space-y-6">
            {(selectedFloor === 'all' ? floors : [selectedFloor]).map((floorNum) => {
              const floorRooms = filteredRooms.filter((r) => r.floor === floorNum);
              if (floorRooms.length === 0) return null;

              return (
                <div key={floorNum} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        {floorNum}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm tracking-tight">
                        Sơ Đồ Phòng Tầng {floorNum} (6 phòng: P.{floorNum}01 - P.{floorNum}06)
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500">
                      {floorRooms.filter((r) => r.status === 'Đã nhận').length} đang ở •{' '}
                      {floorRooms.filter((r) => r.status === 'Đặt chỗ').length} đã đặt •{' '}
                      {floorRooms.filter((r) => r.status === 'Trống').length} trống
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {floorRooms.map((room) => {
                      const isOccupied = room.status === 'Đã nhận';
                      const isBooked = room.status === 'Đặt chỗ';

                      return (
                        <div
                          key={room.id}
                          onClick={() => handleOpenRoomModal(room)}
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          {/* Image Thumbnail & Badge */}
                          <div className="relative h-36 bg-slate-100 overflow-hidden">
                            {room.image ? (
                              <img
                                src={room.image}
                                alt={room.roomNumber}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                                <BedDouble className="w-10 h-10" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                            <div className="absolute top-2.5 left-2.5">
                              <span className="font-bold text-sm bg-black/50 text-white px-2.5 py-1 rounded-lg backdrop-blur-sm">
                                {room.roomNumber}
                              </span>
                            </div>

                            <div className="absolute top-2.5 right-2.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-xs ${getStatusBadge(room.status)}`}>
                                {room.status}
                              </span>
                            </div>

                            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-xs">
                              <span>
                                {room.bedType} • {room.viewType}
                              </span>
                              <span className="font-bold">{formatCurrency(room.pricePerDay)}/ngày</span>
                            </div>
                          </div>

                          {/* Room Card Body */}
                          <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              {isOccupied || isBooked ? (
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Khách ở:</span>
                                    <span className="font-bold text-slate-800 truncate max-w-[150px]">
                                      {room.guestName || 'Khách đã đặt'}
                                    </span>
                                  </div>
                                  {room.checkInDate && (
                                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                                      <span>Thời gian:</span>
                                      <span>
                                        {formatDate(room.checkInDate)} - {formatDate(room.checkOutDate)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="py-2.5 px-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Phòng sẵn sàng đón mẹ và bé ở cữ</span>
                                </div>
                              )}

                              {room.notes && (
                                <p className="text-xs text-slate-500 mt-2 line-clamp-1 italic">
                                  {room.notes}
                                </p>
                              )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                              <span className="flex items-center gap-1 group-hover:underline">
                                <Eye className="w-3.5 h-3.5" /> Xem & Tùy chỉnh phòng
                              </span>
                              <span className="text-slate-400 text-[11px]">Tầng {room.floor}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Room Detail Modal - Shared across Grid, Table, and Calendar */}
      <RoomDetailModal
        isOpen={!!selectedRoom}
        onClose={handleCloseRoomModal}
        room={selectedRoom}
        initialEditing={modalOptions.editing}
        initialCheckInDate={modalOptions.checkInDate}
        bookings={bookings}
        onOpenBookingModal={handleOpenBookingModal}
        onCheckoutBooking={onCheckoutBooking ? (bkId) => onCheckoutBooking(bkId) : undefined}
        onSaveRoom={(roomId, updatedData) => {
          onUpdateRoom(roomId, updatedData);
          if (selectedRoom && selectedRoom.id === roomId) {
            setSelectedRoom({ ...selectedRoom, ...updatedData });
          }
        }}
      />

      {/* Booking Modal - Create / Edit / Checkout */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={handleCloseBookingModal}
        booking={selectedBooking}
        initialRoomId={bookingModalInitialRoomId}
        initialDate={bookingModalInitialDate}
        rooms={rooms}
        bookings={bookings}
        onSaveBooking={handleSaveBooking}
        onCheckoutBooking={onCheckoutBooking}
        onCancelBooking={onCancelBooking}
        onDeleteBooking={onDeleteBooking}
      />
    </div>
  );
};

