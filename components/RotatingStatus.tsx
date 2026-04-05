"use client";

import { useState, useEffect } from "react";

interface RotatingStatusProps {
  messages: string[];
  interval?: number;
}

export function RotatingStatus({
  messages,
  interval = 1500,
}: RotatingStatusProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => {
        // Stop at last message — don't loop
        if (prev >= messages.length - 1) return prev;
        setVisible(false);
        setTimeout(() => {
          setVisible(true);
        }, 300);
        return prev + 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [messages, interval]);

  return (
    <div className="flex justify-center py-1">
      <span
        className="text-[13px] font-sans italic text-ink/40 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {messages[index]}
      </span>
    </div>
  );
}
