const $ = id => document.getElementById(id);
let offsetX=0,offsetY=0,drag=null;
function update(){
 const scale=Number($('overlayScale').value)/100;
 $('overlayLayer').style.transform=`translate(${offsetX}px,${offsetY}px) scale(${scale})`;
 $('overlayLayer').style.opacity=Number($('overlayOpacity').value)/100;
 $('overlayLayer').hidden=!$('overlayShowDrawing').checked;
 $('overlayOriginal').hidden=!$('overlayShowOriginal').checked;
 $('overlayLayer').style.mixBlendMode=$('overlayDifference').checked?'difference':'normal';
 $('overlayScaleValue').textContent=`${Math.round(scale*100)}%`;
 $('overlayOpacityValue').textContent=`${$('overlayOpacity').value}%`;
 $('overlayX').value=offsetX;$('overlayY').value=offsetY;
}
function reset(){offsetX=offsetY=0;$('overlayScale').value=100;$('overlayOpacity').value=50;$('overlayShowDrawing').checked=true;$('overlayShowOriginal').checked=true;$('overlayDifference').checked=false;update();}
$('compareOverlay').addEventListener('click',()=>{
 const source=$('imagePreview');
 if(source.hidden||!source.getAttribute('src')){$('status').textContent='疊圖比對需要先貼上或選擇原始截圖。';return;}
 $('render').click();
 if($('copy').disabled){$('status').textContent='請先修正 JSON，才能疊圖比對。';return;}
 const preview=$('preview'),copy=preview.cloneNode(true);copy.removeAttribute('id');copy.removeAttribute('data-stale');copy.className='overlay-copy';
 // Keep the actual preview layout; scale the entire layer uniformly.
 copy.style.width=preview.clientWidth+'px';copy.style.minHeight='0';
 $('overlayLayer').replaceChildren(copy);$('overlayOriginal').src=source.src;
 $('overlayStage').style.aspectRatio=`${source.naturalWidth||900}/${source.naturalHeight||650}`;
 $('overlayDialog').showModal();reset();
});
$('overlayClose').addEventListener('click',()=>$('overlayDialog').close());
$('overlayReset').addEventListener('click',reset);
for(const id of ['overlayScale','overlayOpacity','overlayShowDrawing','overlayShowOriginal','overlayDifference'])$(id).addEventListener('input',update);
for(const id of ['overlayX','overlayY'])$(id).addEventListener('input',()=>{offsetX=Number($('overlayX').value)||0;offsetY=Number($('overlayY').value)||0;update();});
$('overlayStage').addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,startX:offsetX,startY:offsetY};event.currentTarget.setPointerCapture(event.pointerId);});
$('overlayStage').addEventListener('pointermove',event=>{if(!drag)return;offsetX=Math.round(drag.startX+event.clientX-drag.x);offsetY=Math.round(drag.startY+event.clientY-drag.y);update();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('overlayStage').addEventListener(type,()=>drag=null);
$('overlayDialog').addEventListener('close',()=>{drag=null;$('overlayLayer').replaceChildren();$('overlayOriginal').removeAttribute('src');});
