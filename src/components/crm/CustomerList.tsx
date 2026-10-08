import React, { useState, useMemo } from 'react';
import { Customer, CustomerCategory } from '../../types';
import { formatDate } from '../../utils/storage';
import {
  UserPlus,
  Search,
  Calendar,
  Phone,
  FileText,
  Image as ImageIcon,
  Edit,
  Trash2,
  ChevronRight,
  Filter,
  Stethoscope,
  HeartHandshake,
  Baby,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerDetailModal } from './CustomerDetailModal';

interface CustomerListProps {
  customers: Customer[];
  onAddCustomer: (customerData: Partial<Customer>) => Promise<void> | void;
  onUpdateCustomer: (id: string, customerData: Partial<Customer>) => Promise<void> | void;
  onDeleteCustomer: (id: string) => Promise<{ success: boolean; error: string | null } | void> | void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  isLoading = false,
  error = null,
  onRefresh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Category counts
  const stats = useMemo(() => {
    return {
      total: customers.length,
      sanKhoa: customers.filter((c) => c.category === 'Sản khoa').length,
      anSanh: customers.filter((c) => c.category === 'An Sanh').length,
      sauSinh: customers.filter((c) => c.category === 'Sau sinh').length,
      khac: customers.filter((c) => c.category === 'Khác').length,
      upcomingAppointments: customers.filter((c) => {
        if (!c.nextAppointmentDate) return false;
        const appDate = new Date(c.nextAppointmentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return appDate >= today;
      }).length,
    };
  }, [customers]);

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [customers, selectedCategory, searchQuery]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setIsFormModalOpen(true);
  };

  const handleSaveForm = (data: Partial<Customer>) => {
    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, data);
    } else {
      onAddCustomer(data);
    }
  };

  const handleAddMedicalRecord = (customerId: string, record: any) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    const newRecord = {
      ...record,
      id: `med-${Date.now()}`,
    };
    const updatedHistory = [newRecord, ...(cust.medicalHistory || [])];
    onUpdateCustomer(customerId, { medicalHistory: updatedHistory });
    if (viewingCustomer && viewingCustomer.id === customerId) {
      setViewingCustomer({
        ...viewingCustomer,
        medicalHistory: updatedHistory,
      });
    }
  };

  const handleDeleteMedicalRecord = (customerId: string, recordId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    const updatedHistory = (cust.medicalHistory || []).filter((r) => r.id !== recordId);
    onUpdateCustomer(customerId, { medicalHistory: updatedHistory });
    if (viewingCustomer && viewingCustomer.id === customerId) {
      setViewingCustomer({
        ...viewingCustomer,
        medicalHistory: updatedHistory,
      });
    }
  };

  const getCategoryBadgeClass = (category: CustomerCategory) => {
    switch (category) {
      case 'Sản khoa':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'An Sanh':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Sau sinh':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Top Banner & Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
        <div
          onClick={() => setSelectedCategory('all')}
          className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Tất cả khách</span>
            <Activity className="w-4 h-4 opacity-80" />
          </div>
          <div className="text-2xl font-bold mt-0.5 sm:mt-1">{stats.total}</div>
          <div className="text-xs mt-0.5 sm:mt-1 opacity-80">{stats.upcomingAppointments} cuộc hẹn sắp tới</div>
        </div>

        <div
          onClick={() => setSelectedCategory('An Sanh')}
          className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'An Sanh'
              ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">An Sanh (Ở cữ)</span>
            <HeartHandshake className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold mt-0.5 sm:mt-1">{stats.anSanh}</div>
          <div className="text-xs mt-0.5 sm:mt-1 opacity-70">Gói chăm sóc ở cữ</div>
        </div>

        <div
          onClick={() => setSelectedCategory('Sản khoa')}
          className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'Sản khoa'
              ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-pink-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Sản khoa</span>
            <Stethoscope className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-bold mt-0.5 sm:mt-1">{stats.sanKhoa}</div>
          <div className="text-xs mt-0.5 sm:mt-1 opacity-70">Khám thai & sinh nở</div>
        </div>

        <div
          onClick={() => setSelectedCategory('Sau sinh')}
          className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'Sau sinh'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Sau sinh</span>
            <Baby className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold mt-0.5 sm:mt-1">{stats.sauSinh}</div>
          <div className="text-xs mt-0.5 sm:mt-1 opacity-70">Phục hồi & tắm bé</div>
        </div>

        <div
          onClick={() => setSelectedCategory('Khác')}
          className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedCategory === 'Khác'
              ? 'bg-slate-700 text-white border-slate-700 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Khác</span>
            <Filter className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold mt-0.5 sm:mt-1">{stats.khac}</div>
          <div className="text-xs mt-0.5 sm:mt-1 opacity-70">Dịch vụ lẻ / Spa</div>
        </div>
      </div>

      {/* Control Bar: Search, Category Filter, and Add Button */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm theo họ tên, SĐT, địa chỉ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar shrink-0">
            {(['all', 'Sản khoa', 'An Sanh', 'Sau sinh', 'Khác'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all touch-manipulation ${
                  selectedCategory === cat
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shrink-0 disabled:opacity-50"
              title="Đồng bộ danh sách từ Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Thêm Khách Hàng Mới
          </button>
        </div>
      </div>

      {/* Supabase Error Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span><strong className="font-semibold">Lỗi Supabase:</strong> {error}</span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-300 transition-colors shrink-0"
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {/* Customers List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Khách Hàng & Thông Tin</th>
                <th className="px-4 py-3.5">Phân Loại</th>
                <th className="px-4 py-3.5">Ngày Tạo</th>
                <th className="px-4 py-3.5">Lịch Hẹn Kế Tiếp</th>
                <th className="px-4 py-3.5">Bệnh Sử & Hồ Sơ</th>
                <th className="px-4 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                      <span className="text-sm font-medium">Đang tải danh sách khách hàng từ Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => {
                  const hasUpcoming = cust.nextAppointmentDate && new Date(cust.nextAppointmentDate) >= new Date();
                  const historyCount = cust.medicalHistory?.length || 0;
                  const imagesCount = cust.attachedImages?.length || 0;

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setViewingCustomer(cust)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                            {cust.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {cust.fullName}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {cust.phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Sinh: {formatDate(cust.dateOfBirth)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getCategoryBadgeClass(cust.category)}`}>
                          {cust.category}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-600">
                        {formatDate(cust.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        {cust.nextAppointmentDate ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className={`w-3.5 h-3.5 ${hasUpcoming ? 'text-amber-500' : 'text-slate-400'}`} />
                            <span className={`text-xs font-semibold ${hasUpcoming ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200' : 'text-slate-500'}`}>
                              {formatDate(cust.nextAppointmentDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa có lịch hẹn</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md" title={`${historyCount} lần ghi chép bệnh án`}>
                            <Stethoscope className="w-3 h-3 text-emerald-600" />
                            {historyCount} lần khám
                          </span>
                          {imagesCount > 0 && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md" title={`${imagesCount} hình ảnh đính kèm`}>
                              <ImageIcon className="w-3 h-3 text-teal-600" />
                              {imagesCount} ảnh
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingCustomer(cust)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Xem chi tiết & bệnh án"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            title="Sửa thông tin"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteErrorMessage(null);
                              setCustomerToDelete(cust);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">Không tìm thấy khách hàng nào phù hợp với bộ lọc</p>
                    <button
                      onClick={handleOpenCreate}
                      className="mt-2 text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      + Thêm hồ sơ khách hàng mới ngay
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Form Modal (Create / Edit) */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveForm}
        initialCustomer={editingCustomer}
      />

      {/* Customer Detail Modal (Timeline History, Images, Notes) */}
      <CustomerDetailModal
        customer={viewingCustomer ? (customers.find((c) => c.id === viewingCustomer.id) || viewingCustomer) : null}
        isOpen={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        onAddMedicalRecord={handleAddMedicalRecord}
        onDeleteMedicalRecord={handleDeleteMedicalRecord}
        onUpdateCustomerImages={(customerId, images) => {
          onUpdateCustomer(customerId, { attachedImages: images });
        }}
        onOpenEdit={(cust) => {
          setViewingCustomer(null);
          handleOpenEdit(cust);
        }}
      />

      {/* Delete Confirmation Modal (Preview-compatible, no window.confirm) */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Xác nhận xóa khách hàng
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa khách hàng <strong className="text-slate-800">{customerToDelete.fullName}</strong> ({customerToDelete.phone || 'Chưa có SĐT'}) khỏi cơ sở dữ liệu Supabase không? Thao tác này không thể hoàn tác.
            </p>

            {deleteErrorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{deleteErrorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setCustomerToDelete(null);
                  setDeleteErrorMessage(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteErrorMessage(null);
                  try {
                    const res = await onDeleteCustomer(customerToDelete.id);
                    if (res && typeof res === 'object' && 'success' in res && !res.success) {
                      setDeleteErrorMessage(res.error || 'Xóa khách hàng thất bại trên Supabase');
                      setIsDeleting(false);
                      return;
                    }
                    // Success: close modal
                    setCustomerToDelete(null);
                  } catch (err: any) {
                    setDeleteErrorMessage(err?.message || 'Lỗi khi xóa khách hàng trên Supabase');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  'Xác nhận xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
