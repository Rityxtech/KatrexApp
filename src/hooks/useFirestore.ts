"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  where,
  doc,
  QueryConstraint,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useCollection<T = DocumentData>(
  path: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const constraintsKey = useRef<string>("");

  const constraintStr = constraints.map((c) => JSON.stringify(c)).join("|");
  const key = `${path}|${constraintStr}`;

  useEffect(() => {
    if (constraintsKey.current === key) return;
    constraintsKey.current = key;

    setLoading(true);
    setError(null);

    const q = constraints.length
      ? query(collection(db, path), ...constraints)
      : collection(db, path);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
        setData(items);
        setLoading(false);
      },
      (err) => {
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
          setData({ id: snap.id, ...snap.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [path, docId]);

  return { data, loading, error };
}

export { collection, query, onSnapshot, orderBy, limit, where, doc };
