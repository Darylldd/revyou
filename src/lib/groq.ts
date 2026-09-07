import Groq from "groq-sdk";
import type {
  Flashcard,
  MultipleChoiceQuestion,
  DifficultyLevel,
} from "@/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "openai/gpt-oss-20b";
const VISION_MODEL = "qwen/qwen3.6-27b";

const difficultyInstructions: Record<DifficultyLevel, string> = {
  easy: `- Simple recall questions about definitions and key terms
- Short direct questions with clear answers`,
  medium: `- Mix of conceptual and application questions
- Include "how" and "why" style questions`,
  hard: `- Complex analytical and evaluative questions
- Scenario-based questions requiring synthesis`,
};

/* -------------------------------------------------------------------------- */
/* Test bank detection                                                        */
/* -------------------------------------------------------------------------- */

export function isTestBank(text: string): boolean {
  const normalized = text.toLowerCase();

  const hasNumberedQuestions = /^\s*\d+[\.\)]\s+\w/m.test(text);

  const hasChoiceLetters =
    /^\s*[abcd][\.\)]\s+\w/im.test(text) ||
    /^\s*[abcd]\.\s+/im.test(text);

  const hasChoiceSymbols =
    /\(a\)|\(b\)|\(c\)|\(d\)/i.test(text);

  const questionMatches =
    text.match(/^\s*\d+[\.\)]\s+/gm) ?? [];

  const choiceMatches =
    text.match(/^\s*[abcd][\.\)]\s+/gim) ??
    text.match(/\(a\)|\(b\)|\(c\)|\(d\)/gi) ??
    [];

  const looksLikeMCQ =
    questionMatches.length >= 2 &&
    choiceMatches.length >= 4;

  const hasAnswerKey =
    /answer\s*key|correct\s*answer|ans\s*:/i.test(normalized);

  return (
    (hasNumberedQuestions &&
      (hasChoiceLetters || hasChoiceSymbols)) ||
    looksLikeMCQ ||
    (hasAnswerKey && hasChoiceLetters)
  );
}

/* -------------------------------------------------------------------------- */
/* Test bank parsing                                                          */
/* -------------------------------------------------------------------------- */

export async function parseTestBank(
  text: string,
  count: number
): Promise<MultipleChoiceQuestion[]> {
  const requestCount = Math.min(Math.max(count, 1), 10);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    reasoning_effort: "low",

    messages: [
      {
        role: "system",
        content: `You are a test bank parser.

Your job is to extract existing multiple-choice questions from the
provided source material.

Return ONLY valid JSON.
Do not use markdown.
Do not use code fences.
Do not include explanations outside the JSON.

Return an object with this exact structure:
{
  "questions": [
    {
      "id": "mc_1",
      "question": "Question text",
      "choices": [
        "Choice A",
        "Choice B",
        "Choice C",
        "Choice D"
      ],
      "correctIndex": 0,
      "explanation": "Brief explanation",
      "difficulty": "medium"
    }
  ]
}

IMPORTANT:
- "choices" MUST contain exactly 4 strings.
- correctIndex MUST be 0, 1, 2, or 3.
- Do not include A/B/C/D labels inside the choice strings.
- Preserve the original question and choices whenever possible.
- Do not invent additional choices.
- If an answer key exists, use it.
- If no answer is marked, determine the answer using the source material.
- Never invent information that contradicts the source.`,
      },
      {
        role: "user",
        content: `Extract up to ${requestCount} multiple-choice questions.

For each question:
- Extract the question text.
- Extract all four choices.
- Determine the correct answer.
- Provide a short explanation.
- Assign difficulty as easy, medium, or hard.

TEST BANK TEXT:
${text.slice(0, 14000)}

Return ONLY JSON in this structure:
{
  "questions": [
    {
      "id": "mc_1",
      "question": "exact question text",
      "choices": [
        "Choice A text",
        "Choice B text",
        "Choice C text",
        "Choice D text"
      ],
      "correctIndex": 0,
      "explanation": "brief explanation",
      "difficulty": "medium"
    }
  ]
}`,
      },
    ],

    temperature: 0.1,
    max_tokens: 6000,

    response_format: {
      type: "json_object",
    },
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  const parsed = parseJsonObject<{
    questions?: MultipleChoiceQuestion[];
  }>(raw);

  const questions = Array.isArray(parsed?.questions)
    ? parsed.questions
    : [];

  return questions
    .map((q, i) => normalizeMcq(q, i, "medium"))
    .filter(isValidMcq)
    .slice(0, count);
}

/* -------------------------------------------------------------------------- */
/* Utility helpers                                                            */
/* -------------------------------------------------------------------------- */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tooSimilar(
  a: string,
  b: string,
  threshold = 0.75
): boolean {
  const na = normalize(a);
  const nb = normalize(b);

  if (!na || !nb) return false;

  if (na === nb) return true;

  if (na.includes(nb) || nb.includes(na)) {
    return true;
  }

  const wa = new Set(
    na.split(" ").filter((w) => w.length > 3)
  );

  const wb = new Set(
    nb.split(" ").filter((w) => w.length > 3)
  );

  if (!wa.size || !wb.size) {
    return false;
  }

  let overlap = 0;

  for (const word of wa) {
    if (wb.has(word)) {
      overlap++;
    }
  }

  return (
    overlap / Math.max(wa.size, wb.size) >= threshold
  );
}

/* -------------------------------------------------------------------------- */
/* Flashcard deduplication                                                    */
/* -------------------------------------------------------------------------- */

function dedupeFc(cards: Flashcard[]): Flashcard[] {
  const out: Flashcard[] = [];

  for (const card of cards) {
    const duplicate = out.some(
      (existing) =>
        tooSimilar(existing.question, card.question) ||
        tooSimilar(existing.answer, card.answer, 0.9)
    );

    if (!duplicate) {
      out.push(card);
    }
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* MCQ deduplication                                                          */
/* -------------------------------------------------------------------------- */

function dedupeMcq(
  questions: MultipleChoiceQuestion[]
): MultipleChoiceQuestion[] {
  const out: MultipleChoiceQuestion[] = [];

  for (const question of questions) {
    const duplicate = out.some((existing) =>
      tooSimilar(existing.question, question.question)
    );

    if (!duplicate) {
      out.push(question);
    }
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Flashcard generation                                                       */
/* -------------------------------------------------------------------------- */

export async function generateFlashcards(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<Flashcard[]> {
  const requestCount = Math.min(Math.max(count, 1), 8);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    reasoning_effort: "low",

    messages: [
      {
        role: "system",
        content: `You are a flashcard generator.

Return ONLY valid JSON.
Do not use markdown.
Do not use code fences.
Do not include explanations outside the JSON.

Return exactly this structure:
{
  "flashcards": [
    {
      "id": "fc_1",
      "question": "Question",
      "answer": "Answer",
      "difficulty": "medium"
    }
  ]
}

IMPORTANT:
- flashcards MUST be an array.
- Each flashcard MUST contain question and answer.
- Answers must be concise.
- Use only information from the supplied material.
- Do not hallucinate.`,
      },
      {
        role: "user",
        content: `Create exactly ${requestCount} ${difficulty} flashcards.

Difficulty requirements:
${difficultyInstructions[difficulty]}

Rules:
- Use ONLY information from the material.
- Do NOT hallucinate.
- Each card must test a DIFFERENT concept.
- Do not ask essentially the same question twice.
- Cover different parts of the material.
- Answers should be 1-2 sentences.
- Keep answers concise.
- Make questions clear and useful for studying.

MATERIAL:
${text.slice(0, 12000)}`,
      },
    ],

    temperature: 0.4,
    max_tokens: 1400,

    response_format: {
      type: "json_object",
    },
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error(
      "AI failed to generate flashcards. Please try again."
    );
  }

  const parsed = parseJsonObject<{
    flashcards?: Flashcard[];
  }>(raw);

  const flashcards = Array.isArray(parsed?.flashcards)
    ? parsed.flashcards
    : [];

  const valid = flashcards
    .filter(
      (card) =>
        typeof card.question === "string" &&
        card.question.trim().length > 0 &&
        typeof card.answer === "string" &&
        card.answer.trim().length > 0
    )
    .map((card, i) => ({
      ...card,
      id: `fc_${i + 1}`,
      difficulty,
    }));

  if (valid.length === 0) {
    throw new Error(
      "AI failed to generate flashcards. Please try again."
    );
  }

  const deduped = dedupeFc(valid);
  const shuffled = shuffle(deduped);

  return shuffled.slice(0, count).map((card, i) => ({
    ...card,
    id: `fc_${i + 1}`,
  }));
}

/* -------------------------------------------------------------------------- */
/* MCQ generation                                                             */
/* -------------------------------------------------------------------------- */

export async function generateMultipleChoice(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<MultipleChoiceQuestion[]> {
  /*
   * If the source already looks like a test bank, extract the questions
   * instead of asking the model to rewrite them.
   */
  if (isTestBank(text)) {
    const parsed = await parseTestBank(text, count);

    if (
      parsed.length >=
      Math.max(2, Math.ceil(count * 0.5))
    ) {
      return shuffle(parsed)
        .slice(0, count)
        .map((q, i) => ({
          ...q,
          id: `mc_${i + 1}`,
        }));
    }
  }

  const requestCount = Math.min(Math.max(count, 1), 8);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    reasoning_effort: "low",

    messages: [
      {
        role: "system",
        content: `You are a multiple-choice question generator.

Return ONLY valid JSON.
Do not use markdown.
Do not use code fences.
Do not include explanations outside the JSON.

Return exactly this structure:
{
  "questions": [
    {
      "id": "mc_1",
      "question": "Question",
      "choices": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctIndex": 0,
      "explanation": "Brief explanation",
      "difficulty": "medium"
    }
  ]
}

CRITICAL RULES:
- questions MUST be an array.
- Every question MUST have exactly 4 choices.
- Every choice MUST be a plain string.
- Do not include A/B/C/D labels in the choice strings.
- correctIndex MUST be 0, 1, 2, or 3.
- There MUST be exactly one correct answer.
- Use ONLY information from the material.
- Do NOT hallucinate.`,
      },
      {
        role: "user",
        content: `Create exactly ${requestCount} multiple-choice questions at ${difficulty.toUpperCase()} difficulty.

Difficulty requirements:
${difficultyInstructions[difficulty]}

ANTI-REPETITION RULES:
1. Every question must test a DIFFERENT concept.
2. No two questions should ask the same thing in different words.
3. Vary the question styles.
4. Spread questions across ALL major topics in the material.
5. Avoid repeatedly testing the same fact.
6. Distractors should be plausible and related to the topic.
7. There must be exactly one unambiguously correct answer.

QUALITY RULES:
- Use ONLY information from the material.
- Do NOT hallucinate.
- Do not introduce outside facts.
- Include a brief explanation of WHY the correct answer is correct.
- Avoid trick questions unless the material specifically supports them.
- Avoid questions where multiple choices could reasonably be correct.

MATERIAL:
${text.slice(0, 12000)}

Return ONLY JSON:
{
  "questions": [
    {
      "id": "mc_1",
      "question": "...",
      "choices": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctIndex": 0,
      "explanation": "...",
      "difficulty": "${difficulty}"
    }
  ]
}`,
      },
    ],

    temperature: 0.7,
    max_tokens: 2400,

    response_format: {
      type: "json_object",
    },
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  const parsed = parseJsonObject<{
    questions?: MultipleChoiceQuestion[];
  }>(raw);

  const questions = Array.isArray(parsed?.questions)
    ? parsed.questions
    : [];

  const valid = questions
    .map((q, i) =>
      normalizeMcq(q, i, difficulty)
    )
    .filter(isValidMcq);

  const deduped = dedupeMcq(valid);
  const shuffled = shuffle(deduped);

  return shuffled
    .slice(0, count)
    .map((question, i) => {
      /*
       * Shuffle choices while keeping the correct answer attached
       * to the correct choice.
       */
      const choicesWithCorrect = question.choices.map(
        (choice, index) => ({
          text: choice,
          correct:
            index === question.correctIndex,
        })
      );

      const reordered = shuffle(choicesWithCorrect);

      return {
        ...question,
        id: `mc_${i + 1}`,
        choices: reordered.map(
          (choice) => choice.text
        ),
        correctIndex: reordered.findIndex(
          (choice) => choice.correct
        ),
      };
    });
}

/* -------------------------------------------------------------------------- */
/* Combined generation                                                        */
/* -------------------------------------------------------------------------- */

export async function generateCombined(
  text: string,
  difficulty: DifficultyLevel,
  flashcardCount: number,
  mcqCount: number
): Promise<{
  flashcards: Flashcard[];
  questions: MultipleChoiceQuestion[];
}> {
  const flashcards = await generateFlashcards(
    text,
    difficulty,
    flashcardCount
  );

  /*
   * Small delay to avoid immediately firing another request.
   */
  await new Promise((resolve) =>
    setTimeout(resolve, 500)
  );

  const questions = await generateMultipleChoice(
    text,
    difficulty,
    mcqCount
  );

  return {
    flashcards,
    questions,
  };
}

/* -------------------------------------------------------------------------- */
/* MCQ normalization                                                          */
/* -------------------------------------------------------------------------- */

function normalizeMcq(
  question: MultipleChoiceQuestion,
  index: number,
  defaultDifficulty: DifficultyLevel
): MultipleChoiceQuestion {
  const choices = Array.isArray(question?.choices)
    ? question.choices
        .filter(
          (choice): choice is string =>
            typeof choice === "string"
        )
        .map((choice) => choice.trim())
    : [];

  const correctIndex =
    typeof question?.correctIndex === "number" &&
    Number.isInteger(question.correctIndex) &&
    question.correctIndex >= 0 &&
    question.correctIndex < choices.length
      ? question.correctIndex
      : 0;

  const difficulty: DifficultyLevel =
    question?.difficulty === "easy" ||
    question?.difficulty === "medium" ||
    question?.difficulty === "hard"
      ? question.difficulty
      : defaultDifficulty;

  return {
    ...question,
    id: `mc_${index + 1}`,
    question:
      typeof question?.question === "string"
        ? question.question.trim()
        : "",
    choices,
    correctIndex,
    explanation:
      typeof question?.explanation === "string" &&
      question.explanation.trim()
        ? question.explanation.trim()
        : "Based on the source material.",
    difficulty,
  };
}

function isValidMcq(
  question: MultipleChoiceQuestion
): boolean {
  if (
    typeof question.question !== "string" ||
    question.question.trim().length === 0
  ) {
    return false;
  }

  if (
    !Array.isArray(question.choices) ||
    question.choices.length !== 4
  ) {
    return false;
  }

  if (
    question.choices.some(
      (choice) =>
        typeof choice !== "string" ||
        choice.trim().length === 0
    )
  ) {
    return false;
  }

  if (
    !Number.isInteger(question.correctIndex) ||
    question.correctIndex < 0 ||
    question.correctIndex > 3
  ) {
    return false;
  }

  /*
   * Reject duplicate choices because they can make an MCQ ambiguous.
   */
  const normalizedChoices = question.choices.map(
    normalize
  );

  if (
    new Set(normalizedChoices).size !==
    normalizedChoices.length
  ) {
    return false;
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* JSON parsing                                                               */
/* -------------------------------------------------------------------------- */

function parseJsonObject<T>(raw: string): T | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  /*
   * First attempt: parse the complete response directly.
   */
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue with recovery.
  }

  /*
   * Second attempt: find the outermost JSON object.
   */
  const start = cleaned.indexOf("{");

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        objectStart = i;
      }

      depth++;
    }

    if (char === "}") {
      depth--;

      if (
        depth === 0 &&
        objectStart !== -1
      ) {
        try {
          return JSON.parse(
            cleaned.slice(
              objectStart,
              i + 1
            )
          ) as T;
        } catch {
          // Continue searching.
        }

        objectStart = -1;
      }
    }
  }

  return null;
}
