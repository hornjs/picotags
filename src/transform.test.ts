import assert from "node:assert/strict";
import test from "node:test";
import { transform } from "./transform.ts";

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
