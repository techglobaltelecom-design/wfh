import { payrollRules } from "./rules";

export interface PayrollComputation {
  totalHours: number;
  overtimeHours: number;
  deductionAmount: number;
  estimatedSalary: number;
  activeWorkPct: number;
}

export function computePayroll(input: {
  totalMinutes: number;
  activeSeconds: number;
  idleSeconds: number;
}) {
  const totalHours = input.totalMinutes / 60;
  const overtimeHours = Math.max(0, totalHours - payrollRules.standardDailyHours);
  const regularHours = totalHours - overtimeHours;
  const activeWorkPct =
    input.activeSeconds + input.idleSeconds > 0
      ? (input.activeSeconds / (input.activeSeconds + input.idleSeconds)) * 100
      : 0;

  const idleHours = input.idleSeconds / 3600;
  const deductionAmount = Number((idleHours * payrollRules.idleDeductionPerHour).toFixed(2));

  const salary =
    regularHours * payrollRules.hourlyRate +
    overtimeHours * payrollRules.hourlyRate * payrollRules.overtimeMultiplier -
    deductionAmount;

  const result: PayrollComputation = {
    totalHours: Number(totalHours.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    deductionAmount,
    estimatedSalary: Number(Math.max(0, salary).toFixed(2)),
    activeWorkPct: Number(activeWorkPct.toFixed(2))
  };
  return result;
}
