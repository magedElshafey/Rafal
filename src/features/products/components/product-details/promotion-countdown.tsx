"use client";

import { useEffect, useState } from "react";

type PromotionCountdownProps = {
  copy: {
    days: string;
    expired: string;
    hours: string;
    label: string;
    minutes: string;
    seconds: string;
  };
  endsAt: string;
  initialNow: number;
};

type RemainingTime =
  | { status: "hidden" }
  | { status: "active"; milliseconds: number }
  | { status: "expired" };

function getRemainingTime(endTime: number, now: number): RemainingTime {
  if (!Number.isFinite(endTime)) return { status: "hidden" };

  const milliseconds = Math.max(0, endTime - now);
  return milliseconds === 0
    ? { status: "expired" }
    : { status: "active", milliseconds };
}

export function PromotionCountdown({
  copy,
  endsAt,
  initialNow,
}: PromotionCountdownProps) {
  const [remaining, setRemaining] = useState<RemainingTime>(() => {
    const initial = getRemainingTime(Date.parse(endsAt), initialNow);
    return initial.status === "expired" ? { status: "hidden" } : initial;
  });

  useEffect(() => {
    const endTime = Date.parse(endsAt);
    if (!Number.isFinite(endTime) || endTime <= initialNow) return;

    const updateRemaining = () => {
      const next = getRemainingTime(endTime, Date.now());
      setRemaining(next);
      if (next.status === "expired") window.clearInterval(intervalId);
    };
    const timeoutId = window.setTimeout(updateRemaining, 0);
    const intervalId = window.setInterval(updateRemaining, 1_000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [endsAt, initialNow]);

  if (remaining.status === "hidden") return null;
  if (remaining.status === "expired") {
    return <span className="type-body-sm text-gray-600">{copy.expired}</span>;
  }

  const totalSeconds = Math.floor(remaining.milliseconds / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className="type-body-sm text-gray-700">
      {copy.label}: <bdi>{days}</bdi> {copy.days} <bdi>{hours}</bdi>{" "}
      {copy.hours} <bdi>{minutes}</bdi> {copy.minutes} <bdi>{seconds}</bdi>{" "}
      {copy.seconds}
    </span>
  );
}
