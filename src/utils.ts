import type { TagAttrs } from "./index.ts";

/**
 * Supported tag and attribute name pattern.
 *
 * Names must start with an ASCII letter and can then contain ASCII letters,
 * digits, colon, underscore, or dash. This intentionally keeps the grammar
 * small and predictable for inline markup use cases.
 */
export const NAME = "[A-Za-z][A-Za-z0-9:_-]*";

/**
 * Matches an opening-like tag at the start of a string.
 *
 * The first capture group is the tag name. The second capture group is the raw
 * attribute body, including any trailing slash for self-closing tags.
 */
export const OPEN_TAG = new RegExp(`^<(${NAME})([^<>]*)>`);

/**
 * Matches a closing tag at the start of a string.
 *
 * The first capture group is the tag name.
 */
export const CLOSE_TAG = new RegExp(`^</(${NAME})>`);

/**
 * Matches one attribute from a tag attribute body.
 *
 * Capture groups:
 * 1. Attribute name
 * 2. Double-quoted value
 * 3. Single-quoted value
 * 4. Bare value
 *
 * If groups 2-4 are all undefined, the attribute is boolean.
 */
export const ATTR = /([A-Za-z][A-Za-z0-9:_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * Parse a raw tag attribute body into a normalized attribute map.
 *
 * Boolean attributes are represented as `true`. Quoted and bare values are
 * returned without their surrounding quotes.
 */
export function parseAttrs(input: string): TagAttrs {
  const attrs: TagAttrs = {};
  // ATTR is global, so reset it before each independent parse.
  ATTR.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ATTR.exec(input))) {
    const [, name, doubleQuoted, singleQuoted, bare] = match;
    attrs[name] = doubleQuoted ?? singleQuoted ?? bare ?? true;
  }

  return attrs;
}
