"use client";

import React, { useState } from "react";
import { Badge } from "../ui/Badge";
import { ArrowDown, Check, Layers, AlertCircle } from "lucide-react";

export interface MatchingStageData {
  stage: string;
  count: number;
  label: string;
  criterionDescription: string;
  reductionPercentage: string;
}

// Illustrative UI data for conceptual pipeline visualization.
// Structured cleanly to allow direct binding with backend telemetry or live request simulation.
const SAMPLE_PIPELINE_DATA: MatchingStageData[] = [
  {
    stage: "Registered Regional Pool",
    count: 47,
    label: "Initial Registered Candidates",
    criterionDescription: "All active donors registered within the municipal metro area.",
    reductionPercentage: "100%",
  },
  {
    stage: "Compatibility Filter",
    count: 29,
    label: "ABO / Rh Compatible",
    criterionDescription: "Evaluated against clinical red cell antigen compatibility chart for recipient blood group.",
    reductionPercentage: "61.7%",
  },
  {
    stage: "Biological Eligibility",
    count: 17,
    label: "Safe Donation Interval",
    criterionDescription: "Excludes donors who gave blood within the mandatory 90-day cooldown period.",
    reductionPercentage: "36.2%",
  },
  {
    stage: "Geographic Proximity",
    count: 9,
    label: "Within 15km Transit Radius",
    criterionDescription: "Calculated via spatial coordinates to ensure rapid response under 45 minutes travel time.",
    reductionPercentage: "19.1%",
  },
  {
    stage: "Notification Throttling",
    count: 6,
    label: "Notification-Eligible Finalists",
    criterionDescription: "Highest response reliability, no active pending alerts, optimal anti-fatigue score.",
    reductionPercentage: "12.8%",
  },
];

export const MatchingFlow: React.FC = () => {
  const [activeStageIdx, setActiveStageIdx] = useState<number>(4);

  return (
    <section className="rs-funnel-section" aria-labelledby="funnel-title">
      <div className="rs-container">
        <div className="rs-funnel-header">
          <div className="rs-funnel-eyebrow-wrap">
            <span className="rs-eyebrow">STEP-DOWN FILTERING</span>
            <Badge variant="oxblood" size="sm">
              Illustrative Pipeline Flow
            </Badge>
          </div>
          <h2 id="funnel-title" className="rs-funnel-title">
            From forty-seven candidates <br />
            to six verified matches.
          </h2>
          <p className="rs-funnel-subtitle">
            See how a single emergency request narrows the donor pool through mathematical, biological, and spatial constraints.
          </p>
        </div>

        {/* Funnel Layout */}
        <div className="rs-funnel-card">
          <div className="rs-funnel-stages">
            {SAMPLE_PIPELINE_DATA.map((item, idx) => {
              const isSelected = activeStageIdx === idx;
              // Bar width proportional to initial 47 candidates
              const barWidthPercent = Math.max(14, Math.round((item.count / 47) * 100));

              return (
                <div key={item.stage} className="rs-funnel-row-wrap">
                  <div
                    className={`rs-funnel-row ${isSelected ? "rs-funnel-row--active" : ""}`}
                    onClick={() => setActiveStageIdx(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveStageIdx(idx);
                      }
                    }}
                    aria-label={`${item.label}: ${item.count} donors`}
                  >
                    <div className="rs-funnel-label-col">
                      <span className="rs-funnel-step-idx">Stage {idx + 1}</span>
                      <strong className="rs-funnel-stage-name">{item.stage}</strong>
                    </div>

                    <div className="rs-funnel-bar-col">
                      <div className="rs-funnel-bar-track">
                        <div
                          className="rs-funnel-bar-fill"
                          style={{ width: `${barWidthPercent}%` }}
                        />
                      </div>
                      <span className="rs-funnel-count">
                        <strong>{item.count}</strong>
                        <small>candidates</small>
                      </span>
                    </div>

                    <div className="rs-funnel-meta-col">
                      <span className="rs-funnel-percent">{item.reductionPercentage}</span>
                    </div>
                  </div>

                  {idx < SAMPLE_PIPELINE_DATA.length - 1 && (
                    <div className="rs-funnel-arrow" aria-hidden="true">
                      <ArrowDown size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inspection Card for the Selected Stage */}
          <div className="rs-funnel-detail-card">
            <div className="rs-detail-header">
              <span className="rs-detail-badge">
                STAGE 0{activeStageIdx + 1} ANALYSIS
              </span>
              <span className="rs-detail-count">
                {SAMPLE_PIPELINE_DATA[activeStageIdx].count} Candidates Remaining
              </span>
            </div>
            <h4 className="rs-detail-title">
              {SAMPLE_PIPELINE_DATA[activeStageIdx].label}
            </h4>
            <p className="rs-detail-desc">
              {SAMPLE_PIPELINE_DATA[activeStageIdx].criterionDescription}
            </p>
            <div className="rs-detail-disclaimer">
              <AlertCircle size={14} className="rs-disclaimer-icon" />
              <span>
                Demonstration dataset. In production, stage candidate volumes fluctuate dynamically based on geographic density and hospital urgency criteria.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
