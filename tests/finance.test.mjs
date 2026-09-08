import test from "node:test";
import assert from "node:assert/strict";
import { calculateMetrics, rublesToKopecks } from "../lib/finance.ts";

test("считает доходы, расходы, прибыль и рентабельность", () => {
  assert.deepEqual(calculateMetrics([
    { kind: "income", amountKopecks: 85000000 },
    { kind: "expense", amountKopecks: 22000000 },
    { kind: "expense", amountKopecks: 4950000 },
  ]), { incomeKopecks: 85000000, expenseKopecks: 26950000, profitKopecks: 58050000, profitability: 68.29411764705883 });
});

test("при нулевом доходе рентабельность не вводит в заблуждение", () => {
  assert.deepEqual(calculateMetrics([{ kind: "expense", amountKopecks: 10000 }]), { incomeKopecks: 0, expenseKopecks: 10000, profitKopecks: -10000, profitability: null });
});

test("конвертирует рубли в целые копейки без float в базе", () => {
  assert.equal(rublesToKopecks("1 234,56"), 123456);
  assert.equal(rublesToKopecks("0.01"), 1);
  assert.throws(() => rublesToKopecks("10.999"));
  assert.throws(() => rublesToKopecks("0"));
});
