import React, { useState } from 'react';
import { Customer, MedicalRecord } from '../../types';
import { formatDate } from '../../utils/storage';
import {
  X,
  Calendar,
  Phone,
  MapPin,
  Clock,
  Plus,
  FileText,
  Stethoscope,
  Image as ImageIcon,
  ExternalLink,
  Trash2
} from 'lucide-react';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onAddMedicalRecord: (customerId: string, record: Omit<MedicalRecord, 'id'>) => void;
  onDeleteMedicalRecord: (customerId: string, recordId: string) => void;
  onUpdateCustomerImages: (customerId: string, images: string[]) => void;
  onOpenEdit: (customer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onAddMedicalRecord,
  onDeleteMedicalRecord,
  onUpdateCustomerImages,
  onOpenEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'gallery' | 'info'>('history');
  const [showAddRecordForm, setShowAddRecordForm] = useState(false);
  const [newDiagnose, setNewDiagnose] = useState('');
  const [newDoctor, setNewDoctor] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newRecordDate, setNewRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagnose.trim()) {
      alert('Vui lòng nhập nội dung chẩn đoán hoặc chăm sóc');
      return;
    }
    onAddMedicalRecord(customer.id, {
      date: newRecordDate,
      diagnoseOrCare: newDiagnose.trim(),
      doctorOrCaregiver: newDoctor.trim() || 'Điều dưỡng phụ trách',
      notes: newNotes.trim(),
    });
    setNewDiagnose('');
    setNewDoctor('');
    setNewNotes('');
    setShowAddRecordForm(false);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Sản khoa':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'An Sanh':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Sau sinh':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Customer Summary */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">{customer.fullName}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryBadge(customer.category)}`}>
                  {customer.category}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-emerald-100">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${customer.phone}`} className="hover:underline text-white font-medium">
                    {customer.phone}
                  </a>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Sinh: {formatDate(customer.dateOfBirth)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Tạo ngày: {formatDate(customer.createdAt)}
                </span>
              </div>
            </div>

            <button
              onClick={() => onOpenEdit(customer)}
              className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold self-start transition-colors"
            >
              Chỉnh sửa hồ sơ
            </button>
          </div>

          {/* Quick appointment banner */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-md font-medium border border-amber-300/30">
                Lịch hẹn kế tiếp:
              </span>
              <span className="font-semibold text-white">
                {customer.nextAppointmentDate ? formatDate(customer.nextAppointmentDate) : 'Chưa đặt lịch hẹn'}
              </span>
            </div>
            {customer.address && (
              <span className="flex items-center gap-1 text-emerald-100 truncate max-w-xs">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {customer.address}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-6">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Lịch Sử Bệnh Án & Chăm Sóc ({customer.medicalHistory?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'gallery'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Hình Ảnh Đính Kèm ({customer.attachedImages?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'info'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Ghi Chú & Nguyện Vọng
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Medical History (Bệnh sử cập nhật nhiều lần) */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Bệnh sử & Diễn tiến chăm sóc
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ghi chép nhiều lần theo từng buổi khám thai, thủ thuật, hoặc ngày dưỡng cữ
                  </p>
                </div>
                {!showAddRecordForm && (
                  <button
                    onClick={() => setShowAddRecordForm(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Thêm lượt ghi mới
                  </button>
                )}
              </div>

              {/* Add form inline */}
              {showAddRecordForm && (
                <form
                  onSubmit={handleCreateRecord}
                  className="mb-6 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Cập nhật lượt bệnh sử / chăm sóc mới
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddRecordForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Ngày thực hiện *</label>
                      <input
                        type="date"
                        required
                        value={newRecordDate}
                        onChange={(e) => setNewRecordDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Bác sĩ / Kỹ thuật viên</label>
                      <input
                        type="text"
                        placeholder="VD: BS. Nguyễn Thị Mai / ĐD. Yến"
                        value={newDoctor}
                        onChange={(e) => setNewDoctor(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Chẩn đoán / Quy trình chăm sóc *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Khám thai 32 tuần, Siêu âm 4D, Tắm bé & chăm sóc rốn, Thông tia sữa..."
                      value={newDiagnose}
                      onChange={(e) => setNewDiagnose(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú & Dặn dò y lệnh</label>
                    <textarea
                      rows={2}
                      placeholder="Kết quả chi tiết, chỉ số tim thai, tình trạng vết mổ, đơn thuốc, lịch hẹn tiếp..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddRecordForm(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      Lưu lượt bệnh án
                    </button>
                  </div>
                </form>
              )}

              {/* Timeline list */}
              {customer.medicalHistory && customer.medicalHistory.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {customer.medicalHistory.map((rec) => (
                    <div key={rec.id} className="relative group">
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-slate-800 text-sm">{rec.diagnoseOrCare}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {formatDate(rec.date)}
                            </span>
                            <button
                              onClick={() => onDeleteMedicalRecord(customer.id, rec.id)}
                              className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 p-1 transition-opacity"
                              title="Xóa lượt này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">Người phụ trách: <span className="font-medium text-slate-700">{rec.doctorOrCaregiver}</span></p>
                        {rec.notes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-line leading-relaxed">
                            {rec.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                  <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">Chưa có lượt bệnh sử nào</p>
                  <p className="text-xs text-slate-400 mt-1">Bấm nút "Thêm lượt ghi mới" để cập nhật quá trình chăm sóc</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Images Gallery */}
          {activeTab === 'gallery' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bộ Sưu Tập Hình Ảnh</h3>
                  <p className="text-xs text-slate-500">Hình ảnh kết quả siêu âm, hồ sơ cận lâm sàng, hình ảnh phòng cữ của bé và mẹ</p>
                </div>
              </div>

              {customer.attachedImages && customer.attachedImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {customer.attachedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 cursor-pointer shadow-sm hover:shadow-md transition-all"
                      onClick={() => setPreviewImage(img)}
                    >
                      <img
                        src={img}
                        alt={`Ảnh đính kèm ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="text-white text-xs font-semibold flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                          <ExternalLink className="w-3.5 h-3.5" /> Xem lớn
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">Chưa có hình ảnh nào được đính kèm</p>
                  <button
                    onClick={() => onOpenEdit(customer)}
                    className="mt-3 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100"
                  >
                    Chỉnh sửa để tải ảnh lên
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: General Notes & Info */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Ghi chú đặc biệt / Yêu cầu gia đình
                </h4>
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {customer.notes || 'Không có ghi chú đặc biệt.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 block">Địa chỉ liên hệ</span>
                  <span className="text-sm font-medium text-slate-800">{customer.address || 'Chưa cập nhật'}</span>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 block">Phân loại quản lý</span>
                  <span className="text-sm font-medium text-slate-800">{customer.category}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-sm transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Image zoom lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Xem chi tiết"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 font-medium flex items-center gap-1 text-sm"
            >
              <X className="w-5 h-5" /> Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
