const DEFAULT_TIMEOUT_MS = 2500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getProxyBase() {
  return (globalThis.window?.HKGAI_API_PROXY_BASE || "").replace(/\/$/, "");
}

async function callProxy(endpoint, payload) {
  const proxyBase = getProxyBase();
  if (!proxyBase) {
    return { ok: false, reason: "未配置后端代理；当前使用本地 fallback。" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${proxyBase}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      return { ok: false, reason: `后端代理返回 ${response.status}；已回退到本地 fallback。` };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    const reason = error?.name === "AbortError" ? "后端代理超时" : "后端代理调用失败";
    return { ok: false, reason: `${reason}；已回退到本地 fallback。` };
  } finally {
    clearTimeout(timeout);
  }
}

export async function enhanceProfileInput(profile) {
  const proxyResult = await callProxy("/api/hkgai/profile-input", { profile });
  if (proxyResult.ok && proxyResult.data?.inferred) {
    return {
      mode: "live_api",
      provider: "hkgai-modelhub-proxy",
      used_live_api: true,
      safe_to_continue: true,
      fallback_checks: [],
      reason: "已通过后端代理调用 HKGAI Modelhub。API Key 未暴露给前端。",
      inferred: normalizeProfileInference(proxyResult.data.inferred, profile)
    };
  }

  await sleep(420);
  return buildProfileFallback(profile, proxyResult.reason);
}

export async function queryTravelToolhub(context) {
  const proxyResult = await callProxy("/api/hkgai/toolhub/traffic-weather", { context });
  if (proxyResult.ok && proxyResult.data?.snapshot) {
    return normalizeToolhubResult({
      mode: "live_api",
      provider: "toolhub-proxy",
      used_live_api: true,
      safe_to_continue: true,
      fallback_checks: [],
      reason: "已通过后端代理调用交通 / 天气 ToolHub；前端没有暴露 API Key。",
      ...proxyResult.data
    });
  }

  await sleep(360);
  return normalizeToolhubResult({
    mode: "mock_fallback",
    provider: "local-toolhub-adapter",
    used_live_api: false,
    safe_to_continue: true,
    fallback_checks: buildFallbackChecks(proxyResult.reason),
    reason: proxyResult.reason,
    toolhub_calls: ["transport_route", "transit_fare", "weather_query"],
    snapshot: {
      route_summary: "当前无 ToolHub 凭证，先保留官方入口：HKeMobility / 香港天文台 / 八达通。",
      weather_note: "出发前查看天气警告；台风、暴雨和极端天气以香港天文台实时公告为准。",
      payment_note: "准备八达通或移动支付；票价、优惠和实名规则以官方渠道为准。",
      official_links: ["HKeMobility", "香港天文台", "八达通"]
    }
  });
}

export async function polishConsultationQuestions(questions, context) {
  const proxyResult = await callProxy("/api/hkgai/polish-questions", { questions, context });
  if (proxyResult.ok && Array.isArray(proxyResult.data?.questions)) {
    return {
      mode: "live_api",
      provider: "hkgai-modelhub-proxy",
      used_live_api: true,
      safe_to_continue: true,
      fallback_checks: [],
      reason: "已通过后端代理调用 HKGAI Modelhub 润色问题；材料边界和最终确认方仍由本地规则保留。",
      questions: proxyResult.data.questions.map((item, index) => ({
        ...questions[index],
        ...item
      }))
    };
  }

  await sleep(420);
  return buildQuestionFallback(questions, context, proxyResult.reason);
}

function buildProfileFallback(profile, reason) {
  const input = profile.input || "";
  const inferred = normalizeProfileInference(
    {
      user_group: inferUserGroup(input, profile.user_group),
      arrival_stage: inferArrivalStage(input, profile.arrival_stage),
      main_blocker: inferMainBlocker(input),
      intent_tags: inferTags(input),
      summary: "已把自然语言输入拆成本地结构化画像：身份、抵港阶段、主要卡点和任务意图。当前是 mock fallback；后续有后端代理后可替换为 HKGAI Modelhub 返回。"
    },
    profile
  );

  return {
    mode: "mock_fallback",
    provider: "local-api-adapter",
    used_live_api: false,
    safe_to_continue: true,
    fallback_checks: buildFallbackChecks(reason),
    reason,
    inferred
  };
}

function buildQuestionFallback(questions, context, reason) {
  return {
    mode: "mock_fallback",
    provider: "local-api-adapter",
    used_live_api: false,
    safe_to_continue: true,
    fallback_checks: buildFallbackChecks(reason),
    reason,
    questions: questions.map((question) => {
      const originalText = question.text;
      return {
        ...question,
        original_text: originalText,
        text: [
          "【可直接发送】",
          "您好，我想确认以下事项，避免理解错材料要求。",
          "",
          originalText,
          "",
          `我的当前情况：${context.phaseText}；住处状态：${context.livingText}。`,
          "请以贵机构最新要求为准；如果这不是贵机构负责，也请告知我应该联系哪个入口。"
        ].join("\n"),
        rewrite_notes: [
          "补上礼貌开场，降低直接质问感",
          "加入当前阶段和住处状态，减少对方来回追问",
          "保留“以机构最新要求为准”，不让 AI 替官方下结论"
        ]
      };
    })
  };
}

function normalizeToolhubResult(result) {
  return {
    mode: result.mode || "mock_fallback",
    provider: result.provider || "local-toolhub-adapter",
    used_live_api: Boolean(result.used_live_api),
    safe_to_continue: result.safe_to_continue !== false,
    fallback_checks: Array.isArray(result.fallback_checks) ? result.fallback_checks : [],
    reason: result.reason || "交通 / 天气增强位已返回。",
    toolhub_calls: Array.isArray(result.toolhub_calls) && result.toolhub_calls.length
      ? result.toolhub_calls
      : ["transport_route", "transit_fare", "weather_query"],
    snapshot: {
      route_summary: result.snapshot?.route_summary || "以 HKeMobility / 官方公告为准。",
      weather_note: result.snapshot?.weather_note || "以香港天文台实时天气警告为准。",
      payment_note: result.snapshot?.payment_note || "以八达通和交通运营方官方渠道为准。",
      official_links: Array.isArray(result.snapshot?.official_links) && result.snapshot.official_links.length
        ? result.snapshot.official_links
        : ["HKeMobility", "香港天文台", "八达通"]
    }
  };
}

function buildFallbackChecks(reason) {
  const checks = [
    "前端没有保存或暴露 API Key",
    "真实 API 不可用时使用本地规则和模板",
    "P0 -> P5 -> P1 主流程继续可运行"
  ];
  if (reason.includes("超时")) checks.unshift("后端代理超时已被捕获");
  if (reason.includes("返回")) checks.unshift("后端代理错误状态已被捕获");
  if (reason.includes("未配置")) checks.unshift("未配置后端代理已被识别");
  if (reason.includes("调用失败")) checks.unshift("后端代理调用失败已被捕获");
  return checks;
}

function normalizeProfileInference(inferred, profile) {
  return {
    user_group: inferred.user_group || profile.user_group,
    arrival_stage: inferred.arrival_stage || profile.arrival_stage,
    main_blocker: inferred.main_blocker || "第一月任务顺序",
    intent_tags: Array.isArray(inferred.intent_tags) && inferred.intent_tags.length ? inferred.intent_tags : ["first_month_plan"],
    summary: inferred.summary || "已生成结构化画像。"
  };
}

function inferUserGroup(input, fallback) {
  if (includesAny(input, ["读研", "研究生", "学生", "学校", "宿舍"])) return "内地来港读研学生";
  if (includesAny(input, ["家庭", "小孩", "配偶", "新移民", "照顾家人"])) return "新移民 / 来港家庭";
  if (includesAny(input, ["高才", "专才", "工作", "雇主"])) return "高才通 / 专才";
  return fallback;
}

function inferArrivalStage(input, fallback) {
  if (includesAny(input, ["到港前", "还没到", "出发前", "准备来香港"])) return "抵港前";
  if (includesAny(input, ["刚到", "刚抵港", "到香港", "第一周"])) return "刚抵港";
  if (includesAny(input, ["一个月", "第一个月", "稳定下来"])) return "第一月";
  return fallback;
}

function inferMainBlocker(input) {
  if (includesAny(input, ["租房", "住处", "地址", "住址证明", "宿舍"])) return "住处与材料";
  if (includesAny(input, ["电话", "手机", "验证码", "SIM", "上台", "储值卡"])) return "通信和验证码";
  if (includesAny(input, ["身份证", "HKID", "预约", "入境处"])) return "香港身份证预约";
  if (includesAny(input, ["银行", "开户", "银行卡"])) return "银行开户准备";
  if (includesAny(input, ["交通", "八达通", "路线", "天气"])) return "交通和天气";
  return "第一月任务顺序";
}

function inferTags(input) {
  const tags = [];
  if (includesAny(input, ["电话", "手机", "验证码", "SIM", "储值卡"])) tags.push("telecom");
  if (includesAny(input, ["租房", "住处", "地址", "住址证明", "宿舍"])) tags.push("housing_materials");
  if (includesAny(input, ["银行", "开户", "银行卡"])) tags.push("bank_account");
  if (includesAny(input, ["HKID", "身份证", "入境处", "预约"])) tags.push("hkid");
  if (includesAny(input, ["交通", "八达通", "天气", "路线"])) tags.push("transport_payment");
  if (includesAny(input, ["第一周", "刚到", "刚抵港", "到港"])) tags.push("first_week_plan");
  return tags.length ? tags : ["first_month_plan"];
}

function includesAny(input, keywords) {
  return keywords.some((keyword) => input.includes(keyword));
}
