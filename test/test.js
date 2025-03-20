import assert from "node:assert/strict";
import { mock, suite, test } from "node:test";

import markdownIt from "markdown-it";
import Token from "markdown-it/lib/token.mjs";

import markdownItMathblock from "../index.js";

/** @type {import("../index.js").CustomRenderer} */
function optionalLatexRenderer(src, token, md) {
  if (token.info.trim() === "latex") {
    return `<la-tex display="block">${md.utils.escapeHtml(src)}</la-tex>\n`;
  }

  return `<math-up display="block">${md.utils.escapeHtml(src)}</math-up>\n`;
}

/**
 * @param {string} str
 * @returns {string}
 */
function mathblock(str) {
  return `<div class="math block">${str}</div>\n`;
}

/**
 * @param {string} str
 * @returns {string}
 */
function p(str) {
  return `<p>${str}</p>\n`;
}

/**
 * @param {string} str
 * @returns {string}
 */
function pre(str) {
  return `<pre><code>${str}\n</code></pre>\n`;
}

/**
 * @param {string} str
 * @returns {string}
 */
function blockquote(str) {
  return `<blockquote>\n${str}</blockquote>\n`;
}

suite("Options", () => {
  suite("minDelims", () => {
    test("Rejects if fewer delims", () => {
      const md = markdownIt().use(markdownItMathblock, { minDelims: 3 });
      const src = "$$\nfoo\n$$";
      const res = md.render(src);

      assert.equal(res, p("$$\nfoo\n$$"));
    });

    test("Accepts equal delims", () => {
      const md = markdownIt().use(markdownItMathblock, { minDelims: 2 });
      const src = "$$\nfoo\n$$";
      const res = md.render(src);

      assert.equal(res, mathblock("foo"));
    });
  });

  suite("renderer", () => {
    test("Custom renderer", () => {
      const md = markdownIt().use(markdownItMathblock, {
        renderer: (src) => `<NULL>${src}</NULL>\n`,
      });

      const src = "$$\nfoo\n$$";
      const res = md.render(src);

      assert.equal(res, "<NULL>foo</NULL>\n");
    });

    test("Correct arguments passed into renderer", () => {
      const renderer = mock.fn((_src, _token, _md) => "");
      const md = markdownIt().use(markdownItMathblock, { renderer });

      md.render("$$\nfoo\n$$");

      const [firstCall] = renderer.mock.calls;
      assert.ok(firstCall);

      const args = firstCall.arguments;

      assert.equal(args[0], "foo");
      assert.equal(args[1] instanceof Token, true);
      assert.equal(args[2], md);
    });

    test("customElement", () => {
      const md = markdownIt().use(markdownItMathblock, {
        customElement: "my-el",
      });

      const src = "$$\nfoo\n$$";
      const res = md.render(src);

      assert.equal(res, "<my-el>foo</my-el>\n");
    });

    test("customElement no-attrs", () => {
      const md = markdownIt().use(markdownItMathblock, {
        customElement: ["my-el"],
      });

      const src = "$$\nfoo\n$$";
      const res = md.render(src);

      assert.equal(res, "<my-el>foo</my-el>\n");
    });

    test("customElement attrs", () => {
      const md = markdownIt().use(markdownItMathblock, {
        customElement: ["my-el", { class: "bar" }],
      });

      const src = "$$\nfoo\n$$";
      const res = md.render(src);

      assert.equal(res, '<my-el class="bar">foo</my-el>\n');
    });

    test("Custom <la-tex> automatically handles the preample info string", () => {
      const md = markdownIt().use(markdownItMathblock, {
        customElement: ["la-tex", { display: "block", macros: "persist" }],
      });

      const src = String.raw`# Document
$$ preample
\def\E{\mathbb{E}}
\newcommand\d[0]{\operatorname{d}\!}
$$

With block math:

$$
\E[X] = \int_{-\infty}^{\infty} xf(x) \d{x}
$$
`;
      const res = md.render(src);

      assert.equal(
        res,
        String.raw`<h1>Document</h1>
<la-tex-preample>\def\E{\mathbb{E}}
\newcommand\d[0]{\operatorname{d}\!}</la-tex-preample>
<p>With block math:</p>
<la-tex display="block" macros="persist">\E[X] = \int_{-\infty}^{\infty} xf(x) \d{x}</la-tex>
`,
      );
    });

    suite("Default renderer from custom element registry", () => {
      /**
       * @param {import("node:test").TestContext} t
       * @param {string} elementName
       */
      function mockCustomElementRegistry(t, elementName) {
        const restoreCustomElements = globalThis.customElements;
        t.before(() => {
          globalThis.customElements = {
            // @ts-ignore
            get(name) {
              if (name === elementName) {
                return {};
              }

              return undefined;
            },
          };
        });
        t.after(() => {
          globalThis.customElements = restoreCustomElements;
        });
      }
      test("<math-up>", (t) => {
        mockCustomElementRegistry(t, "math-up");
        const md = markdownIt().use(markdownItMathblock);
        const src = "$$\nfoo\n$$";
        const res = md.render(src);

        assert.equal(res, '<math-up display="block">foo</math-up>\n');
      });

      test("<la-tex>", (t) => {
        mockCustomElementRegistry(t, "la-tex");
        const md = markdownIt().use(markdownItMathblock);
        const src = "$$\nfoo\n$$";
        const res = md.render(src);

        assert.equal(res, '<la-tex display="block">foo</la-tex>\n');
      });

      test("<la-tex-preample> from the preample info string", (t) => {
        mockCustomElementRegistry(t, "la-tex");
        const md = markdownIt().use(markdownItMathblock);
        const src = "$$preample\nfoo\n$$";
        const res = md.render(src);

        assert.equal(res, "<la-tex-preample>foo</la-tex-preample>\n");
      });
    });
  });
});

suite("Commonmark", () => {
  // https://spec.commonmark.org/0.31.2/#fenced-code-blocks
  const md = markdownIt().use(markdownItMathblock);

  test("Example 119", () => {
    const src = `$$
<
 >
$$`;
    const res = md.render(src);

    assert.equal(res, mathblock("&lt;\n &gt;"));
  });

  test("Example 121", () => {
    const src = `$
foo
$`;
    const res = md.render(src);

    assert.equal(res, p("$\nfoo\n$"));
  });

  test("Example 124", () => {
    const src = `$$$$
aaa
$$$
$$$$$$`;
    const res = md.render(src);

    assert.equal(res, mathblock("aaa\n$$$"));
  });

  test("Example 126", () => {
    const src = `$$
`;
    const res = md.render(src);

    assert.equal(res, mathblock(""));
  });

  test("Example 127", () => {
    const src = `$$$$$
$$$
aaa`;
    const res = md.render(src);

    assert.equal(res, mathblock("$$$\naaa"));
  });

  test("Example 128", () => {
    const src = `> $$
> aaa

bbb`;
    const res = md.render(src);

    assert.equal(res, `${blockquote(mathblock("aaa"))}${p("bbb")}`);
  });

  test("Example 129", () => {
    const src = `$$

  
$$`;
    const res = md.render(src);

    assert.equal(res, mathblock("\n  "));
  });

  test("Example 130", () => {
    const src = `$$
$$`;
    const res = md.render(src);

    assert.equal(res, mathblock(""));
  });

  test("Example 131", () => {
    const src = ` $$
 aaa
aaa
$$`;
    const res = md.render(src);

    assert.equal(res, mathblock("aaa\naaa"));
  });

  test("Example 132", () => {
    const src = `  $$
aaa
  aaa
aaa
  $$`;
    const res = md.render(src);

    assert.equal(res, mathblock("aaa\naaa\naaa"));
  });

  test("Example 133", () => {
    const src = `   $$
   aaa
    aaa
  aaa
   $$`;
    const res = md.render(src);

    assert.equal(res, mathblock("aaa\n aaa\naaa"));
  });

  test("Example 134", () => {
    const src = `    $$
    aaa
    $$`;
    const res = md.render(src);

    assert.equal(res, pre("$$\naaa\n$$"));
  });

  test("Example 135", () => {
    const src = `$$
aaa
  $$`;
    const res = md.render(src);

    assert.equal(res, mathblock("aaa"));
  });

  test("Example 136", () => {
    const src = `   $$
aaa
   $$`;
    const res = md.render(src);

    assert.equal(res, mathblock("aaa"));
  });

  test("Example 137", () => {
    const src = `$$
aaa
    $$`;
    const res = md.render(src);

    assert.equal(res, mathblock("aaa\n    $$"));
  });

  test("Example 138", () => {
    const src = `$$ $$
aaa`;
    const res = md.render(src);

    assert.equal(res, p("$$ $$\naaa"));
  });

  test("Example 139", () => {
    const src = `$$$$$
aaa
$$$ $$`;
    const res = md.render(src);

    assert.equal(res, mathblock("aaa\n$$$ $$"));
  });

  test("Example 140", () => {
    const src = `foo
$$
bar
$$
baz`;
    const res = md.render(src);

    assert.equal(res, `${p("foo")}${mathblock("bar")}${p("baz")}`);
  });

  test("Example 141", () => {
    const src = `foo
---
$$
bar
$$
# baz`;
    const res = md.render(src);

    assert.equal(res, `<h2>foo</h2>\n${mathblock("bar")}<h1>baz</h1>\n`);
  });

  test("Example 142", () => {
    const src = String.raw`$$latex
sin x
$$`;
    const res = md.render(src);

    assert.equal(res, mathblock("sin x"));
  });

  test("Example 142 - custom renderer", () => {
    const md2 = markdownIt().use(markdownItMathblock, {
      renderer: optionalLatexRenderer,
    });

    assert.equal(
      md2.render("$$latex\n\\sin x\n$$"),
      '<la-tex display="block">\\sin x</la-tex>\n',
    );

    assert.equal(
      md2.render("$$\nsin x\n$$"),
      '<math-up display="block">sin x</math-up>\n',
    );
  });

  test("Example 143", () => {
    const src = `$$$$   latex decimal-mark="," +%@#~
sin x
$$$$$$$`;
    const res = md.render(src);

    assert.equal(res, mathblock("sin x"));
  });

  test("Example 144", () => {
    const src = `$$$$;
$$$$`;
    const res = md.render(src);

    assert.equal(res, mathblock(""));
  });

  test("Example 145", () => {
    const src = `$$$$ aa $$$$
foo`;
    const res = md.render(src);

    assert.equal(res, p("$$$$ aa $$$$\nfoo"));
  });

  test("Example 147", () => {
    const src = `$$
$$ latex
$$`;
    const res = md.render(src);

    assert.equal(res, mathblock("$$ latex"));
  });

  test("Extra: non-empty line with negative indent should stop the list", () => {
    const src = `- $$
 test
`;
    const res = md.render(src);

    assert.equal(res, `<ul>\n<li>\n${mathblock("")}</li>\n</ul>\n${p("test")}`);
  });
});
