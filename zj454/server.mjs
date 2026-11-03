import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import { callProvider, normalizeSettings } from "./providers.mjs";

const app = express();
const PORT = Number(process.env.PORT || 5185);
// 僅允許本機頁面使用帶金鑰的 JSON 請求，避免跨網站呼叫或 DNS rebinding。
app.use((req, res, next) => {
  const hosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
  if (!hosts.has(req.headers.host)) return res.status(403).json({ error: "僅允許本機存取。" });
  if (req.path.startsWith("/api/") && req.method === "POST") {
    const origins = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`, "http://127.0.0.1:5184", "http://localhost:5184"]);
    if (!origins.has(req.headers.origin) || !req.is("application/json")) return res.status(403).json({ error: "請從本機模組頁面送出 JSON 請求。" });
  }
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "12mb" }));
app.use(express.static(fileURLToPath(new URL("./public", import.meta.url))));

import { instructions, responseSchema } from "./public/question-spec.js";

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
    const { text, image, settings } = req.body ?? {};
    const config = normalizeSettings(settings ?? { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL });
    if ((typeof text !== "string" || !text.trim()) && !image) return res.status(400).json({ error: "請輸入題目文字或上傳圖片。" });
    if (text && (typeof text !== "string" || text.length > 50000)) return res.status(400).json({ error: "題目文字過長或格式錯誤。" });
    if (image && (typeof image !== "string" || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(image) || image.length > 10 * 1024 * 1024)) return res.status(400).json({ error: "圖片必須是 7 MB 以下 PNG、JPEG 或 WebP。" });
    const output = await callProvider(config, { text, image, instructions, schema: responseSchema });
    res.json(validateBlocks(JSON.parse(output)));
  } catch (error) {
    // 不記錄或回傳供應商原始錯誤，避免金鑰或題目被寫入日誌。
    res.status(error.status || 422).json({ error: error.safeMessage || (error instanceof SyntaxError ? "模型未傳回有效 JSON，請重試。" : "轉換失敗：請確認 API 設定、額度與輸出格式。") });
  }
});

app.post("/api/test", async (req, res) => {
  try {
    const config = normalizeSettings(req.body?.settings);
    await callProvider(config, { text: "請只回答 OK。", test: true });
    res.json({ message: "連線與模型存取成功；截圖辨識品質請另外測試。" });
  } catch (error) {
    res.status(error.status || 422).json({ error: error.safeMessage || "連線失敗，請確認金鑰、模型與網路。" });
  }
});

app.use((error, req, res, next) => {
  res.status(error.status === 413 ? 413 : 400).json({ error: error.status === 413 ? "請求過大，請縮小圖片。" : "請求不是有效的 JSON。" });
});

app.listen(PORT, "127.0.0.1", () => console.log(`數學 JSON 模組：http://127.0.0.1:${PORT}`));
