import assert from "node:assert/strict";
import test from "node:test";
import { ATTR, CLOSE_TAG, getReplacement, getTokenSource, NAME, OPEN_TAG, parseAttrs } from "./utils.ts";

test("NAME matches supported tag and attribute names", () => {
  const pattern = new RegExp(`^${NAME}$`);

  assert.equal(pattern.test("dim"), true);
  assert.equal(pattern.test("x-foo:bar_1"), true);
  assert.equal(pattern.test("1dim"), false);
  assert.equal(pattern.test("dim.foo"), false);
});

test("OPEN_TAG and CLOSE_TAG match tags at the start of input", () => {
  assert.deepEqual(OPEN_TAG.exec("<dim level=1>text")?.slice(1), ["dim", " level=1"]);
  assert.deepEqual(CLOSE_TAG.exec("</dim>text")?.slice(1), ["dim"]);

  assert.equal(OPEN_TAG.test("x <dim>"), false);
  assert.equal(CLOSE_TAG.test("x </dim>"), false);
});

test("ATTR tokenizes boolean, quoted, and bare attributes", () => {
  ATTR.lastIndex = 0;
  const matches = Array.from(' disabled a="1" b=\'2\' c=three'.matchAll(ATTR));

  assert.deepEqual(matches.map((match) => match.slice(1, 5)), [
    ["disabled", undefined, undefined, undefined],
    ["a", "1", undefined, undefined],
    ["b", undefined, "2", undefined],
    ["c", undefined, undefined, "three"],
  ]);
});

test("parseAttrs returns normalized attributes", () => {
  assert.deepEqual(parseAttrs(' disabled a="1" b=\'2\' c=three'), {
    disabled: true,
    a: "1",
    b: "2",
    c: "three",
  });
});

test("getTokenSource returns text or raw token source", () => {
  assert.equal(getTokenSource({ type: "text", text: "hello", start: 0, end: 5 }), "hello");
  assert.equal(getTokenSource({ type: "opentag", name: "a", attrs: {}, raw: "<a>", start: 0, end: 3 }), "<a>");
  assert.equal(getTokenSource({ type: "selfclosetag", name: "br", attrs: {}, raw: "<br />", start: 0, end: 6 }), "<br />");
  assert.equal(getTokenSource({ type: "closetag", name: "a", raw: "</a>", start: 0, end: 4 }), "</a>");
});

test("getReplacement applies callbacks and falls back to source", () => {
  assert.equal(
    getReplacement(
      { type: "opentag", name: "a", attrs: {}, raw: "<a>", start: 0, end: 3 },
      { onopentag: (token) => `[${token.name}]` },
    ),
    "[a]",
  );
  assert.equal(
    getReplacement(
      { type: "text", text: "hello", start: 0, end: 5 },
      { ontext: () => undefined },
    ),
    "hello",
  );
});
