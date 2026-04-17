import { tokenize } from "./tokenize.ts";
import type { Options, TransformChunk, TransformResult } from "./types.ts";
import { getReplacement, getTokenSource } from "./utils.ts";

/**
 * Transform tags and text from left to right.
 *
 * A callback can return a string to replace the token. If no callback is
 * provided, or if it returns `undefined`, the original token text is preserved.
 * Tags must be properly nested and closed.
 *
 * The returned chunks include original and generated ranges, which makes this
 * API suitable as input for a source map generator.
 */
export function transform(input: string, options: Options = {}): TransformResult {
  let output = "";
  const chunks: TransformChunk[] = [];

  for (const token of tokenize(input)) {
    const value = getReplacement(token, options);
    const original = getTokenSource(token);
    const generatedStart = output.length;
    output += value;
    chunks.push({
      value,
      original,
      token,
      generatedStart,
      generatedEnd: output.length,
      originalStart: token.start,
      originalEnd: token.end,
    });
  }

  return { code: output, chunks };
}
