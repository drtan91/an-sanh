import React, { useState, useMemo } from 'react';
import { Transaction, TransactionScope, TransactionType, PaymentSource } from '../../types';
import { formatCurrency, formatDate } from '../../utils/storage';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Building2,
  User,
  CreditCard,
  Trash2,
  X,
  TrendingUp,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface FinanceManagerProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Partial<Transaction>) => Promise<boolean> | void;
  onDeleteTransaction: (id: string) => Promise<boolean> | void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  isLoading = false,
  error = null,
  onRefresh,
}) => {
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form states
  const [scope, setScope] = useState<TransactionScope>('An Sanh');
  const [type, setType] = useState<TransactionType>('Thu');
  const [amount, setAmount] = useState<string>('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentSource, setPaymentSource] = useState<PaymentSource>('Chuyển khoản VCB');
  const [category, setCategory] = useState('Doanh thu phòng ở cữ');
  const [note, setNote] = useState('');

  // Calculations
  const stats = useMemo(() => {
    let anSanhThu = 0;
    let anSanhChi = 0;
    let caNhanThu = 0;
    let caNhanChi = 0;

    transactions.forEach((tx) => {
      if (tx.scope === 'An Sanh') {
        if (tx.type === 'Thu') anSanhThu += tx.amount;
        else anSanhChi += tx.amount;
      } else {
        if (tx.type === 'Thu') caNhanThu += tx.amount;
        else caNhanChi += tx.amount;
      }
    });

    const anSanhNet = anSanhThu - anSanhChi;
    const caNhanNet = caNhanThu - caNhanChi;
    const totalBalance = anSanhNet + caNhanNet;

    return {
      anSanhThu,
      anSanhChi,
      anSanhNet,
      caNhanThu,
      caNhanChi,
      caNhanNet,
      totalBalance,
    };
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchScope = selectedScope === 'all' || tx.scope === selectedScope;
      const matchType = selectedType === 'all' || tx.type === selectedType;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        tx.content.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.paymentSource.toLowerCase().includes(q) ||
        (tx.note && tx.note.toLowerCase().includes(q));
      return matchScope && matchType && matchSearch;
    });
  }, [transactions, selectedScope, selectedType, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const numAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (!numAmount || numAmount <= 0) {
      setSubmitError('Vui lòng nhập số tiền hợp lệ lớn hơn 0đ');
      return;
    }
    if (!content.trim()) {
      setSubmitError('Vui lòng nhập nội dung thu chi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onAddTransaction({
        scope,
        type,
        amount: numAmount,
        content: content.trim(),
        date,
        paymentSource,
        category: category.trim() || 'Thu chi chung',
        note: note.trim() || undefined,
      });

      // Nếu hàm trả về boolean false thì giữ modal để người dùng kiểm tra lại
      if (res === false) {
        setIsSubmitting(false);
        return;
      }

      // Reset form khi thành công
      setAmount('');
      setContent('');
      setNote('');
      setIsModalOpen(false);
    } catch (err: any) {
      setSubmitError(err?.message || 'Không thể lưu giao dịch. Vui lòng kiểm tra kết nối.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (tx: Transaction) => {
    setTxToDelete(tx);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    setDeleteModalError(null);
    try {
      const res = await onDeleteTransaction(txToDelete.id);
      if (res === false) {
        setDeleteModalError('Không thể xóa giao dịch trên Supabase.');
        setIsDeleting(false);
        return;
      }
      setTxToDelete(null);
    } catch (err: any) {
      setDeleteModalError(err?.message || 'Lỗi khi xóa giao dịch');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4">
        {/* An Sanh Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Quỹ Trung Tâm An Sanh</h3>
            </div>
            <span className="text-[11px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
              Kinh doanh
            </span>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-xs text-slate-400 block">Lợi Nhuận Ròng An Sanh:</span>
            <div className={`text-2xl font-bold ${stats.anSanhNet >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatCurrency(stats.anSanhNet)}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block">Tổng Thu An Sanh:</span>
              <span className="font-semibold text-emerald-600">+{formatCurrency(stats.anSanhThu)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Tổng Chi An Sanh:</span>
              <span className="font-semibold text-rose-600">-{formatCurrency(stats.anSanhChi)}</span>
            </div>
          </div>
        </div>

        {/* Ca Nhan Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Quỹ Thu Chi Cá Nhân</h3>
            </div>
            <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
              Cá nhân
            </span>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-xs text-slate-400 block">Tích Lũy Ròng Cá Nhân:</span>
            <div className={`text-2xl font-bold ${stats.caNhanNet >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatCurrency(stats.caNhanNet)}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block">Tổng Thu Cá Nhân:</span>
              <span className="font-semibold text-emerald-600">+{formatCurrency(stats.caNhanThu)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Tổng Chi Cá Nhân:</span>
              <span className="font-semibold text-rose-600">-{formatCurrency(stats.caNhanChi)}</span>
            </div>
          </div>
        </div>

        {/* Total Net Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-3.5 sm:p-5 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                Tổng Kết Dư Thực Tế
              </span>
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">
              {formatCurrency(stats.totalBalance)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Bao gồm toàn bộ quỹ lưu động An Sanh và tài chính cá nhân
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full mt-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Ghi Nhận Thu / Chi Mới
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo nội dung thu chi, danh mục, nguồn tiền (VCB, Tiền mặt...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scope filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(['all', 'An Sanh', 'Cá nhân'] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => setSelectedScope(sc)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedScope === sc ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {sc === 'all' ? 'Tất cả quỹ' : sc}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Thu & Chi</option>
            <option value="Thu">Chỉ tiền Thu</option>
            <option value="Chi">Chỉ tiền Chi</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> Thêm Giao Dịch
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-colors shrink-0 disabled:opacity-50"
              title="Tải lại dữ liệu thu chi từ Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs font-bold underline hover:text-rose-900"
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Ngày & Loại</th>
                <th className="px-4 py-3.5">Lĩnh Vực</th>
                <th className="px-5 py-3.5">Nội Dung Thu / Chi</th>
                <th className="px-4 py-3.5">Nguồn Tiền</th>
                <th className="px-4 py-3.5 text-right">Số Tiền (VNĐ)</th>
                <th className="px-4 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-xs font-medium">Đang đồng bộ dữ liệu thu chi từ Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const isThu = tx.type === 'Thu';
                  const isTxDeleting = isDeleting && txToDelete?.id === tx.id;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isThu ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {isThu ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-slate-900 block">{formatDate(tx.date)}</span>
                            <span
                              className={`text-[11px] font-bold ${
                                isThu ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            tx.scope === 'An Sanh'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {tx.scope}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-900 text-sm">{tx.content}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{tx.category}</span>
                          {tx.note && <span>• {tx.note}</span>}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {tx.paymentSource}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-sm">
                        <span className={isThu ? 'text-emerald-600' : 'text-rose-600'}>
                          {isThu ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenDelete(tx)}
                          disabled={isDeleting && txToDelete?.id === tx.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Xóa giao dịch"
                        >
                          {isDeleting && txToDelete?.id === tx.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Không tìm thấy khoản thu chi nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Ghi Nhận Thu / Chi Mới</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Lĩnh Vực *</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as TransactionScope)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-semibold"
                  >
                    <option value="An Sanh">🌿 An Sanh (Kinh doanh)</option>
                    <option value="Cá nhân">👤 Cá nhân</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Loại Giao Dịch *</label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setType('Thu')}
                      className={`flex-1 py-2 font-bold text-xs transition-colors ${
                        type === 'Thu' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      + Thu Vào
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('Chi')}
                      className={`flex-1 py-2 font-bold text-xs transition-colors ${
                        type === 'Chi' ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      - Chi Ra
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Số Tiền (VNĐ) *</label>
                <input
                  type="number"
                  required
                  placeholder="VD: 5000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nội Dung Thu / Chi *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thu tiền trọn gói ở cữ P.201, Mua tã bỉm sữa..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Ngày Giao Dịch</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nguồn Tiền *</label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value as PaymentSource)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="Chuyển khoản VCB">Chuyển khoản VCB</option>
                    <option value="Chuyển khoản MB">Chuyển khoản MB</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Thẻ tín dụng">Thẻ tín dụng</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Danh Mục Phân Bổ</label>
                <input
                  type="text"
                  placeholder="Doanh thu phòng, Vật tư y tế, Thực phẩm, Lương..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Ghi Chú Đính Kèm</label>
                <input
                  type="text"
                  placeholder="Số hóa đơn, người giao nhận..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {submitError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu vào Supabase...</span>
                    </>
                  ) : (
                    <span>Lưu Giao Dịch</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Preview-compatible, no window.confirm) */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Xác nhận xóa giao dịch
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa giao dịch <strong className="text-slate-800">"{txToDelete.content}"</strong> ({formatCurrency(txToDelete.amount)}) khỏi cơ sở dữ liệu Supabase không? Thao tác này không thể hoàn tác.
            </p>

            {deleteModalError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{deleteModalError}</span>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setTxToDelete(null);
                  setDeleteModalError(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <span>Xác nhận xóa</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
