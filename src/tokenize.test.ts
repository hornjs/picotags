import assert from "node:assert/strict";
import test from "node:test";
import { PicotagsSyntaxError } from "./error.ts";
import { tokenize } from "./tokenize.ts";

function expectSyntaxError(
  error: unknown,
  expected: {
    code: string;
    expected?: string;
    actual?: string;
    raw: string;
  },
): true {
  assert.equal(error instanceof PicotagsSyntaxError, true);
  const syntaxError = error as PicotagsSyntaxError;
  assert.equal(syntaxError.code, expected.code);
  assert.equal(syntaxError.expected, expected.expected);
  assert.equal(syntaxError.actual, expected.actual);
  assert.equal(syntaxError.token.raw, expected.raw);
  return true;
}

test("tokenize parses text, nested tags, attrs, and self-closing tags", () => {
  assert.deepEqual(Array.from(tokenize('a <dim level=1 flag>b<br /></dim>')), [
    { type: "text", text: "a ", start: 0, end: 2 },
    { type: "opentag", name: "dim", attrs: { level: "1", flag: true }, raw: "<dim level=1 flag>", start: 2, end: 20 },
    { type: "text", text: "b", start: 20, end: 21 },
    { type: "selfclosetag", name: "br", attrs: {}, raw: "<br />", start: 21, end: 27 },
    { type: "closetag", name: "dim", raw: "</dim>", start: 27, end: 33 },
  ]);
});

test("tokenize can be consumed in source order", () => {
  const events: unknown[] = [];

  for (const token of tokenize("<dim>Hello<br /></dim>")) {
    switch (token.type) {
      case "opentag":
        events.push(["open", token.name, token.attrs, token.start, token.end]);
        break;
      case "text":
        events.push(["text", token.text, token.start, token.end]);
        break;
      case "selfclosetag":
        events.push(["self", token.name, token.attrs, token.start, token.end]);
        break;
      case "closetag":
        events.push(["close", token.name, token.start, token.end]);
        break;
    }
  }

  assert.deepEqual(events, [
    ["open", "dim", {}, 0, 5],
    ["text", "Hello", 5, 10],
    ["self", "br", {}, 10, 16],
    ["close", "dim", 16, 22],
  ]);
});

test("tokenize throws on an unexpected close tag", () => {
  assert.throws(
    () => Array.from(tokenize("</a>")),
    (error) => expectSyntaxError(error, {
      code: "unexpected-close-tag",
      actual: "a",
      raw: "</a>",
    }),
  );
});

test("tokenize throws on mismatched nested tags", () => {
  assert.throws(
    () => Array.from(tokenize("<a><b></a></b>")),
    (error) => expectSyntaxError(error, {
      code: "mismatched-close-tag",
      expected: "b",
      actual: "a",
      raw: "</a>",
    }),
  );
});

test("tokenize throws on an unclosed tag", () => {
  assert.throws(
    () => Array.from(tokenize("<a>text")),
    (error) => expectSyntaxError(error, {
      code: "unclosed-tag",
      expected: "a",
      raw: "<a>",
    }),
  );
});
