import React, { useState, useEffect, useMemo } from 'react';
import { RoomBooking, BookingStatus, Room } from '../../types';
import { formatCurrency, formatDate } from '../../utils/storage';
import { checkBookingOverlap } from '../../services/bookingService';
import {
  X,
  Calendar,
  User,
  Phone,
  BedDouble,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  LogOut,
  Ban,
  Trash2,
  Info
} from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: RoomBooking | null;
  initialRoomId?: string;
  initialDate?: string;
  rooms: Room[];
  bookings: RoomBooking[];
  onSaveBooking: (
    bookingData: Partial<RoomBooking>,
    bookingId?: string
  ) => Promise<{ success: boolean; error?: string | null }>;
  onCheckoutBooking?: (bookingId: string, actualEndDate?: string) => Promise<void>;
  onCancelBooking?: (bookingId: string) => Promise<void>;
  onDeleteBooking?: (bookingId: string, roomId: string) => Promise<void>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  initialRoomId,
  initialDate,
  rooms,
  bookings,
  onSaveBooking,
  onCheckoutBooking,
  onCancelBooking,
  onDeleteBooking,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(booking);

  // Form states
  const [roomId, setRoomId] = useState<string>(() => {
    if (booking) return booking.roomId;
    if (initialRoomId) return initialRoomId;
    return rooms[0]?.id || '';
  });

  const [guestName, setGuestName] = useState<string>(() => booking?.guestName || '');
  const [guestPhone, setGuestPhone] = useState<string>(() => booking?.guestPhone || '');

  const [checkInDate, setCheckInDate] = useState<string>(() => {
    if (booking?.checkInDate) return booking.checkInDate;
    if (initialDate) return initialDate;
    return new Date().toISOString().split('T')[0];
  });

  const [checkOutDate, setCheckOutDate] = useState<string>(() => {
    if (booking?.checkOutDate) return booking.checkOutDate;
    if (initialDate) {
      const nextWeek = new Date(new Date(initialDate).getTime() + 7 * 24 * 60 * 60 * 1000);
      return nextWeek.toISOString().split('T')[0];
    }
    const defaultOut = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
    return defaultOut.toISOString().split('T')[0];
  });

  const [status, setStatus] = useState<BookingStatus>(() => booking?.status || 'Đặt chỗ');
  const [notes, setNotes] = useState<string>(() => booking?.notes || '');
  const [totalPrice, setTotalPrice] = useState<number | undefined>(() => {
    if (booking?.totalPrice && booking.totalPrice > 0) return booking.totalPrice;
    return undefined;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Find selected room
  const selectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === roomId) || rooms[0];
  }, [rooms, roomId]);

  // Calculate days count
  const daysCount = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate).getTime();
    const end = new Date(checkOutDate).getTime();
    const diff = Math.round((end - start) / (1000 * 3600 * 24));
    return Math.max(0, diff);
  }, [checkInDate, checkOutDate]);

  // Suggested price based on room price and duration: số ngày lưu trú × giá phòng/ngày
  const suggestedPrice = useMemo(() => {
    if (!selectedRoom || daysCount <= 0) return 0;
    const pricePerDay = selectedRoom.pricePerDay !== undefined ? selectedRoom.pricePerDay : 2500000;
    return daysCount * pricePerDay;
  }, [selectedRoom, daysCount]);

  // Update total price automatically when room or dates change:
  // Nếu booking chưa có giá (> 0) hoặc người dùng chưa nhập giá riêng, tự động tính = số ngày lưu trú × giá phòng/ngày
  useEffect(() => {
    if (!booking || !booking.totalPrice || booking.totalPrice === 0) {
      setTotalPrice(suggestedPrice);
    }
  }, [suggestedPrice, booking]);

  // Real-time overlap check
  const overlapCheck = useMemo(() => {
    if (!roomId || !checkInDate || !checkOutDate) return { hasOverlap: false };
    if (status === 'Kết thúc' || status === 'Đã hủy') return { hasOverlap: false };

    return checkBookingOverlap(
      roomId,
      checkInDate,
      checkOutDate,
      booking?.id,
      bookings
    );
  }, [roomId, checkInDate, checkOutDate, status, booking?.id, bookings]);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!roomId) {
      setFormError('Vui lòng chọn phòng.');
      return;
    }

    if (!guestName.trim()) {
      setFormError('Vui lòng nhập họ và tên khách hàng.');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      setFormError('Vui lòng chọn ngày nhận và trả phòng.');
      return;
    }

    if (checkOutDate <= checkInDate) {
      setFormError('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày.');
      return;
    }

    if (overlapCheck.hasOverlap && overlapCheck.conflictingBooking) {
      const cb = overlapCheck.conflictingBooking;
      setFormError(
        `Trùng lịch đặt phòng! Phòng ${selectedRoom?.roomNumber} đã có lịch của khách "${cb.guestName}" từ ${formatDate(cb.checkInDate)} đến ${formatDate(cb.checkOutDate)} (Trạng thái: ${cb.status}). Vui lòng chọn khoảng thời gian khác!`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSaveBooking(
        {
          roomId,
          roomNumber: selectedRoom?.roomNumber || '',
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim() || undefined,
          checkInDate,
          checkOutDate,
          status,
          totalPrice: (totalPrice !== undefined && totalPrice > 0) ? totalPrice : suggestedPrice,
          notes: notes.trim() || undefined,
        },
        booking?.id
      );

      if (!res.success) {
        setFormError(res.error || 'Lỗi khi lưu thông tin đặt phòng');
      } else {
        onClose();
      }
    } catch (err: any) {
      setFormError(err?.message || 'Lỗi ngoại lệ khi lưu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick checkout handler
  const handleQuickCheckout = async () => {
    if (!booking || !onCheckoutBooking) return;
    const today = new Date().toISOString().split('T')[0];
    if (window.confirm(`Xác nhận kết thúc đợt lưu trú cho khách "${booking.guestName}" tại phòng ${booking.roomNumber} kể từ hôm nay (${formatDate(today)})? Ngày sau phòng sẽ tự động chuyển sang Trống.`)) {
      setIsSubmitting(true);
      try {
        await onCheckoutBooking(booking.id, today);
        onClose();
      } catch (err: any) {
        setFormError(err?.message || 'Lỗi khi trả phòng');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Quick cancel handler
  const handleCancel = async () => {
    if (!booking || !onCancelBooking) return;
    if (window.confirm(`Xác nhận hủy lịch đặt phòng của khách "${booking.guestName}"?`)) {
      setIsSubmitting(true);
      try {
        await onCancelBooking(booking.id);
        onClose();
      } catch (err: any) {
        setFormError(err?.message || 'Lỗi khi hủy lịch đặt');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Delete booking handler
  const handleDelete = async () => {
    if (!booking || !onDeleteBooking) return;
    if (window.confirm(`Bạn có chắc chắn muốn XÓA vĩnh viễn booking này của khách "${booking.guestName}"?`)) {
      setIsSubmitting(true);
      try {
        await onDeleteBooking(booking.id, booking.roomId);
        onClose();
      } catch (err: any) {
        setFormError(err?.message || 'Lỗi khi xóa đặt phòng');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <Calendar className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? `Chi Tiết Đặt Phòng • ${booking?.roomNumber}` : 'Tạo Lịch Đặt Phòng Mới'}
              </h3>
              <p className="text-xs text-emerald-100">
                {isEditing ? 'Chỉnh sửa, cập nhật hoặc kết thúc lưu trú' : 'Đặt phòng theo khoảng ngày trên timeline'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Overlap Error Warning */}
          {overlapCheck.hasOverlap && overlapCheck.conflictingBooking && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Cảnh báo: Trùng lịch với booking khác!</p>
                <p>
                  Phòng {selectedRoom?.roomNumber} đã có khách <b>{overlapCheck.conflictingBooking.guestName}</b> từ{' '}
                  <b>{formatDate(overlapCheck.conflictingBooking.checkInDate)}</b> đến{' '}
                  <b>{formatDate(overlapCheck.conflictingBooking.checkOutDate)}</b> (Trạng thái:{' '}
                  {overlapCheck.conflictingBooking.status}).
                </p>
                <p className="text-[11px] text-rose-700">
                  Hệ thống không cho phép lưu hai booking chồng chéo thời gian trên cùng một phòng.
                </p>
              </div>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Chọn phòng & Trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5 text-emerald-600" /> Chọn Phòng
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} (Tầng {r.floor} • {r.bedType} • {formatCurrency(r.pricePerDay)}/ngày)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Trạng Thái Booking
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BookingStatus)}
                className={`w-full text-sm font-bold p-2.5 rounded-xl border focus:outline-emerald-600 ${
                  status === 'Đang ở'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                    : status === 'Đặt chỗ'
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : status === 'Kết thúc'
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <option value="Đặt chỗ">Đặt chỗ (Chưa nhận phòng)</option>
                <option value="Đang ở">Đang ở (Khách đang lưu trú)</option>
                <option value="Kết thúc">Kết thúc (Đã trả phòng)</option>
                <option value="Đã hủy">Đã hủy (Không sử dụng)</option>
              </select>
            </div>
          </div>

          {/* Thông tin khách */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" /> Thông Tin Khách Hàng
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Họ và tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mẹ Lê Hồng Nhung (Bé Bắp)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full text-sm p-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Số điện thoại liên hệ</label>
                <input
                  type="tel"
                  placeholder="VD: 0901234789"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full text-sm p-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Khoảng ngày Check-in & Check-out */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Thời Gian Lưu Trú
              </h4>
              <span className="text-xs font-bold bg-emerald-200/70 text-emerald-800 px-2.5 py-0.5 rounded-full">
                {daysCount} ngày lưu trú
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Ngày nhận phòng (Check-in) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Ngày trả phòng (Check-out) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 font-medium">Gợi ý nhanh:</span>
              <button
                type="button"
                onClick={() => {
                  const inD = new Date(checkInDate || Date.now());
                  const outD = new Date(inD.getTime() + 7 * 24 * 60 * 60 * 1000);
                  setCheckOutDate(outD.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 text-[11px] font-semibold bg-white hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
              >
                +7 ngày
              </button>
              <button
                type="button"
                onClick={() => {
                  const inD = new Date(checkInDate || Date.now());
                  const outD = new Date(inD.getTime() + 14 * 24 * 60 * 60 * 1000);
                  setCheckOutDate(outD.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 text-[11px] font-semibold bg-white hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
              >
                +14 ngày
              </button>
              <button
                type="button"
                onClick={() => {
                  const inD = new Date(checkInDate || Date.now());
                  const outD = new Date(inD.getTime() + 28 * 24 * 60 * 60 * 1000);
                  setCheckOutDate(outD.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 text-[11px] font-semibold bg-white hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
              >
                +28 ngày (Gói chuẩn)
              </button>
            </div>
          </div>

          {/* Tiền & Ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Tổng Tiền Dự Kiến (VNĐ)
              </label>
              <input
                type="number"
                step="50000"
                value={totalPrice !== undefined && totalPrice > 0 ? totalPrice : (suggestedPrice > 0 ? suggestedPrice : 0)}
                onChange={(e) => setTotalPrice(e.target.value === '' ? undefined : Number(e.target.value))}
                className="w-full text-sm font-bold text-emerald-800 p-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Gợi ý: {daysCount} ngày × {formatCurrency(selectedRoom?.pricePerDay !== undefined ? selectedRoom.pricePerDay : 2500000)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú gói chăm sóc</label>
              <textarea
                rows={2}
                placeholder="VD: Chế độ ăn lợi sữa, xông hơ thảo dược..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white resize-none"
              />
            </div>
          </div>

          {/* Quick Actions if editing */}
          {isEditing && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Thao Tác Nhanh Cho Booking Này
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {onCheckoutBooking && status !== 'Kết thúc' && (
                  <button
                    type="button"
                    onClick={handleQuickCheckout}
                    className="px-3 py-1.5 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Kết thúc lưu trú (Trả phòng)
                  </button>
                )}

                {onCancelBooking && status !== 'Đã hủy' && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" /> Hủy lịch đặt
                  </button>
                )}

                {onDeleteBooking && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa hẳn
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (overlapCheck.hasOverlap && status !== 'Kết thúc' && status !== 'Đã hủy')}
              className={`px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-2 ${
                overlapCheck.hasOverlap && status !== 'Kết thúc' && status !== 'Đã hủy'
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập Nhật Booking' : 'Xác Nhận Đặt Phòng'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
