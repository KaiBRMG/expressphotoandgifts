/**
 * A spreadsheet for the shop's books or mailing tool: each cell quoted when it
 * must be, and a leading formula character neutered, so a customer's name
 * can't run as a spreadsheet formula. Rows end in CRLF, as Excel expects.
 */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
