import assert from "node:assert/strict";
import test from "node:test";
import { PicotagsSyntaxError } from "./error.ts";
import { replace } from "./replace.ts";

test("replace keeps original tokens unless callbacks return strings", () => {
  assert.equal(
    replace("<dim>Hello<br /></dim>", {
      onopentag: (token) => `[${token.name}]`,
      onselfclosetag: (token) => `[${token.name}/]`,
      onclosetag: (token) => `[/${token.name}]`,
    }),
    "[dim]Hello[br/][/dim]",
  );

  assert.equal(replace("<dim>Hello</dim>", { ontext: (token) => token.text.toUpperCase() }), "<dim>HELLO</dim>");
});

test("replace throws on invalid tag structure", () => {
  assert.throws(() => replace("<a><b></a></b>"), PicotagsSyntaxError);
});
