import { z } from "zod";

export const propSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  userAnswer: z.number().optional().describe("User's answer index (0-3)"),
  correctAnswer: z.number().describe("Correct answer index (0-3)"),
  explanation: z.string().optional(),
  isCorrect: z.boolean().optional(),
  score: z.object({ correct: z.number(), total: z.number() }).optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
});

export type QuizCardProps = z.infer<typeof propSchema>;
