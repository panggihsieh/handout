import assert from 'node:assert/strict';
import { validateSolution,solutionSchema } from '../zj454/public/solution-spec.js';
assert.equal(validateSolution({status:'solved',answer:' 12 × 3 = 36 枝 '}).answer,'12 × 3 = 36 枝');
assert.equal(validateSolution({status:'needs_review',answer:'高的數值不清楚，請提供清晰圖片。'}).status,'needs_review');
for(const data of [null,{status:'solved',answer:''},{status:'invented',answer:'1'},{status:'solved',answer:'1',key:'secret'}])assert.throws(()=>validateSolution(data));
assert.deepEqual(solutionSchema.required,['status','answer']);
console.log('AI solution validation: passed');
