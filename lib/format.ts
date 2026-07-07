export function formatEventDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatDayNumber(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "numeric" });
}
