import assert from 'node:assert/strict';
import { createVariant, validateVariant } from '../zj454/public/variant-spec.js';

// Intentionally distorted diagram: the labels, not pixel lengths, are facts.
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100"><rect x="10" y="10" width="240" height="40" fill="none" stroke="black"/><text x="80" y="8">8 公分</text><text x="260" y="30">5 公分</text></svg>';
const original={blocks:[{type:'text',value:'長方形長 8 公分、寬 5 公分，面積是多少？'},{type:'svg',value:svg}]};
const candidate={blocks:[{type:'text',value:'一張長 16 公分、寬 10 公分的長方形紙，求它的面積。'},{type:'svg',value:svg.replace('8 公分','16 公分').replace('5 公分','10 公分')}]};
const snapshot=JSON.stringify(original);let calls=[];
const mock=async(settings,input)=>{
  calls.push(input);
  return JSON.stringify(calls.length===1?candidate:{status:'verified',reason:'題型、比例及標示一致，已分別驗算。'});
};
assert.deepEqual(await createVariant({},original,mock),candidate);
assert.equal(calls.length,2);
assert.equal(JSON.stringify(original),snapshot);
assert.deepEqual(JSON.parse(calls[1].text),{original,candidate});
assert.ok(candidate.blocks[1].value.includes('width="240" height="40"'));
assert.equal((16*10)/(8*5),4); // A length multiplier of 2 scales area by 4.

assert.throws(()=>validateVariant(original,original),/更換數字/);
const onlyNumbers={blocks:[{type:'text',value:original.blocks[0].value.replace('8','16').replace('5','10')},candidate.blocks[1]]};
assert.deepEqual(validateVariant(original,onlyNumbers),onlyNumbers);
// A numeric-only change must reach review and may be accepted without a rewrite.
let simpleCalls=0;
assert.deepEqual(await createVariant({},original,async()=>JSON.stringify(++simpleCalls===1?onlyNumbers:{status:'verified',reason:'僅簡單換數，解法與難度不變。'})),onlyNumbers);
assert.equal(simpleCalls,2);
assert.throws(()=>validateVariant(original,{blocks:[onlyNumbers.blocks[0],original.blocks[1]]}),/舊標示/);
assert.throws(()=>validateVariant(original,{blocks:[candidate.blocks[0],{type:'svg',value:candidate.blocks[1].value.replace('width="240"','width="120"')}]}),/輪廓/);
let count=0;
await assert.rejects(createVariant({},original,async()=>JSON.stringify(++count===1?candidate:{status:'needs_review',reason:'條件有矛盾。'})),/檢核未通過/);
await assert.rejects(createVariant({},original,async()=>'{broken'),/JSON/);
await assert.rejects(createVariant({},original,async()=>JSON.stringify({blocks:[]})),/完整辨識/);
await assert.rejects(createVariant({},original,async()=>JSON.stringify({blocks:[candidate.blocks[0],{type:'svg',value:svg.replace('</svg>','<script>alert(1)</script></svg>')}]})),/安全/);
console.log('Variant generation/review, simple numeric-only changes, fixed SVG, original preservation and rejection paths: passed (mock only)');
