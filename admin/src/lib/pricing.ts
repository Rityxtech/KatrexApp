"use client";

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const adminApi = httpsCallable(functions, "adminApi");

// ─── Pricing Config ────────────────────────────────────────────────

export async function updateFees(data: {
  withdrawalFee?: string;
  depositFee?: string;
  swapFee?: string;
  p2pCommission?: string;
  airtimeDiscount?: string;
  dataMarkup?: string;
}) {
  return adminApi({ action: "updatePricingConfig", section: "fees", ...data });
}

export async function updateLimits(data: {
  p2pMin?: string;
  p2pMax?: string;
  cryptoMin?: string;
  cryptoMax?: string;
  billMin?: string;
  billMax?: string;
}) {
  return adminApi({ action: "updatePricingConfig", section: "limits", ...data });
}

export async function updateTradeFees(data: {
  buyFeePercent?: number;
  sellFeePercent?: number;
  swapFeePercent?: number;
  sendFeePercent?: number;
}) {
  return adminApi({ action: "updatePricingConfig", section: "tradeFees", ...data });
}

export async function updateCryptoSpreads(data: {
  buySpreadPercent?: number;
  sellSpreadPercent?: number;
}) {
  return adminApi({ action: "updatePricingConfig", section: "cryptoSpreads", ...data });
}

export async function updateFiatSpreads(data: {
  buySpreadPercent?: number;
  sellSpreadPercent?: number;
}) {
  return adminApi({ action: "updatePricingConfig", section: "fiatSpreads", ...data });
}

export async function updateNgnRate(rate: number) {
  return adminApi({ action: "updatePricingConfig", section: "ngnRate", rate });
}

// ─── Giftcard Rate ─────────────────────────────────────────────────

export async function updateGiftcardRate(data: {
  rateId: string;
  brandId: string;
  currency: string;
  cardType: string;
  minValue: number;
  maxValue: number | null;
  ratePerUnit: number;
  isActive: boolean;
}) {
  return adminApi({ action: "saveGiftcardRate", ...data });
}

// ─── Market Data (admin override crypto prices) ────────────────────

export async function updateMarketPrice(coinId: string, priceNaira: number) {
  const ref = doc(db, "market_data", coinId);
  await updateDoc(ref, { priceNaira, updatedAt: serverTimestamp() });
}
