import assert from "node:assert/strict";
import test from "node:test";
import { parse, replace, tokenize, transform } from "./index.ts";

test("tokenize parses text, nested tags, attrs, and self-closing tags", () => {
  assert.deepEqual(Array.from(tokenize('a <dim level=1 flag>b<br /></dim>')), [
    { type: "text", text: "a ", start: 0, end: 2 },
    { type: "opentag", name: "dim", attrs: { level: "1", flag: true }, raw: "<dim level=1 flag>", start: 2, end: 20 },
    { type: "text", text: "b", start: 20, end: 21 },
    { type: "selfclosetag", name: "br", attrs: {}, raw: "<br />", start: 21, end: 27 },
    { type: "closetag", name: "dim", raw: "</dim>", start: 27, end: 33 },
  ]);
});

test("parse emits callbacks in source order", () => {
  const events: unknown[] = [];

  parse("<dim>Hello<br /></dim>", {
    onopentag: (token) => events.push(["open", token.name, token.attrs, token.start, token.end]),
    ontext: (token) => events.push(["text", token.text, token.start, token.end]),
    onselfclosetag: (token) => events.push(["self", token.name, token.attrs, token.start, token.end]),
    onclosetag: (token) => events.push(["close", token.name, token.start, token.end]),
  });

  assert.deepEqual(events, [
    ["open", "dim", {}, 0, 5],
    ["text", "Hello", 5, 10],
    ["self", "br", {}, 10, 16],
    ["close", "dim", 16, 22],
  ]);
});

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

test("transform returns generated code and source-map-ready chunks", () => {
  const result = transform("<dim>Hello<br /></dim>", {
    onopentag: (token) => `[${token.name}]`,
    onselfclosetag: (token) => `[${token.name}/]`,
    onclosetag: (token) => `[/${token.name}]`,
  });

  assert.equal(result.code, "[dim]Hello[br/][/dim]");
  assert.deepEqual(result.chunks.map((chunk) => ({
    value: chunk.value,
    original: chunk.original,
    generatedStart: chunk.generatedStart,
    generatedEnd: chunk.generatedEnd,
    originalStart: chunk.originalStart,
    originalEnd: chunk.originalEnd,
  })), [
    { value: "[dim]", original: "<dim>", generatedStart: 0, generatedEnd: 5, originalStart: 0, originalEnd: 5 },
    { value: "Hello", original: "Hello", generatedStart: 5, generatedEnd: 10, originalStart: 5, originalEnd: 10 },
    { value: "[br/]", original: "<br />", generatedStart: 10, generatedEnd: 15, originalStart: 10, originalEnd: 16 },
    { value: "[/dim]", original: "</dim>", generatedStart: 15, generatedEnd: 21, originalStart: 16, originalEnd: 22 },
  ]);
});
