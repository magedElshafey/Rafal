"use client";

import { useEffect, useState } from "react";

type ResendCountdownProps = {
  initialSeconds?: number;
  countdownLabel: string;
  resendLabel: string;
};

export function ResendCountdown({
  countdownLabel,
  initialSeconds = 55,
  resendLabel,
}: ResendCountdownProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds === 0) return;

    const timer = window.setTimeout(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [seconds]);

  if (seconds === 0) {
    return (
      <button
        type="button"
        className="rounded-sm type-body-sm text-gray-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setSeconds(initialSeconds)}
      >
        {resendLabel}
      </button>
    );
  }

  const time = `00:${String(seconds).padStart(2, "0")}`;

  return (
    <p className="type-body-sm text-gray-400">
      {countdownLabel} <bdi>{time}</bdi>
    </p>
  );
}
