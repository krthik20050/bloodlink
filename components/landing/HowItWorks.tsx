import React from "react";

interface WorkflowStage {
  number: string;
  title: string;
  summary: string;
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    number: "01",
    title: "REQUEST",
    summary: "The hospital or family enters patient blood group, required units, and facility location.",
  },
  {
    number: "02",
    title: "FILTER",
    summary: "The system computes red-cell compatibility, statutory 90-day cooldowns, and transit radius.",
  },
  {
    number: "03",
    title: "NOTIFY",
    summary: "High-priority eligible donors receive a direct 1-to-1 prompt via private Telegram bot.",
  },
  {
    number: "04",
    title: "CONNECT",
    summary: "When a donor confirms, arrival details are exchanged. Active notifications halt immediately.",
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="rs-workflow-section" aria-labelledby="workflow-title">
      <div className="rs-container">
        {/* Header */}
        <div className="rs-workflow-header">
          <span className="rs-mono-tag">04 // OPERATING SEQUENCE</span>
          <h2 id="workflow-title" className="rs-workflow-title">
            How coordination happens in practice.
          </h2>
          <p className="rs-workflow-lead">
            Every step is deterministic, private, and designed to resolve emergencies without panic broadcasting.
          </p>
        </div>

        {/* Connected Horizontal Line Process (No cards) */}
        <div className="rs-workflow-track-wrapper">
          <div className="rs-workflow-track" role="list">
            {WORKFLOW_STAGES.map((stage, idx) => (
              <div key={stage.number} className="rs-workflow-node-item" role="listitem">
                {/* Horizontal / Vertical connecting bus */}
                <div className="rs-workflow-spine">
                  <span className="rs-workflow-node-num">{stage.number}</span>
                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <div className="rs-workflow-line-segment" aria-hidden="true" />
                  )}
                </div>

                <div className="rs-workflow-text-block">
                  <h3 className="rs-workflow-node-title">{stage.title}</h3>
                  <p className="rs-workflow-node-desc">{stage.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
