export type DifficultyLevel = "easy" | "medium" | "hard";
export type ReviewMode = "flashcard" | "multiple-choice" | "combined";
export type FileStatus = "uploading" | "processing" | "ready" | "error";

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface ReviewerFile {
  id: string;
  userId?: string; // undefined if guest
  fileName: string;
  fileType: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  extractedText: string;
  createdAt: Date;
  status: FileStatus;
}

export interface Reviewer {
  id: string;
  userId: string;
  title: string;
  description?: string;
  fileIds: string[]; // references to ReviewerFile ids
  combinedText: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: DifficultyLevel;
}

export interface MultipleChoiceQuestion {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  difficulty: DifficultyLevel;
}

export interface ReviewSession {
  id: string;
  userId?: string;
  reviewerId?: string;
  mode: ReviewMode;
  difficulty: DifficultyLevel;
  flashcards?: Flashcard[];
  questions?: MultipleChoiceQuestion[];
  score?: number;
  completedAt?: Date;
  createdAt: Date;
}

export interface GenerateReviewerPayload {
  extractedText: string;
  mode: ReviewMode;
  difficulty: DifficultyLevel;
  itemCount: number;
}