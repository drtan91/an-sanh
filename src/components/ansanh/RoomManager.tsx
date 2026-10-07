import React, { useState, useMemo } from 'react';
import { Room, RoomStatus } from '../../types';
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
  Eye
} from 'lucide-react';
import { RoomDetailModal } from './RoomDetailModal';

interface RoomManagerProps {
  rooms: Room[];
  onUpdateRoom: (roomId: string, data: Partial<Room>) => void;
}

export const RoomManager: React.FC<RoomManagerProps> = ({ rooms, onUpdateRoom }) => {
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

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
      {/* Top Metric Cards */}
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

      {/* Control Bar: Floor filter, Status filter, View Mode */}
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

        {/* Status filter & View Switcher */}
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

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Sơ đồ phòng"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Bảng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main View: By Floor Groups or Flat Table */}
      {viewMode === 'grid' ? (
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
                        onClick={() => setSelectedRoom(room)}
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
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Số Phòng & Tầng</th>
                  <th className="px-4 py-3.5">Loại Giường</th>
                  <th className="px-4 py-3.5">Không Gian</th>
                  <th className="px-4 py-3.5">Giá / Ngày</th>
                  <th className="px-4 py-3.5">Tình Trạng</th>
                  <th className="px-4 py-3.5">Khách Đang Ở / Đặt Chỗ</th>
                  <th className="px-4 py-3.5 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((room) => (
                  <tr
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{room.roomNumber}</div>
                      <div className="text-xs text-slate-400">Tầng {room.floor}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">{room.bedType}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">{room.viewType}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-emerald-700">
                      {formatCurrency(room.pricePerDay)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(room.status)}`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">
                      {room.guestName ? (
                        <div>
                          <span className="font-semibold text-slate-800">{room.guestName}</span>
                          <span className="block text-[11px] text-slate-400">
                            {formatDate(room.checkInDate)} - {formatDate(room.checkOutDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Trống</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-xs font-semibold text-slate-600 transition-colors">
                        Tùy chỉnh
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Detail Modal */}
      <RoomDetailModal
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        room={selectedRoom}
        onSaveRoom={(roomId, updatedData) => {
          onUpdateRoom(roomId, updatedData);
          if (selectedRoom && selectedRoom.id === roomId) {
            setSelectedRoom({ ...selectedRoom, ...updatedData });
          }
        }}
      />
    </div>
  );
};
