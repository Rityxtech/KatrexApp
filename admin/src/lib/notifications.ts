"use client";

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const adminApi = httpsCallable(functions, "adminApi");

export type PushTargetType = "all" | "segment" | "individual";

export interface SendPushParams {
  title: string;
  body: string;
  targetType: PushTargetType;
  ctaRoute?: string;
  ctaLabel?: string;
  // Segment filters
  country?: string;
  currency?: string;
  kycVerified?: boolean;
  // Individual
  targetUid?: string;
}

export async function sendPush(params: SendPushParams) {
  return adminApi({ action: "sendPushNotification", ...params });
}

/// Fetch push campaign logs (most recent first).
export async function getPushCampaigns(max = 50) {
  const q = query(
    collection(db, "push_campaigns"),
    orderBy("createdAt", "desc"),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
