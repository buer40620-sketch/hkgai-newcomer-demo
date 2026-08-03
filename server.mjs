import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 5173);
const REQUEST_LIMIT_BYTES = 1024 * 1024;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

loadLocalEnv();

function setApiCorsHeaders(req, res) {
  const origin = req.headers.origin || "";
  const allowed = (process.env.HKGAI_ALLOWED_ORIGINS || "http://localhost:5173,https://buer40620-sketch.github.io")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes("*") || allowed.includes(origin) ? origin || "*" : allowed[0] || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Vary", "Origin");
}

function loadLocalEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > REQUEST_LIMIT_BYTES) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}

function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    const error = new Error(`Missing environment variables: ${missing.join(", ")}`);
    error.code = "MISSING_ENV";
    error.missing = missing;
    throw error;
  }
}

function apiUrl(base, path) {
  const cleanBase = String(base || "").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanBase.endsWith("/v1") && cleanPath.startsWith("/v1/")) {
    return `${cleanBase}${cleanPath.slice(3)}`;
  }
  return `${cleanBase}${cleanPath}`;
}

async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw_text: text.slice(0, 1200) };
    }
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBinary(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.data = contentType.includes("json") ? JSON.parse(buffer.toString("utf8") || "{}") : buffer.toString("utf8").slice(0, 1200);
      throw error;
    }
    return { buffer, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

function textAuthHeaders() {
  return {
    "Authorization": `Bearer ${process.env.HKGAI_TEXT_API_KEY}`,
    "Content-Type": "application/json"
  };
}

function voiceAuthHeaders() {
  return {
    "Authorization": `Bearer ${process.env.HKGAI_VOICE_API_KEY}`,
    "Content-Type": "application/json"
  };
}

async function callModelhub(messages, extra = {}) {
  requireEnv(["HKGAI_TEXT_API_BASE", "HKGAI_TEXT_API_KEY", "HKGAI_TEXT_MODEL"]);
  const body = {
    model: process.env.HKGAI_TEXT_MODEL,
    messages,
    stream: false,
    temperature: 0.2,
    ...extra
  };
  return fetchJson(apiUrl(process.env.HKGAI_TEXT_API_BASE, "/v1/chat/completions"), {
    method: "POST",
    headers: textAuthHeaders(),
    body: JSON.stringify(body)
  });
}

function parseJsonFromModel(data) {
  const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.delta?.content || "";
  if (typeof content !== "string" || !content.trim()) throw new Error("EMPTY_MODEL_CONTENT");
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("MODEL_JSON_NOT_FOUND");
    return JSON.parse(match[0]);
  }
}

function normalizeInference(inferred, profile) {
  return {
    user_group: inferred.user_group || profile.user_group || "内地来港读研学生",
    arrival_stage: inferred.arrival_stage || profile.arrival_stage || "抵港前",
    main_blocker: inferred.main_blocker || "第一月任务顺序",
    intent_tags: Array.isArray(inferred.intent_tags) ? inferred.intent_tags.slice(0, 8) : ["first_month_plan"],
    summary: inferred.summary || "已通过 HKGAI Modelhub 解析为结构化画像。"
  };
}

async function handleModels(req, res) {
  if (req.method !== "GET") return sendText(res, 405, "Method not allowed");
  requireEnv(["HKGAI_TEXT_API_BASE", "HKGAI_TEXT_API_KEY"]);
  const data = await fetchJson(apiUrl(process.env.HKGAI_TEXT_API_BASE, "/v1/models"), {
    method: "GET",
    headers: { "Authorization": `Bearer ${process.env.HKGAI_TEXT_API_KEY}` }
  });
  sendJson(res, 200, { models: data?.data || data?.models || data });
}

async function handleProfileInput(req, res) {
  if (req.method !== "POST") return sendText(res, 405, "Method not allowed");
  const { profile = {} } = await readJsonBody(req);
  const messages = [
    {
      role: "system",
      content: [
        "你是港话通 Demo 的结构化输入解析器。",
        "只返回 JSON，不要 Markdown。",
        "字段必须是 user_group, arrival_stage, main_blocker, intent_tags, summary。",
        "user_group 只能从：内地来港读研学生、新移民 / 来港家庭、高才通 / 专才、我帮家人办理 中选择。",
        "arrival_stage 只能从：抵港前、刚抵港、抵港第一周、第一月 中选择。",
        "不要做法律、医疗、移民、银行或政府资格判断。"
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify({ input: profile.input || "", fallback_profile: profile }, null, 2)
    }
  ];
  const modelData = await callModelhub(messages);
  const inferred = normalizeInference(parseJsonFromModel(modelData), profile);
  sendJson(res, 200, { inferred });
}

async function handlePolishQuestions(req, res) {
  if (req.method !== "POST") return sendText(res, 405, "Method not allowed");
  const { questions = [], context = {} } = await readJsonBody(req);
  const compactQuestions = questions.map((item, index) => ({ index, title: item.title, text: item.text }));
  const messages = [
    {
      role: "system",
      content: [
        "你是港话通 Demo 的咨询问题润色器。",
        "只返回 JSON，不要 Markdown。",
        "返回格式：{\"questions\":[{\"text\":\"...\",\"rewrite_notes\":[\"...\"]}]}。",
        "只改表达和上下文补齐，不改变事实判断，不删除官方确认边界。",
        "必须保留：以机构最新要求为准；如果不是对方负责，请告知应联系哪个入口。"
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify({ context, questions: compactQuestions }, null, 2)
    }
  ];
  const modelData = await callModelhub(messages);
  const parsed = parseJsonFromModel(modelData);
  const polished = Array.isArray(parsed.questions) ? parsed.questions : [];
  sendJson(res, 200, {
    questions: questions.map((question, index) => ({
      original_text: question.text,
      text: polished[index]?.text || question.text,
      rewrite_notes: Array.isArray(polished[index]?.rewrite_notes) ? polished[index].rewrite_notes : ["已通过 HKGAI Modelhub 润色表达。"]
    }))
  });
}

async function handleVoiceTts(req, res) {
  if (req.method !== "POST") return sendText(res, 405, "Method not allowed");
  requireEnv(["HKGAI_VOICE_API_BASE", "HKGAI_VOICE_API_KEY", "HKGAI_VOICE_MODEL"]);
  const { text = "", language = "cantonese", voice = "female" } = await readJsonBody(req);
  const cleanText = String(text).trim().slice(0, 120);
  if (!cleanText) return sendJson(res, 400, { error: "EMPTY_TTS_TEXT", message: "缺少需要朗读的文本。" });

  const data = await fetchBinary(apiUrl(process.env.HKGAI_VOICE_API_BASE, "/server_proxy/api/v1/audio/speech"), {
    method: "POST",
    headers: voiceAuthHeaders(),
    body: JSON.stringify({
      model_name: process.env.HKGAI_VOICE_MODEL,
      input: cleanText,
      language,
      voice,
      type: "file",
      response_format: "wav"
    })
  });

  res.writeHead(200, {
    "Content-Type": data.contentType.includes("audio") ? data.contentType : "audio/wav",
    "Cache-Control": "no-store",
    "X-HKGAI-Provider": "openspeech-tts"
  });
  res.end(data.buffer);
}
function toolHeaders() {
  return {
    "Content-Type": "application/json",
    "App-Name": process.env.HKGAI_TOOL_APP_NAME,
    "App-Key": process.env.HKGAI_TOOL_APP_KEY
  };
}

async function callToolhub(path, payload) {
  requireEnv(["HKGAI_TOOL_API_BASE", "HKGAI_TOOL_APP_NAME", "HKGAI_TOOL_APP_KEY"]);
  return fetchJson(apiUrl(process.env.HKGAI_TOOL_API_BASE, path), {
    method: "POST",
    headers: toolHeaders(),
    body: JSON.stringify(payload)
  }, 12000);
}

async function callToolhubTrafficWeather() {
  const weather = await callToolhub("/v1/weather", { location: "Hong Kong", language: "zh-HK" });
  const route = await callToolhub("/v1/transport/route", {
    origin: "Hong Kong International Airport",
    destination: "HKUST",
    mode: "transit",
    language: "zh-HK",
    fare_type: "adult"
  });
  return { weather, route };
}

function summarizeWeather(data) {
  const current = data?.data?.current || data?.current || {};
  const location = data?.data?.location || data?.location || {};
  const text = current.text_tc || current.text_en || current.text || "天气数据已返回";
  const temp = typeof current.temperature === "number" ? `${current.temperature}°C` : "温度待查";
  const humidity = typeof current.humidity === "number" ? `湿度 ${current.humidity}%` : "湿度待查";
  return `${location.name_tc || location.name_en || "香港"}当前天气：${text}，${temp}，${humidity}。以香港天文台和 Toolhub 返回为准。`;
}

function summarizeRoute(data) {
  const payload = data?.data || data || {};
  const first = Array.isArray(payload.results) ? payload.results[0] : null;
  if (!first) return "Toolhub 已返回路线查询结果；现场仍建议打开 HKeMobility 复核最新安排。";
  const duration = first.duration_text || first.duration || (typeof first.duration_seconds === "number" ? `约 ${Math.round(first.duration_seconds / 60)} 分钟` : null);
  const fareAmount = first.fare?.amount ?? first.fare;
  const fareCurrency = first.fare?.currency || "HKD";
  const fare = typeof fareAmount === "number" ? `${fareCurrency} ${fareAmount}` : first.fare_text || first.price || null;
  const parts = ["机场到 HKUST 的 Toolhub 路线已返回"];
  if (duration) parts.push(`预计时间 ${duration}`);
  if (fare) parts.push(`参考票价 ${fare}`);
  return `${parts.join("，")}。临场交通安排仍以 HKeMobility / 运营商公告为准。`;
}

async function handleTrafficWeather(req, res) {
  if (req.method !== "POST") return sendText(res, 405, "Method not allowed");
  await readJsonBody(req);
  const live = await callToolhubTrafficWeather();
  sendJson(res, 200, {
    toolhub_calls: ["weather_query", "transport_route"],
    snapshot: {
      route_summary: summarizeRoute(live.route),
      weather_note: summarizeWeather(live.weather),
      payment_note: "票价、优惠和支付规则以八达通和交通运营方官方渠道为准。",
      official_links: ["Toolhub /v1/weather", "Toolhub /v1/transport/route", "香港天文台", "HKeMobility", "八达通"]
    },
    debug: { weather_path: "/v1/weather", route_path: "/v1/transport/route" }
  });
}

function agentBaseUrl() {
  return process.env.HKGAI_AGENT_API_BASE || "https://search-agent.prod.hkchat.app/v1";
}

async function callAgenthubSearch(query) {
  requireEnv(["HKGAI_TOOL_APP_NAME", "HKGAI_TOOL_APP_KEY"]);
  return fetchJson(apiUrl(agentBaseUrl(), "/tool/search-agent"), {
    method: "POST",
    headers: toolHeaders(),
    body: JSON.stringify({ query })
  }, 18000);
}

function summarizeAgenthubSearch(data) {
  const payload = data?.data || data || {};
  const content = typeof payload.content === "string" ? payload.content : JSON.stringify(payload).slice(0, 3000);
  const sources = extractAgenthubSources(content);
  const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    raw_summary: plain.slice(0, 1200),
    summary: plain.slice(0, 360) || "Agenthub 已返回搜索结果。",
    sources
  };
}

function extractAgenthubSources(content) {
  const sources = [];
  const addSource = (url, title) => {
    if (!url || !/^https?:\/\//i.test(url)) return;
    const normalized = url.replace(/[),.，。]+$/, "");
    if (sources.some((item) => item.url === normalized)) return;
    sources.push({ url: normalized, title: (title || normalized).replace(/\s+/g, " ").trim() });
  };

  for (const match of content.matchAll(/<source[^>]*url=['"]([^'"]+)['"][^>]*title=['"]([^'"]+)['"]/g)) addSource(match[1], match[2]);
  for (const match of content.matchAll(/\[([^\]]{2,120})\]\((https?:\/\/[^\s)]+)\)/g)) addSource(match[2], match[1]);
  for (const match of content.matchAll(/"title"\s*:\s*"([^"]{2,120})"[\s\S]{0,160}?"url"\s*:\s*"(https?:\/\/[^"]+)"/g)) addSource(match[2], match[1]);
  for (const match of content.matchAll(/"url"\s*:\s*"(https?:\/\/[^"]+)"[\s\S]{0,160}?"title"\s*:\s*"([^"]{2,120})"/g)) addSource(match[1], match[2]);
  for (const match of content.matchAll(/https?:\/\/[^\s<>'")]+/g)) addSource(match[0], match[0]);

  return sources.slice(0, 4);
}

function buildAgenthubQuery(task) {
  const title = task?.title || "香港新来港办事";
  const channels = Array.isArray(task?.fallback_channels) ? task.fallback_channels.join(" ") : "";
  const base = `${title} ${channels} 香港 官方 来源`;
  const category = task?.category || "general";
  const categoryTerms = {
    telecom: "储值电话卡 实名登记 OFCA 运营商 短信 验证码",
    transport: "HKeMobility 香港天文台 八达通 机场 路线 天气 官方",
    bank_medical: "银行开户 医管局 HA Go IFSC HAD 新来港服务 官方",
    housing_materials: "学校 注册 住址证明 地址材料 银行 政府 1823 官方",
    entry_documents: "入境处 HKID 1823 证件 入境 材料 官方",
    rental_scam: "18222 反诈骗 警方 租房 押金 官方",
    family_services: "1823 IFSC HAD 新来港服务 家庭 社区 官方"
  };
  return `${base} ${categoryTerms[category] || "政府 机构 查询 入口"}`.replace(/\s+/g, " ").trim();
}

async function localizeAgenthubSummary(agentSummary, taskTitle) {
  const fallback = `Agenthub 已围绕“${taskTitle}”返回联网来源线索。请只把这些结果当作补充查证入口，最终仍以项目内已入库的官方/机构来源和目标机构回复为准。`;
  if (!agentSummary.raw_summary) return fallback;
  try {
    const modelData = await callModelhub([
      {
        role: "system",
        content: [
          "你是港话通 Demo 的来源摘要整理器。",
          "只返回 JSON，不要 Markdown。",
          "字段必须是 summary。",
          "请用简体中文输出，最多 120 字。",
          "不要新增事实，不要下结论，不要把搜索结果说成官方确认。",
          "必须保留边界：联网搜索只是补充线索，最终以官方/机构来源和目标机构确认为准。"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify({ taskTitle, raw_search_text: agentSummary.raw_summary }, null, 2)
      }
    ], { temperature: 0.1 });
    const parsed = parseJsonFromModel(modelData);
    return typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : fallback;
  } catch {
    return fallback;
  }
}

async function handleAgenthubSourceCheck(req, res) {
  if (req.method !== "POST") return sendText(res, 405, "Method not allowed");
  const body = await readJsonBody(req);
  const task = body.task || { title: body.taskTitle || "香港新来港办事", category: "general" };
  const query = buildAgenthubQuery(task);
  const data = await callAgenthubSearch(query);
  const summary = summarizeAgenthubSearch(data);
  const chineseSummary = await localizeAgenthubSummary(summary, task.title || query);
  sendJson(res, 200, {
    agenthub_calls: ["search-agent", "modelhub-chinese-summary"],
    query,
    summary: chineseSummary,
    sources: summary.sources,
    boundary: summary.sources.length
      ? "Agenthub 只作为联网来源补充线索；最终仍以已入库官方/机构来源和目标机构确认结果为准。"
      : "Agenthub 已返回文本线索，但未抽取到可直接展示的新链接；最终仍以已入库官方/机构来源和目标机构确认结果为准。"
  });
}
async function handleApi(req, res, url) {
  try {
    if (url.pathname === "/api/hkgai/models") return await handleModels(req, res);
    if (url.pathname === "/api/hkgai/profile-input") return await handleProfileInput(req, res);
    if (url.pathname === "/api/hkgai/polish-questions") return await handlePolishQuestions(req, res);
    if (url.pathname === "/api/hkgai/voice/tts") return await handleVoiceTts(req, res);
    if (url.pathname === "/api/hkgai/toolhub/traffic-weather") return await handleTrafficWeather(req, res);
    if (url.pathname === "/api/hkgai/agenthub/source-check") return await handleAgenthubSourceCheck(req, res);
    return sendText(res, 404, "API route not found");
  } catch (error) {
    const status = error.code === "MISSING_ENV" ? 500 : error.message === "REQUEST_TOO_LARGE" ? 413 : 502;
    sendJson(res, status, {
      error: error.code || error.message || "API_PROXY_ERROR",
      message: error.code === "MISSING_ENV" ? "后端代理缺少环境变量。" : "后端代理调用失败。",
      missing: error.missing || undefined,
      details: error.details || undefined
    });
  }
}

async function handleStatic(req, res, url) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = normalize(join(root, pathname));

  if (!target.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const body = await readFile(target);
  res.writeHead(200, {
    "Content-Type": contentTypes[extname(target)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  try {
    if (url.pathname.startsWith("/api/hkgai/")) {
      setApiCorsHeaders(req, res);
      if (req.method === "OPTIONS") {
        res.writeHead(204, { "Cache-Control": "no-store" });
        res.end();
        return;
      }
      if (url.pathname === "/api/hkgai/health") {
        return sendJson(res, 200, {
          ok: true,
          service: "hkgai-newcomer-demo-proxy",
          configured: {
            text: Boolean(process.env.HKGAI_TEXT_API_BASE && process.env.HKGAI_TEXT_API_KEY && process.env.HKGAI_TEXT_MODEL),
            voice: Boolean(process.env.HKGAI_VOICE_API_BASE && process.env.HKGAI_VOICE_API_KEY && process.env.HKGAI_VOICE_MODEL),
            toolhub: Boolean(process.env.HKGAI_TOOL_API_BASE && process.env.HKGAI_TOOL_APP_NAME && process.env.HKGAI_TOOL_APP_KEY),
            agenthub: Boolean(process.env.HKGAI_TOOL_APP_NAME && process.env.HKGAI_TOOL_APP_KEY)
          }
        });
      }
      return await handleApi(req, res, url);
    }
    return await handleStatic(req, res, url);
  } catch {
    sendText(res, 404, "Not found");
  }
}).listen(port, () => {
  console.log(`港话通 Demo running at http://localhost:${port}`);
});




