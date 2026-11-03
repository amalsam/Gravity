"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Small queue: at most `max` visible, each auto-dismissed after `ttl` ms.
export function useToasts({ max = 3, ttl = 5200 } = {}) {
  const [items, setItems] = useState([]);
  const id = useRef(0);
  const timers = useRef(new Set());

  const push = useCallback(
    (text, color) => {
      const t = { id: ++id.current, text, color };
      setItems((xs) => [...xs, t].slice(-max));
      const h = setTimeout(() => {
        setItems((xs) => xs.filter((x) => x.id !== t.id));
        timers.current.delete(h);
      }, ttl);
      timers.current.add(h);
    },
    [max, ttl]
  );

  const clear = useCallback(() => setItems([]), []);

  useEffect(() => {
    const all = timers.current;
    return () => all.forEach(clearTimeout);
  }, []);

  return { items, push, clear };
}
