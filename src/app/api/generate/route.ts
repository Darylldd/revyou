import { NextRequest, NextResponse } from "next/server";
import {
  generateFlashcards,
  generateMultipleChoice,
  generateCombined,
  isTestBank,
} from "@/lib/groq";
import type { GenerateReviewerPayload } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateReviewerPayload = await req.json();
    const { extractedText, mode, difficulty, itemCount } = body;

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        { error: "Not enough text content. Try a file with more written content." },
        { status: 400 }
      );
    }

    // Tell the client if this is a test bank so it can show a notice
    const detectedTestBank = isTestBank(extractedText);

    if (mode === "flashcard") {
      const flashcards = await generateFlashcards(extractedText, difficulty, itemCount);
      if (!flashcards.length)
        return NextResponse.json({ error: "No flashcards generated. Try again." }, { status: 500 });
      return NextResponse.json({ flashcards, detectedTestBank });
    }

    if (mode === "multiple-choice") {
      const questions = await generateMultipleChoice(extractedText, difficulty, itemCount);
      if (!questions.length)
        return NextResponse.json({ error: "No questions generated. Try again." }, { status: 500 });
      return NextResponse.json({ questions, detectedTestBank });
    }

    if (mode === "combined") {
      const half = Math.ceil(itemCount / 2);
      const result = await generateCombined(extractedText, difficulty, half, itemCount - half);
      return NextResponse.json({ ...result, detectedTestBank });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  } catch (error) {
    console.error("Generation error:", error);
    if (error instanceof Error) {
      if (error.message.includes("429") || error.message.includes("rate_limit"))
        return NextResponse.json({ error: "Rate limit hit. Wait 30 seconds and try again." }, { status: 429 });
      if (error.message.includes("No valid JSON") || error.message.includes("parse"))
        return NextResponse.json({ error: "AI returned unexpected data. Please try again." }, { status: 500 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}