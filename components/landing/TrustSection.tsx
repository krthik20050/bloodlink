import React from "react";
import { Lock, Clock, Sliders } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface TrustPrinciple {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const PRINCIPLES: TrustPrinciple[] = [
  {
    title: "PRIVATE",
    description: "Personal contact details are never publicly broadcast or shared with open directories.",
    icon: <Lock size={19} strokeWidth={1.75} className="rs-trust-icon rs-trust-icon--lock" />,
  },
  {
    title: "ELIGIBILITY",
    description: "Medical donation intervals are checked prior to alert dispatch to protect donor health.",
    icon: <Clock size={19} strokeWidth={1.75} className="rs-trust-icon rs-trust-icon--clock" />,
  },
  {
    title: "CHOICE",
    description: "Donors decide freely whether to respond without pressure or public exposure.",
    icon: <Sliders size={19} strokeWidth={1.75} className="rs-trust-icon rs-trust-icon--sliders" />,
  },
];

export const TrustSection: React.FC = () => {
  return (
    <section className="rs-section rs-trust-section" aria-labelledby="trust-heading">
      <div className="rs-content-container">
        <ScrollReveal>
          <div className="rs-trust-head">
            <span className="rs-section-eyebrow">TRUST & INTEGRITY</span>
            <h2 id="trust-heading" className="rs-section-title">
              Private by default.<br />
              Human by design.
            </h2>
          </div>

          {/* Three Principles with Subtle Hover Micro-Movement */}
          <div className="rs-trust-grid">
            {PRINCIPLES.map((item, idx) => (
              <div key={item.title} className="rs-trust-item">
                <div className="rs-trust-item-header">
                  {item.icon}
                  <h3 className="rs-trust-item-title">{item.title}</h3>
                </div>
                <p className="rs-trust-item-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
