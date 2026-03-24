import { MCPServer, text, widget, error } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({
  name: "quiz-master",
  title: "Quiz Master",
  version: "1.0.0",
  description: "AI-powered quiz game — showcasing elicitation and sampling",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  icons: [
    { src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] },
  ],
});

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const fallbackQuestions: QuizQuestion[] = [
  { question: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1, explanation: "Mars appears red due to iron oxide on its surface." },
  { question: "Who painted the Mona Lisa?", options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"], correct: 2, explanation: "Leonardo da Vinci painted it between 1503-1519." },
  { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2, explanation: "Au comes from the Latin word 'aurum'." },
  { question: "Which ocean is the largest?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3, explanation: "The Pacific Ocean covers about 63 million square miles." },
  { question: "What year did the Berlin Wall fall?", options: ["1987", "1989", "1991", "1993"], correct: 1, explanation: "The Berlin Wall fell on November 9, 1989." },
  { question: "What is the speed of light in a vacuum?", options: ["300,000 m/s", "300,000 km/s", "150,000 km/s", "3,000,000 km/s"], correct: 1, explanation: "Light travels at approximately 299,792 km/s in a vacuum." },
  { question: "Which element has the atomic number 1?", options: ["Helium", "Oxygen", "Carbon", "Hydrogen"], correct: 3, explanation: "Hydrogen is the lightest and most abundant element in the universe." },
  { question: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correct: 2, explanation: "Canberra was chosen as the capital in 1908 as a compromise between Sydney and Melbourne." },
  { question: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correct: 1, explanation: "Shakespeare wrote the tragedy around 1594-1596." },
  { question: "What is the largest mammal on Earth?", options: ["African Elephant", "Blue Whale", "Giraffe", "Colossal Squid"], correct: 1, explanation: "Blue whales can reach up to 100 feet long and weigh 200 tons." },
];

let score = { correct: 0, total: 0 };
let usedFallbackIndices: number[] = [];

function getRandomFallback(): QuizQuestion {
  if (usedFallbackIndices.length >= fallbackQuestions.length) {
    usedFallbackIndices = [];
  }
  const available = fallbackQuestions
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => !usedFallbackIndices.includes(i));
  const pick = available[Math.floor(Math.random() * available.length)];
  usedFallbackIndices.push(pick.i);
  return pick.q;
}

const answerLabels = ["A", "B", "C", "D"] as const;

server.tool(
  {
    name: "start-quiz",
    description:
      "Start an AI-powered quiz! Uses LLM sampling to generate questions " +
      "and elicitation to collect answers interactively.",
    schema: z.object({
      category: z
        .enum(["science", "history", "geography", "pop-culture", "general"])
        .default("general")
        .describe("Quiz category"),
      difficulty: z
        .enum(["easy", "medium", "hard"])
        .default("medium")
        .describe("Difficulty level"),
    }),
    widget: {
      name: "quiz-card",
      invoking: "Generating question...",
      invoked: "Quiz ready",
    },
  },
  async ({ category, difficulty }, ctx) => {
    let parsed: QuizQuestion;

    // Step 1: Try to generate a question via sampling
    try {
      if (!ctx.client.can("sampling")) throw new Error("Sampling not supported");

      const questionResult = await ctx.sample(
        `Generate a ${difficulty} ${category} trivia question with 4 multiple-choice answers. ` +
        `Format: {"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."} ` +
        `Return ONLY valid JSON.`,
        { maxTokens: 500, temperature: 0.9 }
      );

      const responseText =
        questionResult.content.type === "text"
          ? questionResult.content.text
          : "";

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in sampling response");

      parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 4) {
        throw new Error("Invalid question format from sampling");
      }
      parsed.correct = Number(parsed.correct);
      parsed.explanation = parsed.explanation || "";
    } catch {
      await ctx.log("info", "Sampling unavailable or failed — using fallback question bank");
      parsed = getRandomFallback();
    }

    // Step 2: Try to elicit the user's answer
    let userAnswerIndex: number | undefined;
    try {
      if (!ctx.client.can("elicitation")) throw new Error("Elicitation not supported");

      const answer = await ctx.elicit(
        `📝 ${parsed.question}`,
        z.object({
          answer: z.enum(["A", "B", "C", "D"]).describe(
            `A: ${parsed.options[0]} | B: ${parsed.options[1]} | C: ${parsed.options[2]} | D: ${parsed.options[3]}`
          ),
        })
      );

      if (answer.action === "accept" && answer.data?.answer) {
        userAnswerIndex = answerLabels.indexOf(answer.data.answer);
      }
    } catch {
      await ctx.log("info", "Elicitation unavailable — returning question without interactive answer");
    }

    // Step 3: Score if we got an answer
    let isCorrect: boolean | undefined;
    if (userAnswerIndex !== undefined) {
      isCorrect = userAnswerIndex === parsed.correct;
      score.total++;
      if (isCorrect) score.correct++;
    }

    // Step 4: Return result widget
    const resultText = userAnswerIndex !== undefined
      ? `${isCorrect ? "✅ Correct!" : "❌ Wrong!"} The answer is ${answerLabels[parsed.correct]}: ${parsed.options[parsed.correct]}. ${parsed.explanation} (Score: ${score.correct}/${score.total})`
      : `Question: ${parsed.question}\n${parsed.options.map((o, i) => `${answerLabels[i]}: ${o}`).join("\n")}\nCorrect: ${answerLabels[parsed.correct]}: ${parsed.options[parsed.correct]}\n${parsed.explanation}`;

    return widget({
      props: {
        question: parsed.question,
        options: parsed.options,
        userAnswer: userAnswerIndex,
        correctAnswer: parsed.correct,
        explanation: parsed.explanation,
        isCorrect,
        score: { correct: score.correct, total: score.total },
        category,
        difficulty,
      },
      output: text(resultText),
    });
  }
);

server.tool(
  {
    name: "get-score",
    description: "Get your current quiz score summary",
    schema: z.object({}),
  },
  async () => {
    if (score.total === 0) {
      return text("No questions answered yet. Use start-quiz to begin!");
    }
    const pct = Math.round((score.correct / score.total) * 100);
    return text(
      `🏆 Quiz Score: ${score.correct}/${score.total} correct (${pct}%)\n` +
      `${pct >= 80 ? "🌟 Excellent!" : pct >= 60 ? "👍 Good job!" : pct >= 40 ? "📚 Keep practicing!" : "💪 Don't give up!"}`
    );
  }
);

server.listen().then(() => {
  console.log("Quiz Master running");
});
