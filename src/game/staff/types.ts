import type { WarungSnapshot } from "@/game/warung/model";
export type StaffKind = "guard" | "courier" | "cook" | "keeper";
export type StaffBusiness = "warung" | "warteg" | "kos";
export interface StaffMember {
  kind: StaffKind;
  business: StaffBusiness;
  name: string;
  monthly: number;
  daily: number;
  hireCost: number;
  restockTargetPercent?: number | null;
  amountDue: number;
  paymentToken: string | null;
  dueThrough: string | null;
  requirement: string;
  effect: string;
  eligible: boolean;
  status: "active" | "left" | "dismissed" | "vacant";
  lateDays: number;
  startedAt: string | null;
  /** Last WIB date whose salary is paid; null when never hired. */
  paidUntil: string | null;
  /** Unpaid WIB dates left before the employee leaves; null when never hired. */
  leaveIn: number | null;
}
export interface StaffData {
  offlineSales?: Pick<WarungSnapshot, "settled" | "catalog">;
  enabled: true;
  kas: number | null;
  staff: StaffMember[];
  messages: {
    id: number;
    type: "STAFF_LATE" | "STAFF_LEFT" | "STAFF_RESTOCK" | "STAFF_SALARY";
    kind: StaffKind;
    name: string;
    at: string;
    text: string;
  }[];
  text: Record<
    | "title"
    | "hire"
    | "rehire"
    | "dismiss"
    | "retry"
    | "rules"
    | "rounding"
    | "cash_low"
    | "locked"
    | "late_status"
    | "salary"
    | "hire_cost"
    | "messages"
    | StaffMember["status"],
    string
  > &
    Record<string, string | undefined>;
  pollSeconds: number;
}
export type StaffSnapshot = StaffData | { enabled: false };
export type StaffCommand = {
  action: "state" | "hire" | "dismiss" | "pay" | "configure";
  restockTargetPercent?: number;
  kind?: StaffKind;
  paymentToken?: string;
  requestId: string;
};
