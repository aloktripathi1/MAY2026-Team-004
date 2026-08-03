function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map((h) => escapeCsvField(String(h))).join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => escapeCsvField(String(cell))).join(","));
  }
  return lines.join("\r\n");
}
