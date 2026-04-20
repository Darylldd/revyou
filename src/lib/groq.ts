import Groq from "groq-sdk";
import type { Flashcard, MultipleChoiceQuestion, DifficultyLevel } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

const difficultyInstructions: Record<DifficultyLevel, string> = {
  easy: `- Simple recall questions about definitions and key terms
- Short, direct questions with clear answers
- Focus on "what is" and "what does X mean" style questions`,
  medium: `- Mix of conceptual and application questions
- Include "how" and "why" style questions
- Require connecting two or more ideas together`,
  hard: `- Complex analytical and evaluative questions
- Scenario-based questions requiring synthesis of multiple concepts
- Include nuanced edge cases and exceptions`,
};

// ─────────────────────────────────────────────────────────────────
// Shuffle helper — randomizes array order every session
// ─────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────────
// Check if two strings are too similar (catches near-duplicates)
// ─────────────────────────────────────────────────────────────────
function normalizeText(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function isTooSimilar(a: string, b: string, threshold = 0.75): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;

  // Check if one string contains the other (substring match)
  if (na.includes(nb) || nb.includes(na)) return true;

  // Word overlap check
  const wordsA = new Set(na.split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }

  const similarity = overlap / Math.max(wordsA.size, wordsB.size);
  return similarity >= threshold;
}

function deduplicateFlashcards(cards: Flashcard[]): Flashcard[] {
  const unique: Flashcard[] = [];
  for (const card of cards) {
    const isDupe = unique.some(
      (u) =>
        isTooSimilar(u.question, card.question) ||
        isTooSimilar(u.answer, card.answer, 0.9)
    );
    if (!isDupe) unique.push(card);
  }
  return unique;
}

function deduplicateMCQ(questions: MultipleChoiceQuestion[]): MultipleChoiceQuestion[] {
  const unique: MultipleChoiceQuestion[] = [];
  for (const q of questions) {
    const isDupe = unique.some((u) => isTooSimilar(u.question, q.question));
    if (!isDupe) unique.push(q);
  }
  return unique;
}

// ─────────────────────────────────────────────────────────────────
// Flashcard generation
// ─────────────────────────────────────────────────────────────────
export async function generateFlashcards(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<Flashcard[]> {
  // Request more than needed so we have extras after deduplication
  const requestCount = Math.min(count + 5, 35);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a JSON generator. Output ONLY a raw JSON array.
No markdown, no code fences, no preamble, no explanation.
Just the JSON array starting with [ and ending with ].`,
      },
      {
        role: "user",
        content: `Create exactly ${requestCount} flashcards at ${difficulty.toUpperCase()} difficulty from the study material below.

Difficulty guidelines:
${difficultyInstructions[difficulty]}

STRICT ANTI-REPETITION RULES — this is critical:
1. Every question must test a DIFFERENT concept, fact, or idea
2. No two questions can ask about the same topic in different words
3. No two answers can contain the same core information
4. Vary your question styles across the set:
   - Some should be definitions ("What is X?")
   - Some should be application ("How does X work?")
   - Some should be comparison ("What is the difference between X and Y?")
   - Some should be cause-effect ("What causes X?" or "What is the result of X?")
   - Some should be identification ("Which of the following is an example of X?")
5. Spread questions across ALL major topics in the material — do not focus on just one section
6. If the material has 5 topics, make sure each topic has at least one question

QUALITY RULES:
- Use ONLY information explicitly stated in the material
- Do NOT invent, assume, or hallucinate any facts
- Answers must be concise but complete (1-3 sentences max)

STUDY MATERIAL:
${text.slice(0, 12000)}

Output a JSON array in this exact format:
[{"id":"fc_1","question":"...","answer":"...","difficulty":"${difficulty}"},{"id":"fc_2","question":"...","answer":"...","difficulty":"${difficulty}"}]`,
      },
    ],
    temperature: 0.8,
    max_tokens: 6000,
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";
  const parsed = parseJsonArray<Flashcard>(raw);

  // Deduplicate then shuffle then trim to requested count
  const deduped = deduplicateFlashcards(parsed);
  const shuffled = shuffle(deduped);
  return shuffled.slice(0, count).map((card, i) => ({
    ...card,
    id: `fc_${i + 1}`,
  }));
}

// ─────────────────────────────────────────────────────────────────
// Multiple choice generation
// ─────────────────────────────────────────────────────────────────
export async function generateMultipleChoice(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<MultipleChoiceQuestion[]> {
  const requestCount = Math.min(count + 5, 35);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a JSON generator. Output ONLY a raw JSON array.
No markdown, no code fences, no preamble, no explanation.
Just the JSON array starting with [ and ending with ].
CRITICAL: Every item MUST have a "choices" field that is an array of exactly 4 strings.`,
      },
      {
        role: "user",
        content: `Create exactly ${requestCount} multiple choice questions at ${difficulty.toUpperCase()} difficulty from the study material below.

Difficulty guidelines:
${difficultyInstructions[difficulty]}

STRICT ANTI-REPETITION RULES — this is critical:
1. Every question must test a DIFFERENT concept, fact, or idea
2. No two questions can ask about the same topic even with different wording
3. Vary question styles across the set:
   - Some should test recall ("What is X?")
   - Some should test comprehension ("What does X mean in the context of Y?")
   - Some should test application ("Which approach would you use for X?")
   - Some should test analysis ("What is the relationship between X and Y?")
   - Some should use negative phrasing ("Which of the following is NOT X?")
4. Spread questions across ALL major topics — do not cluster on one section
5. Distractors (wrong choices) must be:
   - Plausible but clearly wrong on reflection
   - Related to the topic (not random)
   - NOT obviously silly or unrelated

QUALITY RULES:
- Use ONLY information from the material
- Do NOT hallucinate any facts
- Explanation must say WHY the correct answer is right (not just restate it)
- Keep questions unambiguous — only one answer should be defensibly correct

STUDY MATERIAL:
${text.slice(0, 12000)}

Output JSON in this exact format (choices MUST be an array of 4 plain strings, no "A)" labels):
[{"id":"mc_1","question":"...","choices":["Option A","Option B","Option C","Option D"],"correctIndex":0,"explanation":"...","difficulty":"${difficulty}"}]`,
      },
    ],
    temperature: 0.8,
    max_tokens: 6000,
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";
  const parsed = parseJsonArray<MultipleChoiceQuestion>(raw);

  // Validate structure
  const valid = parsed
    .map((q, i) => ({
      ...q,
      id: `mc_${i + 1}`,
      choices:
        Array.isArray(q.choices) && q.choices.length === 4
          ? q.choices
          : ["Option A", "Option B", "Option C", "Option D"],
      correctIndex:
        typeof q.correctIndex === "number" &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3
          ? q.correctIndex
          : 0,
      explanation: q.explanation ?? "No explanation provided.",
      difficulty: q.difficulty ?? difficulty,
    }))
    .filter((q) => q.question && Array.isArray(q.choices) && q.choices.length === 4);

  // Deduplicate, shuffle, trim
  const deduped = deduplicateMCQ(valid);
  const shuffled = shuffle(deduped);

  // Also shuffle the choices for each question (keeping correctIndex in sync)
  const withShuffledChoices = shuffled.slice(0, count).map((q, i) => {
    const choicesWithIndex = q.choices.map((c, idx) => ({
      text: c,
      isCorrect: idx === q.correctIndex,
    }));
    const shuffledChoices = shuffle(choicesWithIndex);
    return {
      ...q,
      id: `mc_${i + 1}`,
      choices: shuffledChoices.map((c) => c.text),
      correctIndex: shuffledChoices.findIndex((c) => c.isCorrect),
    };
  });

  return withShuffledChoices;
}

// ─────────────────────────────────────────────────────────────────
// Combined generation
// ─────────────────────────────────────────────────────────────────
export async function generateCombined(
  text: string,
  difficulty: DifficultyLevel,
  flashcardCount: number,
  mcqCount: number
): Promise<{ flashcards: Flashcard[]; questions: MultipleChoiceQuestion[] }> {
  const flashcards = await generateFlashcards(text, difficulty, flashcardCount);
  await new Promise((r) => setTimeout(r, 500));
  const questions = await generateMultipleChoice(text, difficulty, mcqCount);
  return { flashcards, questions };
}

// ─────────────────────────────────────────────────────────────────
// Robust JSON parser
// ─────────────────────────────────────────────────────────────────
function parseJsonArray<T>(raw: string): T[] {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  if (start === -1 || end === -1 || end < start) {
    console.error("No JSON array found:", cleaned.slice(0, 200));
    throw new Error("AI returned unexpected data format. Please try again.");
  }

  const jsonStr = cleaned.slice(start, end + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) throw new Error("Not an array");
    return parsed as T[];
  } catch {
    console.error("JSON parse failed:", jsonStr.slice(0, 300));
    throw new Error("Failed to parse AI response. Please try again.");
  }
}