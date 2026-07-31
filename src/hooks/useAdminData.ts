"use client";

import { useCollection } from "./useFirestore";
import { orderBy, limit, where } from "firebase/firestore";

// Transactions - recent
export function useTransactions(max = 50) {
  return useCollection<any>("transactions", orderBy("createdAt", "desc"), limit(max));
}

// Users - all
export function useUsers(max = 100) {
  return useCollection<any>("users", orderBy("createdAt", "desc"), limit(max));
}

// Wallets - all
export function useWallets() {
  return useCollection<any>("wallets");
}

// Market data - crypto prices
export function useMarketData() {
  return useCollection<any>("market_data");
}

// Notifications
export function useNotifications(max = 50) {
  return useCollection<any>("notifications", orderBy("createdAt", "desc"), limit(max));
}

// KYC queue - users with pending verification
export function useKycQueue() {
  return useCollection<any>("users", where("kycStatus", "==", "pending"));
}

// Virtual accounts
export function useVirtualAccounts() {
  return useCollection<any>("virtualAccounts");
}

// Crypto deposits
export function useCryptoDeposits() {
  return useCollection<any>("crypto_deposits");
}

// Email codes (verification)
export function useEmailCodes(max = 20) {
  return useCollection<any>("email_codes", orderBy("createdAt", "desc"), limit(max));
}

// P2P listings (if collection exists)
export function useP2PListings(max = 50) {
  return useCollection<any>("p2p_listings", orderBy("createdAt", "desc"), limit(max));
}

// P2P trades
export function useP2PTrades(max = 50) {
  return useCollection<any>("p2p_trades", orderBy("createdAt", "desc"), limit(max));
}

// Support tickets
export function useSupportTickets(max = 50) {
  return useCollection<any>("support_tickets", orderBy("createdAt", "desc"), limit(max));
}

// Referrals
export function useReferrals(max = 50) {
  return useCollection<any>("referrals", orderBy("createdAt", "desc"), limit(max));
}

// Pricing config
export function usePricingConfig() {
  return useCollection<any>("pricing_config");
}

// App settings
export function useAppSettings() {
  return useCollection<any>("app_settings");
}

// Giftcard rates
export function useGiftcardRates() {
  return useCollection<any>("giftcard_rates");
}

// Airtime/data plans
export function useAirtimePlans() {
  return useCollection<any>("airtime_plans");
}

// Webhook logs
export function useWebhookLogs(max = 30) {
  return useCollection<any>("webhook_logs", orderBy("createdAt", "desc"), limit(max));
}

// Admin stats - aggregate counts
export function useAdminStats() {
  const { data: users, loading: lu } = useUsers(1000);
  const { data: txns, loading: lt } = useTransactions(1000);
  const { data: wallets, loading: lw } = useWallets();
  const { data: market, loading: lm } = useMarketData();

  const loading = lu || lt || lw || lm;

  const totalUsers = users.length;
  const totalTransactions = txns.length;
  const completedTxns = txns.filter((t: any) => t.status === "completed").length;
  const pendingTxns = txns.filter((t: any) => t.status === "pending").length;
  const totalVolume = txns
    .filter((t: any) => t.status === "completed")
    .reduce((sum: number, t: any) => sum + (t.amountNaira || 0), 0);
  const totalNairaBalance = wallets.reduce(
    (sum: number, w: any) => sum + (w.nairaBalance || 0),
    0
  );
  const verifiedUsers = users.filter((u: any) => u.kycStatus === "verified" || u.verified).length;

  return {
    stats: {
      totalUsers,
      totalTransactions,
      completedTxns,
      pendingTxns,
      totalVolume,
      totalNairaBalance,
      verifiedUsers,
      marketCoins: market.length,
    },
    users,
    txns,
    wallets,
    market,
    loading,
  };
}
