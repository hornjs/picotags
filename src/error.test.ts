import assert from "node:assert/strict";
import test from "node:test";
import { PicotagsSyntaxError, validateCloseTag } from "./error.ts";
import type { CloseTagToken, OpenTagToken } from "./types.ts";

function openTag(name: string): OpenTagToken {
  return {
    type: "opentag",
    name,
    attrs: {},
    raw: `<${name}>`,
    start: 0,
    end: name.length + 2,
  };
}

function closeTag(name: string): CloseTagToken {
  return {
    type: "closetag",
    name,
    raw: `</${name}>`,
    start: 0,
    end: name.length + 3,
  };
}

test("PicotagsSyntaxError stores syntax metadata", () => {
  const token = closeTag("a");
  const error = new PicotagsSyntaxError(
    "unexpected-close-tag",
    "Unexpected close tag.",
    token,
    { actual: "a" },
  );

  assert.equal(error.name, "PicotagsSyntaxError");
  assert.equal(error.message, "Unexpected close tag.");
  assert.equal(error.code, "unexpected-close-tag");
  assert.equal(error.token, token);
  assert.equal(error.actual, "a");
  assert.equal(error.expected, undefined);
});

test("validateCloseTag pops a matching open tag", () => {
  const stack = [openTag("a")];

  validateCloseTag(closeTag("a"), stack);

  assert.deepEqual(stack, []);
});

test("validateCloseTag throws without an open tag", () => {
  assert.throws(
    () => validateCloseTag(closeTag("a"), []),
    (error) => {
      assert.equal(error instanceof PicotagsSyntaxError, true);
      const syntaxError = error as PicotagsSyntaxError;
      assert.equal(syntaxError.code, "unexpected-close-tag");
      assert.equal(syntaxError.actual, "a");
      assert.equal(syntaxError.token.raw, "</a>");
      return true;
    },
  );
});

test("validateCloseTag throws on a mismatched close tag", () => {
  const stack = [openTag("a"), openTag("b")];

  assert.throws(
    () => validateCloseTag(closeTag("a"), stack),
    (error) => {
      assert.equal(error instanceof PicotagsSyntaxError, true);
      const syntaxError = error as PicotagsSyntaxError;
      assert.equal(syntaxError.code, "mismatched-close-tag");
      assert.equal(syntaxError.expected, "b");
      assert.equal(syntaxError.actual, "a");
      assert.equal(syntaxError.token.raw, "</a>");
      return true;
    },
  );
  assert.deepEqual(stack.map((token) => token.name), ["a", "b"]);
});
