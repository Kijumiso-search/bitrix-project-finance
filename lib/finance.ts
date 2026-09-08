export type EntryKind = "income" | "expense";
export type FinanceEntry = { amountKopecks: number; kind: EntryKind };

export function calculateMetrics(entries: FinanceEntry[]) {
  const incomeKopecks = entries.filter((e) => e.kind === "income").reduce((sum, e) => sum + e.amountKopecks, 0);
  const expenseKopecks = entries.filter((e) => e.kind === "expense").reduce((sum, e) => sum + e.amountKopecks, 0);
  const profitKopecks = incomeKopecks - expenseKopecks;
  const profitability = incomeKopecks === 0 ? null : (profitKopecks / incomeKopecks) * 100;
  return { incomeKopecks, expenseKopecks, profitKopecks, profitability };
}

export function rublesToKopecks(value: string | number) {
  const normalized = String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("Сумма должна быть положительным числом с точностью до копеек");
  const kopecks = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(kopecks) || kopecks <= 0) throw new Error("Сумма должна быть больше нуля");
  return kopecks;
}
