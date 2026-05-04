"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type {
  DifficultyLevel,
  ReviewMode,
  Flashcard,
  MultipleChoiceQuestion,
  Reviewer,
} from "@/types";
import SessionConfig from "@/components/reviewer/SessionConfig";
import FlashcardMode from "@/components/reviewer/FlashcardMode";
import MultipleChoiceMode from "@/components/reviewer/MultipleChoiceMode";
import ScoreSummary from "@/components/reviewer/ScoreSummary";
import Spinner from "@/components/ui/Spinner";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export type SessionState = "config" | "reviewing" | "done";

export interface SessionResult {
  mode: ReviewMode;
  difficulty: DifficultyLevel;
  totalItems: number;
  correctAnswers: number;
  flashcards?: Flashcard[];
  questions?: MultipleChoiceQuestion[];
  timeTaken: number; // seconds
}

function ReviewContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const reviewerId = searchParams.get("reviewerId");
  const fromUpload = searchParams.get("fromUpload");

  const [sessionState, setSessionState] = useState<SessionState>("config");
  const [extractedText, setExtractedText] = useState("");
  const [reviewerTitle, setReviewerTitle] = useState("");
  const [mode, setMode] = useState<ReviewMode>("flashcard");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [loadingReviewer, setLoadingReviewer] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    if (!reviewerId) return;
    setLoadingReviewer(true);
    getDoc(doc(db, "reviewers", reviewerId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as Reviewer & {
            createdAt: Timestamp;
            updatedAt: Timestamp;
          };
          setExtractedText(data.combinedText);
          setReviewerTitle(data.title);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingReviewer(false));
  }, [reviewerId]);

  // Load text from sessionStorage if coming from upload page
  useEffect(() => {
    if (!fromUpload) return;
    const text = sessionStorage.getItem("reviewText");
    if (text) {
      setExtractedText(text);
      sessionStorage.removeItem("reviewText");
      sessionStorage.removeItem("reviewFileIds");
    }
  }, [fromUpload]);

  function handleSessionStart(
    text: string,
    selectedMode: ReviewMode,
    selectedDifficulty: DifficultyLevel,
    generatedFlashcards?: Flashcard[],
    generatedQuestions?: MultipleChoiceQuestion[]
  ) {
    setExtractedText(text);
    setMode(selectedMode);
    setDifficulty(selectedDifficulty);
    setFlashcards(generatedFlashcards ?? []);
    setQuestions(generatedQuestions ?? []);
    setStartTime(Date.now());
    setSessionState("reviewing");
  }

  function handleSessionDone(correct: number) {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const totalItems =
      mode === "flashcard"
        ? flashcards.length
        : mode === "multiple-choice"
        ? questions.length
        : flashcards.length + questions.length;

    setSessionResult({
      mode,
      difficulty,
      totalItems,
      correctAnswers: correct,
      flashcards: flashcards.length > 0 ? flashcards : undefined,
      questions: questions.length > 0 ? questions : undefined,
      timeTaken,
    });
    setSessionState("done");
  }

  function handleRestart() {
    setSessionState("config");
    setSessionResult(null);
    setFlashcards([]);
    setQuestions([]);
  }

  if (loadingReviewer) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner size={32} />
          <p className="text-slate-400 text-sm">Loading your reviewer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      {/* Top Bar */}
      {sessionState === "config" && (
        <nav
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <Sparkles className="text-violet-400 w-5 h-5" />
            <span className="text-white font-bold text-lg">RevYouw</span>
          </Link>
          <div className="flex items-center gap-3">
            {!user && (
              <Link
                href="/login"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Sign in to save progress
              </Link>
            )}
            {user && (
              <Link
                href="/dashboard"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                ← Dashboard
              </Link>
            )}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <div className="flex-1">
        {sessionState === "config" && (
          <SessionConfig
            preloadedText={extractedText}
            preloadedTitle={reviewerTitle}
            onStart={handleSessionStart}
            user={user}
          />
        )}

        {sessionState === "reviewing" && mode === "flashcard" && (
          <FlashcardMode
            flashcards={flashcards}
            difficulty={difficulty}
            onDone={handleSessionDone}
          />
        )}

        {sessionState === "reviewing" && mode === "multiple-choice" && (
          <MultipleChoiceMode
            questions={questions}
            difficulty={difficulty}
            onDone={handleSessionDone}
          />
        )}

        {sessionState === "reviewing" && mode === "combined" && (
          <CombinedMode
            flashcards={flashcards}
            questions={questions}
            difficulty={difficulty}
            onDone={handleSessionDone}
          />
        )}

        {sessionState === "done" && sessionResult && (
          <ScoreSummary
            result={sessionResult}
            reviewerTitle={reviewerTitle}
            onRestart={handleRestart}
            onNewSession={() => {
              handleRestart();
            }}
            user={user}
            extractedText={extractedText}
          />
        )}
      </div>
    </div>
  );
}

// Combined mode wrapper
function CombinedMode({
  flashcards,
  questions,
  difficulty,
  onDone,
}: {
  flashcards: Flashcard[];
  questions: MultipleChoiceQuestion[];
  difficulty: DifficultyLevel;
  onDone: (correct: number) => void;
}) {
  const [phase, setPhase] = useState<"flashcard" | "quiz">("flashcard");
  const [fcCorrect, setFcCorrect] = useState(0);

  function handleFlashcardsDone(correct: number) {
    setFcCorrect(correct);
    setPhase("quiz");
  }

  function handleQuizDone(correct: number) {
    onDone(fcCorrect + correct);
  }

  return phase === "flashcard" ? (
    <FlashcardMode
      flashcards={flashcards}
      difficulty={difficulty}
      onDone={handleFlashcardsDone}
      isCombinedPhase={true}
      phaseLabel="Phase 1 of 2 — Flashcards"
    />
  ) : (
    <MultipleChoiceMode
      questions={questions}
      difficulty={difficulty}
      onDone={handleQuizDone}
      isCombinedPhase={true}
      phaseLabel="Phase 2 of 2 — Quiz"
    />
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "var(--bg)" }}
        >
          <Spinner size={32} />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}