export function normalizeEmployeeId(employeeId: string) {
  return employeeId.trim().toUpperCase();
}

export function employeeIdCandidates(employeeId: string) {
  const normalized = normalizeEmployeeId(employeeId);
  const candidates = new Set<string>([normalized]);
  if (normalized.startsWith("EMP")) {
    candidates.add(normalized.slice(3));
  } else {
    candidates.add(`EMP${normalized}`);
  }
  return [...candidates];
}
