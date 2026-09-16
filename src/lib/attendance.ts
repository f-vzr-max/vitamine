export const FR_DOW = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
export const FR_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function fmtDate(y: number, mo: number, d: number): string {
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function dowOf(dateStr: string): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).getDay();
}

export function daysInMonth(month: string): number {
  const [y, mo] = month.split("-").map(Number);
  return new Date(y, mo, 0).getDate();
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export type AttendanceStatus = "PRESENT" | "DEMIE-J" | "ABS" | "OFF" | "WEEKEND";
export const CYCLE_STATUSES: AttendanceStatus[] = ["PRESENT", "DEMIE-J", "ABS"];

export function computeStatus(
  dateStr: string,
  employeeId: string,
  recordsByKey: Map<string, string>
): AttendanceStatus {
  const dow = dowOf(dateStr);
  if (dow === 0 || dow === 6) return "WEEKEND";
  const stored = recordsByKey.get(`${employeeId}|${dateStr}`);
  return (stored as AttendanceStatus | undefined) ?? "PRESENT";
}

const LABELS: Record<AttendanceStatus, string> = { PRESENT: "P", "DEMIE-J": "½", ABS: "A", OFF: "X", WEEKEND: "X" };
export function statusLabel(status: AttendanceStatus): string {
  return LABELS[status];
}

const CLASSES: Record<AttendanceStatus, string> = {
  PRESENT: "att-present",
  "DEMIE-J": "att-half",
  ABS: "att-absent",
  OFF: "att-off",
  WEEKEND: "att-weekend",
};
export function statusClassName(status: AttendanceStatus): string {
  return CLASSES[status];
}
