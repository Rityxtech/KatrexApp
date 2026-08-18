"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

interface Props {
  user: any;
  onClose: () => void;
}

export default function MessageUserDrawer({ user, onClose }: Props) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const name = user.fullName || user.displayName || user.name || "Unknown";
  const email = user.email || "";

  async function handleSend() {
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    if (!message.trim()) {
      setError("Message is required.");
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "sendUserEmail",
        targetUid: user.id || user.uid,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess(true);
      setSubject("");
      setMessage("");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(e.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface-deep border-l border-subtle z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle bg-surface-bright">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={name}
                className="w-10 h-10 rounded-full object-cover border border-outline-variant"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="w-10 h-10 rounded-full bg-surface-container-highest items-center justify-center text-secondary border border-outline-variant text-sm font-bold"
              style={{ display: user.avatarUrl ? "none" : "flex" }}
            >
              {(name || email || "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <p className="font-body-md font-bold text-on-surface truncate max-w-[200px]">{name}</p>
              <p className="text-[11px] text-on-surface-variant truncate max-w-[200px]">{email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {success ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-16 h-16 rounded-full bg-status-success/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-status-success text-[32px]">check_circle</span>
              </div>
              <p className="font-body-md font-bold text-on-surface">Email Sent</p>
              <p className="text-body-sm text-on-surface-variant text-center">
                Your message has been sent to {email}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-body-sm text-on-surface-variant mb-1">To</p>
                <div className="px-3 py-2.5 rounded-lg bg-surface-container-high text-on-surface text-body-sm font-medium">
                  {name} &lt;{email}&gt;
                </div>
              </div>

              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1.5 font-medium">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject..."
                  maxLength={200}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1.5 font-medium">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={10}
                  maxLength={10000}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
                <p className="text-[11px] text-on-surface-variant mt-1">
                  {message.length} / 10000 characters
                </p>
              </div>

              {error && (
                <div className="px-3 py-2.5 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger text-body-sm font-medium">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-4 py-3 border-t border-subtle bg-surface-bright flex gap-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="flex-1 py-2.5 bg-surface-container-high text-on-surface rounded-lg text-body-sm font-bold hover:bg-surface-container-highest transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !message.trim()}
              className="flex-1 py-2.5 bg-primary text-white rounded-lg text-body-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Email"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
