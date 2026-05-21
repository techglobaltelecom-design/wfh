export type UserRole = "EMPLOYEE" | "ADMIN";

export type WorkStatus = "ONLINE" | "BUSY" | "AWAY";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface DateRange {
  from: string;
  to: string;
}
