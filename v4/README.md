# Math's Scrapbook v.4.0 (JSON/SVG/LaTeX rendering test)

This is the standalone v4 browser app. Open `index.html` or serve the repository and visit `/v4/index.html`. The root app remains v3.1 until this branch is reviewed and merged.

Each question has a JSON paste button. Copy one of these JSON forms and click JSON, or click it and press Ctrl+V if clipboard access is blocked:

```json
{"latex":"\\frac{a}{b}+\\sqrt{x}"}
```

```json
{
  "blocks": [
    {"type":"text","value":"求圓的面積。"},
    {"type":"latex","value":"A=\\pi r^2"},
    {"type":"svg","value":"<svg viewBox='0 0 160 100'><circle cx='80' cy='50' r='35' fill='none' stroke='black'/></svg>"}
  ]
}
```

Accepted block types are `text`, `latex` (or `katex`), and `svg`. A single `{ "type": "latex", "value": "..." }`, an array of blocks, or an object with `text`, `latex`, and/or `svg` keys also works. LaTeX is rendered with KaTeX; SVG markup is filtered to safe drawing elements and displayed as an image. Raw scripts, external references, and HTML inside SVG are not supported. Invalid JSON leaves the existing question unchanged.
