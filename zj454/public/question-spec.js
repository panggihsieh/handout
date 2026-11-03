export const instructions = `你是台灣國小數學題目結構化轉換器。將使用者提供的一道題目（文字或截圖）忠實轉換為 JSON。最外層只能有 blocks 陣列，每個 block 只能有 type 與 value，type 僅允許 text、latex、svg，value 必須是非空字串。保留題目數字、分數、單位、選項、附圖標示與所求；不納入原題號、手寫答案或批改記號，不產生解答或提示。latex 只放公式本體，不加數學定界符；SVG 使用 xmlns=http://www.w3.org/2000/svg 和 viewBox、基本幾何圖形與內嵌文字，不使用 script、外部內容、foreignObject 或事件。不得從示意圖外觀比例推定幾何關係。若圖片重要內容辨識不清、無法完整轉換，回傳空 blocks，不要猜測。`;

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

