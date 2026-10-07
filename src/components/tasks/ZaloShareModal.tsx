import React, { useState } from 'react';
import { Employee, Task } from '../../types';
import { formatTaskZaloText, createZaloMessageUrl } from '../../utils/storage';
import { X, Send, Copy, Check, ExternalLink, MessageCircle } from 'lucide-react';

interface ZaloShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  employee: Employee | null;
}

export const ZaloShareModal: React.FC<ZaloShareModalProps> = ({
  isOpen,
  onClose,
  task,
  employee,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !task) return null;

  const zaloMessage = formatTaskZaloText(task, employee?.fullName);
  const zaloUrl = employee?.zaloPhone ? createZaloMessageUrl(employee.zaloPhone, zaloMessage) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(zaloMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenZalo = () => {
    // Copy to clipboard first so the user can easily paste into Zalo chat window
    navigator.clipboard.writeText(zaloMessage);
    if (zaloUrl) {
      window.open(zaloUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Giao Việc Qua Zalo Nhân Viên</h3>
              <p className="text-xs text-blue-100">Gửi nội dung công việc và nhiệm vụ con tới Zalo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-800">
          {employee ? (
            <div className="flex items-center justify-between p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs">
              <div>
                <span className="text-slate-500 block">Nhân sự nhận việc:</span>
                <span className="font-bold text-slate-900 text-sm">{employee.fullName}</span>
                <span className="text-slate-500 block">{employee.position}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">SĐT Zalo:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">{employee.zaloPhone}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs">
              ⚠️ Nhiệm vụ này chưa được gán nhân viên cụ thể. Bạn vẫn có thể sao chép văn bản để gửi vào nhóm Zalo hoặc bất kỳ nhân viên nào.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Nội Dung Tin Nhắn Mẫu Sẵn Sàng Gửi:
              </label>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Sao chép văn bản
                  </>
                )}
              </button>
            </div>

            <textarea
              readOnly
              rows={8}
              value={zaloMessage}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 leading-relaxed focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * Hệ thống tự động đính kèm thông tin phân loại, hạn chót và danh sách các việc con (subtasks).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium text-xs hover:bg-slate-50"
            >
              Đóng
            </button>

            {employee?.zaloPhone ? (
              <button
                onClick={handleOpenZalo}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Mở Trực Tiếp Zalo ({employee.zaloPhone})
              </button>
            ) : (
              <button
                onClick={handleCopy}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Sao Chép Nội Dung
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
