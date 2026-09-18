import React from "react";

export interface StepItem {
  id: number;
  label: string;
}

interface DonorProgressProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

export const DonorProgress: React.FC<DonorProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <nav aria-label="Donor registration progress" className="rs-donor-stepper">
      <div className="rs-stepper-line-wrap">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          const isClickable = isDone && onStepClick;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                className={`rs-step-tab ${isActive ? "rs-step-tab--active" : isDone ? "rs-step-tab--done" : ""}`}
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(idx)}
              >
                <span className="rs-step-tab-num">0{step.id}</span>
                <span className="rs-step-tab-label">{step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <span className={`rs-step-tab-line ${isDone ? "rs-step-tab-line--done" : ""}`} aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
