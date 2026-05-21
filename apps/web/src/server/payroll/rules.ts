export interface PayrollRules {
  hourlyRate: number;
  overtimeMultiplier: number;
  standardDailyHours: number;
  idleDeductionPerHour: number;
}

export const payrollRules: PayrollRules = {
  hourlyRate: 18,
  overtimeMultiplier: 1.5,
  standardDailyHours: 8,
  idleDeductionPerHour: 6
};
