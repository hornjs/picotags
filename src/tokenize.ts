import { PicotagsSyntaxError, validateCloseTag } from "./error.ts";
import type { CloseTagToken, OpenTagToken, SelfCloseTagToken, Token } from "./types.ts";
import { CLOSE_TAG, OPEN_TAG, parseAttrs } from "./utils.ts";

/**
 * Tokenize a string containing lightweight XML-like tags.
 *
 * The tokenizer is streaming-friendly: it returns an iterator and only
 * allocates tokens as they are consumed. Malformed `<` characters are kept as
 * text instead of throwing. Recognized tags must be properly nested and closed.
 *
 * @example
 * for (const token of tokenize("a <dim>b</dim>")) {
 *   console.log(token.type);
 * }
 *
 * @example
 * for (const token of tokenize("<dim>Hello<br /></dim>")) {
 *   switch (token.type) {
 *     case "opentag":
 *       console.log("open", token.name, token.attrs);
 *       break;
 *     case "selfclosetag":
 *       console.log("self", token.name, token.attrs);
 *       break;
 *     case "closetag":
 *       console.log("close", token.name);
 *       break;
 *     case "text":
 *       console.log("text", token.text);
 *       break;
 *   }
 * }
 */
export function* tokenize(input: string): IterableIterator<Token> {
  let index = 0;
  let text = "";
  let textStart = 0;
  const stack: OpenTagToken[] = [];

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
      const token: CloseTagToken = {
        type: "closetag",
        name: close[1],
        raw: close[0],
        start: next,
        end: next + close[0].length,
      };
      validateCloseTag(token, stack);
      yield token;
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
      const token: OpenTagToken | SelfCloseTagToken = {
        type: selfClosing ? "selfclosetag" : "opentag",
        name: open[1],
        attrs,
        raw: open[0],
        start: next,
        end: next + open[0].length,
      };
      if (token.type === "opentag") {
        stack.push(token);
      }
      yield token;
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

  const unclosed = stack.pop();
  if (unclosed) {
    throw new PicotagsSyntaxError(
      "unclosed-tag",
      `Unclosed tag <${unclosed.name}> at ${unclosed.start}.`,
      unclosed,
      { expected: unclosed.name },
    );
  }
}
