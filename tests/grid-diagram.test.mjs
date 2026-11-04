import assert from 'node:assert/strict';
import {renderGridDiagram,normalizeConvertedQuestion} from '../zj454/public/grid-diagram.js';
import {geometryCases,userGridCase} from './geometry-cases.js';
import {validateBlocks} from '../zj454/public/question-spec.js';
assert.equal(geometryCases.length,20);
assert.equal(new Set(geometryCases.map(x=>x.id)).size,20);
for(const item of [...geometryCases,userGridCase]){
 assert.ok(item.text&&item.expected);
 if(item.source)assert.match(item.source,/^https:\/\/(?:openstax.org|tasks.illustrativemathematics.org)\//);
 const value=item.grid?renderGridDiagram(JSON.stringify(item.grid)):item.diagram;
 validateBlocks({blocks:[{type:'text',value:item.text},{type:'svg',value}]});
}
const grid=userGridCase.grid, output=renderGridDiagram(JSON.stringify(grid));
assert.deepEqual(grid.figures.map(f=>[f.rows*f.cols,f.shaded.length]),[[24,8],[4,1],[12,4],[6,2]]);
assert.equal((output.match(/stroke-width="2"/g)||[]).length,4,'Four complete outer borders');
assert.equal((output.match(/fill="#999"/g)||[]).length,15,'All shaded cells');
assert.equal((output.match(/<line /g)||[]).length,18,'All internal grid lines');
for(const mutation of [g=>g.figures[0].shaded.push([0,0]),g=>g.figures[0].shaded.push([4,0]),g=>g.figures[0].rows=0,g=>g.figures[1].width=120]){
 const broken=structuredClone(grid);mutation(broken);assert.throws(()=>renderGridDiagram(JSON.stringify(broken)));
}
assert.ok(!renderGridDiagram(JSON.stringify({...grid,figures:[{...grid.figures[0],label:'<script>'}]})).includes('<script>'));
assert.equal(normalizeConvertedQuestion({blocks:[{type:'grid',value:JSON.stringify(grid)}]}).blocks[0].type,'svg');
console.log('20 sourced geometry fixtures plus user grid: border/line/shading counts and malformed grid rejection passed. No AI calls.');
