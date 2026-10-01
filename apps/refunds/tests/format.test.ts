import assert from "node:assert/strict";
import { test } from "node:test";
import { auditCsv } from "../src/lib/refunds/csv.ts";
import { parseAmountMinor } from "../src/lib/refunds/format.ts";

test("parseAmountMinor accepts currency-style input", () => {
  assert.equal(parseAmountMinor("129.99"), 129_99);
  assert.equal(parseAmountMinor("$1,250.5"), 1_250_50);
  assert.equal(parseAmountMinor(" 40 "), 40_00);
  assert.equal(parseAmountMinor("1.999"), null);
  assert.equal(parseAmountMinor("-5"), null);
  assert.equal(parseAmountMinor("abc"), null);
});

test("auditCsv quotes fields and neutralizes spreadsheet formulas", () => {
  const csv = auditCsv([
    {
      id: "1",
      occurredAt: "2026-10-01T12:00:00.000Z",
      action: "Refund requested",
      actorId: "o",
      actorName: "=HYPERLINK(\"x\")",
      target: { type: "refund", id: "rf_1" },
      changes: [{ attribute: "note", oldValue: null, newValue: "a, b" }],
    },
  ]);
  const [header, row] = csv.trimEnd().split("\r\n");
  assert.equal(header, "occurred_at,action,actor_id,actor_name,target_type,target_id,changes");
  assert.equal(row, `2026-10-01T12:00:00.000Z,Refund requested,o,"'=HYPERLINK(""x"")",refund,rf_1,"note: null -> ""a, b"""`);
});
