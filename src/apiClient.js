const DEFAULT_TIMEOUT_MS = 15000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getProxyBase() {
  return (globalThis.window?.HKGAI_API_PROXY_BASE || globalThis.window?.location?.origin || "").replace(/\/$/, "");
}

async function callProxy(endpoint, payload) {
  const proxyBase = getProxyBase();
  if (!proxyBase) {
    return { ok: false, reason: "当前暂时无法连接智能服务，已继续使用内置指引。" };
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
      return { ok: false, reason: `当前智能服务暂时不可用，已继续使用内置指引。` };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    const reason = error?.name === "AbortError" ? "智能服务响应较慢" : "智能服务暂时不可用";
    return { ok: false, reason: `${reason}，已继续使用内置指引。` };
  } finally {
    clearTimeout(timeout);
  }
}

async function callBinaryProxy(endpoint, payload) {
  const proxyBase = getProxyBase();
  if (!proxyBase) {
    return { ok: false, reason: "当前暂时无法生成语音，请继续参考粤拼和外部朗读页面。" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const response = await fetch(`${proxyBase}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      return { ok: false, reason: `语音生成暂时失败，请继续参考粤拼和外部朗读页面。` };
    }

    const blob = await response.blob();
    return { ok: true, blob };
  } catch (error) {
    const reason = error?.name === "AbortError" ? "语音智能服务响应较慢" : "语音智能服务暂时不可用";
    return { ok: false, reason };
  } finally {
    clearTimeout(timeout);
  }
}

export async function synthesizeCantoneseSpeech(text) {
  const proxyResult = await callBinaryProxy("/api/hkgai/voice/tts", {
    text,
    language: "cantonese",
    voice: "female"
  });

  if (!proxyResult.ok) {
    return {
      mode: "voice_fallback",
      provider: "local-voice-adapter",
      used_live_api: false,
      safe_to_continue: true,
      reason: proxyResult.reason
    };
  }

  return {
    mode: "live_api",
    provider: "hkgai-openspeech-tts-proxy",
    used_live_api: true,
    safe_to_continue: true,
    reason: "已生成粤语试听。",
    audio_url: URL.createObjectURL(proxyResult.blob)
  };
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
      reason: "已根据你的描述整理出当前情况。",
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
      reason: "已更新交通和天气提醒。",
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
      route_summary: "暂时无法取得实时路线，先保留官方入口：HKeMobility / 香港天文台 / 八达通。",
      weather_note: "出发前查看天气警告；台风、暴雨和极端天气以香港天文台实时公告为准。",
      payment_note: "准备八达通或移动支付；票价、优惠和实名规则以官方渠道为准。",
      official_links: ["HKeMobility", "香港天文台", "八达通"]
    }
  });
}

export async function queryAgenthubSourceCheck(task) {
  const proxyResult = await callProxy("/api/hkgai/agenthub/source-check", { task });
  const fallbackSources = fallbackAgentSources(task);
  if (proxyResult.ok && proxyResult.data?.summary) {
    const liveSources = Array.isArray(proxyResult.data.sources) ? proxyResult.data.sources : [];
    return {
      mode: "live_api",
      provider: "agenthub-search-proxy",
      used_live_api: true,
      safe_to_continue: true,
      reason: "已补充查找相关来源线索。",
      ...proxyResult.data,
      sources: liveSources.length ? liveSources : fallbackSources,
      boundary: liveSources.length
        ? proxyResult.data.boundary
        : "联网搜索已返回文本线索，但未抽取到可直接展示的新链接；这里先列出可核对入口，最终仍以官方/机构确认为准。"
    };
  }

  return {
    mode: "agenthub_fallback",
    provider: "local-source-boundary",
    used_live_api: false,
    safe_to_continue: true,
    reason: proxyResult.reason,
    summary: fallbackSources.length
      ? "暂时无法完成联网补充；先列出当前任务可核对的官方或机构入口。"
      : "暂时无法补充联网来源；继续使用已入库可信来源和机构确认边界。",
    sources: fallbackSources,
    boundary: "这些入口只作为补充线索，不替代官方来源和目标机构确认。"
  };
}

function fallbackAgentSources(task = {}) {
  const category = task.category || "general";
  const byCategory = {
    telecom: [
      { title: "OFCA 通信事务管理局", url: "https://www.ofca.gov.hk/" },
      { title: "OFCA 实名登记资讯", url: "https://www.ofca.gov.hk/en/consumer_focus/guide/hot_topics/sim_registration/index.html" }
    ],
    transport: [
      { title: "HKeMobility", url: "https://www.hkemobility.gov.hk/" },
      { title: "香港天文台", url: "https://www.hko.gov.hk/" },
      { title: "八达通", url: "https://www.octopus.com.hk/" }
    ],
    bank_medical: [
      { title: "香港金融管理局银行资讯", url: "https://www.hkma.gov.hk/" },
      { title: "医管局 HA", url: "https://www.ha.org.hk/" },
      { title: "HAD 新来港服务", url: "https://www.had.gov.hk/" }
    ],
    housing_materials: [
      { title: "1823 政府查询", url: "https://www.1823.gov.hk/" },
      { title: "入境事务处", url: "https://www.immd.gov.hk/" },
      { title: "香港金融管理局", url: "https://www.hkma.gov.hk/" }
    ],
    rental_scam: [
      { title: "反诈骗协调中心 18222", url: "https://www.adcc.gov.hk/" },
      { title: "香港警务处", url: "https://www.police.gov.hk/" }
    ]
  };
  return byCategory[category] || [];
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
      reason: "已把问题整理成更适合发给机构确认的表达。",
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
      summary: "已根据你的描述整理身份、抵港阶段、主要卡点和任务意图。"
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
    reason: result.reason || "交通和天气提醒已返回。",
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
    "不会影响主流程继续使用",
    "真实 API 不可用时使用本地规则和模板",
    "P0 -> P5 -> P1 主流程继续可运行"
  ];
  if (reason.includes("超时")) checks.unshift("智能服务响应较慢已被捕获");
  if (reason.includes("暂时不可用")) checks.unshift("当前服务暂时不可用，已自动切换到内置指引");
  if (reason.includes("未配置")) checks.unshift("当前环境未开启智能服务，已自动切换到内置指引");
  if (reason.includes("调用失败")) checks.unshift("智能服务暂时不可用已被捕获");
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




