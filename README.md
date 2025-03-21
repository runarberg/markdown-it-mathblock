# markdown-it-mathblock

[![ci](https://github.com/runarberg/markdown-it-mathblock/actions/workflows/ci.yml/badge.svg)](https://github.com/runarberg/markdown-it-mathblock/actions/workflows/ci.yml)
![Coverage](https://runarberg.github.io/markdown-it-mathblock/badge.svg)
[![npm](https://img.shields.io/npm/v/markdown-it-mathblock.svg)](https://www.npmjs.com/package/markdown-it-mathblock)
[![License](https://img.shields.io/npm/l/markdown-it-mathblock)](https://github.com/runarberg/markdown-it-mathblock/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dm/markdown-it-mathblock)](https://npm-stat.com/charts.html?package=markdown-it-mathblock)

> A markdown-it plugin to render block math that feels like markdown.

Pairs well with [markdown-it-mathspan][markdown-it-mathspan].

This is a markdown-it plugin which renders block math (delimited by
`$$` by default) with the same behavior as [fenced code
blocks][commonmark#fenced-code-blocks] (` ``` `) according to the
commonmark spec.

```md
$$
x = -b+-sqrt(b^2 - 4ac) / 2a
$$
```

This is useful if you are more familiar with markdown than LaTeX or
sometimes need to include dollar signs in your math expressions.

<!-- prettier-ignore -->
```md
- Function application:
  $$
  f$0 = 1
  $$
- Calculating dollars:
  $$
  $a + $b = $c
  $$
- Tribble dollars $$$:
  $$$$
  $$$
  $$$$
- Also fine like this:
  $$
  1 + $$$ + 2
  $$
```

## Install

```bash
npm install --save markdown-it markdown-it-mathblock
```

**Note**: This plugin does not include a math renderer. So you must
provide your own: Here are some excellent choices:

- [mathup][mathup] (an AsciiMath Dialect):
  ```bash
  npm install --save mathup
  ```
- [Temml][temml] (LaTeX):
  ```bash
  npm install --save temml
  # And if you plan on using the <la-tex> custom elements (see usage)
  npm install --save temml-custom-element
  ```

## Usage

### Mathup (AsciiMath dialect)

See [mathup][mathup] for the renderer reference.

```js
import markdownIt from "markdown-it";
import markdownItMathblock from "markdown-it-mathblock";

// Optional (for default mathup renderer)
import "mathup/custom-element";

// Optional, with defaults
const options = {
  minDelims: 2,
  renderer, // See below
  customElement, // See below
};

const md = markdownIt().use(markdownItMathblock, options);

md.render(`
# Document

With block math:

$$
x = -b+-sqrt(b^2 - 4ac) / 2a
$$
`);
// <h1>Document</h1>
// <p>With block math:</p>
// <math-up display="block">x = -b+-sqrt(b^2 - 4ac) / 2a</math-up>
```

### LaTeX

See [Temml][temml] for the renderer reference and
[temml-custom-element][temml-custom-element] for reference on the
`<la-tex>` custom element.

```js
import markdownIt from "markdown-it";
import markdownItMathblock from "markdown-it-mathblock";
import "temml-custom-element";

const md = markdownIt().use(markdownItMathblock, {
  // Do this if you want to use custom macros
  customElement: ["la-tex", { display: "block", macros: "persist" }],
});

md.render(`
# Document

$$ preample
\def\E{\mathbb{E}}
\newcommand\d[0]{\operatorname{d}\!}
$$

With block math:

$$
\E[X] = \int_{-\infty}^{\infty} xf(x) \d{x}
$$
`);
// <h1>Document</h1>
//
// <la-tex-preample>
//   \def\E{\mathbb{E}}
//   \newcommand\d[0]{\operatorname{d}\!}
// </la-tex-preample>
//
// <p>With block math:</p>
//
// <la-tex display="block" macros="persist">
//   \E[X] = \int_{-\infty}^{\infty} xf(x) \d{x}
// </la-tex>
```

### Options

- **`minDelims`**: The minimum required number of delimiters around a
  math block. Set this to 3 if you want mathblocks to behave exactly
  like code fences.
- **`renderer`**: The math renderer. Accepts the source, the parsed
  `MarkdownIt` token, and the `markdownIt` instance. Defaults to a
  function that surrounds and escapes with a custom element (see below).
  ```js
  {
    renderer: (src, token, md) =>
      `<math-up display="block">${md.utils.escapeHtml(src)}</math-up>`,
  }
  ```
- **`customElement`**: If you want to specify which custom element to
  render into, this is a convenience option to do so. Accepts a pair of
  `["tag-name", { attribute: "value" }]` The default is:
  ```js
  {
    customElement: ["math-up", { display: "block" }],
  }
  ```

### Default renderer

The default renderer depends on which custom element depends on which
elements are in in your [custom element registry][custom-element-registry].
It will try the following in order:

1. `<math-up display="block">` ([see mathup][mathup])
2. `<la-tex display="block">` ([see Temml][temml] and
   [temml-custom-element][temml-custom-element])
3. If none is found it will default to `<div class="math block">`

## Examples

Use with [markdown-it-mathspan][markdown-it-mathspan]:

```js
import markdownIt from "markdown-it";
import markdownItMathblock from "markdown-it-mathblock";
import markdownItSpan from "markdown-it-mathspan";
import "mathup/custom-element";

const md = markdownIt().use(markdownItMathblock).use(markdownItMathspan);

md.render(`
Inline math $a^2 + b^2 = c^2$. And block math:

$$
x = -b+-sqrt(b^2 - 4ac) / 2a
$$
`);
// <p>Inline math <math-up>a^2 + b^2 = c^2</math-up>. And block math:</p>
// <math-up display="block">x = -b+-sqrt(b^2 - 4ac) / 2a</math-up>
```

Enforce thicker delimiters:

```js
import markdownIt from "markdown-it";
import markdownItMathblock from "markdown-it-mathblock";
import "mathup/custom-element";

const md = markdownIt().use(markdownItMath, { minDelims: 3 });

md.render(
$$
This is not math
$$

$$$
[b; u; t] * t[h; i; s] = i_s
$$$
);
```

Use the info string.

```js
import markdownIt from "markdown-it";
import markdownItMathblock from "markdown-it-mathblock";
import "mathup/custom-element";

const md = markdownIt().use(markdownItMathblock, {
  renderer(src, token, md) {
    if (token.info.trim().toLowerCase().startsWith("latex")) {
      return `<la-tex display="block">${md.utils.escapeHtml(src)}</la-tex>`;
    }

    return `<math-up display="block">${md.utils.escapeHtml(src)}</math-up>`;
  },
});

md.render(`
$$ mathup
sin x
$$

$$ latex
\cos \theta
$$
`);
// <math-up display="block">sin x</math-up>
// <la-tex display="block">\cos \theta</la-tex>
```

Render the expression straight into MathML using [mathup][mathup]. You
might want to include the stylesheet from mathup for this.

```js
import markdownIt from "markdown-it";
import markdownItMathblock from "markdown-it-mathblock";
import mathup from "mathup";

const md = markdownIt().use(markdownItMathblock, {
  renderer: (src) => mathup(src, { display: "block" }).toString(),
});

md.render(`
$$
pi ~~ 3.14159
$$
`);
// <math display="block"><mi>π</mi><mo>≈</mo><mn>3.14159</mn></math>
```

Render the expression from LaTeX into MathML using [Temml][temml]. You
might want to include the stylesheet and fonts from Temml for this.

```js
import markdownIt from "markdown-it";
import markdownItMathblock from "markdown-it-mathblock";
import temml from "temml";

const md = markdownIt().use(markdownItMathblock, {
  renderer: (src) => temml.renderToString(src, { displayMode: true }),
});

md.render(`
$$
\sin x
$$
`);
// <math display="block"><!- ... --></math>
```

Pass in custom attributes to the renderer `<math-up>` element:

```js
import markdownIt from "markdown-it";
import markdownItMathblock from "markdown-it-mathblock";
import "mathup/custom-element";

const md = markdownIt().use(markdownItMathblock, {
  customElement: ["math-up", { display: "block", "decimal-mark": "," }],
});

md.render(`
$$
pi ~~ 3,14159
$$
`);
// <math-up display="block" decimal-mark=",">pi ~~ 3,14159</math-up>
```

## See Also and References

- [markdown-it-math][markdown-it-math] - For a more LaTeX like plugin.
- [markdown-it-mathspan][markdown-it-mathspan] - If you also want to include inline math.
- [mathup][mathup] - An AsciiMath dialect renderer.
- [Temml][temml] - A LaTeX math renderer.
- [Commonmark spec for fenced code blocks][commonmark#fenced-code-blocks]

[commonmark#fenced-code-blocks]: https://spec.commonmark.org/0.31.2/#fenced-code-blocks
[custom-element-registry]: https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry
[markdown-it-math]: https://github.com/runarberg/math
[markdown-it-mathspan]: https://github.com/runarberg/mathspan
[mathup]: https://mathup.xyz/
[temml]: https://temml.org/
[temml-custom-element]: https://github.com/runarberg/temml-custom-element
