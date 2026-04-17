import { tokenize } from "./tokenize.ts";
import type { Options } from "./types.ts";
import { getReplacement } from "./utils.ts";

/**
 * Replace tags and text from left to right, returning only the generated code.
 *
 * Use `transform` when you need source ranges or mapping information.
 */
export function replace(input: string, options: Options = {}): string {
  let output = "";

  for (const token of tokenize(input)) {
    output += getReplacement(token, options);
  }

  return output;
}
