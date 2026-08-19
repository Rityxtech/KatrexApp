"use client";

import { useCollection, useDocument } from "./useFirestore";
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

// P2P disputes
export function useP2PDisputes(max = 50) {
  return useCollection<any>("p2p_disputes", orderBy("createdAt", "desc"), limit(max));
}

// P2P settings (single doc in app_settings/p2p)
export function useP2PSettings() {
  return useDocument<any>("app_settings", "p2p");
}

// Support tickets
export function useSupportTickets(max = 50) {
  return useCollection<any>("support_tickets", orderBy("createdAt", "desc"), limit(max));
}

// Referrals
export function useReferrals(max = 50) {
  return useCollection<any>("referrals", orderBy("createdAt", "desc"), limit(max));
}

// Referral config (single document)
export function useReferralConfig() {
  return useDocument<any>("referral_config", "config");
}

// Pricing config
export function usePricingConfig() {
  return useCollection<any>("pricing_config");
}

// App settings
export function useAppSettings() {
  return useCollection<any>("app_settings");
}

export interface GiftcardBrand {
  id: string;
  name: string;
  iconName: string;
  colorHex: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  featured: boolean;
  promoTag: string;
  promoTitle: string;
  promoSubtitle: string;
  promoImageUrl: string;
}

export interface GiftcardRate {
  id: string;
  brandId: string;
  brandName: string;
  currency: string;
  cardType: string;
  minValue: number;
  maxValue: number | null;
  ratePerUnit: number;
  isActive: boolean;
  version: number;
}

export interface GiftcardTrade {
  id: string;
  uid: string;
  userName: string;
  userEmail: string;
  brandId: string;
  brandName: string;
  cardType: string;
  currency: string;
  cardValue: number;
  rateApplied: number;
  payoutAmount: number;
  cardImageUrls: string[];
  storagePaths: string[];
  ecode: string | null;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  adminId: string;
  adminComment: string | null;
  rejectionReason: string | null;
  originalCardValue?: number;
  cardValueAdjusted?: boolean;
  originalPayoutAmount?: number;
  payoutAdjusted?: boolean;
  createdAt: unknown;
  reviewedAt: unknown;
}

export interface GiftcardSettings {
  id: string;
  payoutMode: string;
  payoutDestination: string;
}

// Giftcard administration - all listeners update in real time.
export function useGiftcardBrands() {
  return useCollection<GiftcardBrand>("giftcard_brands", orderBy("sortOrder", "asc"));
}

export function useGiftcardRates() {
  return useCollection<GiftcardRate>("giftcard_rates", orderBy("brandName", "asc"));
}

export function useGiftcardTrades() {
  return useCollection<GiftcardTrade>("giftcard_trades", orderBy("createdAt", "desc"));
}

export function useGiftcardSettings() {
  return useDocument<GiftcardSettings>("app_settings", "giftcard");
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
