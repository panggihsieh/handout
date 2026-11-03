import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../zj454/public/index.html',import.meta.url),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const elements=new Map(),timers=new Map();let timerId=0;
function element(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',dataset:{},disabled:false,hidden:true,events:{},addEventListener(name,fn){this.events[name]=fn;},removeAttribute(name){delete this[name];}});return elements.get(id);}
const context=vm.createContext({document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},window:{getMathApiSettings:()=>({provider:'fake'})},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),FileReader:class{}});
vm.runInContext(script,context);
// Render implementation is covered by the four-image browser test; isolate UI synchronization here.
vm.runInContext(`renderQuestion=data=>{if(!data.blocks?.length)throw Error('empty blocks');$('preview').textContent=data.blocks.map(b=>b.value).join('|');};`,context);
const input=id=>element(id).events.input();
const flush=()=>{for(const [id,fn]of timers){timers.delete(id);fn();}};
element('json').value=JSON.stringify({blocks:[{type:'text',value:'第一題'}]});input('json');flush();
assert.equal(element('preview').textContent,'第一題');assert.match(element('previewState').textContent,/同步/);
element('source').value='新的來源';input('source');assert.equal(element('preview').dataset.stale,'true');assert.match(element('jsonState').textContent,/待重新轉換/);
element('json').value='{broken';input('json');flush();assert.equal(element('preview').textContent,'第一題');assert.ok(element('copy').disabled);assert.match(element('previewState').textContent,/尚未更新/);
element('json').value=JSON.stringify({blocks:[{type:'text',value:'手動第二題'}]});input('json');flush();assert.equal(element('preview').textContent,'手動第二題');assert.match(element('previewState').textContent,/①仍待/);
element('sample').events.click();assert.match(element('source').value,/8 公分/);assert.equal(element('preview').dataset.stale,'false');assert.equal(element('imagePreview').hidden,true);
let finish;
context.window.convertMathQuestion=()=>new Promise(resolve=>finish=resolve);
const pending=element('convert').events.click();
element('source').value='請勿覆蓋';input('source');
finish({blocks:[{type:'text',value:'過期回覆'}]});await pending;
assert.equal(element('source').value,'請勿覆蓋');assert.ok(!element('json').value.includes('過期回覆'));assert.match(element('status').textContent,/未套用/);
console.log('Source stale state, live JSON rendering, invalid JSON preservation, sample synchronization and stale API results: passed');
