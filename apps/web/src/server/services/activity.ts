export function calculateActiveWorkPercentage(activeSeconds: number, idleSeconds: number) {
  const overall = activeSeconds + idleSeconds;
  if (!overall) return 0;
  return Number(((activeSeconds / overall) * 100).toFixed(2));
}
