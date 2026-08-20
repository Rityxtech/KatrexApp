"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

interface Props {
  user: any;
  wallet: any;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function UserEditDrawer({ user, wallet, onClose, onRefresh }: Props) {
  const [tab, setTab] = useState<"profile" | "wallet" | "security" | "kyc">("profile");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const targetUid = user.id || user.uid;

  // Profile fields
  const [fullName, setFullName] = useState(user.fullName || user.displayName || "");
  const [username, setUsername] = useState(user.username || "");
  const [email] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [country, setCountry] = useState(user.country || "NG");
  const [bvn, setBvn] = useState(user.bvn || "");
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || "");
  const [gender, setGender] = useState(user.gender || "");
  const [address, setAddress] = useState(user.address || "");
  const [kycTier, setKycTier] = useState(user.kycTier ?? 0);
  const [kycStatus, setKycStatus] = useState(user.kycStatus || "unverified");
  const [isEmailVerified, setIsEmailVerified] = useState(user.isEmailVerified ?? false);
  const [isActive, setIsActive] = useState(user.isActive ?? true);
  const [isFrozen, setIsFrozen] = useState(user.isFrozen ?? false);
  const [withdrawalsLocked, setWithdrawalsLocked] = useState(user.withdrawalsLocked ?? false);
  const [tradesLocked, setTradesLocked] = useState(user.tradesLocked ?? false);
  const [defaultCurrency, setDefaultCurrency] = useState(user.defaultCurrency || "NGN");
  const [referralCode, setReferralCode] = useState(user.referralCode || "");

  // Wallet fields
  const [nairaBalance, setNairaBalance] = useState(wallet?.nairaBalance ?? user.nairaBalance ?? 0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [cryptoBalances, setCryptoBalances] = useState<Record<string, number>>(
    wallet?.cryptoBalances || user.cryptoBalances || {}
  );
  const [newCoinKey, setNewCoinKey] = useState("");
  const [newCoinVal, setNewCoinVal] = useState("");

  // Security fields
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState(user.email || "");

  function flash(text: string, type: "success" | "error" = "success") {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "updateUserProfile",
        targetUid,
        profile: {
          fullName,
          username,
          phone,
          country,
          bvn,
          dateOfBirth,
          gender,
          address,
          kycTier: Number(kycTier),
          kycStatus,
          defaultCurrency,
          referralCode,
        },
        reason: "Admin updated user profile via management drawer",
      });
      flash("Profile updated successfully");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      flash(e?.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveFlags() {
    setSaving(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "updateUserFlags",
        targetUid,
        flags: {
          isActive,
          isEmailVerified,
          isFrozen,
          withdrawalsLocked,
          tradesLocked,
        },
        reason: "Admin updated account status & lock flags",
      });
      flash("Account flags updated successfully");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      flash(e?.message || "Failed to update account flags", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveWalletBalance() {
    if (!adjustmentReason.trim()) {
      flash("Adjustment reason is required for balance changes", "error");
      return;
    }
    setSaving(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "adjustUserBalance",
        targetUid,
        nairaBalance: Number(nairaBalance),
        cryptoBalances,
        reason: adjustmentReason.trim(),
      });
      flash("Wallet balance adjusted & ledger transaction created");
      setAdjustmentReason("");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      flash(e?.message || "Failed to adjust wallet balance", "error");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (newPassword.length < 6) {
      flash("Password must be at least 6 characters", "error");
      return;
    }
    setSaving(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "resetUserPassword",
        targetUid,
        newPassword,
      });
      setNewPassword("");
      flash("Password reset successfully");
    } catch (e: any) {
      flash(e?.message || "Failed to reset password", "error");
    } finally {
      setSaving(false);
    }
  }

  async function changeEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      flash("Invalid email address", "error");
      return;
    }
    setSaving(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "updateUserEmail",
        targetUid,
        newEmail,
      });
      flash("Email updated successfully in Auth and Firestore");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      flash(e?.message || "Failed to update email", "error");
    } finally {
      setSaving(false);
    }
  }

  function addCoin() {
    const key = newCoinKey.trim().toUpperCase();
    const val = parseFloat(newCoinVal);
    if (!key || isNaN(val)) return;
    setCryptoBalances({ ...cryptoBalances, [key]: val });
    setNewCoinKey("");
    setNewCoinVal("");
  }

  function removeCoin(key: string) {
    const next = { ...cryptoBalances };
    delete next[key];
    setCryptoBalances(next);
  }

  function updateCoin(key: string, val: string) {
    const n = parseFloat(val);
    setCryptoBalances({ ...cryptoBalances, [key]: isNaN(n) ? 0 : n });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface-deep border-l border-subtle z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle bg-surface-bright">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary border border-outline-variant text-sm font-bold">
              {(fullName || email || "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <p className="font-body-md font-bold text-on-surface truncate max-w-[200px]">{fullName || "Unknown"}</p>
              <p className="text-[11px] text-on-surface-variant truncate max-w-[200px]">{email}</p>
              <p className="text-[10px] text-outline font-mono truncate max-w-[200px]">ID: {targetUid}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-container-highest rounded transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-subtle bg-surface-bright">
          {(["profile", "wallet", "kyc", "security"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-body-sm font-bold capitalize transition-colors ${
                tab === t
                  ? "text-secondary border-b-2 border-secondary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Message Banner */}
        {msg && (
          <div className={`px-4 py-2.5 text-body-sm font-medium flex items-center gap-2 text-white ${
            msg.type === "error" ? "bg-status-danger" : "bg-status-success"
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {msg.type === "error" ? "error" : "check_circle"}
            </span>
            {msg.text}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === "profile" && (
            <>
              <Section title="Registration Details">
                <Field label="Full Name">
                  <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </Field>
                <Field label="Username">
                  <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} />
                </Field>
                <Field label="Email (Read Only)">
                  <input className={inputCls} value={email} readOnly disabled />
                </Field>
                <Field label="Phone Number">
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Field label="Country Code">
                  <input className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} />
                </Field>
                <Field label="Referral Code">
                  <input className={inputCls} value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
                </Field>
                <Field label="Default Currency">
                  <select className={inputCls} value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
                    {["NGN", "USD", "EUR", "GBP", "GHS", "KES", "ZAR"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </Section>

              <Section title="Account Control & Restrictions">
                <Toggle label="Active (Not Suspended)" checked={isActive} onChange={setIsActive} />
                <Toggle label="Email Verified" checked={isEmailVerified} onChange={setIsEmailVerified} />
                <Toggle label="Account Frozen (All Trades Stopped)" checked={isFrozen} onChange={setIsFrozen} />
                <Toggle label="Withdrawals Locked" checked={withdrawalsLocked} onChange={setWithdrawalsLocked} />
                <Toggle label="Trades Locked" checked={tradesLocked} onChange={setTradesLocked} />
                <button
                  onClick={saveFlags}
                  disabled={saving}
                  className="w-full py-2 bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-subtle rounded-lg font-bold text-xs transition-colors mt-2"
                >
                  {saving ? "Updating..." : "Save Account Flags"}
                </button>
              </Section>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-2.5 bg-secondary text-on-secondary-container rounded-lg font-bold text-body-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "Saving Profile..." : "Save Profile Details"}
              </button>
            </>
          )}

          {tab === "wallet" && (
            <>
              <Section title="Balance Adjustments (Ledger Tracked)">
                <Field label="Naira Balance (NGN)">
                  <input
                    type="number"
                    step="0.01"
                    className={inputCls}
                    value={nairaBalance}
                    onChange={(e) => setNairaBalance(parseFloat(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Audit Reason (Required)">
                  <input
                    className={inputCls}
                    placeholder="e.g. Manual correction, Refund for trade #123"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                  />
                </Field>
              </Section>

              <Section title="Crypto Asset Balances">
                {Object.keys(cryptoBalances).length === 0 && (
                  <p className="text-[11px] text-on-surface-variant">No crypto holdings stored</p>
                )}
                {Object.entries(cryptoBalances).map(([symbol, amount]) => (
                  <div key={symbol} className="flex items-center gap-2">
                    <span className="w-16 text-body-sm font-bold text-on-surface">{symbol}</span>
                    <input
                      type="number"
                      step="0.00000001"
                      className={inputCls}
                      value={amount}
                      onChange={(e) => updateCoin(symbol, e.target.value)}
                    />
                    <button
                      onClick={() => removeCoin(symbol)}
                      className="p-1 text-status-danger hover:bg-status-danger/10 rounded transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 border-t border-subtle">
                  <input
                    className={inputCls}
                    placeholder="COIN (e.g. BTC)"
                    value={newCoinKey}
                    onChange={(e) => setNewCoinKey(e.target.value)}
                  />
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="Amount"
                    value={newCoinVal}
                    onChange={(e) => setNewCoinVal(e.target.value)}
                  />
                  <button
                    onClick={addCoin}
                    className="p-1.5 bg-surface-container-high text-secondary rounded hover:bg-surface-container-highest transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
              </Section>

              <button
                onClick={saveWalletBalance}
                disabled={saving}
                className="w-full py-2.5 bg-secondary text-on-secondary-container rounded-lg font-bold text-body-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "Processing Adjustment..." : "Commit Balance Adjustment"}
              </button>
            </>
          )}

          {tab === "kyc" && (
            <>
              <Section title="KYC Verification Status">
                <Field label="BVN">
                  <input className={inputCls} value={bvn} onChange={(e) => setBvn(e.target.value)} />
                </Field>
                <Field label="Date of Birth">
                  <input className={inputCls} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} placeholder="YYYY-MM-DD" />
                </Field>
                <Field label="Gender">
                  <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Unspecified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </Field>
                <Field label="Address">
                  <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
                <Field label="KYC Tier Level">
                  <select className={inputCls} value={kycTier} onChange={(e) => setKycTier(Number(e.target.value))}>
                    <option value={0}>Tier 0 — Unverified</option>
                    <option value={1}>Tier 1 — Basic (BVN Verified)</option>
                    <option value={2}>Tier 2 — Advanced (NIN / Passport)</option>
                    <option value={3}>Tier 3 — VIP Corporate</option>
                  </select>
                </Field>
                <Field label="KYC Status">
                  <select className={inputCls} value={kycStatus} onChange={(e) => setKycStatus(e.target.value)}>
                    <option value="unverified">Unverified</option>
                    <option value="pending">Pending Review</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </Field>
              </Section>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-2.5 bg-secondary text-on-secondary-container rounded-lg font-bold text-body-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "Saving KYC..." : "Save KYC Status"}
              </button>
            </>
          )}

          {tab === "security" && (
            <>
              <Section title="Admin Reset Password">
                <p className="text-[11px] text-on-surface-variant">
                  Overrides current password in Firebase Auth immediately.
                </p>
                <Field label="New Password (min 6 chars)">
                  <input
                    type="password"
                    className={inputCls}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </Field>
                <button
                  onClick={resetPassword}
                  disabled={saving}
                  className="w-full py-2 bg-status-warning/10 text-status-warning border border-status-warning/30 rounded-lg font-bold text-body-sm disabled:opacity-50 hover:bg-status-warning/20 transition-colors"
                >
                  {saving ? "Resetting..." : "Execute Password Reset"}
                </button>
              </Section>

              <Section title="Update Registered Email">
                <p className="text-[11px] text-on-surface-variant">
                  Updates primary email across Firebase Auth & Firestore user records.
                </p>
                <Field label="New Email Address">
                  <input
                    type="email"
                    className={inputCls}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </Field>
                <button
                  onClick={changeEmail}
                  disabled={saving}
                  className="w-full py-2 bg-secondary text-on-secondary-container rounded-lg font-bold text-body-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {saving ? "Updating Email..." : "Update Registered Email"}
                </button>
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const inputCls = "w-full h-9 bg-surface-container-low border border-subtle rounded-md px-3 text-body-sm text-on-surface focus:border-secondary focus:ring-0 outline-none transition-colors";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-on-surface-variant mb-1">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between py-1 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <span className="text-body-sm text-on-surface">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors relative ${checked ? "bg-secondary" : "bg-surface-container-highest"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-5" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}
