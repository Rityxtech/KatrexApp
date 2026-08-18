"use client";

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { doc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

const supportApi = httpsCallable(functions, "supportApi");

// ─── Admin Ticket Actions ──────────────────────────────────────────

export async function adminReplyTicket(ticketId: string, text: string) {
  return supportApi({ action: "adminReplyTicket", ticketId, text });
}

export async function updateTicketStatus(ticketId: string, status: string, priority?: string) {
  const payload: any = { action: "updateTicketStatus", ticketId, status };
  if (priority) payload.priority = priority;
  return supportApi(payload);
}

// ─── Admin Live Chat Actions ───────────────────────────────────────

export async function adminAssignChat(chatId: string) {
  return supportApi({ action: "adminAssignChat", chatId });
}

export async function adminSendChatMessage(chatId: string, text: string) {
  return supportApi({ action: "adminSendChatMessage", chatId, text });
}

export async function adminCloseChat(chatId: string) {
  return supportApi({ action: "adminCloseChat", chatId });
}
