import type { CloseTagToken, OpenTagToken } from "./types.ts";

type StackTraceConstructor = {
  captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
};

/**
 * Syntax error code thrown when tag structure is invalid.
 */
export type SyntaxErrorCode =
  | "unexpected-close-tag"
  | "mismatched-close-tag"
  | "unclosed-tag";

/**
 * Error thrown when tags are not properly nested or closed.
 */
export class PicotagsSyntaxError extends SyntaxError {
  code: SyntaxErrorCode;
  token: OpenTagToken | CloseTagToken;
  expected?: string;
  actual?: string;

  constructor(
    code: SyntaxErrorCode,
    message: string,
    token: OpenTagToken | CloseTagToken,
    details: { expected?: string; actual?: string } = {},
  ) {
    super(message);
    this.name = "PicotagsSyntaxError";
    this.code = code;
    this.token = token;
    this.expected = details.expected;
    this.actual = details.actual;
    captureStackTrace(this);
  }
}

function captureStackTrace(error: PicotagsSyntaxError): void {
  const capture = (SyntaxError as StackTraceConstructor).captureStackTrace
    ?? (Error as StackTraceConstructor).captureStackTrace;

  capture?.(error, PicotagsSyntaxError);
}

/**
 * Validate that a closing tag matches the latest open tag.
 */
export function validateCloseTag(token: CloseTagToken, stack: OpenTagToken[]): void {
  const current = stack[stack.length - 1];

  if (!current) {
    throw new PicotagsSyntaxError(
      "unexpected-close-tag",
      `Unexpected close tag </${token.name}> at ${token.start}.`,
      token,
      { actual: token.name },
    );
  }

  if (current.name !== token.name) {
    throw new PicotagsSyntaxError(
      "mismatched-close-tag",
      `Expected close tag </${current.name}> but found </${token.name}> at ${token.start}.`,
      token,
      { expected: current.name, actual: token.name },
    );
  }

  stack.pop();
}
