"use client";

import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { updateDocument, setDocument } from "@/hooks/useFirestore";

interface Props {
  user: any;
  wallet: any;
  onClose: () => void;
}

export default function UserEditDrawer({ user, wallet, onClose }: Props) {
  const [tab, setTab] = useState<"profile" | "wallet" | "security">("profile");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState(user.fullName || "");
  const [username, setUsername] = useState(user.username || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [country, setCountry] = useState(user.country || "");
  const [bvn, setBvn] = useState(user.bvn || "");
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || "");
  const [gender, setGender] = useState(user.gender || "");
  const [address, setAddress] = useState(user.address || "");
  const [kycTier, setKycTier] = useState(user.kycTier ?? 0);
  const [isEmailVerified, setIsEmailVerified] = useState(user.isEmailVerified ?? false);
  const [isActive, setIsActive] = useState(user.isActive ?? true);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin ?? false);
  const [defaultCurrency, setDefaultCurrency] = useState(user.defaultCurrency || "NGN");
  const [referralCode, setReferralCode] = useState(user.referralCode || "");
  const [referredBy, setReferredBy] = useState(user.referredBy || "");

  // Wallet fields
  const [nairaBalance, setNairaBalance] = useState(wallet?.nairaBalance ?? 0);
  const [cryptoBalances, setCryptoBalances] = useState<Record<string, number>>(
    wallet?.cryptoBalances || {}
  );
  const [newCoinKey, setNewCoinKey] = useState("");
  const [newCoinVal, setNewCoinVal] = useState("");

  // Security fields
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState(user.email || "");

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await updateDocument("users", user.id, {
        fullName,
        username,
        phone,
        country,
        bvn,
        dateOfBirth,
        gender,
        address,
        kycTier: Number(kycTier),
        isEmailVerified,
        isActive,
        defaultCurrency,
        referralCode,
        referredBy,
      });
      flash("Profile updated successfully");
    } catch (e: any) {
      flash(`Error: ${e.message || "Failed to save"}`);
    } finally {
      setSaving(false);
    }
  }

  async function saveWallet() {
    setSaving(true);
    try {
      await setDocument("wallets", user.uid || user.id, {
        nairaBalance: Number(nairaBalance),
        cryptoBalances,
        updatedAt: new Date(),
      });
      flash("Wallet balances updated");
    } catch (e: any) {
      flash(`Error: ${e.message || "Failed to save"}`);
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (newPassword.length < 6) {
      flash("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "resetUserPassword",
        targetUid: user.uid || user.id,
        newPassword,
      });
      setNewPassword("");
      flash("Password reset successfully");
    } catch (e: any) {
      flash(`Error: ${e.message || "Failed to reset password"}`);
    } finally {
      setSaving(false);
    }
  }

  async function changeEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      flash("Invalid email address");
      return;
    }
    setSaving(true);
    try {
      const adminApi = httpsCallable(functions, "adminApi");
      await adminApi({
        action: "updateUserEmail",
        targetUid: user.uid || user.id,
        newEmail,
      });
      setEmail(newEmail);
      flash("Email updated successfully");
    } catch (e: any) {
      flash(`Error: ${e.message || "Failed to update email"}`);
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
                alt={fullName || email}
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
              {(fullName || email || "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <p className="font-body-md font-bold text-on-surface truncate max-w-[200px]">{fullName || "Unknown"}</p>
              <p className="text-[11px] text-on-surface-variant truncate max-w-[200px]">{email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-container-highest rounded transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-subtle bg-surface-bright">
          {(["profile", "wallet", "security"] as const).map((t) => (
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

        {/* Toast message — fixed between tabs and content so it's always visible */}
        {msg && (
          <div className={`px-4 py-2.5 text-body-sm font-medium flex items-center gap-2 text-white ${
            msg.startsWith("Error") ? "bg-status-danger" : "bg-status-success"
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {msg.startsWith("Error") ? "error" : "check_circle"}
            </span>
            {msg}
          </div>
        )}

        {/* Content */}
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
                <Field label="Email">
                  <input className={inputCls} value={email} readOnly />
                </Field>
                <Field label="Phone">
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Field label="Country">
                  <input className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} />
                </Field>
                <Field label="Referral Code">
                  <input className={inputCls} value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
                </Field>
                <Field label="Referred By">
                  <input className={inputCls} value={referredBy} onChange={(e) => setReferredBy(e.target.value)} />
                </Field>
                <Field label="Default Currency">
                  <select className={inputCls} value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
                    {["NGN", "USD", "EUR", "GBP", "GHS", "KES", "ZAR"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </Section>

              <Section title="KYC / Identity">
                <Field label="BVN">
                  <input className={inputCls} value={bvn} onChange={(e) => setBvn(e.target.value)} />
                </Field>
                <Field label="Date of Birth">
                  <input className={inputCls} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} placeholder="yyyy-mm-dd" />
                </Field>
                <Field label="Gender">
                  <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </Field>
                <Field label="Address">
                  <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
                <Field label="KYC Tier">
                  <select className={inputCls} value={kycTier} onChange={(e) => setKycTier(Number(e.target.value))}>
                    <option value={0}>0 — Unverified</option>
                    <option value={1}>1 — BVN Verified</option>
                    <option value={2}>2 — Full KYC</option>
                  </select>
                </Field>
                <Toggle label="Email Verified" checked={isEmailVerified} onChange={setIsEmailVerified} />
                <Toggle label="Active (not suspended)" checked={isActive} onChange={setIsActive} />
                <Toggle label="Admin" checked={isAdmin} onChange={setIsAdmin} disabled />
              </Section>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-2.5 bg-secondary text-on-secondary-container rounded-lg font-bold text-body-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </>
          )}

          {tab === "wallet" && (
            <>
              <Section title="Fiat Balance">
                <Field label="Naira Balance (NGN)">
                  <input
                    type="number"
                    step="0.01"
                    className={inputCls}
                    value={nairaBalance}
                    onChange={(e) => setNairaBalance(parseFloat(e.target.value) || 0)}
                  />
                </Field>
              </Section>

              <Section title="Crypto Balances">
                {Object.keys(cryptoBalances).length === 0 && (
                  <p className="text-[11px] text-on-surface-variant">No crypto holdings</p>
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
                    placeholder="COIN"
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
                onClick={saveWallet}
                disabled={saving}
                className="w-full py-2.5 bg-secondary text-on-secondary-container rounded-lg font-bold text-body-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {saving ? "Saving..." : "Save Wallet"}
              </button>
            </>
          )}

          {tab === "security" && (
            <>
              <Section title="Reset Password">
                <p className="text-[11px] text-on-surface-variant">
                  Sets a new password for this user in Firebase Auth. They will need to use it on next login.
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
                  {saving ? "Resetting..." : "Reset Password"}
                </button>
              </Section>

              <Section title="Change Email">
                <p className="text-[11px] text-on-surface-variant">
                  Updates the email in both Firebase Auth and Firestore. The new email will be marked as verified.
                </p>
                <Field label="New Email">
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
                  {saving ? "Updating..." : "Update Email"}
                </button>
              </Section>

              <Section title="Account Status">
                <Toggle label="Active (not suspended)" checked={isActive} onChange={(v) => {
                  setIsActive(v);
                  updateDocument("users", user.id, { isActive: v }).catch(() => {});
                }} />
                <Toggle label="Email Verified" checked={isEmailVerified} onChange={(v) => {
                  setIsEmailVerified(v);
                  updateDocument("users", user.id, { isEmailVerified: v }).catch(() => {});
                }} />
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
    <label className={`flex items-center justify-between py-1 ${disabled ? "opacity-50" : ""}`}>
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
