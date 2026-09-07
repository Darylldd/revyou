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

const difficultyInstructions: Record<DifficultyLevel, string> = {
  easy: `Focus on basic facts, definitions, terminology, and direct recall.`,
  medium: `Mix recall, comprehension, application, and how/why questions.`,
  hard: `Focus on analysis, application, comparison, evaluation, and scenarios.`,
};

const mcqSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          question: {
            type: "string",
          },
          choices: {
            type: "array",
            items: {
              type: "string",
            },
          },
          correctIndex: {
            type: "integer",
            enum: [0, 1, 2, 3],
          },
          explanation: {
            type: "string",
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
          },
        },
        required: [
          "id",
          "question",
          "choices",
          "correctIndex",
          "explanation",
          "difficulty",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

const flashcardSchema = {
  type: "object",
  properties: {
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          question: {
            type: "string",
          },
          answer: {
            type: "string",
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
          },
        },
        required: [
          "id",
          "question",
          "answer",
          "difficulty",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["flashcards"],
  additionalProperties: false,
} as const;

export function isTestBank(text: string): boolean {
  const normalized = text.toLowerCase();

  const hasNumberedQuestions =
    /^\s*\d+[\.\)]\s+\w/m.test(text);

  const hasChoiceLetters =
    /^\s*[abcd][\.\)]\s+\w/im.test(text) ||
    /^\s*[abcd]\.\s+\w/im.test(text);

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
    /answer\s*key|correct\s*answer|ans\s*:/i.test(
      normalized
    );

  return (
    (hasNumberedQuestions &&
      (hasChoiceLetters || hasChoiceSymbols)) ||
    looksLikeMCQ ||
    (hasAnswerKey && hasChoiceLetters)
  );
}

export async function parseTestBank(
  text: string,
  count: number
): Promise<MultipleChoiceQuestion[]> {
  const requestCount = Math.min(
    Math.max(count, 1),
    8
  );

  const completion =
    await groq.chat.completions.create({
      model: MODEL,
      reasoning_effort: "low",
      include_reasoning: false,

      messages: [
        {
          role: "system",
          content:
            "Extract multiple-choice questions from educational material. Use only the supplied material.",
        },
        {
          role: "user",
          content: `Extract up to ${requestCount} multiple-choice questions from the following material.

Each question must contain exactly four answer choices.

Use the original wording and choices when possible.

If an answer key exists, use it.
If no answer key exists, determine the correct answer from the supplied material.

SOURCE:

${text.slice(0, 14000)}`,
        },
      ],

      temperature: 0.1,
      max_tokens: 5000,

      response_format: {
        type: "json_schema",
        json_schema: {
          name: "test_bank_questions",
          strict: true,
          schema: mcqSchema,
        },
      },
    });

  const raw =
    completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error(
      "AI returned no test bank questions."
    );
  }

  let data: {
    questions?: MultipleChoiceQuestion[];
  };

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      "AI returned invalid test bank data."
    );
  }

  const questions = Array.isArray(data.questions)
    ? data.questions
    : [];

  return questions
    .map((question, index) =>
      normalizeMcq(
        question,
        index,
        "medium"
      )
    )
    .filter(isValidMcq)
    .slice(0, count);
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

function normalize(text: string): string {
  return text
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
  const first = normalize(a);
  const second = normalize(b);

  if (!first || !second) {
    return false;
  }

  if (first === second) {
    return true;
  }

  if (
    first.includes(second) ||
    second.includes(first)
  ) {
    return true;
  }

  const wordsA = new Set(
    first
      .split(" ")
      .filter((word) => word.length > 3)
  );

  const wordsB = new Set(
    second
      .split(" ")
      .filter((word) => word.length > 3)
  );

  if (!wordsA.size || !wordsB.size) {
    return false;
  }

  let overlap = 0;

  for (const word of wordsA) {
    if (wordsB.has(word)) {
      overlap++;
    }
  }

  return (
    overlap /
      Math.max(wordsA.size, wordsB.size) >=
    threshold
  );
}

function dedupeFlashcards(
  cards: Flashcard[]
): Flashcard[] {
  const result: Flashcard[] = [];

  for (const card of cards) {
    const duplicate = result.some(
      (existing) =>
        tooSimilar(
          existing.question,
          card.question
        ) ||
        tooSimilar(
          existing.answer,
          card.answer,
          0.9
        )
    );

    if (!duplicate) {
      result.push(card);
    }
  }

  return result;
}

function dedupeQuestions(
  questions: MultipleChoiceQuestion[]
): MultipleChoiceQuestion[] {
  const result: MultipleChoiceQuestion[] = [];

  for (const question of questions) {
    const duplicate = result.some(
      (existing) =>
        tooSimilar(
          existing.question,
          question.question
        )
    );

    if (!duplicate) {
      result.push(question);
    }
  }

  return result;
}

export async function generateFlashcards(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<Flashcard[]> {
  const requestCount = Math.min(
    Math.max(count, 1),
    8
  );

  const completion =
    await groq.chat.completions.create({
      model: MODEL,
      reasoning_effort: "low",
      include_reasoning: false,

      messages: [
        {
          role: "system",
          content:
            "Create concise study flashcards using only the supplied educational material.",
        },
        {
          role: "user",
          content: `Create exactly ${requestCount} flashcards.

Difficulty:
${difficulty}

Guidelines:
${difficultyInstructions[difficulty]}

Rules:
- Use only information from the supplied material.
- Do not invent facts.
- Each flashcard should test a different concept.
- Cover different parts of the material.
- Keep answers concise.
- Avoid duplicate questions.

MATERIAL:

${text.slice(0, 12000)}`,
        },
      ],

      temperature: 0.4,
      max_tokens: 1400,

      response_format: {
        type: "json_schema",
        json_schema: {
          name: "flashcards",
          strict: true,
          schema: flashcardSchema,
        },
      },
    });

  const raw =
    completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error(
      "AI returned no flashcards."
    );
  }

  let data: {
    flashcards?: Flashcard[];
  };

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      "AI returned invalid flashcard data."
    );
  }

  const flashcards = Array.isArray(
    data.flashcards
  )
    ? data.flashcards
    : [];

  const valid = flashcards
    .filter(
      (card) =>
        typeof card.question === "string" &&
        card.question.trim().length > 0 &&
        typeof card.answer === "string" &&
        card.answer.trim().length > 0
    )
    .map((card, index) => ({
      ...card,
      id: `fc_${index + 1}`,
      difficulty,
    }));

  if (valid.length === 0) {
    throw new Error(
      "AI failed to generate valid flashcards."
    );
  }

  const result = shuffle(
    dedupeFlashcards(valid)
  );

  return result
    .slice(0, count)
    .map((card, index) => ({
      ...card,
      id: `fc_${index + 1}`,
    }));
}

export async function generateMultipleChoice(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<MultipleChoiceQuestion[]> {
  if (isTestBank(text)) {
    const parsed = await parseTestBank(
      text,
      count
    );

    if (
      parsed.length >=
      Math.max(
        2,
        Math.ceil(count * 0.5)
      )
    ) {
      return shuffle(parsed)
        .slice(0, count)
        .map((question, index) => ({
          ...question,
          id: `mc_${index + 1}`,
        }));
    }
  }

  const requestCount = Math.min(
    Math.max(count, 1),
    8
  );

  const completion =
    await groq.chat.completions.create({
      model: MODEL,
      reasoning_effort: "low",
      include_reasoning: false,

      messages: [
        {
          role: "system",
          content:
            "Create multiple-choice study questions from the supplied educational material. Use only information from that material.",
        },
        {
          role: "user",
          content: `Create exactly ${requestCount} multiple-choice questions.

Difficulty:
${difficulty}

Difficulty guidelines:
${difficultyInstructions[difficulty]}

Rules:
- Use ONLY the supplied material.
- Do not use outside knowledge.
- Do not invent information.
- Each question must test a different concept.
- Cover different topics from the material.
- Each question must have exactly four choices.
- Exactly one choice must be correct.
- correctIndex identifies the correct choice.
- Choices must be plain text without A/B/C/D labels.
- Make incorrect choices plausible but clearly incorrect based on the material.
- Avoid duplicate questions.
- Avoid ambiguous questions.
- Include a short explanation.

STUDY MATERIAL:

${text.slice(0, 12000)}`,
        },
      ],

      temperature: 0.6,
      max_tokens: 2600,

      response_format: {
        type: "json_schema",
        json_schema: {
          name: "multiple_choice_questions",
          strict: true,
          schema: mcqSchema,
        },
      },
    });

  const raw =
    completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error(
      "AI returned no multiple-choice questions."
    );
  }

  let data: {
    questions?: MultipleChoiceQuestion[];
  };

  try {
    data = JSON.parse(raw);
  } catch {
    console.error(
      "MCQ JSON parse error:",
      raw
    );

    throw new Error(
      "AI returned invalid multiple-choice data."
    );
  }

  const questions = Array.isArray(
    data.questions
  )
    ? data.questions
    : [];

  console.log(
    `AI returned ${questions.length} MCQs`
  );

  const valid = questions
    .map((question, index) =>
      normalizeMcq(
        question,
        index,
        difficulty
      )
    )
    .filter(isValidMcq);

  console.log(
    `${valid.length} MCQs passed validation`
  );

  if (valid.length === 0) {
    console.error(
      "Raw MCQ response:",
      JSON.stringify(
        data,
        null,
        2
      )
    );

    throw new Error(
      "AI failed to generate valid multiple-choice questions. Please try again."
    );
  }

  const deduped =
    dedupeQuestions(valid);

  const shuffledQuestions =
    shuffle(deduped);

  return shuffledQuestions
    .slice(0, count)
    .map((question, index) => {
      const choices =
        question.choices.map(
          (choice, choiceIndex) => ({
            text: choice,
            correct:
              choiceIndex ===
              question.correctIndex,
          })
        );

      const shuffledChoices =
        shuffle(choices);

      return {
        ...question,

        id: `mc_${index + 1}`,

        choices:
          shuffledChoices.map(
            (choice) => choice.text
          ),

        correctIndex:
          shuffledChoices.findIndex(
            (choice) => choice.correct
          ),
      };
    });
}

export async function generateCombined(
  text: string,
  difficulty: DifficultyLevel,
  flashcardCount: number,
  mcqCount: number
): Promise<{
  flashcards: Flashcard[];
  questions: MultipleChoiceQuestion[];
}> {
  const flashcards =
    await generateFlashcards(
      text,
      difficulty,
      flashcardCount
    );

  await new Promise((resolve) =>
    setTimeout(resolve, 500)
  );

  const questions =
    await generateMultipleChoice(
      text,
      difficulty,
      mcqCount
    );

  return {
    flashcards,
    questions,
  };
}

function normalizeMcq(
  question: MultipleChoiceQuestion,
  index: number,
  defaultDifficulty: DifficultyLevel
): MultipleChoiceQuestion {
  const choices =
    Array.isArray(question.choices)
      ? question.choices
          .filter(
            (choice): choice is string =>
              typeof choice === "string"
          )
          .map((choice) => choice.trim())
      : [];

  let correctIndex =
    Number.isInteger(
      question.correctIndex
    )
      ? question.correctIndex
      : 0;

  if (
    correctIndex < 0 ||
    correctIndex >= choices.length
  ) {
    correctIndex = 0;
  }

  const difficulty =
    question.difficulty === "easy" ||
    question.difficulty === "medium" ||
    question.difficulty === "hard"
      ? question.difficulty
      : defaultDifficulty;

  return {
    ...question,

    id: `mc_${index + 1}`,

    question:
      typeof question.question === "string"
        ? question.question.trim()
        : "",

    choices,

    correctIndex,

    explanation:
      typeof question.explanation === "string"
        ? question.explanation.trim()
        : "",

    difficulty,
  };
}

function isValidMcq(
  question: MultipleChoiceQuestion
): boolean {
  if (
    typeof question.question !==
      "string" ||
    !question.question.trim()
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
        !choice.trim()
    )
  ) {
    return false;
  }

  if (
    !Number.isInteger(
      question.correctIndex
    ) ||
    question.correctIndex < 0 ||
    question.correctIndex > 3
  ) {
    return false;
  }

  return true;
}
