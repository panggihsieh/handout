import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
const PORT = Number(process.env.PORT || 5185);
app.use(express.json({ limit: "12mb" }));
app.use(express.static("public"));

const instructions = `你是台灣國小數學題目結構化轉換器。將使用者提供的一道題目（文字或截圖）忠實轉換為 JSON。最外層只能有 blocks 陣列，每個 block 只能有 type 與 value，type 僅允許 text、latex、svg，value 必須是非空字串。保留題目數字、分數、單位、選項、附圖標示與所求；不納入原題號、手寫答案或批改記號，不產生解答或提示。latex 只放公式本體，不加數學定界符；SVG 使用 xmlns=http://www.w3.org/2000/svg 和 viewBox、基本幾何圖形與內嵌文字，不使用 script、外部內容、foreignObject 或事件。不得從示意圖外觀比例推定幾何關係。若圖片重要內容辨識不清、無法完整轉換，回傳空 blocks，不要猜測。`;

const responseSchema = {
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

function validateBlocks(data) {
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

app.post("/api/convert", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY.startsWith("請填入")) {
      return res.status(503).json({ error: "尚未設定有效的 OPENAI_API_KEY。" });
    }
    const { text, image } = req.body ?? {};
    if ((!text || !String(text).trim()) && !image) {
      return res.status(400).json({ error: "請輸入題目文字或上傳圖片。" });
    }
    const content = [{ type: "input_text", text: String(text || "請忠實轉換圖片中的單一道數學題目。") }];
    if (image) {
      if (typeof image !== "string" ||
          !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(image)) {
        return res.status(400).json({ error: "圖片必須是 PNG、JPEG 或 WebP。" });
      }
      content.push({ type: "input_image", image_url: image, detail: "high" });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1",
      instructions,
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: "math_question", strict: true, schema: responseSchema } }
    });
    if (!response.output_text) throw new Error("AI 沒有傳回內容。");
    res.json(validateBlocks(JSON.parse(response.output_text)));
  } catch (err) {
    console.error(err);
    res.status(422).json({ error: err.message || "轉換失敗" });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`數學 JSON 模組：http://127.0.0.1:${PORT}`);
});
