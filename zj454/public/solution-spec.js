import { geometryRules } from './geometry-rules.js?v=20261104-geometry';

export const solutionInstructions = `你是台灣國小數學教師。依題文、明確數字、單位、幾何記號解題並驗算。不可依示意圖比例推定數值，不可新增未提供的條件。圖片模糊、條件不足或矛盾時 status 必須為 needs_review 並在 answer 說明缺少條件，不可猜測答案。可解時 status 為 solved，answer 使用繁體中文簡潔列出必要計算、單位與最後答案；使用 Markdown 與 LaTeX（行內用 \\( \\)，獨立用 $$），不要 HTML。只輸出 JSON：{"status":"solved","answer":"計算與答案"}。可解時，最後一行必須以「答案：」開頭，只放最終結果與單位，其後不再加解釋；計算步驟放在前面。needs_review 時只說明待核對原因，不寫答案標籤。優先用 3 至 6 行、150 字內呈現；必要時可延長，但不超過 1200 字。
${geometryRules}`;
export const solutionSchema = { type: 'object', additionalProperties: false, properties: { status: { type:'string',enum:['solved','needs_review'] }, answer: { type:'string' } }, required:['status','answer'] };
// Repair TeX escapes only inside JSON strings. Preserve valid JSON escapes,
// including newlines and escaped backslashes used for aligned equations.
export function parseSolution(source) {
  const raw=String(source).trim().replace(/^```(?:json)?\s*\n?/i,'').replace(/\n?```$/,'').trim();
  const texCommands=/^(?:frac|tfrac|binom|begin|bar|boldsymbol|boxed|big|Big|bigg|Bigg|beta|backslash|text|textbf|textit|textrm|times|theta|tau|tan|tanh|to|tilde|top|triangle|right|rangle|rbrace|rfloor|rceil|rightarrow|rm|rule|ref|nu|ne|neq|nabla|not|neg|forall)$/;
  let fixed='',inString=false;
  for(let i=0;i<raw.length;i++){
    const char=raw[i];
    if(char==='"'){inString=!inString;fixed+=char;continue;}
    if(inString&&char==='\\'){
      const next=raw[i+1],command=raw.slice(i+1).match(/^[A-Za-z]+/)?.[0];
      const valid=/^["\\/bfnrt]$/.test(next??'')&&!texCommands.test(command??'');
      const unicode=next==='u'&&/^[0-9a-fA-F]{4}/.test(raw.slice(i+2,i+6));
      if(valid||unicode){fixed+=char+next;i++;}
      else fixed+='\\\\';
    }else fixed+=char;
  }
  let data;
  try{data=JSON.parse(fixed);}catch{throw Error('AI 解答 JSON 無法解析，請重試。');}
  return validateSolution(data);
}
export function validateSolution(data) {
  if(!data || !['solved','needs_review'].includes(data.status) || typeof data.answer!=='string' || !data.answer.trim() || data.answer.length>6000 || Object.keys(data).sort().join()!=='answer,status') throw Error('AI 解答格式不正確，請重試。');
  return { status:data.status, answer:data.answer.trim() };
}
