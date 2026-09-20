"use client";
// ponytail: official Telegram-blue FAB, hand-rolled on installed framer-motion —
// no shadcn, no new dep. Press = straight to Telegram; hover/focus springs
// open the info panel. Panel text stays unfiltered.

import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Send } from "lucide-react";

interface TelegramFloatProps {
  telegramLink: string;
  botHandle: string;
}

const SPRING = { type: "spring", stiffness: 420, damping: 28 } as const;

export const TelegramFloat: React.FC<TelegramFloatProps> = ({
  telegramLink,
  botHandle,
}) => {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  function closeIfOutside(next: React.FocusEvent<HTMLDivElement>): void {
    if (!next.currentTarget.contains(next.relatedTarget as Node | null)) setOpen(false);
  }

  const links = [
    { label: "Start chat", href: telegramLink },
    { label: "Register as donor", href: `${telegramLink}?start=donate` },
    { label: "Request blood", href: `${telegramLink}?start=request` },
  ];

  return (
    <div
      className="rs-tg-float"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={closeIfOutside}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <AnimatePresence>
        {open && (
          reduce ? (
            <div key="panel" className="rs-tg-panel" role="dialog" aria-label={`BloodLink bot on Telegram, ${botHandle}`}>
              <p className="rs-tg-panel-title">BloodLink bot</p>
              <p className="rs-tg-panel-handle">@{botHandle}</p>
              <div className="rs-tg-panel-links">
                {links.map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                    {l.label} →
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <motion.div
              key="panel"
              className="rs-tg-panel"
              role="dialog"
              aria-label={`BloodLink bot on Telegram, ${botHandle}`}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={SPRING}
            >
              <p className="rs-tg-panel-title">BloodLink bot</p>
              <p className="rs-tg-panel-handle">@{botHandle}</p>
              <div className="rs-tg-panel-links">
                {links.map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                    {l.label} →
                  </a>
                ))}
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* ponytail: press navigates natively — no JS routing needed */}
      {reduce ? (
        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rs-tg-fab"
          aria-label={`Open BloodLink bot on Telegram, ${botHandle}`}
          title={`Open @${botHandle} in Telegram`}
        >
          <Send size={22} aria-hidden="true" />
        </a>
      ) : (
        <motion.a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rs-tg-fab"
          aria-label={`Open BloodLink bot on Telegram, ${botHandle}`}
          title={`Open @${botHandle} in Telegram`}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.93 }}
          transition={SPRING}
        >
          <Send size={22} aria-hidden="true" />
        </motion.a>
      )}
    </div>
  );
};
