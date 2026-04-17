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
 * Any token emitted by `tokenize`.
 */
export type Token =
  | TextToken
  | OpenTagToken
  | SelfCloseTagToken
  | CloseTagToken;

/**
 * Replacement callbacks used by `replace` and `transform`.
 *
 * Returning a string replaces the current token. Returning `undefined`
 * keeps the original token text unchanged.
 */
export type Options = {
  onopentag?: (token: OpenTagToken) => string | void;
  onselfclosetag?: (token: SelfCloseTagToken) => string | void;
  ontext?: (token: TextToken) => string | void;
  onclosetag?: (token: CloseTagToken) => string | void;
};

/**
 * A generated output chunk produced by `transform`.
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
 * Result returned by `transform`.
 */
export type TransformResult = {
  code: string;
  chunks: TransformChunk[];
};
