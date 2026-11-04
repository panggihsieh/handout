// Convert a small, checked grid description into deterministic SVG.
const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function renderGridDiagram(value) {
  let data;
  try { data = JSON.parse(value); } catch { throw Error('分格圖資料無法解析，請核對原圖。'); }
  const fail = () => { throw Error('分格圖的列數、欄數或塗色座標不完整，請核對原圖。'); };
  if (!data || !Array.isArray(data.figures) || data.figures.length < 1 || data.figures.length > 12 ||
      !Number.isInteger(data.columns) || data.columns < 1 || data.columns > 4 ||
      typeof data.equalSize !== 'boolean') fail();
  const figures = data.figures;
  for (const f of figures) {
    if (!f || typeof f.label !== 'string' || f.label.length > 30 ||
        !Number.isInteger(f.rows) || f.rows < 1 || f.rows > 30 ||
        !Number.isInteger(f.cols) || f.cols < 1 || f.cols > 30 ||
        !Number.isFinite(f.width) || f.width < 40 || f.width > 400 ||
        !Number.isFinite(f.height) || f.height < 40 || f.height > 400 ||
        !Array.isArray(f.shaded) || f.shaded.length > f.rows * f.cols) fail();
    const used = new Set();
    for (const cell of f.shaded) {
      if (!Array.isArray(cell) || cell.length !== 2 || !Number.isInteger(cell[0]) || !Number.isInteger(cell[1]) ||
          cell[0] < 0 || cell[0] >= f.rows || cell[1] < 0 || cell[1] >= f.cols || used.has(cell.join(','))) fail();
      used.add(cell.join(','));
    }
    if (data.equalSize && (f.width !== figures[0].width || f.height !== figures[0].height)) {
      throw Error('全等分格圖的外框尺寸不一致，未套用圖形，請核對原圖。');
    }
  }
  const cellWidth = Math.max(...figures.map(f => f.width)) + 40;
  const cellHeight = Math.max(...figures.map(f => f.height)) + 65;
  const width = Math.min(data.columns, figures.length) * cellWidth;
  const height = Math.ceil(figures.length / data.columns) * cellHeight;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`];
  figures.forEach((f,i) => {
    const x = (i % data.columns) * cellWidth + 10, y = Math.floor(i / data.columns) * cellHeight + 40;
    const w = f.width / f.cols, h = f.height / f.rows;
    parts.push(`<text x="${x}" y="${y-12}" font-size="22">${escape(f.label)}</text>`);
    parts.push(`<rect x="${x}" y="${y}" width="${f.width}" height="${f.height}" fill="white"/>`);
    for (const [r,c] of f.shaded) parts.push(`<rect x="${x+c*w}" y="${y+r*h}" width="${w}" height="${h}" fill="#999"/>`);
    for (let c=1;c<f.cols;c++) parts.push(`<line x1="${x+c*w}" y1="${y}" x2="${x+c*w}" y2="${y+f.height}" stroke="black" stroke-width="1.5"/>`);
    for (let r=1;r<f.rows;r++) parts.push(`<line x1="${x}" y1="${y+r*h}" x2="${x+f.width}" y2="${y+r*h}" stroke="black" stroke-width="1.5"/>`);
    parts.push(`<rect x="${x}" y="${y}" width="${f.width}" height="${f.height}" fill="none" stroke="black" stroke-width="2"/>`);
  });
  return parts.join('') + '</svg>';
}
export function normalizeConvertedQuestion(data) {
  if (!data || !Array.isArray(data.blocks) || Object.keys(data).join() !== 'blocks') throw Error('轉換結果格式不正確。');
  return {blocks:data.blocks.map(b => b?.type === 'grid'
    ? (Object.keys(b).sort().join() === 'type,value' && typeof b.value === 'string'
      ? {type:'svg',value:renderGridDiagram(b.value)}
      : (()=>{throw Error('分格圖格式不正確。');})())
    : b)};
}
