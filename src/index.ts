import { CLOSE_TAG, OPEN_TAG, parseAttrs } from "./utils.ts";

/**
 * Attribute map parsed from an opening or self-closing tag.
 *
 * Attributes without an explicit value are represented as `true`.
 *
 * @example
 * `<tag disabled count="1">` -> `{ disabled: true, count: "1" }`
 */
export type TagAttrs = Record<string, string | true>;

/**
 * Source range for a token.
 *
 * `start` is inclusive and `end` is exclusive. Both offsets are UTF-16 string
 * indexes, matching JavaScript's native `slice()` semantics.
 */
export type SourceSpan = {
  start: number;
  end: number;
};

/**
 * Plain text between tags.
 */
export type TextToken = SourceSpan & {
  type: "text";
  text: string;
};

/**
 * Opening tag token such as `<dim>` or `<a href="/">`.
 */
export type OpenTagToken = SourceSpan & {
  type: "opentag";
  name: string;
  attrs: TagAttrs;
  /** Original source slice for this token. */
  raw: string;
};

/**
 * Self-closing tag token such as `<br/>` or `<img src="logo.png" />`.
 */
export type SelfCloseTagToken = SourceSpan & {
  type: "selfclosetag";
  name: string;
  attrs: TagAttrs;
  /** Original source slice for this token. */
  raw: string;
};

/**
 * Closing tag token such as `</dim>`.
 */
export type CloseTagToken = SourceSpan & {
  type: "closetag";
  name: string;
  /** Original source slice for this token. */
  raw: string;
};

/**
 * Any token emitted by {@link tokenize}.
 */
export type Token = TextToken | OpenTagToken | SelfCloseTagToken | CloseTagToken;

/**
 * Event callbacks used by {@link parse}.
 */
export type ParseOptions = {
  onopentag?: (token: OpenTagToken) => void;
  onselfclosetag?: (token: SelfCloseTagToken) => void;
  ontext?: (token: TextToken) => void;
  onclosetag?: (token: CloseTagToken) => void;
};

/**
 * Replacement callbacks used by {@link replace}.
 *
 * Returning a string replaces the current token. Returning `undefined`
 * keeps the original token text unchanged.
 */
export type ReplaceOptions = {
  onopentag?: (token: OpenTagToken) => string | void;
  onselfclosetag?: (token: SelfCloseTagToken) => string | void;
  ontext?: (token: TextToken) => string | void;
  onclosetag?: (token: CloseTagToken) => string | void;
};

/**
 * A generated output chunk produced by {@link transform}.
 *
 * This is intentionally source-map-ready without depending on a source map
 * package. Consumers can convert these ranges to line/column mappings using
 * their preferred source map implementation.
 */
export type TransformChunk = {
  value: string;
  original: string;
  token: Token;
  generatedStart: number;
  generatedEnd: number;
  originalStart: number;
  originalEnd: number;
};

/**
 * Result returned by {@link transform}.
 */
export type TransformResult = {
  code: string;
  chunks: TransformChunk[];
};

/**
 * Tokenize a string containing lightweight XML-like tags.
 *
 * The tokenizer is streaming-friendly: it returns an iterator and only
 * allocates tokens as they are consumed. Malformed `<` characters are kept as
 * text instead of throwing.
 *
 * @example
 * for (const token of tokenize("a <dim>b</dim>")) {
 *   console.log(token.type);
 * }
 */
export function* tokenize(input: string): IterableIterator<Token> {
  let index = 0;
  let text = "";
  let textStart = 0;

  while (index < input.length) {
    // Scan directly to the next possible tag start. Text is buffered so
    // adjacent text fragments caused by malformed `<` are emitted as one token.
    const next = input.indexOf("<", index);
    if (next === -1) {
      if (!text) textStart = index;
      text += input.slice(index);
      break;
    }

    if (next > index) {
      if (!text) textStart = index;
      text += input.slice(index, next);
    }

    const rest = input.slice(next);

    // Closing tags have no attributes, so they can be emitted immediately.
    const close = CLOSE_TAG.exec(rest);
    if (close) {
      if (text) {
        yield { type: "text", text, start: textStart, end: next };
        text = "";
      }
      yield {
        type: "closetag",
        name: close[1],
        raw: close[0],
        start: next,
        end: next + close[0].length,
      };
      index = next + close[0].length;
      continue;
    }

    // Opening tags also cover self-closing tags. A trailing slash before `>`
    // changes only the token type; attributes are parsed from the same body.
    const open = OPEN_TAG.exec(rest);
    if (open) {
      if (text) {
        yield { type: "text", text, start: textStart, end: next };
        text = "";
      }
      const attrsSource = open[2];
      const selfClosing = attrsSource.trimEnd().endsWith("/");
      const attrs = parseAttrs(selfClosing ? attrsSource.trimEnd().slice(0, -1) : attrsSource);
      yield {
        type: selfClosing ? "selfclosetag" : "opentag",
        name: open[1],
        attrs,
        raw: open[0],
        start: next,
        end: next + open[0].length,
      };
      index = next + open[0].length;
      continue;
    }

    // A `<` that does not begin a supported tag is ordinary text.
    if (!text) textStart = next;
    text += "<";
    index = next + 1;
  }

  if (text) {
    yield { type: "text", text, start: textStart, end: input.length };
  }
}

/**
 * Parse tags and text from left to right, invoking callbacks for each token.
 *
 * `parse` performs no tree validation. Nested tags are represented by the
 * natural callback order: open -> text/children -> close.
 */
export function parse(input: string, options: ParseOptions = {}): void {
  for (const token of tokenize(input)) {
    switch (token.type) {
      case "opentag":
        options.onopentag?.(token);
        break;
      case "selfclosetag":
        options.onselfclosetag?.(token);
        break;
      case "closetag":
        options.onclosetag?.(token);
        break;
      case "text":
        options.ontext?.(token);
        break;
    }
  }
}

/**
 * Transform tags and text from left to right.
 *
 * A callback can return a string to replace the token. If no callback is
 * provided, or if it returns `undefined`, the original token text is preserved.
 *
 * The returned chunks include original and generated ranges, which makes this
 * API suitable as input for a source map generator.
 */
export function transform(input: string, options: ReplaceOptions = {}): TransformResult {
  let output = "";
  const chunks: TransformChunk[] = [];

  for (const token of tokenize(input)) {
    let value: string;
    const original = getTokenSource(token);

    switch (token.type) {
      case "opentag":
        value = options.onopentag?.(token) ?? token.raw;
        break;
      case "selfclosetag":
        value = options.onselfclosetag?.(token) ?? token.raw;
        break;
      case "closetag":
        value = options.onclosetag?.(token) ?? token.raw;
        break;
      case "text":
        value = options.ontext?.(token) ?? token.text;
        break;
    }

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

/**
 * Replace tags and text from left to right, returning only the generated code.
 *
 * Use {@link transform} when you need source ranges or mapping information.
 */
export function replace(input: string, options: ReplaceOptions = {}): string {
  return transform(input, options).code;
}

function getTokenSource(token: Token): string {
  return token.type === "text" ? token.text : token.raw;
}
