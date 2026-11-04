import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import { callProvider, normalizeSettings } from "./providers.mjs";
import { probeProviderConnection } from "./public/connection-probe.js";

import { solutionInstructions, solutionSchema, parseSolution } from "./public/solution-spec.js";
import { createVariant } from "./public/variant-spec.js";

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

import { instructions, responseSchema, validateBlocks } from "./public/question-spec.js";

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

app.post("/api/variant", async (req,res) => {
  try {
    const {settings,question}=req.body??{};
    res.json(await createVariant(normalizeSettings(settings),question,callProvider));
  }catch(error){res.status(error.status||422).json({error:error.safeMessage||"類似題產生或檢核失敗，請確認原題條件與 API 設定後重試。"});}
});

app.post("/api/solve", async (req,res) => {
  try {
    const { settings,text,image } = req.body ?? {};
    const config=normalizeSettings(settings);
    if((typeof text!=='string'||!text.trim())&&!image) return res.status(400).json({error:"沒有可解答的題目。"});
    if(text && (typeof text!=='string'||text.length>50000)) return res.status(400).json({error:"題目文字過長。"});
    if(image && (typeof image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(image)||image.length>10*1024*1024)) return res.status(400).json({error:"圖片格式或大小不符合限制。"});
    const output=await callProvider(config,{text,image,instructions:solutionInstructions,schema:solutionSchema});
    res.json(parseSolution(output));
  }catch(error){res.status(error.status||422).json({error:error.safeMessage||"AI 解答失敗，請檢查 API 設定或題目內容。"});}
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
app.post('/api/probe', async (req, res) => {
  try { res.json(await probeProviderConnection(req.body?.settings)); }
  catch (error) { res.status(422).json({ error: error.message }); }
});

app.use((error, req, res, next) => {
  res.status(error.status === 413 ? 413 : 400).json({ error: error.status === 413 ? "請求過大，請縮小圖片。" : "請求不是有效的 JSON。" });
});

app.listen(PORT, "127.0.0.1", () => console.log(`數學 JSON 模組：http://127.0.0.1:${PORT}`));
