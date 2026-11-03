import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../v4/app.js', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('function parseJsonWithRepair('), source.indexOf('function parseQuestionJson('));
const parse = vm.runInNewContext(`${helper}; parseJsonWithRepair`);
const expected = { blocks: [
  { type: 'text', value: '請問塗色部分是多少個圓？' },
  { type: 'latex', value: String.raw`\frac{1}{5}` },
  { type: 'svg', value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 310"><path d="M75 260 L280 260"/></svg>' },
] };
const canonical = JSON.stringify(expected, null, 2);
const check = (input) => assert.equal(JSON.stringify(parse(input)), JSON.stringify(expected));
check(canonical);
check('```json\n' + canonical + '\n```');
// 模擬使用者貼上的 HTML 空白、Markdown 行尾與過度跳脫。
const polluted = canonical
  .replace(/\n/g, '\\\n')
  .replace(/^ /gm, '&#x20;')
  .replace(/\\\\frac/g, '\\\\\\frac')
  .replace(/\\"/g, '\\\\"')
  .replace(/<svg/g, '\\<svg')
  .replace(/<\/svg>/g, '\\<\/svg>')
  .replace('http:', 'http\\:')
  .replace('www.', 'www\\.');
check(polluted);
// 原本合法的特殊字元與 LaTeX 換行完全保留。
const valid = JSON.stringify({ text: String.raw`&#x20; \\ \frac{1}{2} "` });
assert.equal(JSON.stringify(parse(valid)), valid);
assert.throws(() => parse('{"blocks":['), /自動修復後仍無法解析/);
console.log('JSON repair: all checks passed');
