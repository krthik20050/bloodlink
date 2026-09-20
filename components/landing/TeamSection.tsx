import React from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

// ponytail: avatars hotlinked from GitHub (stable). LinkedIn blocks hotlinking (999), so no LinkedIn images.
const FOUNDERS = [
  {
    initials: "GN",
    name: "Gokul N R",
    role: "Co-founder, RaktaKosh",
    blurb: "Developer, Frontend Developer",
    avatar: "/team/gokul.png",
    github: "https://github.com/Gokul-555180",
    linkedin: "https://www.linkedin.com/in/gokulnr0212/",
  },
  {
    initials: "KK",
    name: "Karthik Krishnan",
    role: "Co-founder, RaktaKosh",
    blurb: "Developer, Backend Developer",
    avatar: "https://github.com/krthik20050.png",
    github: "https://github.com/krthik20050",
    linkedin: "https://www.linkedin.com/in/karthik-krishnan-/",
  },
];

export const TeamSection: React.FC = () => {
  return (
    <section id="founders" className="rs-section rs-trust-section" aria-labelledby="founders-heading">
      {/* ponytail: hover polish lives here so app/styles.css stays untouched */}
      <style>{`.founder-card{transition:transform 180ms var(--rs-ease-out),box-shadow 180ms var(--rs-ease-out)}.founder-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(23,23,23,.10)}`}</style>
      <div className="rs-content-container">
        <ScrollReveal>
          <div className="rs-trust-head">
            <span className="rs-section-eyebrow">MEET THE FOUNDERS</span>
            <h2 id="founders-heading" className="rs-section-title">
              Meet the brains behind this.
            </h2>
          </div>

          {/* ponytail: horizontal cards — photo left, info right. No new CSS file, inline only. */}
          <div className="rs-trust-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            {FOUNDERS.map((f) => (
              <div
                key={f.name}
                className="rs-trust-item founder-card"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 22,
                  background: "var(--rs-surface)",
                  border: "1px solid var(--rs-border)",
                  borderRadius: "var(--rs-radius-card)",
                  padding: 24,
                  boxShadow: "0 2px 12px rgba(23,23,23,.05)",
                }}
              >
                {/* ponytail: GitHub avatar img, initials as alt fallback text */}
                <img
                  src={f.avatar}
                  alt={`${f.name} photo`}
                  width={96}
                  height={96}
                  loading="lazy"
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                    border: "2px solid var(--rs-accent-border)",
                    boxShadow: "0 4px 16px rgba(143,38,56,.18)",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "0.02em" }}>{f.name}</h3>
                  <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--rs-accent)" }}>{f.role}</p>
                  <p className="rs-trust-item-desc" style={{ margin: 0 }}>{f.blurb}</p>
                  {/* ponytail: text links, no brand-icon dep */}
                  <div style={{ display: "flex", gap: 16, fontSize: 14, marginTop: 4 }}>
                    <a href={f.github} target="_blank" rel="noreferrer">
                      GitHub →
                    </a>
                    <a href={f.linkedin} target="_blank" rel="noreferrer">
                      LinkedIn →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
