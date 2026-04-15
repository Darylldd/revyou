"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { ReviewerFile, Reviewer } from "@/types";

export function useReviewerFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState<ReviewerFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFiles([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "reviewerFiles"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data();
        return {
          ...raw,
          id: d.id,
          createdAt:
            raw.createdAt instanceof Timestamp
              ? raw.createdAt.toDate()
              : new Date(),
        } as ReviewerFile;
      });
      setFiles(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return { files, loading };
}

export function useReviewers() {
  const { user } = useAuth();
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setReviewers([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "reviewers"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data();
        return {
          ...raw,
          id: d.id,
          createdAt:
            raw.createdAt instanceof Timestamp
              ? raw.createdAt.toDate()
              : new Date(),
          updatedAt:
            raw.updatedAt instanceof Timestamp
              ? raw.updatedAt.toDate()
              : new Date(),
        } as Reviewer;
      });
      setReviewers(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  async function createReviewer(
    title: string,
    fileIds: string[],
    combinedText: string,
    description?: string,
    tags?: string[]
  ) {
    if (!user) throw new Error("Not authenticated");
    const ref = await addDoc(collection(db, "reviewers"), {
      userId: user.uid,
      title,
      description: description ?? "",
      fileIds,
      combinedText,
      tags: tags ?? [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async function updateReviewer(
    reviewerId: string,
    data: Partial<Pick<Reviewer, "title" | "description" | "tags" | "fileIds" | "combinedText">>
  ) {
    await updateDoc(doc(db, "reviewers", reviewerId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async function deleteReviewer(reviewerId: string) {
    await deleteDoc(doc(db, "reviewers", reviewerId));
  }

  return { reviewers, loading, createReviewer, updateReviewer, deleteReviewer };
}