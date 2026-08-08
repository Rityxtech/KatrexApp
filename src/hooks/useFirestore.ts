"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  where,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  QueryConstraint,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function updateDocument(path: string, docId: string, data: Record<string, any>) {
  await updateDoc(doc(db, path, docId), data);
}

export async function setDocument(path: string, docId: string, data: Record<string, any>) {
  await setDoc(doc(db, path, docId), data, { merge: true });
}

export async function deleteDocument(path: string, docId: string) {
  await deleteDoc(doc(db, path, docId));
}

export function useCollection<T = DocumentData>(
  path: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const constraintStr = constraints.map((c) => JSON.stringify(c)).join("|");
  const key = `${path}|${constraintStr}`;

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = constraints.length
      ? query(collection(db, path), ...constraints)
      : collection(db, path);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as T[];
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`[Firestore] ${path} listener failed:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [key]);

  return { data, loading, error };
}

export function useDocument<T = DocumentData>(
  path: string,
  docId: string | null
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = onSnapshot(
      doc(db, path, docId),
      (snap) => {
        if (snap.exists()) {
          setData({ ...snap.data(), id: snap.id } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`[Firestore] ${path} listener failed:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [path, docId]);

  return { data, loading, error };
}

export { collection, query, onSnapshot, orderBy, limit, where, doc, updateDoc, setDoc, deleteDoc };
