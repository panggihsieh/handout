// Anytype renders inline formulas from $...$, without the source page's KaTeX CSS.
function escapeClipboardHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function clipboardFigure(svg) {
  const viewBox = svg.viewBox.baseVal;
  if (!(viewBox.width > 0 && viewBox.height > 0)) throw Error('附圖尺寸不正確。');
  const scale = Math.min(2, 1600 / viewBox.width, 1600 / viewBox.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewBox.width * scale));
  canvas.height = Math.max(1, Math.round(viewBox.height * scale));
  const image = new Image();
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  await image.decode();
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { src: canvas.toDataURL('image/png'), width: Math.min(viewBox.width, 600) };
}

async function buildPreviewClipboard(preview) {
  const clone = preview.cloneNode(true);
  if (!clone.childNodes.length) throw Error('請先渲染題目。');
  for (const math of clone.querySelectorAll('.katex')) {
    const source = math.querySelector('annotation[encoding="application/x-tex"]');
    if (!source) throw Error('無法取得公式原文，請重新渲染。');
    math.replaceWith(document.createTextNode('$' + source.textContent.trim() + '$'));
  }
  const html = [], text = [];
  let paragraph = '';
  const flush = () => {
    if (!paragraph) return;
    html.push('<p style="margin:0;white-space:pre-wrap">' + escapeClipboardHtml(paragraph).replace(/\r?\n/g, '<br>') + '</p>');
    paragraph = '';
  };
  for (const node of clone.childNodes) {
    const svg = node.querySelector?.('svg');
    if (svg) {
      flush();
      const figure = await clipboardFigure(svg);
      html.push('<p><img alt="題目附圖" width="' + figure.width + '" src="' + figure.src + '"></p>');
      text.push('\n[題目附圖]\n');
    } else {
      paragraph += node.textContent;
      text.push(node.textContent);
    }
  }
  flush();
  return { text: text.join(''), html: '<div style="font-family:Microsoft JhengHei,sans-serif;color:#000;font-size:19px;line-height:1.6">' + html.join('') + '</div>' };
}

function copyPreviewToClipboard(preview) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return Promise.reject(Error('此瀏覽器不支援排版複製，請使用新版 Chrome 或 Edge。'));
  }
  // Start the clipboard write during the click; image conversion may finish later.
  const payload = buildPreviewClipboard(preview);
  return navigator.clipboard.write([new ClipboardItem({
    'text/plain': payload.then(value => new Blob([value.text], { type: 'text/plain' })),
    'text/html': payload.then(value => new Blob([value.html], { type: 'text/html' })),
  })]);
}
