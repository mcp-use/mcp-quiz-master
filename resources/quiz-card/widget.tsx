import {
  McpUseProvider,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useEffect, useState } from "react";
import "../styles.css";
import { propSchema, type QuizCardProps } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Quiz question card with results and scoring",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    invoking: "Generating question...",
    invoked: "Quiz ready",
  },
};

const answerLabels = ["A", "B", "C", "D"];

function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ["#22c55e", "#eab308", "#3b82f6", "#f97316", "#a855f7", "#ec4899"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const size = 4 + Math.random() * 6;
  const rotation = Math.random() * 360;
  const duration = 1 + Math.random() * 1.5;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: -10,
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: "2px",
        transform: `rotate(${rotation}deg)`,
        animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
        opacity: 0,
      }}
    />
  );
}

function ScoreBadge({ correct, total }: { correct: number; total: number }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const ring = total > 0 ? (correct / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            className="stroke-gray-200 dark:stroke-gray-700"
            strokeWidth="3"
          />
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            className={pct >= 70 ? "stroke-emerald-500" : pct >= 40 ? "stroke-amber-500" : "stroke-red-400"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${ring * 0.942} 100`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-200">
          {pct}%
        </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
        <div className="font-semibold text-gray-700 dark:text-gray-200">{correct}/{total}</div>
        <div>correct</div>
      </div>
    </div>
  );
}

const QuizCard: React.FC = () => {
  const { props, isPending, sendFollowUpMessage } = useWidget<QuizCardProps>();
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (props?.isCorrect) setShowConfetti(true);
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, [props]);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="p-6 bg-white dark:bg-gray-950">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Generating question...
            </span>
          </div>
          <div className="space-y-3">
            <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
      </McpUseProvider>
    );
  }

  if (!props) return null;

  const {
    question,
    options,
    userAnswer,
    correctAnswer,
    explanation,
    isCorrect,
    score,
    category,
    difficulty,
  } = props;

  const hasAnswer = userAnswer !== undefined && userAnswer !== null;

  return (
    <McpUseProvider autoSize>
      <div className="relative overflow-hidden bg-white dark:bg-gray-950">
        {showConfetti && (
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiParticle key={i} delay={Math.random() * 0.5} />
            ))}
          </div>
        )}

        <style>{`
          @keyframes confetti-fall {
            0% { opacity: 1; transform: translateY(0) rotate(0deg); }
            100% { opacity: 0; transform: translateY(300px) rotate(720deg); }
          }
        `}</style>

        <div
          className="p-5 transition-all duration-500"
          style={{
            opacity: animateIn ? 1 : 0,
            transform: animateIn ? "translateY(0)" : "translateY(8px)",
          }}
        >
          {/* Header: badges + score */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {category && (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 capitalize">
                  {category}
                </span>
              )}
              {difficulty && (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  difficulty === "hard"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : difficulty === "medium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                } capitalize`}>
                  {difficulty}
                </span>
              )}
            </div>
            {score && <ScoreBadge correct={score.correct} total={score.total} />}
          </div>

          {/* Question */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 leading-relaxed">
            {question}
          </h3>

          {/* Options */}
          <div className="space-y-2 mb-4">
            {options.map((option, idx) => {
              const isUserPick = hasAnswer && userAnswer === idx;
              const isCorrectOption = idx === correctAnswer;

              let bg = "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700";
              let label = "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300";
              let textColor = "text-gray-700 dark:text-gray-300";
              let icon: React.ReactNode = null;

              if (hasAnswer) {
                if (isCorrectOption) {
                  bg = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700";
                  label = "bg-emerald-500 text-white";
                  textColor = "text-emerald-800 dark:text-emerald-200 font-medium";
                  icon = (
                    <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  );
                } else if (isUserPick && !isCorrect) {
                  bg = "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700";
                  label = "bg-red-500 text-white";
                  textColor = "text-red-800 dark:text-red-200";
                  icon = (
                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  );
                } else {
                  bg = "bg-gray-50/50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 opacity-60";
                }
              }

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${bg} transition-all duration-300`}
                  style={{
                    transitionDelay: `${idx * 60}ms`,
                    opacity: animateIn ? 1 : 0,
                    transform: animateIn ? "translateX(0)" : "translateX(-8px)",
                  }}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${label}`}>
                    {answerLabels[idx]}
                  </span>
                  <span className={`text-sm flex-1 ${textColor}`}>{option}</span>
                  {icon}
                </div>
              );
            })}
          </div>

          {/* Result banner */}
          {hasAnswer && (
            <div
              className={`rounded-xl px-4 py-3 mb-4 flex items-start gap-3 ${
                isCorrect
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              <span className="text-2xl leading-none mt-0.5">{isCorrect ? "🎉" : "💡"}</span>
              <div>
                <p className={`text-sm font-semibold mb-0.5 ${
                  isCorrect
                    ? "text-emerald-800 dark:text-emerald-200"
                    : "text-red-800 dark:text-red-200"
                }`}>
                  {isCorrect ? "Correct!" : "Not quite!"}
                </p>
                {explanation && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {explanation}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* No interactive answer — show correct answer inline */}
          {!hasAnswer && explanation && (
            <div className="rounded-xl px-4 py-3 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-0.5">
                Answer: {answerLabels[correctAnswer]}) {options[correctAnswer]}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {explanation}
              </p>
            </div>
          )}

          {/* Next question button */}
          <button
            onClick={() =>
              sendFollowUpMessage("Give me another quiz question")
            }
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Next Question →
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
};

export default QuizCard;
