// Chinese adaptations of the linked public educational tasks, including subquestions.
// Diagrams are reconstructed from explicit givens, not copies of publisher artwork.
const os = n => `https://openstax.org/books/prealgebra-2e/pages/9-${n}-` + ({4:'use-properties-of-rectangles-triangles-and-trapezoids',5:'solve-geometry-applications-circles-and-irregular-figures',6:'solve-geometry-applications-volume-and-surface-area'}[n]);
const im = (path,id) => `https://tasks.illustrativemathematics.org/content-standards/${path}/tasks/${id}`;
const svg = content => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">${content}</svg>`;
const text = (x,y,value) => `<text x="${x}" y="${y}" font-size="18">${value}</text>`;
const rectangle = (a,b) => svg(`<rect x="50" y="50" width="${240}" height="${240*b/a}" fill="none" stroke="black" stroke-width="2"/>${text(100,35,a)}${text(305,100,b)}`);
const circle = label => svg(`<circle cx="190" cy="125" r="90" fill="none" stroke="black" stroke-width="2"/>${label.startsWith('d')?'<line x1="100" y1="125" x2="280" y2="125" stroke="black"/>':label.includes('r')?'<line x1="190" y1="125" x2="280" y2="125" stroke="black"/>':''}${text(190,110,label)}`);
const solid = (a,b,c) => {
 const k=Math.min(250/(a+b*.5),180/(c+b*.3)),w=a*k,d=b*k*.5,z=b*k*.3,h=c*k,x=55,y=45+z;
 return svg(`<path d="M${x} ${y}h${w}v${h}h${-w}ZM${x} ${y}l${d} ${-z}h${w}v${h}l${-d} ${z}M${x+w} ${y}l${d} ${-z}" fill="none" stroke="black" stroke-width="2"/>${text(x+w/2,y+h+24,a)}${text(x+w+d+5,y+h-z/2,b)}${text(10,y+h/2,c)}`);
};
export const geometryCases = [
 {id:'G01',part:'Task 881',source:im('NF/4/A/1',881),kind:'grid',text:'長方形分成 12 個等面積小格，其中 3 格塗色。塗色占整張的幾分之幾？',expected:'1/4',numbers:[.25],grid:{columns:1,equalSize:true,figures:[{label:'',rows:4,cols:3,width:180,height:160,shaded:[[0,0],[1,1],[2,2]]}]}},
 {id:'G02',part:'Task 743',source:im('NF/4/A/1',743),kind:'grid',text:'兩張全等長方形，甲塗 4 等份中的 3 份，乙塗 12 等份中的 9 份。兩張的塗色面積相等嗎？',expected:'相等，3/4＝9/12',numbers:[],grid:{columns:2,equalSize:true,figures:[{label:'甲',rows:1,cols:4,width:240,height:100,shaded:[[0,0],[0,1],[0,2]]},{label:'乙',rows:3,cols:4,width:240,height:100,shaded:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]]}]}},
 {id:'G03',part:'Task 1502 (a), (b) A',source:im('3/NF/A/3',1502),kind:'grid',text:'長方形由 6 個單位正方形組成，其中 1 格塗色。整張面積是多少平方單位？塗色占幾分之幾？',expected:'6 平方單位；1/6',numbers:[6],grid:{columns:1,equalSize:true,figures:[{label:'',rows:2,cols:3,width:180,height:120,shaded:[[0,0]]}]}},
 ...[2,3,.5].map((k,i)=>({id:`G0${i+4}`,part:`Task 1682 scale ${k}`,source:im('G/8/A/3',1682),kind:'scale',text:`三角形作 ${k} 倍的等比例縮放。底和高各變成幾倍？面積變成幾倍？角度有改變嗎？`,expected:`底高 ${k} 倍；面積 ${k*k} 倍；角度不變`,numbers:[k,k*k],diagram:svg('<polygon points="60,210 300,210 140,50" fill="none" stroke="black"/>')})),
 {id:'G07',part:'Example 9.27',source:os(4),kind:'rectangle',text:'長方形長 32 公尺、寬 20 公尺，求周長與面積。',expected:'104 公尺；640 平方公尺',numbers:[104,640],diagram:rectangle(32,20)},
 {id:'G08',part:'Example 9.31',source:os(4),kind:'rectangle',text:'長方形面積 168 平方英尺，長 14 英尺，寬是多少英尺？',expected:'12 英尺',numbers:[12],diagram:rectangle(14,12).replace('>12<','>？<')},
 {id:'G09',part:'Example 9.33',source:os(4),kind:'triangle',text:'三角形底 11 英寸，垂直高 8 英寸，求面積。',expected:'44 平方英寸',numbers:[44],diagram:svg('<polygon points="40,220 304,220 112,28" fill="none" stroke="black"/><path d="M112 28V220H124V208H112" fill="none" stroke="black"/>'+text(160,245,'11')+text(80,130,'8'))},
 {id:'G10',part:'Example 9.34',source:os(4),kind:'triangle',text:'三角形周長 24 英尺，其中兩邊長 4 英尺、9 英尺，第三邊多長？',expected:'11 英尺',numbers:[11],diagram:svg('<polygon points="40,220 304,220 101.09,145.94" fill="none" stroke="black"/>'+text(45,160,'4')+text(220,150,'9')+text(160,245,'？'))},
 {id:'G11',part:'Example 9.38',source:os(4),kind:'trapezoid',text:'梯形上底 11 英寸、下底 14 英寸、垂直高 6 英寸，求面積。',expected:'75 平方英寸',numbers:[75],diagram:svg('<polygon points="40,210 320,210 290,90 70,90" fill="none" stroke="black"/><path d="M70 90V210H82V198H70" fill="none" stroke="black"/>'+text(150,75,'11')+text(150,240,'14')+text(45,155,'6'))},
 {id:'G12',part:'Example 9.41',source:os(5),kind:'circle',text:'圓的半徑是 2.5 英尺，求圓周長及面積。π 取 3.14，不必再四捨五入。',expected:'15.7 英尺；19.625 平方英尺',numbers:[15.7,19.625],diagram:circle('r＝2.5')},
 {id:'G13',part:'Try It 9.84',source:os(5),kind:'circle',text:'圓的直徑是 12 英尺，圓周長是多少？π 取 3.14。',expected:'37.68 英尺',numbers:[37.68],diagram:circle('d＝12')},
 {id:'G14',part:'Example 9.43',source:os(5),kind:'circle',text:'圓周長 47.1 公分，求直徑。π 取 3.14。',expected:'15 公分',numbers:[15],diagram:circle('C＝47.1')},
 {id:'G15',part:'Example 9.47',source:os(6),kind:'solid',text:'長方體長 14 公分、寬 9 公分、高 17 公分，求體積和表面積。',expected:'2142 立方公分；1034 平方公分',numbers:[2142,1034],diagram:solid(14,9,17)},
 {id:'G16',part:'Example 9.48',source:os(6),kind:'solid',text:'長方體長 30 英寸、寬 25 英寸、高 20 英寸，求體積和表面積。',expected:'15000 立方英寸；3700 平方英寸',numbers:[15000,3700],diagram:solid(30,25,20)},
 {id:'G17',part:'Example 9.49',source:os(6),kind:'cube',text:'正方體每邊長 2.5 英寸，求體積和表面積。',expected:'15.625 立方英寸；37.5 平方英寸',numbers:[15.625,37.5],diagram:solid(2.5,2.5,2.5)},
 {id:'G18',part:'Example 9.50',source:os(6),kind:'cube',text:'正方體每邊長 2 英寸，求體積和表面積。',expected:'8 立方英寸；24 平方英寸',numbers:[8,24],diagram:solid(2,2,2)},
 {id:'G19',part:'Example 9.51',source:os(6),kind:'sphere',text:'球的半徑為 6 英寸，求體積和表面積。π 取 3.14。',expected:'904.32 立方英寸；452.16 平方英寸',numbers:[904.32,452.16],diagram:circle('球 r＝6')},
 {id:'G20',part:'Example 9.53',source:os(6),kind:'cylinder',text:'圓柱半徑 3 英寸、高 5 英寸，求體積和表面積。π 取 3.14。',expected:'141.3 立方英寸；150.72 平方英寸',numbers:[141.3,150.72],diagram:svg('<ellipse cx="170" cy="60" rx="90" ry="25" fill="none" stroke="black"/><path d="M80 60V210A90 25 0 0 0 260 210V60M170 60H260" fill="none" stroke="black"/>'+text(190,50,'r＝3')+text(275,145,'h＝5'))}
];
export const userGridCase = {id:'U01',text:'甲、乙、丙、丁是四張全等色紙，哪張的塗色面積與其他三張不同？',expected:'乙',grid:{columns:2,equalSize:true,figures:[
 {label:'甲',rows:4,cols:6,width:240,height:160,shaded:[[0,0],[0,5],[1,1],[1,4],[2,2],[2,3],[3,0],[3,3]]},
 {label:'乙',rows:2,cols:2,width:240,height:160,shaded:[[1,1]]},
 {label:'丙',rows:4,cols:3,width:240,height:160,shaded:[[0,0],[1,1],[2,2],[3,0]]},
 {label:'丁',rows:2,cols:3,width:240,height:160,shaded:[[0,0],[1,2]]}
]}};
