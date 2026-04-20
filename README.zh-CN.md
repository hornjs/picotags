# picotags

[English](README.md)

用于内联标记的轻量 XML-like 标签 tokenizer 和 transformer。

当你想在字符串里使用轻量标签时，可以使用 `picotags`，例如终端颜色里的
`<red>failed</red>`、CLI 输出里的 `<dim>hint</dim>`，或者日志、消息和富文本管线里的自定义内联标记。它负责解析标签结构，具体如何渲染或替换由你的代码决定。

## 特性

- 运行时很小，无依赖。
- `tokenize()` 返回可流式消费的 iterator。
- 支持开始标签、结束标签、文本和自闭合标签。
- 支持 boolean、双引号、单引号和裸值属性。
- token 包含 `start` / `end` 源码位置。
- 对已识别标签做严格嵌套校验。
- `transform()` 返回可接入 source map 工具的输出片段。
- 不合法的 `<` 会保留为文本，不会抛错。

## 安装

```sh
pnpm add picotags
```

```ts
import { replace, tokenize, transform } from "picotags";
```

## Tokenize

`tokenize(input)` 返回一个 iterator，可以用 `for...of` 或 `Array.from()` 消费。

```ts
import { tokenize } from "picotags";

const tokens = Array.from(tokenize('a <dim level=1 flag>b<br /></dim>'));

console.log(tokens);
```

输出：

```ts
[
  { type: "text", text: "a ", start: 0, end: 2 },
  {
    type: "opentag",
    name: "dim",
    attrs: [
      { name: "level", value: "1", raw: "level=1", start: 7, end: 14 },
      { name: "flag", value: true, raw: "flag", start: 15, end: 19 },
    ],
    raw: "<dim level=1 flag>",
    start: 2,
    end: 20,
  },
  { type: "text", text: "b", start: 20, end: 21 },
  { type: "selfclosetag", name: "br", attrs: [], raw: "<br />", start: 21, end: 27 },
  { type: "closetag", name: "dim", raw: "</dim>", start: 27, end: 33 },
]
```

已识别的标签必须正确嵌套并关闭。结构不合法时会抛出 `PicotagsSyntaxError`。

## 语法错误

`tokenize()`、`replace()` 和 `transform()` 在遇到不合法标签结构时会抛出 `PicotagsSyntaxError`。

```ts
import { PicotagsSyntaxError, tokenize } from "picotags";

try {
  Array.from(tokenize("<a><b></a></b>"));
} catch (error) {
  if (error instanceof PicotagsSyntaxError) {
    console.log(error.code);
    // mismatched-close-tag
  }
}
```

错误码：

```ts
type SyntaxErrorCode =
  | "unexpected-close-tag"
  | "mismatched-close-tag"
  | "unclosed-tag";
```

## Replace

`replace(input, handlers)` 按源码顺序替换 token。

handler 返回字符串时，会用返回值替换当前 token。返回 `undefined` 时，会保留当前 token 的原始文本。

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

文本也可以替换：

```ts
replace("<dim>Hello</dim>", {
  ontext(token) {
    return token.text.toUpperCase();
  },
});
// <dim>HELLO</dim>
```

## Transform

`transform(input, handlers)` 使用和 `replace()` 相同的替换回调，但额外返回源码位置片段。

它返回生成后的代码和 chunk 映射信息：

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

每个 chunk 都包含原始范围和生成范围：

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

这不是 source map 实现。它只提供后续接入 source map 库所需的原始范围数据。

## 属性

支持的属性形式：

```txt
<tag disabled>
<tag count="1">
<tag count='1'>
<tag count=1>
```

解析结果：

```ts
[
  { name: "disabled", value: true, raw: "disabled", start: 1, end: 9 },
  { name: "count", value: "1", raw: 'count="1"', start: 10, end: 19 },
]
```

属性会保留源码顺序。每个属性都带自己的 `raw`、`start` 和 `end`，便于保留精确位置信息。

属性值始终是字符串；没有显式值的 boolean 属性为 `true`。

## Token 类型

```ts
type Token =
  | TextToken
  | OpenTagToken
  | SelfCloseTagToken
  | CloseTagToken;
```

文本 token：

```ts
type TextToken = {
  type: "text";
  text: string;
  start: number;
  end: number;
};
```

开始标签：

```ts
type OpenTagToken = {
  type: "opentag";
  name: string;
  attrs: AttrToken[];
  raw: string;
  start: number;
  end: number;
};
```

自闭合标签：

```ts
type SelfCloseTagToken = {
  type: "selfclosetag";
  name: string;
  attrs: AttrToken[];
  raw: string;
  start: number;
  end: number;
};
```

属性 token：

```ts
type AttrToken = {
  name: string;
  value: string | true;
  raw: string;
  start: number;
  end: number;
};
```

结束标签：

```ts
type CloseTagToken = {
  type: "closetag";
  name: string;
  raw: string;
  start: number;
  end: number;
};
```

## 语法

标签名和属性名必须匹配：

```txt
[A-Za-z][A-Za-z0-9:_-]*
```

示例：

```txt
<dim>
<x-foo:bar_1>
```

不合法标签会保留为文本：

```ts
Array.from(tokenize("a < b"));
// [{ type: "text", text: "a < b", start: 0, end: 5 }]
```
