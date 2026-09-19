import React, { useRef, KeyboardEvent } from "react";
import { bloodGroups, BloodGroup } from "@/lib/domain";

interface BloodGroupSelectorProps {
  value: BloodGroup;
  onChange: (group: BloodGroup) => void;
  id?: string;
  label?: string;
  error?: string;
}

export const BloodGroupSelector: React.FC<BloodGroupSelectorProps> = ({
  value,
  onChange,
  id = "blood-group-selector",
  label = "Blood group",
  error,
}) => {
  const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % bloodGroups.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + bloodGroups.length) % bloodGroups.length;
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(bloodGroups[currentIndex]);
      return;
    }

    if (nextIndex !== null) {
      onChange(bloodGroups[nextIndex]);
      optionsRef.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="rs-form-field" id={id}>
      <label className="rs-form-label" id={`${id}-label`}>
        {label}
      </label>

      <div
        className="rs-blood-grid"
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {bloodGroups.map((group, index) => {
          const isSelected = value === group;

          return (
            <button
              key={group}
              type="button"
              ref={(el) => {
                optionsRef.current[index] = el;
              }}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={`rs-blood-btn ${isSelected ? "rs-blood-btn--selected" : ""}`}
              onClick={() => onChange(group)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {group}
            </button>
          );
        })}
      </div>

      {error && (
        <span id={`${id}-error`} className="rs-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
