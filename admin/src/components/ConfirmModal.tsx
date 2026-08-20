"use client";

import { useState } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  loading?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  requireReason = false,
  reasonPlaceholder = "Enter reason for audit logs...",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError("Reason is required to execute this action.");
      return;
    }
    setError(null);
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !loading && onCancel()}>
      <div
        className="bg-surface-bright border border-subtle rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDanger ? "bg-status-danger/10 text-status-danger" : "bg-secondary/10 text-secondary"}`}>
            <span className="material-symbols-outlined">{isDanger ? "warning" : "help_outline"}</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">{title}</h3>
          </div>
        </div>

        <p className="text-body-sm text-on-surface-variant leading-relaxed">{message}</p>

        {requireReason && (
          <div className="space-y-1">
            <label className="block text-[11px] text-on-surface-variant font-medium">Audit Reason *</label>
            <input
              type="text"
              className="w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary focus:ring-0 outline-none"
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
            />
            {error && <p className="text-[11px] text-status-danger mt-1">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-opacity flex items-center gap-1.5 ${
              isDanger ? "bg-status-danger hover:opacity-90" : "bg-secondary hover:opacity-90"
            }`}
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
