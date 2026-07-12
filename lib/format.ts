export function formatEventDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatDayNumber(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "numeric" });
}

export function formatIssueStatus(status: string): string {
  return status === "InProgress" ? "In progress" : status;
}

export function formatTaskStatus(status: string): string {
  if (status === "doing") return "In progress";
  if (status === "todo") return "To do";
  if (status === "done") return "Done";
  return status;
}

export function formatTaskDue(date: Date | null | undefined): string {
  if (!date) return "No due date";
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Due ${day}, ${time}`;
}

export function formatContributionDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export function formatTimeAgo(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
