"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Vijf korte, moderne Nederlandse namen met een goede mix tussen meisje/jongen.
// Noor staat eerst zodat de eerste frame consistent is met de rest van de site
// (waar Noor het voorbeeldpersonage is).
const NAMES = ["Noor", "Daan", "Mila", "Finn", "Saar"] as const;
const INTERVAL_MS = 2600;

export function RotatingName() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % NAMES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={NAMES[idx]}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ display: "inline-block" }}
      >
        {NAMES[idx]}
      </motion.span>
    </AnimatePresence>
  );
}
