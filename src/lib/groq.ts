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

function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
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

function normalizeMcq(
  question: MultipleChoiceQuestion,
  index: number,
  defaultDifficulty: DifficultyLevel
): MultipleChoiceQuestion {
  const choices =
    Array.isArray(question?.choices)
      ? question.choices
          .filter(
            (choice): choice is string =>
              typeof choice === "string"
          )
          .map((choice) => choice.trim())
      : [];

  let correctIndex =
    Number.isInteger(
      question?.correctIndex
    )
      ? question.correctIndex
      : 0;

  if (
    correctIndex < 0 ||
    correctIndex >= choices.length
  ) {
    correctIndex = 0;
  }

  const finalDifficulty =
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
      typeof question?.explanation === "string"
        ? question.explanation.trim()
        : "",

    difficulty: finalDifficulty,
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

function isValidFlashcard(
  card: Flashcard
): boolean {
  return (
    typeof card.question === "string" &&
    card.question.trim().length > 0 &&
    typeof card.answer === "string" &&
    card.answer.trim().length > 0
  );
}

export async function generateFlashcards(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<Flashcard[]> {
  const requestCount = Math.max(
    Number.isFinite(count) ? Math.floor(count) : 1,
    1
  );

  const batchSize = 5;
  const batches = Math.ceil(
    requestCount / batchSize
  );

  const allCards: Flashcard[] = [];

  console.log(
    `Generating ${requestCount} flashcards in ${batches} batch(es)...`
  );

  for (let batch = 0; batch < batches; batch++) {
    const remaining =
      requestCount - allCards.length;

    const currentCount = Math.min(
      batchSize,
      remaining
    );

    console.log(
      `Flashcard batch ${batch + 1}/${batches}: generating ${currentCount}...`
    );

    const completion =
      await groq.chat.completions.create({
        model: MODEL,

        messages: [
          {
            role: "user",
            content: `Create exactly ${currentCount} study flashcards from the material below.

Difficulty: ${difficulty}

Difficulty guidance:
${difficultyInstructions[difficulty]}

Return ONLY valid JSON.

Use exactly this structure:

{
  "flashcards": [
    {
      "question": "Question",
      "answer": "Answer"
    }
  ]
}

Rules:
- Create exactly ${currentCount} flashcards.
- Use only information from the material.
- Do not invent facts.
- Each flashcard should test a different fact or concept.
- Keep questions clear and useful.
- Keep answers concise.
- Do not repeat the same concept.
- Do not include commentary outside the JSON.
- Do not return an empty array if the material contains usable information.

MATERIAL:

${text.slice(0, 14000)}`,
          },
        ],

        temperature: 0.5,
        max_completion_tokens: Math.max(
          2500,
          currentCount * 250
        ),

        response_format: {
          type: "json_object",
        },
      });

    const raw =
      completion.choices[0]?.message?.content;

    if (!raw) {
      console.error(
        `Flashcard batch ${batch + 1} returned no content.`
      );

      continue;
    }

    let data: {
      flashcards?: unknown;
    };

    try {
      data = JSON.parse(raw);
    } catch {
      console.error(
        `Flashcard batch ${batch + 1} returned invalid JSON:`,
        raw
      );

      continue;
    }

    if (!Array.isArray(data.flashcards)) {
      console.error(
        `Flashcard batch ${batch + 1} did not contain a flashcards array.`
      );

      continue;
    }

    const cards = data.flashcards
      .filter(
        (card): card is Record<string, unknown> =>
          typeof card === "object" &&
          card !== null
      )
      .map(
        (card, index): Flashcard => ({
          id: `fc_${allCards.length + index + 1}`,

          question:
            typeof card.question === "string"
              ? card.question.trim()
              : "",

          answer:
            typeof card.answer === "string"
              ? card.answer.trim()
              : "",

          difficulty,
        })
      )
      .filter(
        (card) =>
          card.question.length > 0 &&
          card.answer.length > 0
      );

    console.log(
      `Flashcard batch ${batch + 1} returned ${cards.length} valid cards.`
    );

    allCards.push(...cards);

    if (allCards.length >= requestCount) {
      break;
    }

    if (batch < batches - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );
    }
  }

  console.log(
    `Generated ${allCards.length}/${requestCount} flashcards before deduplication.`
  );

  const deduped =
    dedupeFlashcards(allCards);

  console.log(
    `${deduped.length} flashcards remain after deduplication.`
  );

  if (deduped.length === 0) {
    throw new Error(
      "AI failed to generate flashcards. Please try again."
    );
  }

  const shuffled =
    shuffle(deduped);

  return shuffled
    .slice(0, requestCount)
    .map((card, index) => ({
      ...card,
      id: `fc_${index + 1}`,
      difficulty,
    }));
}



export async function parseTestBank(
  text: string,
  count: number
): Promise<MultipleChoiceQuestion[]> {
  const requestCount = Math.max(
    Number.isFinite(count) ? Math.floor(count) : 1,
    1
  );

  const maxTokens = Math.max(
    4000,
    requestCount * 400
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

Each question must have exactly four answer choices.

Preserve the original wording and choices when possible.

If an answer key exists, use it.
If no answer key exists, determine the correct answer using the supplied material.

SOURCE:

${text.slice(0, 14000)}`,
        },
      ],

      temperature: 0.1,
      max_tokens: maxTokens,

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

  const questions = Array.isArray(
    data.questions
  )
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

export async function generateMultipleChoice(
  text: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<MultipleChoiceQuestion[]> {
  const requestCount = Math.max(
    Number.isFinite(count) ? Math.floor(count) : 1,
    1
  );

  if (isTestBank(text)) {
    const parsed = await parseTestBank(
      text,
      requestCount
    );

    if (parsed.length >= requestCount) {
      return shuffle(parsed)
        .slice(0, requestCount)
        .map((question, index) => ({
          ...question,
          id: `mc_${index + 1}`,
        }));
    }

    if (parsed.length > 0) {
      console.log(
        `Test bank provided ${parsed.length}/${requestCount} questions.`
      );
    }
  }

  const batchSize = 5;
  const batches = Math.ceil(
    requestCount / batchSize
  );

  const allQuestions: MultipleChoiceQuestion[] = [];

  console.log(
    `Generating ${requestCount} MCQs in ${batches} batch(es)...`
  );

  for (
    let batch = 0;
    batch < batches;
    batch++
  ) {
    const remaining =
      requestCount - allQuestions.length;

    const currentCount = Math.min(
      batchSize,
      remaining
    );

    if (currentCount <= 0) {
      break;
    }

    console.log(
      `MCQ batch ${batch + 1}/${batches}: generating ${currentCount}...`
    );

    try {
      const completion =
        await groq.chat.completions.create({
          model: MODEL,

          messages: [
            {
              role: "user",
              content: `Create exactly ${currentCount} multiple-choice questions from the study material below.

Difficulty: ${difficulty}

Difficulty guidelines:
${difficultyInstructions[difficulty]}

Rules:
- Create exactly ${currentCount} questions.
- Use ONLY information from the study material.
- Do not use outside knowledge.
- Do not invent facts.
- Each question must test a different concept.
- Cover different parts of the material.
- Every question must have exactly 4 answer choices.
- Exactly one answer must be correct.
- correctIndex must be 0, 1, 2, or 3.
- Do not put A, B, C, or D labels inside the choices.
- Incorrect choices should be plausible but wrong according to the material.
- Avoid duplicate questions.
- Avoid ambiguous questions.
- Keep explanations short.
- Return only JSON.

Use exactly this format:

{
  "questions": [
    {
      "question": "Question",
      "choices": [
        "Choice 1",
        "Choice 2",
        "Choice 3",
        "Choice 4"
      ],
      "correctIndex": 0,
      "explanation": "Why the correct answer is correct"
    }
  ]
}

IMPORTANT:
Do not return an empty questions array when the material contains usable information.

STUDY MATERIAL:

${text.slice(0, 14000)}`,
            },
          ],

          temperature: 0.5,
          max_completion_tokens: Math.max(
            3000,
            currentCount * 500
          ),

          response_format: {
            type: "json_object",
          },
        });

      const raw =
        completion.choices[0]?.message?.content;

      if (!raw) {
        console.log(
          `MCQ batch ${batch + 1} returned no content.`
        );

        continue;
      }

      let data: {
        questions?: unknown;
      };

      try {
        data = JSON.parse(raw);
      } catch {
        console.log(
          `MCQ batch ${batch + 1} returned invalid JSON.`
        );

        continue;
      }

      if (!Array.isArray(data.questions)) {
        console.log(
          `MCQ batch ${batch + 1} returned no questions array.`
        );

        continue;
      }

      const questions =
        data.questions
          .filter(
            (
              question
            ): question is Record<
              string,
              unknown
            > =>
              typeof question ===
                "object" &&
              question !== null
          )
          .map(
            (
              question,
              index
            ): MultipleChoiceQuestion =>
              ({
                id: `mc_${allQuestions.length + index + 1}`,

                question:
                  typeof question.question ===
                  "string"
                    ? question.question.trim()
                    : "",

                choices:
                  Array.isArray(
                    question.choices
                  )
                    ? question.choices
                        .filter(
                          (
                            choice
                          ): choice is string =>
                            typeof choice ===
                            "string"
                        )
                        .map(
                          (choice) =>
                            choice.trim()
                        )
                    : [],

                correctIndex:
                  Number.isInteger(
                    question.correctIndex
                  )
                    ? Number(
                        question.correctIndex
                      )
                    : -1,

                explanation:
                  typeof question.explanation ===
                  "string"
                    ? question.explanation.trim()
                    : "",

                difficulty,
              })
          )
          .filter(
            (question) =>
              question.question.length > 0 &&
              question.choices.length === 4 &&
              question.choices.every(
                (choice) =>
                  choice.length > 0
              ) &&
              Number.isInteger(
                question.correctIndex
              ) &&
              question.correctIndex >= 0 &&
              question.correctIndex <= 3
          );

      console.log(
        `MCQ batch ${batch + 1} returned ${questions.length} valid questions.`
      );

      allQuestions.push(...questions);

      if (
        allQuestions.length >=
        requestCount
      ) {
        break;
      }

      if (batch < batches - 1) {
        await new Promise(
          (resolve) =>
            setTimeout(resolve, 300)
        );
      }
    } catch (error) {
      console.log(
        `MCQ batch ${batch + 1} failed. Continuing...`
      );
    }
  }

  if (allQuestions.length === 0) {
    throw new Error(
      "AI could not generate multiple-choice questions. Please try again."
    );
  }

  const deduped =
    dedupeQuestions(allQuestions);

  let result = shuffle(
    deduped
  ).slice(0, requestCount);

  if (result.length < requestCount) {
    console.log(
      `Generated ${result.length}/${requestCount} unique MCQs.`
    );
  }

  result = result.map(
    (question, index) => {
      const choices =
        question.choices.map(
          (
            choice,
            choiceIndex
          ) => ({
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
            (choice) =>
              choice.text
          ),

        correctIndex:
          shuffledChoices.findIndex(
            (choice) =>
              choice.correct
          ),
      };
    }
  );

  return result;
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
  console.log(
    `Generating ${flashcardCount} flashcards and ${mcqCount} MCQs...`
  );

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
