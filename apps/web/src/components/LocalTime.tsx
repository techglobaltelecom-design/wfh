"use client";

export function LocalTime({
  value,
  mode = "time"
}: {
  value: string | Date;
  mode?: "time" | "datetime";
}) {
  const date = typeof value === "string" ? new Date(value) : value;
  const text =
    mode === "datetime" ? date.toLocaleString(undefined, { hour12: true }) : date.toLocaleTimeString(undefined, { hour12: true });

  return <span suppressHydrationWarning>{text}</span>;
}
