"use client";

import React from "react";

export interface FitnessValue {
  sex: string | null;
  ageYears: number | null;
  weightKg: number | null;
  hemoglobinGdl: number | null;
  systolicBpMmhg: number | null;
  diastolicBpMmhg: number | null;
  pulseBpm: number | null;
  isPregnantNow: boolean | null;
  lastPregnancyEndDate: string | null;
  isBreastfeedingNow: boolean | null;
  illnessAntibiotics14d: boolean | null;
  tattooPiercing12m: boolean | null;
  alcohol24h: boolean | null;
}

export const emptyFitness: FitnessValue = {
  sex: null,
  ageYears: null,
  weightKg: null,
  hemoglobinGdl: null,
  systolicBpMmhg: null,
  diastolicBpMmhg: null,
  pulseBpm: null,
  isPregnantNow: null,
  lastPregnancyEndDate: null,
  isBreastfeedingNow: null,
  illnessAntibiotics14d: null,
  tattooPiercing12m: null,
  alcohol24h: null,
};

export interface FitnessEvaluation {
  blocked: string | null;
  deferUntil: string | null;
  unverified: boolean;
}

const fmtDay = (d: Date): string => d.toISOString().slice(0, 10);
const plusDays = (base: Date, n: number): string => {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return fmtDay(d);
};
const plusMonths = (base: Date, n: number): string => {
  const d = new Date(base.getTime());
  d.setUTCMonth(d.getUTCMonth() + n);
  return fmtDay(d);
};

// ponytail: first firing rule wins; deferUntil is advisory, any block stops submit
export function evaluateFitness(v: FitnessValue, now: Date = new Date()): FitnessEvaluation {
  const unverified =
    v.hemoglobinGdl == null || v.systolicBpMmhg == null || v.diastolicBpMmhg == null || v.pulseBpm == null;
  const block = (blocked: string, deferUntil: string | null = null): FitnessEvaluation => ({
    blocked,
    deferUntil,
    unverified,
  });
  if (v.ageYears != null && (v.ageYears < 18 || v.ageYears > 65))
    return block("Blood donation is only possible between ages 18 and 65. Please discuss with your blood bank if you have questions.");
  if (v.weightKg != null && v.weightKg < 45)
    return block("A minimum weight of 45 kg is required to donate. Please discuss with your blood bank.");
  if (v.hemoglobinGdl != null && v.hemoglobinGdl < 12.5)
    return block("Hemoglobin below 12.5 g/dL needs a short deferral. You can register again after the deferred date.", plusDays(now, 90));
  if (
    (v.systolicBpMmhg != null && (v.systolicBpMmhg < 100 || v.systolicBpMmhg > 180)) ||
    (v.diastolicBpMmhg != null && (v.diastolicBpMmhg < 50 || v.diastolicBpMmhg > 100))
  )
    return block("Blood pressure outside 100\u2013180 / 50\u2013100 mmHg needs a deferral. Please discuss with your blood bank.");
  if (v.pulseBpm != null && (v.pulseBpm < 60 || v.pulseBpm > 100))
    return block("Pulse outside 60\u2013100 bpm needs a deferral. Please discuss with your blood bank.");
  if (v.isPregnantNow === true)
    return block("Donation is deferred during pregnancy and for 12 months after delivery. Please come back then.");
  if (v.lastPregnancyEndDate) {
    if (v.lastPregnancyEndDate >= plusMonths(now, -12))
      return block(
        "Donation is deferred for 12 months after delivery or abortion. You can register again after the deferred date.",
        plusMonths(new Date(v.lastPregnancyEndDate + "T00:00:00Z"), 12)
      );
  }
  if (v.isBreastfeedingNow === true)
    return block("Donation is deferred while breastfeeding. Please discuss with your blood bank.");
  if (v.illnessAntibiotics14d === true)
    return block("Recent illness or antibiotics need a 14-day deferral. You can register again after the deferred date.", plusDays(now, 14));
  if (v.tattooPiercing12m === true)
    return block("A tattoo or piercing in the last 12 months needs a 12-month deferral. You can register again after the deferred date.", plusMonths(now, 12));
  if (v.alcohol24h === true)
    return block("Alcohol in the last 24 hours needs a 24-hour deferral. Please come back tomorrow.", plusDays(now, 1));
  return { blocked: null, deferUntil: null, unverified };
}

interface FitnessStepProps {
  value: FitnessValue;
  onChange: (v: FitnessValue) => void;
  error?: string;
}

export const FitnessStep: React.FC<FitnessStepProps> = ({ value, onChange, error }) => {
  const set = (patch: Partial<FitnessValue>): void => onChange({ ...value, ...patch });
  const numVal = (n: number | null): string => (n == null ? "" : String(n));
  const numSet = (raw: string): number | null => (raw === "" ? null : Number(raw));
  const showFemaleBranch =
    value.sex === "female" && value.ageYears != null && value.ageYears >= 15 && value.ageYears <= 49;
  const preview = evaluateFitness(value);

  const optionGrid = (opts: { label: string; selected: boolean; onPick: () => void }[]): React.ReactNode => (
    <div className="rs-blood-grid" style={{ gridTemplateColumns: `repeat(${opts.length}, 1fr)` }}>
      {opts.map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={o.selected}
          className={`rs-blood-btn${o.selected ? " rs-blood-btn--selected" : ""}`}
          onClick={o.onPick}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="rs-donor-step-content">
      <h3 className="rs-step-heading">Donor fitness</h3>
      <p className="rs-step-body">
        A few health checks to keep you and recipients safe. Answer what you know.
      </p>

      <div className="rs-form-field">
        <label className="rs-form-label" htmlFor="fit-age">
          Age (years)
        </label>
        <input
          id="fit-age"
          type="number"
          min={0}
          max={120}
          inputMode="numeric"
          value={numVal(value.ageYears)}
          onChange={(e) => set({ ageYears: numSet(e.target.value) })}
          placeholder="e.g. 28"
          className="rs-form-input"
        />
      </div>

      <div className="rs-form-field">
        <span className="rs-form-label" id="fit-sex-label">
          Sex
        </span>
        <div role="radiogroup" aria-labelledby="fit-sex-label">
          {optionGrid([
            { label: "Male", selected: value.sex === "male", onPick: () => set({ sex: "male" }) },
            { label: "Female", selected: value.sex === "female", onPick: () => set({ sex: "female" }) },
            { label: "Other", selected: value.sex === "other", onPick: () => set({ sex: "other" }) },
          ])}
        </div>
      </div>

      {showFemaleBranch && (
        <>
          <div className="rs-form-field">
            <span className="rs-form-label" id="fit-preg-label">
              Are you pregnant now?
            </span>
            <div role="radiogroup" aria-labelledby="fit-preg-label">
              {optionGrid([
                { label: "Yes", selected: value.isPregnantNow === true, onPick: () => set({ isPregnantNow: true }) },
                { label: "No", selected: value.isPregnantNow === false, onPick: () => set({ isPregnantNow: false }) },
              ])}
            </div>
          </div>

          <div className="rs-form-field">
            <label className="rs-form-label" htmlFor="fit-preg-end">
              Delivery or abortion in the last 12 months <span className="rs-form-optional">(leave blank if none)</span>
            </label>
            <input
              id="fit-preg-end"
              type="date"
              value={value.lastPregnancyEndDate ?? ""}
              onChange={(e) => set({ lastPregnancyEndDate: e.target.value || null })}
              className="rs-form-input"
            />
          </div>

          <div className="rs-form-field">
            <span className="rs-form-label" id="fit-lact-label">
              Are you breastfeeding now?
            </span>
            <div role="radiogroup" aria-labelledby="fit-lact-label">
              {optionGrid([
                { label: "Yes", selected: value.isBreastfeedingNow === true, onPick: () => set({ isBreastfeedingNow: true }) },
                { label: "No", selected: value.isBreastfeedingNow === false, onPick: () => set({ isBreastfeedingNow: false }) },
              ])}
            </div>
          </div>
        </>
      )}

      <div className="rs-form-field">
        <div className="rs-field-label-row">
          <label className="rs-form-label" htmlFor="fit-weight">
            Weight (kg)
          </label>
          <button type="button" className="rs-link-action" onClick={() => set({ weightKg: null })}>
            I don&apos;t know
          </button>
        </div>
        <input
          id="fit-weight"
          type="number"
          min={0}
          inputMode="decimal"
          value={numVal(value.weightKg)}
          onChange={(e) => set({ weightKg: numSet(e.target.value) })}
          placeholder="e.g. 62"
          className="rs-form-input"
        />
        <span className="rs-form-helper">Minimum 45 kg to donate.</span>
      </div>

      <div className="rs-form-field">
        <div className="rs-field-label-row">
          <label className="rs-form-label" htmlFor="fit-hb">
            Hemoglobin (g/dL)
          </label>
          <button type="button" className="rs-link-action" onClick={() => set({ hemoglobinGdl: null })}>
            I don&apos;t know
          </button>
        </div>
        <input
          id="fit-hb"
          type="number"
          min={0}
          step="0.1"
          inputMode="decimal"
          value={numVal(value.hemoglobinGdl)}
          onChange={(e) => set({ hemoglobinGdl: numSet(e.target.value) })}
          placeholder="e.g. 13.5"
          className="rs-form-input"
        />
        <span className="rs-form-helper">12.5 g/dL or above is required. Skipping marks your profile unverified.</span>
      </div>

      <div className="rs-form-field">
        <div className="rs-field-label-row">
          <span className="rs-form-label" id="fit-bp-label">
            Blood pressure (mmHg)
          </span>
          <button
            type="button"
            className="rs-link-action"
            onClick={() => set({ systolicBpMmhg: null, diastolicBpMmhg: null })}
          >
            Don&apos;t know
          </button>
        </div>
        <div style={{ display: "flex", gap: 10 }} role="group" aria-labelledby="fit-bp-label">
          <input
            type="number"
            aria-label="Systolic blood pressure"
            min={0}
            inputMode="numeric"
            value={numVal(value.systolicBpMmhg)}
            onChange={(e) => set({ systolicBpMmhg: numSet(e.target.value) })}
            placeholder="Sys e.g. 120"
            className="rs-form-input"
          />
          <input
            type="number"
            aria-label="Diastolic blood pressure"
            min={0}
            inputMode="numeric"
            value={numVal(value.diastolicBpMmhg)}
            onChange={(e) => set({ diastolicBpMmhg: numSet(e.target.value) })}
            placeholder="Dia e.g. 80"
            className="rs-form-input"
          />
        </div>
        <span className="rs-form-helper">Usual range 100\u2013180 / 50\u2013100. Skipping marks your profile unverified.</span>
      </div>

      <div className="rs-form-field">
        <div className="rs-field-label-row">
          <label className="rs-form-label" htmlFor="fit-pulse">
            Pulse (bpm)
          </label>
          <button type="button" className="rs-link-action" onClick={() => set({ pulseBpm: null })}>
            I don&apos;t know
          </button>
        </div>
        <input
          id="fit-pulse"
          type="number"
          min={0}
          inputMode="numeric"
          value={numVal(value.pulseBpm)}
          onChange={(e) => set({ pulseBpm: numSet(e.target.value) })}
          placeholder="e.g. 72"
          className="rs-form-input"
        />
        <span className="rs-form-helper">Usual range 60\u2013100. Skipping marks your profile unverified.</span>
      </div>

      <div className="rs-form-field">
        <span className="rs-form-label" id="fit-ill-label">
          Illness or antibiotics in the last 14 days?
        </span>
        <div role="radiogroup" aria-labelledby="fit-ill-label">
          {optionGrid([
            { label: "Yes", selected: value.illnessAntibiotics14d === true, onPick: () => set({ illnessAntibiotics14d: true }) },
            { label: "No", selected: value.illnessAntibiotics14d === false, onPick: () => set({ illnessAntibiotics14d: false }) },
          ])}
        </div>
      </div>

      <div className="rs-form-field">
        <span className="rs-form-label" id="fit-tat-label">
          Tattoo or piercing in the last 12 months?
        </span>
        <div role="radiogroup" aria-labelledby="fit-tat-label">
          {optionGrid([
            { label: "Yes", selected: value.tattooPiercing12m === true, onPick: () => set({ tattooPiercing12m: true }) },
            { label: "No", selected: value.tattooPiercing12m === false, onPick: () => set({ tattooPiercing12m: false }) },
          ])}
        </div>
      </div>

      <div className="rs-form-field">
        <span className="rs-form-label" id="fit-alc-label">
          Alcohol in the last 24 hours?
        </span>
        <div role="radiogroup" aria-labelledby="fit-alc-label">
          {optionGrid([
            { label: "Yes", selected: value.alcohol24h === true, onPick: () => set({ alcohol24h: true }) },
            { label: "No", selected: value.alcohol24h === false, onPick: () => set({ alcohol24h: false }) },
          ])}
        </div>
      </div>

      {preview.blocked && !error && (
        <span className="rs-form-helper" role="status">
          Note: {preview.blocked}
          {preview.deferUntil ? ` Eligible again after ${preview.deferUntil}.` : ""}
        </span>
      )}
      {error && (
        <span className="rs-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
