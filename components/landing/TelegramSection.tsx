"use client";
// ponytail: same section language as Process/Trust (eyebrow + title + track) — no card.

import React from "react";
import { Send } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface TelegramSectionProps {
  telegramLink: string;
  botHandle: string;
}

const STEPS = [
  {
    num: "01",
    title: "REGISTER",
    body: "Become a donor in chat. /donate covers signup plus the health check.",
  },
  {
    num: "02",
    title: "REQUEST",
    body: "Need blood? /request files it without touching a form.",
  },
  {
    num: "03",
    title: "RESPOND",
    body: "Private Yes/No alerts arrive in chat. Accept, and contact is exchanged.",
  },
];

export const TelegramSection: React.FC<TelegramSectionProps> = ({
  telegramLink,
  botHandle,
}) => {
  return (
    <section className="rs-section rs-telegram-section" aria-labelledby="telegram-heading">
      <div className="rs-content-container">
        <ScrollReveal>
          <div className="rs-telegram-head">
            <span className="rs-section-eyebrow">TELEGRAM-FIRST</span>
            <h2 id="telegram-heading" className="rs-section-title">
              No need to come back here.<br />
              Do it in Telegram.
            </h2>
            <p className="rs-telegram-lede">
              Register, request blood, and answer alerts in chat —
              no forms to revisit.
            </p>
          </div>
        </ScrollReveal>

        {/* Same thin connected track as How-it-works, 80ms staggered reveal */}
        <div className="rs-process-track-shell">
          <div className="rs-process-track" role="list">
            {STEPS.map((step, idx) => (
              <ScrollReveal key={step.num} delay={idx * 80} className="rs-process-step-wrap">
                <div className="rs-process-step" role="listitem">
                  <div className="rs-step-topline">
                    <span className="rs-step-num">{step.num}</span>
                    <span className="rs-step-title">{step.title}</span>
                    {idx < STEPS.length - 1 && (
                      <div className="rs-step-connector" aria-hidden="true" />
                    )}
                  </div>
                  <p className="rs-step-body">{step.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <ScrollReveal>
          <div className="rs-telegram-actions">
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rs-btn-primary rs-btn-lg"
            >
              <Send size={16} aria-hidden="true" />
              <span>Open @{botHandle} in Telegram</span>
              <span className="rs-btn-arrow" aria-hidden="true">→</span>
            </a>
          </div>

          <p className="rs-telegram-limits">
            Private 1:1 alerts only · not guaranteed.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};
