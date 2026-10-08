import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, CheckCircle2, Eye, EyeOff, Loader2, HeartHandshake, ShieldCheck } from 'lucide-react';
import { signInStaff } from '../../services/authService';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { user, error } = await signInStaff(email, password);

    setIsLoading(false);

    if (error || !user) {
      setErrorMessage(error || 'Đăng nhập không thành công.');
      return;
    }

    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Brand & Clinic Title */}
      <div className="text-center mb-8 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 mb-4 ring-4 ring-emerald-500/20">
          <HeartHandshake className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
          Hệ Thống An Sanh
        </h1>
        <p className="text-xs sm:text-sm text-teal-200/90 mt-1 font-medium">
          Trung Tâm Ở Cữ & Chăm Sóc Sản Khoa • Cổng Quản Trị Nội Bộ
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Bảo mật dữ liệu CRM & Công việc qua Supabase Auth</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold">Đăng Nhập Nhân Viên</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Xác thực quyền truy cập hệ thống
            </p>
          </div>
          <div className="shrink-0">
            <PWAInstallButton />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-tight">
                <span className="font-bold">Lỗi xác thực: </span>
                {errorMessage}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email công việc
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bacsi@ansanh.vn hoặc nhanvien@ansanh.vn"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-xl flex items-start gap-2 leading-relaxed">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Chính sách bảo mật nội bộ:</strong> Hệ thống đã khóa đăng ký tự do. Chỉ tài khoản được Admin mời qua email trong Supabase Dashboard mới có thể đăng nhập để truy cập dữ liệu CRM, công việc và buồng phòng.
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xác thực thông tin...</span>
              </>
            ) : (
              <span>Đăng Nhập Hệ Thống</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-400">
        © 2026 Trung Tâm Ở Cữ An Sanh • Mọi truy cập được giám sát & ghi log bảo mật
      </div>
    </div>
  );
};
