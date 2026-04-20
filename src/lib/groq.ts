import Groq from "groq-sdk";
import type { Flashcard, MultipleChoiceQuestion, DifficultyLevel } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

const difficultyInstructions: Record<DifficultyLevel, string> = {
  easy: `- Simple recall questions about definitions and key terms
- Short direct questions with clear answers`,
  medium: `- Mix of conceptual and application questions  
- Include "how" and "why" style questions`,
  hard: `- Complex analytical and evaluative questions
- Scenario-based questions requiring synthesis`,
};

// ─────────────────────────────────────────────────────────────────
// Test bank detector
// Returns true if the text looks like a test bank / question set
// ─────────────────────────────────────────────────────────────────
export function isTestBank(text: string): boolean {
  const normalized = text.toLowerCase();

  // Must have question-like patterns
  const hasNumberedQuestions = /^\s*\d+[\.\)]\s+\w/m.test(text);
  const hasChoiceLetters =
    /^\s*[abcd][\.\)]\s+\w/im.test(text) ||
    /^\s*[abcd]\.\s+/im.test(text);
  const hasChoiceSymbols = /\(a\)|\(b\)|\(c\)|\(d\)/i.test(text);

  // Count MCQ patterns
  const questionMatches = text.match(/^\s*\d+[\.\)]\s+/gm) ?? [];
  const choiceMatches =
    text.match(/^\s*[abcd][\.\)]\s+/gim) ??
    text.match(/\(a\)|\(b\)|\(c\)|\(d\)/gi) ?? [];

  // It's a test bank if we find multiple questions AND choices
  const looksLikeMCQ =
    questionMatches.length >= 2 && choiceMatches.length >= 4;

  // Also check for answer key patterns
  const hasAnswerKey =
    /answer\s*key|correct\s*answer|ans\s*:/i.test(normalized);

  return (hasNumberedQuestions && (hasChoiceLetters || hasChoiceSymbols)) ||
    looksLikeMCQ ||
    (hasAnswerKey && hasChoiceLetters);
}

// ─────────────────────────────────────────────────────────────────
// Parse test bank text into MCQ format using AI
// ─────────────────────────────────────────────────────────────────
export async function parseTestBank(
  text: string,
  count: number
): Promise<MultipleChoiceQuestion[]> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a test bank parser. Extract multiple choice questions from the provided text.
Output ONLY a raw JSON array. No markdown, no code fences, no explanation.`,
      },
      {
        role: "user",
        content: `Parse the following test bank text and extract up to ${count} multiple choice questions.

For each question:
- Extract the question text exactly
- Extract all 4 choices (A, B, C, D) exactly as written
- Determine the correct answer (look for answer keys, asterisks, bold markers, or "Ans:" notations)
- If no correct answer is marked, use your knowledge to determine it
- Write a brief explanation of why the answer is correct

TEST BANK TEXT:
${text.slice(0, 14000)}

Output a JSON array in this exact format:
[{"id":"mc_1","question":"exact question text","choices":["Choice A text","Choice B text","Choice C text","Choice D text"],"correctIndex":0,"explanation":"brief explanation","difficulty":"medium"}]

IMPORTANT:
- choices must be an array of 4 plain strings
- correctIndex is 0 for A, 1 for B, 2 for C, 3 for D
- Do not include the letter labels (A., B.) inside the choice text itself`,
      },
    ],
    temperature: 0.2,
    max_tokens: 6000,
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";
  const parsed = parseJsonArray<MultipleChoiceQuestion>(raw);

  return parsed
    .map((q, i) => ({
      ...q,
      id: `mc_${i + 1}`,
      choices:
        Array.isArray(q.choices) && q.choices.length === 4
          ? q.choices
          : ["Option A", "Option B", "Option C", "Option D"],
      correctIndex:
        typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3
          ? q.correctIndex
          : 0,
      explanation: q.explanation ?? "Based on the source material.",
      difficulty: (q.difficulty as DifficultyLevel) ?? "medium",
    }))
    .filter((q) => q.question && q.choices.length === 4)
    .slice(0, count);
}

// ─────────────────────────────────────────────────────────────────
// Shuffle
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
// Deduplication
// ─────────────────────────────────────────────────────────────────
function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function tooSimilar(a: string, b: string, threshold = 0.75): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(na.split(" ").filter((w) => w.length > 3));
  const wb = new Set(nb.split(" ").filter((w) => w.length > 3));
  if (!wa.size || !wb.size) return false;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.max(wa.size, wb.size) >= threshold;
}

function dedupeFc(cards: Flashcard[]) {
  const out: Flashcard[] = [];
  for (const c of cards) {
    if (!out.some((u) => tooSimilar(u.question, c.question) || tooSimilar(u.answer, c.answer, 0.9)))
      out.push(c);
  }
  return out;
}

function dedupeMcq(qs: MultipleChoiceQuestion[]) {
  const out: MultipleChoiceQuestion[] = [];
  for (const q of qs) {
    if (!out.some((u) => tooSimilar(u.question, q.question))) out.push(q);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// Flashcard generation
// ─────────────────────────────────────────────────────────────────
export async function generateFlashcards(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<Flashcard[]> {
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
        content: `Create exactly ${requestCount} flashcards at ${difficulty.toUpperCase()} difficulty.

Difficulty: ${difficultyInstructions[difficulty]}

ANTI-REPETITION RULES:
1. Every question tests a DIFFERENT concept or fact
2. No two questions ask about the same topic in different words
3. Vary styles: definitions, applications, comparisons, cause-effect, identification
4. Spread across ALL major topics — not just one section
5. If material has 5 topics, each must have at least 1 question

QUALITY RULES:
- Use ONLY information from the material
- Do NOT hallucinate
- Answers: 1-3 sentences max

MATERIAL:
${text.slice(0, 12000)}

Output JSON array:
[{"id":"fc_1","question":"...","answer":"...","difficulty":"${difficulty}"}]`,
      },
    ],
    temperature: 0.8,
    max_tokens: 6000,
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";
  const parsed = parseJsonArray<Flashcard>(raw);
  const deduped = dedupeFc(parsed);
  const shuffled = shuffle(deduped);
  return shuffled.slice(0, count).map((c, i) => ({ ...c, id: `fc_${i + 1}` }));
}

// ─────────────────────────────────────────────────────────────────
// MCQ generation
// ─────────────────────────────────────────────────────────────────
export async function generateMultipleChoice(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<MultipleChoiceQuestion[]> {
  // If it's a test bank, parse directly instead of generating
  if (isTestBank(text)) {
    const parsed = await parseTestBank(text, count);
    if (parsed.length >= Math.max(2, count * 0.5)) {
      return shuffle(parsed).slice(0, count).map((q, i) => ({
        ...q,
        id: `mc_${i + 1}`,
      }));
    }
    // Fall through to generation if parsing got too few
  }

  const requestCount = Math.min(count + 5, 35);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a JSON generator. Output ONLY a raw JSON array.
No markdown, no code fences, no preamble, no explanation.
Just the JSON array starting with [ and ending with ].
CRITICAL: Every item MUST have a "choices" array of exactly 4 strings.`,
      },
      {
        role: "user",
        content: `Create exactly ${requestCount} multiple choice questions at ${difficulty.toUpperCase()} difficulty.

Difficulty: ${difficultyInstructions[difficulty]}

ANTI-REPETITION RULES:
1. Every question tests a DIFFERENT concept
2. No two questions ask the same thing differently
3. Vary styles: recall, comprehension, application, analysis, "which is NOT"
4. Spread across ALL major topics
5. Plausible distractors — related to topic but clearly wrong on reflection

QUALITY RULES:
- Use ONLY information from the material
- Do NOT hallucinate
- One unambiguously correct answer
- Brief explanation of WHY answer is correct

MATERIAL:
${text.slice(0, 12000)}

Output JSON array (choices = 4 plain strings, no "A)" labels):
[{"id":"mc_1","question":"...","choices":["Option A","Option B","Option C","Option D"],"correctIndex":0,"explanation":"...","difficulty":"${difficulty}"}]`,
      },
    ],
    temperature: 0.8,
    max_tokens: 6000,
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";
  const parsed = parseJsonArray<MultipleChoiceQuestion>(raw);

  const valid = parsed
    .map((q, i) => ({
      ...q,
      id: `mc_${i + 1}`,
      choices:
        Array.isArray(q.choices) && q.choices.length === 4
          ? q.choices
          : ["Option A", "Option B", "Option C", "Option D"],
      correctIndex:
        typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3
          ? q.correctIndex
          : 0,
      explanation: q.explanation ?? "No explanation provided.",
      difficulty: q.difficulty ?? difficulty,
    }))
    .filter((q) => q.question && q.choices.length === 4);

  const deduped = dedupeMcq(valid);
  const shuffled = shuffle(deduped);

  return shuffled.slice(0, count).map((q, i) => {
    const withIdx = q.choices.map((c, ci) => ({ text: c, correct: ci === q.correctIndex }));
    const reordered = shuffle(withIdx);
    return {
      ...q,
      id: `mc_${i + 1}`,
      choices: reordered.map((c) => c.text),
      correctIndex: reordered.findIndex((c) => c.correct),
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Combined
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
// JSON parser
// ─────────────────────────────────────────────────────────────────
function parseJsonArray<T>(raw: string): T[] {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start)
    throw new Error("AI returned unexpected data format. Please try again.");
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) throw new Error("Not an array");
    return parsed as T[];
  } catch {
    throw new Error("Failed to parse AI response. Please try again.");
  }
}