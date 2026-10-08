import React, { useState, useEffect, useMemo } from 'react';
import { Room, RoomStatus, BedType, ViewType, RoomBooking } from '../../types';
import { formatCurrency, formatDate } from '../../utils/storage';
import {
  X,
  BedDouble,
  Sun,
  DollarSign,
  User,
  Phone,
  Calendar,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Edit3
} from 'lucide-react';

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  onSaveRoom: (roomId: string, updatedData: Partial<Room>) => void;
  initialEditing?: boolean;
  initialCheckInDate?: string;
  bookings?: RoomBooking[];
  onOpenBookingModal?: (booking: RoomBooking | null, initialRoomId?: string, initialDate?: string) => void;
  onCheckoutBooking?: (bookingId: string) => Promise<void>;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  isOpen,
  onClose,
  room,
  onSaveRoom,
  initialEditing = false,
  initialCheckInDate,
  bookings = [],
  onOpenBookingModal,
  onCheckoutBooking,
}) => {
  if (!isOpen || !room) return null;

  const roomBookings = useMemo(() => {
    return bookings
      .filter((b) => b.roomId === room.id && b.status !== 'Đã hủy')
      .sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
  }, [bookings, room.id]);

  const [isEditing, setIsEditing] = useState(initialEditing);
  const [bedType, setBedType] = useState<BedType>(room.bedType);
  const [viewType, setViewType] = useState<ViewType>(room.viewType);
  const [pricePerDay, setPricePerDay] = useState(room.pricePerDay);
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const [guestName, setGuestName] = useState(room.guestName || '');
  const [guestPhone, setGuestPhone] = useState(room.guestPhone || '');
  const [checkInDate, setCheckInDate] = useState(initialCheckInDate || room.checkInDate || '');
  const [checkOutDate, setCheckOutDate] = useState(room.checkOutDate || '');
  const [notes, setNotes] = useState(room.notes || '');
  const [imageUrl, setImageUrl] = useState(room.image || '');

  // Keep internal state synchronized whenever selected room changes
  useEffect(() => {
    if (room) {
      setBedType(room.bedType);
      setViewType(room.viewType);
      setPricePerDay(room.pricePerDay);
      setStatus(room.status);
      setGuestName(room.guestName || '');
      setGuestPhone(room.guestPhone || '');
      setCheckInDate(initialCheckInDate || room.checkInDate || '');
      setCheckOutDate(room.checkOutDate || '');
      setNotes(room.notes || '');
      setImageUrl(room.image || '');
      setIsEditing(initialEditing);
    }
  }, [room?.id, isOpen, initialEditing, initialCheckInDate]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRoom(room.id, {
      bedType,
      viewType,
      pricePerDay: Number(pricePerDay),
      status,
      guestName: guestName.trim() || undefined,
      guestPhone: guestPhone.trim() || undefined,
      checkInDate: checkInDate || undefined,
      checkOutDate: checkOutDate || undefined,
      notes: notes.trim(),
      image: imageUrl.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleQuickCheckIn = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultOut = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    onSaveRoom(room.id, {
      status: 'Đã nhận',
      checkInDate: today,
      checkOutDate: defaultOut,
      guestName: guestName || 'Khách nhận phòng hôm nay',
    });
    onClose();
  };

  const handleQuickCheckOut = () => {
    if (window.confirm(`Xác nhận trả phòng ${room.roomNumber} và chuyển trạng thái về Trống?`)) {
      onSaveRoom(room.id, {
        status: 'Trống',
        guestName: undefined,
        guestPhone: undefined,
        checkInDate: undefined,
        checkOutDate: undefined,
      });
      onClose();
    }
  };

  const getStatusStyle = (st: RoomStatus) => {
    switch (st) {
      case 'Trống':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Đặt chỗ':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Đã nhận':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Room Header with Image */}
        <div className="relative h-40 sm:h-48 bg-slate-800 overflow-hidden shrink-0">
          {room.image ? (
            <img
              src={room.image}
              alt={`Phòng ${room.roomNumber}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white">
              <BedDouble className="w-16 h-16 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Phòng {room.roomNumber}
                </h2>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-md backdrop-blur-sm">
                  Tầng {room.floor}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1">
                {room.bedType} • Hướng {room.viewType} • {formatCurrency(room.pricePerDay)}/ngày
              </p>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(room.status)}`}>
              {room.status}
            </span>
          </div>
        </div>

        {/* Body Content */}
        {!isEditing ? (
          <div className="p-4 sm:p-6 space-y-4 text-slate-800 overflow-y-auto flex-1">
            {/* Quick action buttons */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              {room.status === 'Trống' && (
                <button
                  onClick={handleQuickCheckIn}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Nhận Phòng Nhanh
                </button>
              )}
              {room.status === 'Đã nhận' && (
                <button
                  onClick={handleQuickCheckOut}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4" /> Trả Phòng & Dọn Dẹp
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Tùy Chỉnh Phòng
              </button>
            </div>

            {/* Room Features */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-1">Loại Giường</span>
                <span className="font-bold text-xs text-slate-700">{room.bedType}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-1">Tầm Nhìn</span>
                <span className="font-bold text-xs text-slate-700">{room.viewType}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-400 block mb-1">Đơn Giá Phòng</span>
                <span className="font-bold text-xs text-emerald-700">{formatCurrency(room.pricePerDay)}</span>
              </div>
            </div>

            {/* Guest info card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Thông Tin Khách Ở Cữ
              </h4>
              {room.guestName ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Khách hàng:</span>
                    <span className="font-bold text-slate-800 text-sm">{room.guestName}</span>
                  </div>
                  {room.guestPhone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Số điện thoại:</span>
                      <a href={`tel:${room.guestPhone}`} className="text-blue-600 font-mono font-semibold hover:underline">
                        {room.guestPhone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">Thời gian ở cữ:</span>
                    <span className="font-medium text-slate-700">
                      {formatDate(room.checkInDate)} ➔ {formatDate(room.checkOutDate)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Phòng đang trống, chưa có khách đặt.</p>
              )}
            </div>

            {/* Lịch các đợt đặt phòng & lưu trú */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Lịch Đặt Phòng ({roomBookings.length})
                </h4>
                {onOpenBookingModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBookingModal(null, room.id);
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    + Đặt lịch mới
                  </button>
                )}
              </div>

              {roomBookings.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {roomBookings.map((bk) => (
                    <div
                      key={bk.id}
                      onClick={() => {
                        if (onOpenBookingModal) {
                          onClose();
                          onOpenBookingModal(bk);
                        }
                      }}
                      className="p-2 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{bk.guestName}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              bk.status === 'Đang ở'
                                ? 'bg-indigo-100 text-indigo-800'
                                : bk.status === 'Đặt chỗ'
                                ? 'bg-amber-100 text-amber-800'
                                : bk.status === 'Kết thúc'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {bk.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDate(bk.checkInDate)} ➔ {formatDate(bk.checkOutDate)}
                        </div>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold">Chi tiết ➔</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">Chưa có lịch đặt phòng nào cho phòng này.</p>
              )}
            </div>

            {/* Notes */}
            {room.notes && (
              <div className="text-xs text-slate-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <span className="font-semibold text-emerald-800 block mb-0.5">Ghi chú & Tiện nghi:</span>
                {room.notes}
              </div>
            )}
          </div>
        ) : (
          /* Editing Form */
          <form onSubmit={handleSave} className="p-6 space-y-3.5 text-xs text-slate-800 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                Tùy Chỉnh Đặc Điểm & Tình Trạng Phòng {room.roomNumber}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                Hủy bỏ
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Loại Giường</label>
                <select
                  value={bedType}
                  onChange={(e) => setBedType(e.target.value as BedType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="1 giường">1 giường (Mẹ & bé)</option>
                  <option value="2 giường">2 giường (Gia đình / Người thân ở cùng)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Không Gian</label>
                <select
                  value={viewType}
                  onChange={(e) => setViewType(e.target.value as ViewType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Cửa sổ">Cửa sổ thoáng mát</option>
                  <option value="Ban công">Ban công view đẹp</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Giá Phòng (VNĐ/ngày)</label>
                <input
                  type="number"
                  required
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Tình Trạng Phòng</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RoomStatus)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Trống">🟢 Trống (Sẵn sàng đón)</option>
                  <option value="Đặt chỗ">🟡 Đặt chỗ (Chờ check-in)</option>
                  <option value="Đã nhận">🔵 Đã nhận (Đang ở cữ)</option>
                </select>
              </div>
            </div>

            {/* Guest details if Booked or Occupied */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-700 block">Thông Tin Khách Hàng (Mẹ & Bé)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Họ tên khách</label>
                  <input
                    type="text"
                    placeholder="VD: Mẹ Nguyễn Phương Thảo"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0918xxxxxx"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Ngày Check-in</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Ngày Check-out dự kiến</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Link Ảnh Phòng (URL)</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Ghi Chú Tiện Nghi</label>
              <textarea
                rows={2}
                placeholder="Trang bị nôi sưởi, máy hút sữa, ghế cho con bú..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Lưu Thay Đổi Phòng
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
