"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/");
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Invalid operator credentials.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else {
        setError(err?.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-deep text-on-surface font-body-md min-h-screen flex flex-col overflow-hidden">
      <header className="w-full top-0 sticky border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-container-padding h-14 z-50">
        <div className="flex items-center gap-stack-base">
          <span className="material-symbols-outlined text-primary">terminal</span>
          <span className="font-headline-lg text-headline-lg font-bold tracking-tighter text-primary">KATREX COMMAND</span>
        </div>
        <div className="flex items-center gap-unit">
          <div className="h-2 w-2 rounded-full bg-status-success animate-pulse"></div>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Node: Delta-09 Connected</span>
        </div>
      </header>

      <main className="flex-grow relative flex items-center justify-center p-container-padding">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="h-[4px] w-full absolute"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, rgba(218, 226, 253, 0.05) 50%, transparent 100%)",
              animation: "scan 4s linear infinite",
            }}
          ></div>
          <style>{`@keyframes scan { from { top: -10%; } to { top: 110%; } }`}</style>
        </div>

        <div className="relative z-10 w-full max-w-[420px] flex flex-col gap-max-gap">
          <div className="flex flex-col gap-unit items-center text-center">
            <div className="bg-surface-container border border-outline-variant px-stack-base py-unit rounded-lg flex items-center gap-stack-base">
              <span className="material-symbols-outlined text-status-warning">security</span>
              <span className="font-label-caps text-label-caps text-on-surface">RESTRICTED TERMINAL ACCESS</span>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded p-stack-base flex flex-col gap-max-gap shadow-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center border-b border-outline-variant pb-stack-base mb-unit">
              <span className="font-data-mono text-data-mono text-on-surface-variant opacity-70">AUTH_PROTOCOL_V4.2</span>
              <div className="flex gap-unit">
                <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
                <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
                <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
              </div>
            </div>

            {error && (
              <div className="bg-status-danger/10 border border-status-danger/30 rounded px-3 py-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-status-danger text-[18px]">error</span>
                <span className="font-body-sm text-status-danger">{error}</span>
              </div>
            )}

            <form className="flex flex-col gap-max-gap" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant px-unit">OPERATOR EMAIL</label>
                <div className="relative flex items-center glow-border rounded">
                  <span className="absolute left-3 material-symbols-outlined text-on-surface-variant">fingerprint</span>
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant focus:border-secondary rounded px-10 py-2 font-data-mono text-data-mono text-on-surface placeholder:text-outline-variant outline-none transition-all"
                    placeholder="admin@smclientkx.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between px-unit">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">ACCESS KEY</label>
                  <span className="font-label-caps text-label-caps text-status-warning flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[10px]">lock_open</span>
                    SECURE
                  </span>
                </div>
                <div className="relative flex items-center glow-border rounded">
                  <span className="absolute left-3 material-symbols-outlined text-on-surface-variant">key</span>
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant focus:border-secondary rounded px-10 py-2 font-data-mono text-data-mono text-on-surface placeholder:text-outline-variant outline-none transition-all"
                    placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                className="w-full bg-primary hover:bg-white text-on-primary font-headline-md text-headline-md py-2 rounded transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-stack-base group disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                    <span className="font-bold">AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <span className="font-bold">INITIALIZE SESSION</span>
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex justify-between items-center px-unit border-t border-outline-variant pt-stack-base mt-unit">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Firebase Auth</span>
              <div className="w-px h-3 bg-outline-variant"></div>
              <span className="font-label-caps text-label-caps text-status-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                CONNECTED
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-stack-base">
            <div className="bg-surface-container-low border border-outline-variant rounded-full px-container-padding py-unit flex items-center gap-stack-base shadow-lg">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
              </div>
              <span className="font-data-mono text-data-mono text-on-surface-variant text-[10px] tracking-tighter">SECURE NODE CONNECTION ESTABLISHED [TLS 1.3]</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bottom-0 fixed border-t border-outline-variant bg-surface-dim flex flex-col md:flex-row justify-between items-center px-container-padding py-stack-base gap-stack-base z-50">
        <div className="flex items-center gap-stack-base">
          <span className="font-data-mono text-data-mono text-outline uppercase">VER: 4.0.2-STABLE</span>
          <span className="text-outline-variant">|</span>
          <span className="font-label-caps text-label-caps text-secondary uppercase">&copy; 2024 KATREX SYSTEMS ADMINISTRATION. ALL RIGHTS RESERVED.</span>
        </div>
        <div className="flex items-center gap-max-gap">
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors cursor-default" href="#">SECURITY PROXY</a>
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors cursor-default" href="#">SYSTEM STATUS</a>
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors cursor-default" href="#">TERMINAL PROTOCOLS</a>
        </div>
      </footer>
    </div>
  );
}
