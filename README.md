# picotags

Small XML-like tag tokenizer and transformer for inline markup.

`picotags` is intentionally not tied to HTML, colors, terminals, or any renderer. It only recognizes lightweight tags, emits tokens, and lets callers decide what those tags mean.

## Features

- Tiny, dependency-free runtime.
- Streaming-friendly `tokenize()` iterator.
- Opening, closing, text, and self-closing tokens.
- Boolean, quoted, and bare attributes.
- Token `start` / `end` source offsets.
- `transform()` output chunks that are ready to feed into source map tooling.
- Malformed `<` characters are preserved as text instead of throwing.

## Install

```sh
pnpm add picotags
```

```ts
import { parse, replace, tokenize, transform } from "picotags";
```

## Tokenize

`tokenize(input)` returns an iterator, so you can consume tokens with `for...of` or `Array.from()`.

```ts
import { tokenize } from "picotags";

const tokens = Array.from(tokenize('a <dim level=1 flag>b<br /></dim>'));

console.log(tokens);
```

Output:

```ts
[
  { type: "text", text: "a ", start: 0, end: 2 },
  {
    type: "opentag",
    name: "dim",
    attrs: { level: "1", flag: true },
    raw: "<dim level=1 flag>",
    start: 2,
    end: 20,
  },
  { type: "text", text: "b", start: 20, end: 21 },
  { type: "selfclosetag", name: "br", attrs: {}, raw: "<br />", start: 21, end: 27 },
  { type: "closetag", name: "dim", raw: "</dim>", start: 27, end: 33 },
]
```

## Parse

`parse(input, handlers)` walks tokens from left to right and calls the matching handler.

```ts
import { parse } from "picotags";

parse("<dim>Hello<br /></dim>", {
  onopentag(token) {
    console.log("open", token.name, token.attrs);
  },
  ontext(token) {
    console.log("text", token.text);
  },
  onselfclosetag(token) {
    console.log("self", token.name, token.attrs);
  },
  onclosetag(token) {
    console.log("close", token.name);
  },
});
```

`parse()` does not validate tree structure. Nested tags are represented by callback order.

## Replace

`replace(input, handlers)` replaces tokens from left to right.

If a handler returns a string, that string is used. If it returns `undefined`, the original token text is preserved.

```ts
import { replace } from "picotags";

const output = replace("<dim>Hello <br /></dim>", {
  onopentag(token) {
    return `[${token.name}]`;
  },
  onselfclosetag(token) {
    return `[${token.name}/]`;
  },
  onclosetag(token) {
    return `[/${token.name}]`;
  },
});

console.log(output);
// [dim]Hello [br/][/dim]
```

Text can be replaced too:

```ts
replace("<dim>Hello</dim>", {
  ontext(token) {
    return token.text.toUpperCase();
  },
});
// <dim>HELLO</dim>
```

## Transform

`transform(input, handlers)` is the lower-level API behind `replace()`.

It returns generated code plus chunk mappings:

```ts
import { transform } from "picotags";

const result = transform("<dim>Hello<br /></dim>", {
  onopentag(token) {
    return `[${token.name}]`;
  },
  onselfclosetag(token) {
    return `[${token.name}/]`;
  },
  onclosetag(token) {
    return `[/${token.name}]`;
  },
});

console.log(result.code);
// [dim]Hello[br/][/dim]

console.log(result.chunks);
```

Each chunk includes original and generated ranges:

```ts
type TransformChunk = {
  value: string;
  original: string;
  token: Token;
  generatedStart: number;
  generatedEnd: number;
  originalStart: number;
  originalEnd: number;
};
```

This is not a source map implementation by itself. It gives you the raw range data needed to connect to a source map library later.

## Attributes

Supported attribute forms:

```txt
<tag disabled>
<tag count="1">
<tag count='1'>
<tag count=1>
```

Parsed result:

```ts
{
  disabled: true,
  count: "1"
}
```

Attribute values are always strings unless the attribute is boolean.

## Token Types

```ts
type Token =
  | TextToken
  | OpenTagToken
  | SelfCloseTagToken
  | CloseTagToken;
```

Text token:

```ts
type TextToken = {
  type: "text";
  text: string;
  start: number;
  end: number;
};
```

Opening tag:

```ts
type OpenTagToken = {
  type: "opentag";
  name: string;
  attrs: Record<string, string | true>;
  raw: string;
  start: number;
  end: number;
};
```

Self-closing tag:

```ts
type SelfCloseTagToken = {
  type: "selfclosetag";
  name: string;
  attrs: Record<string, string | true>;
  raw: string;
  start: number;
  end: number;
};
```

Closing tag:

```ts
type CloseTagToken = {
  type: "closetag";
  name: string;
  raw: string;
  start: number;
  end: number;
};
```

## Grammar

Tag and attribute names must match:

```txt
[A-Za-z][A-Za-z0-9:_-]*
```

Examples:

```txt
<dim>
<x-foo:bar_1>
```

Malformed tags are kept as text:

```ts
Array.from(tokenize("a < b"));
// [{ type: "text", text: "a < b", start: 0, end: 5 }]
```
