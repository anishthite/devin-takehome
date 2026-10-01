import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { isDemoMode } from "../src/demo/mode.ts";
import { DEMO_PERSONAS, findPersona, findPersonaByEmail } from "../src/demo/personas.ts";
import { ROLES } from "../src/lib/roles.ts";

describe("isDemoMode", () => {
  const original = process.env.DEMO_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = original;
  });

  it("is off unless DEMO_MODE is exactly 'true'", () => {
    delete process.env.DEMO_MODE;
    assert.equal(isDemoMode(), false);
    for (const value of ["1", "TRUE", "yes", ""]) {
      process.env.DEMO_MODE = value;
      assert.equal(isDemoMode(), false, value);
    }
    process.env.DEMO_MODE = "true";
    assert.equal(isDemoMode(), true);
  });
});

describe("demo personas", () => {
  it("covers every Ledger role exactly once", () => {
    assert.deepEqual(
      DEMO_PERSONAS.map((p) => p.role).sort(),
      [...ROLES].sort(),
    );
  });

  it("has unique ids", () => {
    assert.equal(new Set(DEMO_PERSONAS.map((p) => p.id)).size, DEMO_PERSONAS.length);
  });

  it("finds personas by id and rejects anything else", () => {
    assert.equal(findPersona(DEMO_PERSONAS[0].id), DEMO_PERSONAS[0]);
    assert.equal(findPersona("nope"), undefined);
    assert.equal(findPersona(undefined), undefined);
    assert.equal(findPersona({ id: DEMO_PERSONAS[0].id }), undefined);
    assert.equal(findPersonaByEmail(DEMO_PERSONAS[1].email.toUpperCase()), DEMO_PERSONAS[1]);
    assert.equal(findPersonaByEmail("nobody@demo.ledger"), undefined);
  });
});
