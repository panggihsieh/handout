import assert from 'node:assert/strict';
import { validateSolution,solutionSchema,parseSolution } from '../zj454/public/solution-spec.js';
assert.equal(validateSolution({status:'solved',answer:' 12 × 3 = 36 枝 '}).answer,'12 × 3 = 36 枝');
assert.equal(validateSolution({status:'needs_review',answer:'高的數值不清楚，請提供清晰圖片。'}).status,'needs_review');
for(const data of [null,{status:'solved',answer:''},{status:'invented',answer:'1'},{status:'solved',answer:'1',key:'secret'}])assert.throws(()=>validateSolution(data));
assert.deepEqual(solutionSchema.required,['status','answer']);
const bs=String.fromCharCode(92);
const formula=bs+'('+bs+'frac{1}{2} '+bs+'times 6 = 3'+bs+')';
const broken='{"status":"solved","answer":"'+formula+'"}';
assert.throws(()=>JSON.parse(broken));
assert.equal(parseSolution(broken).answer,formula);
// Valid JSON can silently turn TeX commands into form feeds/tabs/backspaces.
for(const command of ['frac{3}{4}','text{公分}','begin{aligned}','right)','times 4','neq 2']){
  const answer=bs+command;
  assert.equal(parseSolution('{"status":"solved","answer":"'+answer+'"}').answer,answer);
}
const valid={status:'solved',answer:'步驟一\nNext line\t縮排 "引號" '+bs+'frac{1}{2} '+bs+bs+'[2pt]'};
assert.deepEqual(parseSolution(JSON.stringify(valid)),valid);
assert.deepEqual(parseSolution('```json\n'+JSON.stringify(valid)+'\n```'),valid);
assert.equal(parseSolution('{"status":"solved","answer":"'+bs+'u4e2d"}').answer,'中');
assert.throws(()=>parseSolution('{"status":"solved","answer":'),/無法解析/);
assert.throws(()=>parseSolution('{"status":"solved","answer":"1","extra":"2"}'),/格式不正確/);
console.log('AI solution validation, malformed TeX escapes, valid JSON preservation and schema rejection: passed');
