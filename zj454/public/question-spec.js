import { geometryRules } from './geometry-rules.js?v=20261104-geometry-dimensions';

export const instructions = `你是台灣國小數學題目結構化轉換器。將使用者提供的一道題目（文字或截圖）忠實轉換為 JSON。最外層只能有 blocks 陣列，每個 block 只能有 type 與 value，type 僅允許 text、latex、svg、grid，value 必須是非空字串。保留題目數字、分數、單位、選項、附圖標示與所求；不納入原題號、手寫答案或批改記號，不產生解答或提示。排版依原圖閱讀順序輸出：同一行的文字與公式連續排列，不因切換 text／latex 區塊而換行。只在原圖明確換行或分段處，將換行字元放在相鄰 text 的 value 中，保留選項的分行、縮排及公式前後必要空格，不把每個公式改成獨立一行。分數保留上下堆疊，行內較大的分數可用 \\dfrac；獨立多行算式可用 aligned 等 LaTeX 環境保持對齊。規則矩形分格／塗色圖必須使用 grid 區塊，不得自由重畫成 svg。grid 的 value 是 JSON 字串，格式為 {"columns":2,"equalSize":true,"figures":[{"label":"甲","rows":4,"cols":6,"width":240,"height":160,"shaded":[[0,0],[1,1]]}]}。這只是格式示例，禁止照抄示例格數或座標；必須逐列依原圖辨識。rows 為列數，cols 為欄數，shaded 的 [列,欄] 從 0 起算；columns 是原圖每排圖數。width、height 為保持來源外框比例的顯示尺寸（40至400）；全等圖 equalSize=true 且每圖寬高一致，不能把各圖的小格強制畫成同樣大小。不能確認每格等面積或無法數清時回傳空 blocks。其他附圖保留原來的長寬比例、文字標示及相對位置，不把整段題文重畫成 SVG。latex 只放公式本體，不加數學定界符；SVG 使用 xmlns=http://www.w3.org/2000/svg 和 viewBox、基本幾何圖形與內嵌文字，不使用 script、外部內容、foreignObject 或事件。不得從示意圖外觀比例推定幾何關係。若圖片重要內容辨識不清、無法完整轉換，回傳空 blocks，不要猜測。
${geometryRules}`;

export const responseSchema = {
  type: "object", additionalProperties: false,
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["text", "latex", "svg"] },
          value: { type: "string" }
        },
        required: ["type", "value"]
      }
    }
  },
  required: ["blocks"]
};


export function validateBlocks(data) {
  if (!data || !Array.isArray(data.blocks) || data.blocks.length === 0 ||
      Object.keys(data).join() !== "blocks") {
    throw new Error("題目無法完整辨識，請確認圖片或題目內容。");
  }
  for (const b of data.blocks) {
    if (!b || !["text", "latex", "svg"].includes(b.type) ||
        typeof b.value !== "string" || !b.value.trim() ||
        Object.keys(b).sort().join() !== "type,value") {
      throw new Error("題目含有不合法的 JSON 區塊。");
    }
    if (b.type === "svg" && (!/<svg\b/i.test(b.value) ||
        !/xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(b.value) ||
        !/\bviewBox=["'][^"']+["']/i.test(b.value) ||
        /<\s*(script|foreignObject|image|use|style|animate|set)\b/i.test(b.value) ||
        /\bon[a-z]+\s*=/i.test(b.value) ||
        /\b(?:href|src)\s*=/i.test(b.value))) {
      throw new Error("SVG 不符合基本安全格式限制。");
    }
  }
  return data;
}

export const conversionSchema = structuredClone(responseSchema);
conversionSchema.properties.blocks.items.properties.type.enum.push("grid");
