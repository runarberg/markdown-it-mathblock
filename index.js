// https://github.com/markdown-it/markdown-it/blob/master/lib/rules_block/fence.mjs

/**
 * @typedef {import("markdown-it").default} MarkdownIt
 * @typedef {import("markdown-it/lib/parser_block.mjs").RuleBlock} RuleBlock
 * @typedef {import("markdown-it/lib/rules_block/state_block.mjs").default} StateBlock
 * @typedef {import("markdown-it/lib/token.mjs").default} Token
 */

/**
 * @param {object} options
 * @param {number} options.minDelims
 * @returns {RuleBlock}
 */
function createRuler({ minDelims }) {
  return (state, startLine, endLine, silent) => {
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];

    // if it's indented more than 3 spaces, it should be a code block
    if (state.sCount[startLine] - state.blkIndent >= 4) {
      return false;
    }

    if (pos + minDelims > max) {
      return false;
    }

    const marker = state.src.at(pos);

    if (marker !== "$") {
      return false;
    }

    const markerCodePoint = marker.charCodeAt(0);

    // scan marker length
    let mem = pos;
    pos = state.skipChars(pos, markerCodePoint);

    let len = pos - mem;

    if (len < minDelims) {
      return false;
    }

    const markup = state.src.slice(mem, pos);
    const params = state.src.slice(pos, max);

    if (params.includes("$")) {
      return false;
    }

    // Since start is found, we can report success here in validation mode
    if (silent) {
      return true;
    }

    // search end of block
    let nextLine = startLine;
    let haveEndMarker = false;

    while (true) {
      nextLine += 1;

      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break;
      }

      pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];

      if (pos < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        // - ```
        //  test
        break;
      }

      if (state.src.at(pos) !== marker) {
        continue;
      }

      if (state.sCount[nextLine] - state.blkIndent >= 4) {
        // closing fence should be indented less than 4 spaces
        continue;
      }

      pos = state.skipChars(pos, markerCodePoint);

      // closing code fence must be at least as long as the opening one
      if (pos - mem < len) {
        continue;
      }

      // make sure tail has spaces only
      pos = state.skipSpaces(pos);

      if (pos < max) {
        continue;
      }

      haveEndMarker = true;
      // found!
      break;
    }

    // If a fence has heading spaces, they should be removed from its inner block
    len = state.sCount[startLine];

    state.line = nextLine + (haveEndMarker ? 1 : 0);

    const token = state.push("mathblock", "math", 0);
    token.info = params;
    token.content = state.getLines(startLine + 1, nextLine, len, false);
    token.markup = markup;
    token.map = [startLine, state.line];

    return true;
  };
}

/**
 * @typedef {string | [tag: string, attrs?: Record<string, string>]} CustomElementOption
 */

/**
 * @param {CustomElementOption} customElementOption
 * @param {MarkdownIt} md
 * @returns {CustomRenderer}
 */
function createCustomElementRenderer(customElementOption, md) {
  const { escapeHtml } = md.utils;

  /** @type {string} */
  let tag;
  /** @type {string} */
  let attrs = "";
  if (typeof customElementOption === "string") {
    tag = customElementOption;
  } else {
    const [tagName, attrsObj = {}] = customElementOption;
    tag = tagName;
    for (const [key, value] of Object.entries(attrsObj)) {
      attrs += ` ${key}="${escapeHtml(value)}"`;
    }
  }

  if (tag === "la-tex") {
    return (src, token) => {
      let latexTag = tag;
      let latexAttrs = attrs;

      // la-tex elements can contain a preample infostring.
      if (token.info.trim().split(/s+/).at(0)?.toLowerCase() === "preample") {
        latexTag += "-preample";
        latexAttrs = latexAttrs
          .replace(' display="block"', "")
          .replace(' macros="persist"', "");
      }

      return `<${latexTag}${latexAttrs}>${escapeHtml(src)}</${latexTag}>\n`;
    };
  }

  return (src) => `<${tag}${attrs}>${escapeHtml(src)}</${tag}>\n`;
}

/**
 * @param {MarkdownIt} md
 * @returns {CustomRenderer}
 */
function createDefaultRenderer(md) {
  if (globalThis.customElements) {
    // We are in a browser. See if we have some custom elements.
    if (globalThis.customElements.get("math-up")) {
      return createCustomElementRenderer(["math-up", { display: "block" }], md);
    }

    if (globalThis.customElements.get("la-tex")) {
      return createCustomElementRenderer(["la-tex", { display: "block" }], md);
    }
  }

  return createCustomElementRenderer(["div", { class: "math block" }], md);
}

/**
 * @typedef {(src: string, token: Token, md: MarkdownIt) => string} CustomRenderer
 * @typedef {object} PluginOptions
 * @property {number} [minDelims=2] - The minimum required number of delimiters for a mathblock.
 * @property {CustomRenderer} [renderer] - Custom renderer. Overwrites the `customElement` option.
 * @property {CustomElementOption} [customElement] - Render to a custom element.
 * @typedef {import("markdown-it").PluginWithOptions<PluginOptions>} Plugin
 */

/** @type {Plugin} */
export default function markdownItMathblock(
  md,
  {
    minDelims = 2,
    customElement,
    renderer = customElement
      ? createCustomElementRenderer(customElement, md)
      : createDefaultRenderer(md),
  } = {},
) {
  md.block.ruler.after("fence", "mathblock", createRuler({ minDelims }), {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  md.renderer.rules.mathblock = (tokens, idx) =>
    renderer(tokens[idx].content, tokens[idx], md);
}
