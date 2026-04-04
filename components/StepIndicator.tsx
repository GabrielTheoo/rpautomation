"use client";

import { Check } from "lucide-react";
import type { WizardStep } from "@/lib/types";

interface Step {
  number: WizardStep;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { number: 1, label: "Upload",           description: "Inserir planilha" },
  { number: 2, label: "Pré-visualização", description: "Conferir dados" },
  { number: 3, label: "Processamento",    description: "Tier e Impacto" },
  { number: 4, label: "Review",           description: "Gráficos" },
  { number: 5, label: "Exportar",         description: "Planilha final" },
];

interface Props {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}

export default function StepIndicator({ currentStep, onStepClick }: Props) {
  return (
    <div className="overflow-x-auto pb-1 -mb-1">
      <div className="flex items-center gap-0 min-w-max">
        {STEPS.map((step, idx) => {
          const isDone = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = isDone && onStepClick;

          return (
            <div key={step.number} className="flex items-center">
              <button
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={`flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all ${
                  isCurrent
                    ? "bg-primary/15 border border-primary/30"
                    : isDone
                    ? "cursor-pointer hover:bg-card-hover"
                    : "opacity-40 cursor-default"
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 transition-all ${
                    isDone
                      ? "bg-primary text-bg"
                      : isCurrent
                      ? "bg-accent text-bg ring-2 ring-accent/30"
                      : "bg-border text-text-muted"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : step.number}
                </div>
                <div className="text-left">
                  <p className={`text-xs sm:text-sm font-semibold leading-none ${
                    isCurrent ? "text-accent" : isDone ? "text-primary" : "text-text-muted"
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] sm:text-xs text-text-muted mt-0.5 hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`h-px w-3 sm:w-5 mx-0.5 transition-all flex-shrink-0 ${
                  step.number < currentStep ? "bg-primary" : "bg-border"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
