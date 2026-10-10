import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Đã xảy ra lỗi hiển thị</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ứng dụng gặp sự cố khi tải giao diện. Vui lòng bấm thử lại để làm mới giao diện hoặc kiểm tra lại kết nối mạng.
            </p>
            {this.state.error?.message && (
              <div className="text-[11px] bg-slate-950/60 text-rose-300 p-3 rounded-xl border border-rose-900/40 text-left overflow-auto max-h-32 font-mono">
                {this.state.error.message}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Thử lại giao diện
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
