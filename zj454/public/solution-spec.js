export const solutionInstructions = `你是台灣國小數學教師。依題文、明確數字、單位、幾何記號解題並驗算。不可依示意圖比例推定數值，不可新增未提供的條件。圖片模糊、條件不足或矛盾時 status 必須為 needs_review 並在 answer 說明缺少條件，不可猜測答案。可解時 status 為 solved，answer 使用繁體中文簡潔列出必要計算、單位與最後答案；使用 Markdown 與 LaTeX（行內用 \\( \\)，獨立用 $$），不要 HTML。只輸出 JSON：{"status":"solved","answer":"計算與答案"}。優先用 3 至 6 行、150 字內呈現；必要時可延長，但不超過 1200 字。`;
export const solutionSchema = { type: 'object', additionalProperties: false, properties: { status: { type:'string',enum:['solved','needs_review'] }, answer: { type:'string' } }, required:['status','answer'] };
export function validateSolution(data) {
  if(!data || !['solved','needs_review'].includes(data.status) || typeof data.answer!=='string' || !data.answer.trim() || data.answer.length>6000 || Object.keys(data).sort().join()!=='answer,status') throw Error('AI 解答格式不正確，請重試。');
  return { status:data.status, answer:data.answer.trim() };
}
