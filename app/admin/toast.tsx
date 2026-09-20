"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("ax-toast", { detail: message }));
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);
  useEffect(() => {
    const onToast = (event: Event) => {
      const id = Date.now() + Math.random();
      setItems(list => [...list.slice(-2), { id, message: (event as CustomEvent<string>).detail }]);
      setTimeout(() => setItems(list => list.filter(item => item.id !== id)), 3500);
    };
    window.addEventListener("ax-toast", onToast);
    return () => window.removeEventListener("ax-toast", onToast);
  }, []);
  return (
    <div className="ax-toasts" aria-live="polite">
      <AnimatePresence>
        {items.map(item => (
          <motion.div key={item.id} className="ax-toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            {item.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
