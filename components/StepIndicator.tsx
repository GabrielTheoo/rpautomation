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
  { number: 2, label: "Pré-visualização", description: "Conferir dados limpos" },
  { number: 3, label: "Processamento",    description: "Tier, Impacto e campos" },
  { number: 4, label: "Review",           description: "Gráficos e resumo" },
  { number: 5, label: "Exportar",         description: "Gerar planilha final" },
];

interface Props {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}

export default function StepIndicator({ currentStep, onStepClick }: Props) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const isDone = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const isClickable = isDone && onStepClick;

        return (
          <div key={step.number} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(step.number)}
              disabled={!isClickable}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all ${
                isCurrent
                  ? "bg-primary/15 border border-primary/30"
                  : isDone
                  ? "cursor-pointer hover:bg-card-hover"
                  : "opacity-40 cursor-default"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                  isDone
                    ? "bg-primary text-bg"
                    : isCurrent
                    ? "bg-accent text-bg ring-2 ring-accent/30"
                    : "bg-border text-text-muted"
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : step.number}
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold leading-none ${
                  isCurrent ? "text-accent" : isDone ? "text-primary" : "text-text-muted"
                }`}>
                  {step.label}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{step.description}</p>
              </div>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={`h-px w-5 mx-0.5 transition-all ${
                step.number < currentStep ? "bg-primary" : "bg-border"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
