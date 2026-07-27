import { enhanceProfileInput, polishConsultationQuestions } from "./apiClient.js";

const app = document.querySelector("#app");

const state = {
  page: "P0",
  language: "zh-CN",
  selectedTaskId: "housing_materials_001",
  selectedSourceIds: [],
  previousPage: "P1",
  tasks: [],
  sources: [],
  rules: [],
  templates: [],
  phrases: {},
  profile: {
    user_group: "内地来港读研学生",
    arrival_stage: "抵港前",
    main_blocker: "住处与材料",
    input:
      "我是内地来港读研学生，8 月底到香港，还没租房，也没办香港电话卡。到港前和第一周应该先做什么？"
  },
  matcher: {
    arrival_phase: "pre_arrival",
    purposes: ["school_registration", "hkid", "bank_account"],
    materials: ["school_housing_proof", "student_status_letter", "temporary_accommodation"],
    living_status: "temporary_stay",
    matchedRules: []
  },
  copied: false,
  completedTaskIds: [],
  completedPrepTaskIds: [],
  lastSavedSummary: null,
  api: {
    isLoading: false,
    lastProfileRun: null,
    lastQuestionRun: null,
    polishedQuestions: null
  }
};


const languageLabels = {
  "zh-CN": {
    code: "简",
    brandTagline: "新来港，不孤单",
    welcomeEyebrow: "P0 欢迎 / 身份选择",
    welcomeTitle: "一步一步来，<br />香港生活从这里开始",
    start: "开始规划",
    helper: "不知道自己该问什么？直接点开始也可以",
    aiParse: "模拟 HKGAI 解析",
    parsing: "解析中...",
    voiceTitle: "模拟语音输入，不调用真实录音",
    voice: "语",
    personaQuestion: "你是哪类来港情况？",
    stageQuestion: "你现在到哪一步？",
    footer: "覆盖到港前准备、第一周手续、第一个月生活；所有材料结论仍以机构确认。",
    languageAssist: "语言辅助",
    roadmapEyebrow: "P1 第一月任务路线图",
    roadmapTitle: "我的第一月路线",
    mapEyebrow: "任务地图 / 轻探索版",
    mapHint: "点击任意任务查看详细指引；“住处与材料”会进入深水追问。",
    routeFallbackDeep: "住处与材料仍是共用深水区",
    personas: { "内地来港读研学生": "内地来港读研学生", "新移民 / 来港家庭": "新移民 / 来港家庭", "高才通 / 专才": "高才通 / 专才", "我帮家人办理": "我帮家人办理" },
    stages: { "抵港前": "抵港前", "刚抵港": "刚抵港", "抵港第一周": "抵港第一周", "第一月": "第一月", "到港前": "到港前", "抵港第一个月": "抵港第一个月", "抵港准备": "抵港准备", "安顿第一周": "安顿第一周", "第一个月": "第一个月", "马上补做": "马上补做", "本周处理": "本周处理", "本月跟进": "本月跟进", "本周补齐": "本周补齐", "后续确认": "后续确认", "当前补齐": "当前补齐", "重点确认": "重点确认", "后续维护": "后续维护", "住处与材料重点深挖": "住处与材料重点深挖", "住处与材料仍是共用深水区": "住处与材料仍是共用深水区" }
  },
  "zh-HK": {
    code: "繁",
    brandTagline: "新來港，不孤單",
    welcomeEyebrow: "P0 歡迎 / 身份選擇",
    welcomeTitle: "一步一步來，<br />香港生活從這裡開始",
    start: "開始規劃",
    helper: "不知道自己該問甚麼？直接點開始也可以",
    aiParse: "模擬 HKGAI 解析",
    parsing: "解析中...",
    voiceTitle: "模擬語音輸入，不調用真實錄音",
    voice: "語",
    personaQuestion: "你是哪類來港情況？",
    stageQuestion: "你現在到哪一步？",
    footer: "覆蓋到港前準備、第一週手續、第一個月生活；所有材料結論仍以機構確認。",
    languageAssist: "語言輔助",
    roadmapEyebrow: "P1 第一月任務路線圖",
    roadmapTitle: "我的第一月路線",
    mapEyebrow: "任務地圖 / 輕探索版",
    mapHint: "點擊任意任務查看詳細指引；「住處與材料」會進入深水追問。",
    routeFallbackDeep: "住處與材料仍是共用深水區",
    personas: { "内地来港读研学生": "內地來港讀研學生", "新移民 / 来港家庭": "新移民 / 來港家庭", "高才通 / 专才": "高才通 / 專才", "我帮家人办理": "我幫家人辦理" },
    stages: { "抵港前": "抵港前", "刚抵港": "剛抵港", "抵港第一周": "抵港第一週", "第一月": "第一月", "到港前": "到港前", "抵港第一个月": "抵港第一個月", "抵港准备": "抵港準備", "安顿第一周": "安頓第一週", "第一个月": "第一個月", "马上补做": "即時補做", "本周处理": "本週處理", "本月跟进": "本月跟進", "本周补齐": "本週補齊", "后续确认": "後續確認", "当前补齐": "當前補齊", "重点确认": "重點確認", "后续维护": "後續維護", "住处与材料重点深挖": "住處與材料重點深挖", "住处与材料仍是共用深水区": "住處與材料仍是共用深水區" }
  },
  en: {
    code: "EN",
    brandTagline: "New in Hong Kong, not alone",
    welcomeEyebrow: "P0 Welcome / Profile",
    welcomeTitle: "Step by step,<br />start your Hong Kong life here",
    start: "Start planning",
    helper: "Not sure what to ask? Start directly.",
    aiParse: "Simulate HKGAI parsing",
    parsing: "Parsing...",
    voiceTitle: "Simulated voice input, no real recording",
    voice: "Voice",
    personaQuestion: "Who are you planning for?",
    stageQuestion: "Where are you now?",
    footer: "Covers pre-arrival, first-week tasks, and first-month life. Documents still need institutional confirmation.",
    languageAssist: "Language assist",
    roadmapEyebrow: "P1 First-month route",
    roadmapTitle: "My first-month route",
    mapEyebrow: "Task map / light exploration",
    mapHint: "Tap any task for details. Housing and documents remains the deeper check.",
    routeFallbackDeep: "Housing and documents stays as the shared deep-dive",
    personas: { "内地来港读研学生": "Mainland postgraduate student", "新移民 / 来港家庭": "New migrant / arriving family", "高才通 / 专才": "Top Talent / professional", "我帮家人办理": "Planning for family" },
    stages: { "抵港前": "Before arrival", "刚抵港": "Just arrived", "抵港第一周": "First week", "第一月": "First month", "到港前": "Before arrival", "抵港第一个月": "First month", "抵港准备": "Arrival prep", "安顿第一周": "Settling first week", "第一个月": "First month", "马上补做": "Do now", "本周处理": "This week", "本月跟进": "This month", "本周补齐": "Catch up this week", "后续确认": "Confirm later", "当前补齐": "Catch up now", "重点确认": "Key checks", "后续维护": "Keep updated", "住处与材料重点深挖": "Housing and documents deep-dive", "住处与材料仍是共用深水区": "Housing and documents shared deep-dive" }
  }
};

function t(key) {
  return languageLabels[state.language]?.[key] || languageLabels["zh-CN"][key] || key;
}

function tp(value) {
  return languageLabels[state.language]?.personas?.[value] || value;
}

function ts(value) {
  return languageLabels[state.language]?.stages?.[value] || value;
}

function renderLanguageAssist() {
  return `
    <div class="language-assist" aria-label="${t("languageAssist")}">
      <span>${t("languageAssist")}</span>
      ${["zh-CN", "zh-HK", "en"]
        .map((lang) => `<button class="${state.language === lang ? "active" : ""}" data-language="${lang}" type="button">${languageLabels[lang].code}</button>`)
        .join("")}
    </div>
  `;
}


const personaConfigs = {
  "内地来港读研学生": {
    userGroup: "内地来港读研学生",
    arrivalStage: "抵港前",
    mainBlocker: "住处与材料",
    welcomeTitle: "把到港前和第一周的混乱，整理成第一月路线图",
    input: "我是内地来港读研学生，8 月底到香港，还没租房，也没办香港电话卡。到港前和第一周应该先做什么？",
    roadmapIntro: "当前主线：先按到港前 / 第一周 / 第一个月生成任务路线图，再进入“住处与材料”深水区。",
    stats: ["8 个任务", "3 个时间段", "住处与材料做深", "本地 mock 可跑"],
    routeLabels: ["到港前", "抵港第一周", "抵港第一个月", "住处与材料重点深挖"],
    timeline: [
      ["pre_arrival", "到港前", "先保通信、证件材料、临时住宿和交通支付。"],
      ["first_week", "抵港第一周", "处理长期联系方式、学校报到、住处与材料、HKID 预约和租房风险。"],
      ["first_month", "抵港第一个月", "稳定住处后，再确认银行、医疗、社区和 NGO 服务入口。"]
    ],
    focusTitle: "同一人群下补 3 个浅层任务场景",
    focusText: "不是新增第二人群，也不是把所有场景做深；先证明港话通能把交通、防骗、医疗社区入口纳入同一张第一月任务图。",
    mapTitle: "按时间线探索，不做复杂小游戏",
    mapText: "每个节点都是一个可办任务。先看路线，再点节点进入详情；住处与材料保留为唯一深水区。",
    focusBadges: {
      transport_payment_001: { label: "宽度增强 · 工具入口", short: "工具增强", note: "交通 / 天气 / 八达通" },
      rental_scam_001: { label: "宽度增强 · 高风险兜底", short: "风险兜底", note: "租房防骗 / 18222" },
      bank_medical_community_001: { label: "宽度增强 · 公共服务入口", short: "服务入口", note: "医疗 / 银行 / NGO" }
    }
  },
  "新移民 / 来港家庭": {
    userGroup: "新移民 / 来港家庭",
    arrivalStage: "刚抵港",
    mainBlocker: "社区、医疗和家庭服务入口",
    welcomeTitle: "把家庭抵港后的服务入口，整理成第一月任务地图",
    input: "我们一家刚来香港，暂时住在亲友家，还不清楚社区服务、医疗入口、孩子和家庭相关事项应该先问哪里。第一个月应该怎么安排？",
    roadmapIntro: "当前主线：先按到港前 / 第一周 / 第一个月整理家庭安顿任务，再用可信来源和人工兜底避免误判资格。",
    stats: ["8 个任务", "家庭安顿视角", "社区/医疗/政府入口", "不判断资格"],
    routeLabels: ["抵港准备", "安顿第一周", "第一个月", "住处与材料仍是共用深水区"],
    timeline: [
      ["pre_arrival", "抵港准备", "先整理证件材料、临时住处、通信方式和交通支付。"],
      ["first_week", "安顿第一周", "确认住处、政府查询入口、医疗紧急入口和家庭服务支持。"],
      ["first_month", "第一个月", "逐步确认银行、社区/NGO、家庭和公共服务入口。"]
    ],
    focusTitle: "第二人群轻量验证：新移民 / 来港家庭",
    focusText: "不是第二套完整 Demo；只证明同一套任务地图能从学生复用到家庭场景。重点放在社区/NGO、医疗、政府查询和家庭服务入口。",
    mapTitle: "家庭安顿任务地图，不做资格判断",
    mapText: "每个节点只提供下一步和可信入口。福利、公屋、入学、医疗、法律或移民结论都必须转官方或专业机构。",
    focusBadges: {
      bank_medical_community_001: { label: "家庭场景 · 医疗社区入口", short: "医疗社区", note: "HA / IFSC / HAD" },
      entry_documents_001: { label: "家庭场景 · 证件材料归档", short: "证件材料", note: "入境 / 1823 / 材料" },
      housing_materials_001: { label: "家庭场景 · 住处材料共用深水区", short: "住处材料", note: "住处 / 地址 / 确认" }
    }
  },
  "高才通 / 专才": {
    userGroup: "高才通 / 专才",
    arrivalStage: "抵港前",
    mainBlocker: "快速安顿和公共服务入口",
    welcomeTitle: "把来港工作和家属安顿，整理成第一月任务地图",
    input: "我准备通过高才通或专才来香港工作，可能带家人一起过来。住房、证件、银行、医疗和社区服务第一个月应该先处理什么？"
  },
  "我帮家人办理": {
    userGroup: "我帮家人办理",
    arrivalStage: "抵港前",
    mainBlocker: "替家人整理办事入口",
    welcomeTitle: "把家人的来港事项，整理成可确认的任务地图",
    input: "我想帮家人整理来香港后的证件、住处、医疗、社区服务和政府查询入口，不确定应该先问哪些机构。"
  }
};

const stageSemantics = {
  "抵港前": {
    routeLabels: ["到港前", "抵港第一周", "抵港第一个月", "住处与材料重点深挖"],
    timelineTitles: ["到港前", "抵港第一周", "抵港第一个月"],
    timelineTone: "prepare",
    introPrefix: "先按到港前 / 第一周 / 第一个月生成任务路线图",
    queryAction: "到港前和第一周应该先做什么"
  },
  "刚抵港": {
    routeLabels: ["马上补做", "本周处理", "本月跟进", "住处与材料重点深挖"],
    timelineTitles: ["马上补做", "本周处理", "本月跟进"],
    timelineTone: "catchup",
    introPrefix: "先把可能漏掉的前置事项列为马上补做，再安排本周处理和本月跟进",
    queryAction: "现在应该马上补做什么，本周优先处理什么"
  },
  "抵港第一周": {
    routeLabels: ["本周补齐", "本月跟进", "后续确认", "住处与材料重点深挖"],
    timelineTitles: ["本周补齐", "本月跟进", "后续确认"],
    timelineTone: "week",
    introPrefix: "先补齐本周仍可能卡住的前置事项，再安排本月跟进和后续确认",
    queryAction: "这一周还应该补齐什么，本月要跟进什么"
  },
  "第一月": {
    routeLabels: ["当前补齐", "重点确认", "后续维护", "住处与材料重点深挖"],
    timelineTitles: ["当前补齐", "重点确认", "后续维护"],
    timelineTone: "month",
    introPrefix: "先补齐当前仍缺的基础事项，再集中确认住处、材料和公共服务入口",
    queryAction: "现在还应该补齐什么，哪些事项需要重点确认"
  }
};

const stageTimelineDescriptions = {
  "内地来港读研学生": {
    prepare: [
      "先保通信、证件材料、临时住宿和交通支付。",
      "处理长期联系方式、学校报到、住处与材料、HKID 预约和租房风险。",
      "稳定住处后，再确认银行、医疗、社区和 NGO 服务入口。"
    ],
    catchup: [
      "把通信、证件材料、临时住处和交通支付这些前置事项立刻查漏补缺。",
      "本周优先处理学校报到、住处与材料、HKID 预约和租房风险。",
      "本月继续确认银行、医疗、社区和 NGO 服务入口。"
    ],
    week: [
      "先补齐通信、证件材料、临时住处和交通支付里仍未完成的事项。",
      "本月跟进学校记录、住处与材料、HKID、银行和医疗入口。",
      "后续保存机构回复，持续确认住处、材料和公共服务入口。"
    ],
    month: [
      "先补齐还会影响后续办事的基础事项。",
      "重点确认住处与材料、银行、HKID、医疗和学校记录。",
      "后续维护地址信息、机构回复和风险兜底入口。"
    ]
  },
  "新移民 / 来港家庭": {
    prepare: [
      "先整理证件材料、临时住处、通信方式和交通支付。",
      "确认住处、政府查询入口、医疗紧急入口和家庭服务支持。",
      "逐步确认银行、社区/NGO、家庭和公共服务入口。"
    ],
    catchup: [
      "把证件材料、临时住处、通信方式和交通支付这些前置事项立刻查漏补缺。",
      "本周优先确认住处、政府查询入口、医疗紧急入口和家庭服务支持。",
      "本月继续确认银行、社区/NGO、家庭和公共服务入口。"
    ],
    week: [
      "先补齐证件、通信、临时住处和交通支付里仍未完成的事项。",
      "本月跟进政府查询、社区/NGO、医疗入口、家庭服务和银行开户。",
      "后续保存机构回复，持续确认住处、材料和服务入口。"
    ],
    month: [
      "先补齐还会影响家庭办事的基础事项。",
      "重点确认住处与材料、政府服务、社区/NGO、医疗入口和银行开户。",
      "后续维护地址信息、机构回复和风险兜底入口。"
    ]
  }
};

const widthEnhancementBadges = {
  transport_payment_001: {
    label: "宽度增强 · 工具入口",
    short: "工具增强",
    note: "交通 / 天气 / 八达通"
  },
  rental_scam_001: {
    label: "宽度增强 · 高风险兜底",
    short: "风险兜底",
    note: "租房防骗 / 18222"
  },
  bank_medical_community_001: {
    label: "宽度增强 · 公共服务入口",
    short: "服务入口",
    note: "医疗 / 银行 / NGO"
  }
};

const shallowTaskDetails = {
  transport_payment_001: {
    scene: "刚到香港时，交通不是政策判断题，而是行动工具题：先知道怎么到住处、怎么付费、天气会不会影响出行。",
    hkgaiRole: ["把机场/学校/临时住处串成行动顺序", "提示查看官方交通和天气入口", "后续可接 ToolHub 做路线、票价、天气增强"],
    boundary: "港话通不替代实时路线规划。交通时间、服务状态和天气警告以 HKeMobility、香港天文台和运营机构最新信息为准。",
    enhancement: "可扩展：ToolHub 交通路线、票价、天气预警。"
  },
  rental_scam_001: {
    scene: "远程找房、押金转账和线上签约是新来港学生的红色风险点。这里不判断房源真假，而是先让用户停下来做核验。",
    hkgaiRole: ["识别付款、押金、远程签约等高风险信号", "提示保存证据和暂停付款", "把用户转到 18222、警方或学校住宿办公室"],
    boundary: "港话通不能判断某个业主、中介、链接或账户一定真假。涉及诈骗、人身安全或财产损失时，应联系 18222、警方或紧急服务。",
    enhancement: "可扩展：风险清单、证据保存模板、18222 咨询问题。"
  },
  bank_account_preparation_001: {
    scene: "银行开户不是比哪家优惠，而是先确认自己能不能顺利开户、需要什么材料、手机号和地址资料是否能通过目标银行要求。",
    hkgaiRole: ["把开户准备拆成官方入口、预约、手机号、地址资料和防骗提醒", "提醒不要相信代开户、非官方链接或优惠诱导", "需要材料判断时转向目标银行确认"],
    boundary: "港话通不推荐银行、不比较套餐或优惠，也不承诺一定开户成功。开户材料、地址要求和审批结果以目标银行官方入口、客服或分行为准。",
    enhancement: "可扩展：银行开户材料确认问题、官方入口跳转、防骗提醒清单。"
  },
  bank_medical_community_001: {
    scene: "第一个月稳定下来后，用户会开始处理银行、医疗和社区支持。这里展示港话通能把公共服务入口分流，而不是只讲住址证明。",
    hkgaiRole: ["把银行开户、医疗入口、社区/NGO 支持分成不同下一步", "医疗问题只做入口导航和安全提醒", "需要人工支持时转 IFSC、HAD 或服务机构"],
    boundary: "医疗问题不做诊断；紧急情况直接 999 或急症室。银行开户和社区服务资格以目标机构或服务单位确认为准。",
    enhancement: "可扩展：HA/急症室轮候、地区 NGO 列表、银行材料确认问题。"
  }
};
const personaTaskOverlays = {
  "新移民 / 来港家庭": {
    telecom_001: {
      summary: "先确认内地手机号漫游、香港电话卡方案，以及政府、银行和家人联络的验证码接收方式。",
      next_steps: ["开通或确认内地手机号码漫游", "准备香港电话卡或到港购买点", "列出政府、银行、邮箱和家人联络的验证码接收方式"],
      fallback_channels: ["电讯商客服", "1823"]
    },
    transport_payment_001: {
      summary: "先解决机场到临时住处或亲友家的路线、日常交通支付和天气预警。交通和天气属于低风险工具增强，最终以官方应用和实时公告为准。",
      next_steps: ["保存机场到临时住处或亲友家的路线", "准备八达通或移动支付方案", "出发前查看天气警告和交通服务状态", "把实时路线和天气留作 ToolHub 增强位"],
      fallback_channels: ["HKeMobility", "香港天文台", "八达通官方入口"]
    },
    rental_scam_001: {
      summary: "线上找房、远程签约、押金转账都先做风险核验。疑似诈骗时不判断真假，先暂停付款并转 18222、警方或官方咨询入口。",
      next_steps: ["付款前保存广告、聊天、账号和收款资料", "核对业主或中介身份，警惕只催转账不让实地核验", "怀疑诈骗时先暂停付款", "用 18222 或警方入口确认下一步"],
      fallback_channels: ["18222", "999", "警署报案室", "1823"]
    },
    entry_documents_001: {
      title: "证件、入境和家庭材料先归档",
      category: "entry_documents",
      source_ids: ["HK-S-209-IMMD-HKID", "HK-S-208-1823-CONTACT", "HK-S-503-HAD-NEW-ARRIVALS"],
      summary: "把入境、身份证明、临时住处、亲友住址说明，以及医疗或社区服务可能需要的材料先放到一个办事文件夹。",
      next_steps: ["保存入境和身份证明材料", "整理临时住处或亲友住址相关说明", "不确定政府服务入口时先问 1823"],
      fallback_channels: ["入境处", "1823", "HAD 新来港服务", "IFSC"]
    },
    housing_materials_001: {
      title: "住处与材料：临时住址、地址信息、机构确认",
      source_ids: ["HK-S-208-1823-CONTACT", "HK-S-211-HKMA-ACCOUNT-INFO", "HK-S-503-HAD-NEW-ARRIVALS"],
      summary: "先确认当前住处状态，再把临时住址、亲友住址、政府信件和银行开户地址要求分开问清楚。",
      next_steps: ["确认当前住处状态", "整理临时住址、亲友住址或政府信件", "按政府、银行、社区服务用途分别生成咨询问题"],
      fallback_channels: ["1823", "目标银行", "HAD 新来港服务", "IFSC"]
    },
    school_checkin_001: {
      title: "社区、家庭和政府服务查询",
      category: "family_services",
      priority: "should_do",
      risk_level: "yellow",
      status: "needs_confirm",
      source_ids: ["HK-S-208-1823-CONTACT", "HK-S-502-SWD-IFSC", "HK-S-503-HAD-NEW-ARRIVALS"],
      summary: "不确定该找哪个部门时，先用 1823、HAD 新来港服务和 IFSC 做分流；这里只帮你找到入口，不判断福利、公屋、入学或医疗资格。",
      next_steps: ["用 1823 确认政府服务入口", "查看 HAD 新来港服务资讯", "需要家庭或社区支持时联系 IFSC"],
      required_inputs: ["district", "support_need"],
      fallback_channels: ["1823", "HAD 新来港服务", "IFSC"]
    },
    bank_medical_community_001: {
      title: "医疗、社区和银行入口",
      summary: "第一个月逐步确认医疗入口、社区/NGO 支持和银行开户要求。医疗只做入口导航；资格、费用和个案判断交给官方或专业机构。",
      next_steps: ["保存 999、HA Go 或医管局入口", "需要家庭或社区支持时查 IFSC 或 HAD 新来港服务", "向目标银行确认开户地址材料"],
      fallback_channels: ["999", "医管局 / HA Go", "IFSC", "HAD 新来港服务", "目标银行"]
    }
  }
};

const familyQuestionTemplates = [
  {
    template_id: "qt_family_government_1823_001",
    target_type: "government",
    target_label: "1823 / 目标政府部门",
    scenario: "housing_materials",
    priority_order: 1,
    why_contact: "家庭场景下先确认应该由哪个政府部门处理，避免把攻略或他人经验当成官方规则。",
    confirm_checklist: ["具体事项由哪个部门负责", "是否需要地址资料或住址证明", "哪些临时住址或政府信件可作为辅助材料", "是否应转问其他部门"],
    fallback_channels: ["1823", "入境处", "对应政府部门"],
    template_text: "你好，我们一家刚来香港，目前处于【抵港阶段】，住处状态是【居住状态】。我们想确认【用途】相关事项，手上已有：【材料列表】。请问这个事项应由哪个政府部门处理？是否需要地址资料或住址证明？如果需要，哪些临时住址、亲友住址说明或政府信件可以作为辅助材料？如果应转问其他部门，请问应联系哪个入口？"
  },
  {
    template_id: "qt_family_community_support_001",
    target_type: "community_service",
    target_label: "IFSC / HAD 新来港服务入口",
    scenario: "housing_materials",
    priority_order: 2,
    why_contact: "社区和家庭支持很容易被误说成资格结论，Demo 只生成转介和咨询问题。",
    confirm_checklist: ["所在地区应联系哪个服务单位", "是否需要预约或转介", "需要准备哪些身份证明或住址资料", "儿童、长者或照顾者事项是否有专门入口"],
    fallback_channels: ["IFSC", "HAD 新来港服务", "社区服务机构"],
    template_text: "你好，我们一家刚抵港，目前住处状态是【居住状态】，正在整理【用途】相关事项。手上已有：【材料列表】。请问我们所在地区如需家庭、社区或新来港人士支援，应先联系哪个服务入口？是否需要预约、转介、身份证明或住址资料？如涉及儿童、长者或照顾者事项，是否有更合适的部门或机构？"
  },
  {
    template_id: "qt_family_bank_address_001",
    target_type: "bank",
    target_label: "目标银行 / 开户客服",
    scenario: "housing_materials",
    priority_order: 3,
    why_contact: "银行开户地址要求因银行和账户类型不同，港话通只能帮你把问题问清楚。",
    confirm_checklist: ["是否需要香港 residential address proof", "临时住址或亲友住址说明是否可作辅助材料", "是否需要英文版本或最近日期", "未稳定租房或未持 HKID 时是否需额外文件"],
    fallback_channels: ["目标银行客服", "银行分行", "HKMA 银行资料入口"],
    template_text: "你好，我们一家刚来香港，准备确认银行开户材料。目前处于【抵港阶段】，住处状态是【居住状态】。手上地址相关材料包括：【材料列表】。请问开户是否需要香港 residential address proof？如果暂住亲友家、酒店或临时住处，哪些文件可作为地址资料或辅助材料？是否需要原件、英文版本、最近三个月日期、香港电话号码，或因未持 HKID 而需要额外文件？"
  }
];
const labels = {
  purpose: {
    school_registration: "学校注册",
    student_record_update: "学校资料更新",
    school_housing_proof: "宿舍证明",
    hkid: "HKID",
    government_service: "政府服务",
    medical_entry: "医疗入口",
    community_support: "社区 / NGO 支持",
    family_service: "家庭服务查询",
    bank_account: "银行开户"
  },
  material: {
    school_housing_proof: "宿舍证明",
    student_status_letter: "学校信 / 学生证明",
    lease: "租约",
    stamped_tenancy_agreement: "已打厘印租约",
    temporary_accommodation: "临时住宿文件",
    family_or_friend_address_note: "亲友住址相关说明",
    entry_documents: "入境 / 证件材料",
    government_letter: "政府信件",
    bank_or_address_record: "银行或通讯地址文件",
    university_document: "大学文件",
    utility_bill: "本人水电账单",
    home_country_address_proof: "家乡地址证明",
    no_document: "暂时没有"
  },
  living: {
    school_hall: "学校宿舍",
    off_campus_rental: "校外租房",
    family_or_friend_home: "亲友家",
    temporary_stay: "酒店 / 短租",
    not_decided: "未确定"
  },
  phase: {
    pre_arrival: "抵港前",
    arrival_week: "抵港第一周",
    first_month: "抵港第一个月"
  },
  risk: {
    green: "绿色风险",
    yellow: "黄色风险",
    red: "红色风险"
  },
  status: {
    needs_info: "需要补充信息",
    needs_confirm: "需要机构确认",
    can_act: "可以行动",
    high_risk_pause: "高风险先暂停",
    official_only: "只走官方入口"
  },
  priority: {
    must_do: "必做",
    should_do: "建议",
    as_needed: "按需",
    risk: "风险提醒"
  },
  stage: {
    pre_arrival: "抵港前",
    arrival_day: "抵港当天",
    first_week: "第一周",
    first_month: "第一月"
  }
};


function currentPersona() {
  const base = personaConfigs["内地来港读研学生"];
  return { ...base, ...(personaConfigs[state.profile.user_group] || {}) };
}

function currentStageSemantics() {
  return stageSemantics[state.profile.arrival_stage] || stageSemantics["抵港前"];
}

function currentTimeline() {
  const persona = currentPersona();
  const semantics = currentStageSemantics();
  const baseTimeline = persona.timeline || personaConfigs["内地来港读研学生"].timeline;
  const descriptionSet = stageTimelineDescriptions[persona.userGroup] || stageTimelineDescriptions["内地来港读研学生"];
  const descriptions = descriptionSet[semantics.timelineTone] || descriptionSet.prepare;
  return baseTimeline.map(([stage], index) => [stage, semantics.timelineTitles[index], descriptions[index]]);
}

function currentRouteLabels() {
  const labelsForStage = currentStageSemantics().routeLabels;
  return isFamilyPersona()
    ? labelsForStage.map((item) => (item === "住处与材料重点深挖" ? "住处与材料仍是共用深水区" : item))
    : labelsForStage;
}

function displayStageLabel(stage) {
  const item = currentTimeline().find(([timelineStage]) => timelineStage === stage);
  return item?.[1] || labels.stage[stage] || stage;
}

function currentWelcomeTitle() {
  const persona = currentPersona();
  if (state.profile.arrival_stage === "抵港前") return persona.welcomeTitle;
  if (isFamilyPersona()) {
    return `把${state.profile.arrival_stage}后的家庭安顿事项，整理成第一月任务地图`;
  }
  return `把${state.profile.arrival_stage}后的补做事项，整理成第一月路线图`;
}

function buildProfileInput(userGroup = state.profile.user_group, arrivalStage = state.profile.arrival_stage) {
  const persona = personaConfigs[userGroup] || personaConfigs["内地来港读研学生"];
  const semantics = stageSemantics[arrivalStage] || stageSemantics["抵港前"];
  if (persona.userGroup === "新移民 / 来港家庭") {
    const locationText = arrivalStage === "抵港前" ? "准备来香港" : arrivalStage === "刚抵港" ? "刚来香港" : `来香港${arrivalStage}`;
    return `我们一家${locationText}，暂时住处和社区服务入口还不确定，也不清楚医疗、政府查询和家庭相关事项应该先问哪里。${semantics.queryAction}？`;
  }
  if (persona.userGroup === "高才通 / 专才") {
    const stageText = arrivalStage === "抵港前" ? "准备来香港工作" : `${arrivalStage}来香港工作`;
    return `我${stageText}，可能带家人一起过来。住房、证件、银行、医疗和社区服务${semantics.queryAction}？`;
  }
  if (persona.userGroup === "我帮家人办理") {
    return `我想帮家人整理来香港后的证件、住处、医疗、社区服务和政府查询入口。家人目前是${arrivalStage}，${semantics.queryAction}？`;
  }
  const stageText = arrivalStage === "抵港前" ? "8 月底到香港" : arrivalStage;
  return `我是内地来港读研学生，${stageText}，还没确认哪些通信、住处、证件材料和香港电话卡事项已经完成。${semantics.queryAction}？`;
}

function buildLocalizedProfileInput(userGroup = state.profile.user_group, arrivalStage = state.profile.arrival_stage) {
  if (state.language === "zh-CN") return buildProfileInput(userGroup, arrivalStage);
  const persona = personaConfigs[userGroup] || personaConfigs["内地来港读研学生"];
  const stageText = ts(arrivalStage);

  if (state.language === "zh-HK") {
    if (persona.userGroup === "新移民 / 来港家庭") {
      return `我們一家${stageText}，暫時住處和社區服務入口還不確定，也不清楚醫療、政府查詢和家庭相關事項應該先問哪裡。下一步應該怎樣安排？`;
    }
    if (persona.userGroup === "高才通 / 专才") {
      return `我${stageText}來香港工作，可能帶家人一起過來。住房、證件、銀行、醫療和社區服務應該先處理甚麼？`;
    }
    if (persona.userGroup === "我帮家人办理") {
      return `我想幫家人整理來香港後的證件、住處、醫療、社區服務和政府查詢入口。家人目前是${stageText}，下一步應該怎樣安排？`;
    }
    return `我是內地來港讀研學生，${stageText}，還沒確認哪些通信、住處、證件材料和香港電話卡事項已經完成。下一步應該先做甚麼？`;
  }

  if (persona.userGroup === "新移民 / 来港家庭") {
    return `My family is ${stageText}. We have not confirmed housing, community services, medical access, government enquiries, or family-related support. What should we do next?`;
  }
  if (persona.userGroup === "高才通 / 专才") {
    return `I am coming to Hong Kong for work as a talent/professional, possibly with family. What should I handle first for housing, documents, banking, medical access, and community services?`;
  }
  if (persona.userGroup === "我帮家人办理") {
    return `I am helping my family plan documents, housing, medical access, community services, and government enquiry channels after arriving in Hong Kong. What should we do first?`;
  }
  return `I am a mainland postgraduate student ${stageText}. I have not confirmed telecom, housing, documents, or a Hong Kong phone card yet. What should I do first?`;
}

function syncProfileInput() {
  state.profile.input = buildLocalizedProfileInput();
}

function isFamilyPersona() {
  return state.profile.user_group === "新移民 / 来港家庭";
}

function personaTaskOverlay(taskId) {
  return personaTaskOverlays[state.profile.user_group]?.[taskId] || null;
}

function displayTask(task) {
  if (!task) return null;
  return { ...task, ...(personaTaskOverlay(task.task_id) || {}) };
}

function tasksForCurrentPersona() {
  return state.tasks.map(displayTask);
}

const prepTaskIds = ["telecom_001", "entry_documents_001", "transport_payment_001"];

function shouldShowPrepCompletion() {
  return state.profile.arrival_stage !== "抵港前";
}

function prepTaskItems() {
  return prepTaskIds.map((taskId) => getTask(taskId)).filter(Boolean);
}

function isPrepTaskCompleted(taskId) {
  return (state.completedPrepTaskIds || []).includes(taskId);
}

function missingPrepTasks() {
  if (!shouldShowPrepCompletion()) return prepTaskItems();
  return prepTaskItems().filter((task) => !isPrepTaskCompleted(task.task_id));
}

function completedPrepTasks() {
  if (!shouldShowPrepCompletion()) return [];
  return prepTaskItems().filter((task) => isPrepTaskCompleted(task.task_id));
}

function tasksForTimelineStage(stage) {
  const tasks = tasksForCurrentPersona().filter((task) => task.stage === stage);
  if (stage !== "pre_arrival" || !shouldShowPrepCompletion()) return tasks;
  return tasks.filter((task) => !isPrepTaskCompleted(task.task_id));
}

function focusBadges() {
  return currentPersona().focusBadges || widthEnhancementBadges;
}

function taskBadge(taskId) {
  return focusBadges()[taskId];
}

function taskAssistMeta(task) {
  const phrase = phraseItemsForTask(task)[0];
  if (!phrase?.assist_type) return null;
  const labels = {
    onsite: "\u73b0\u573a\u5f00\u53e3",
    copy_question: "\u590d\u5236\u786e\u8ba4",
    email: "\u90ae\u4ef6\u786e\u8ba4",
    checklist: "\u6e05\u5355\u81ea\u67e5",
    official_question: "\u5b98\u65b9\u786e\u8ba4",
    risk_escalation: "\u98ce\u9669\u6c42\u8bc1",
    service_routing: "\u5165\u53e3\u5206\u6d41"
  };
  return {
    type: phrase.assist_type,
    label: labels[phrase.assist_type] || "\u8868\u8fbe\u8f85\u52a9"
  };
}

function renderTaskAssistBadge(task, variant = "mini") {
  const meta = taskAssistMeta(task);
  if (!meta) return "";
  return `<span class="assist-${variant} assist-${meta.type}">${meta.label}</span>`;
}

function applyPersona(userGroup) {
  const persona = personaConfigs[userGroup] || personaConfigs["内地来港读研学生"];
  state.profile.user_group = persona.userGroup;
  state.profile.arrival_stage = persona.arrivalStage || state.profile.arrival_stage;
  state.profile.main_blocker = persona.mainBlocker || state.profile.main_blocker;
  state.profile.input = buildLocalizedProfileInput(persona.userGroup, state.profile.arrival_stage);
  if (isFamilyPersona()) {
    state.selectedTaskId = "housing_materials_001";
    state.matcher = {
      ...state.matcher,
      arrival_phase: "arrival_week",
      living_status: "family_or_friend_home",
      purposes: ["government_service", "community_support", "bank_account"],
      materials: ["temporary_accommodation", "family_or_friend_address_note", "entry_documents"],
      matchedRules: []
    };
  } else {
    state.matcher = {
      ...state.matcher,
      arrival_phase: "pre_arrival",
      living_status: "temporary_stay",
      purposes: ["school_registration", "hkid", "bank_account"],
      materials: ["school_housing_proof", "student_status_letter", "temporary_accommodation"],
      matchedRules: []
    };
  }
  state.matcher.matchedRules = matchRules();
  state.api.lastProfileRun = null;
  state.api.lastQuestionRun = null;
  state.api.polishedQuestions = null;
}

async function boot() {
  const [tasks, sources, rules, templates, phrases] = await Promise.all([
    fetchJson("./src/data/tasks.json"),
    fetchJson("./src/data/sources.json"),
    fetchJson("./src/data/address_proof_rules.json"),
    fetchJson("./src/data/question_templates.json"),
    fetchJson("./src/data/local_phrases.json")
  ]);

  state.tasks = tasks;
  state.sources = sources;
  state.rules = rules;
  state.templates = templates;
  state.phrases = phrases;
  state.matcher.matchedRules = matchRules();
  state.api.polishedQuestions = null;
  state.api.lastQuestionRun = null;
  render();
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function setPage(page) {
  if (page !== state.page) state.previousPage = state.page;
  state.page = page;
  state.copied = false;
  render();
}

function getTask(taskId = state.selectedTaskId) {
  return displayTask(state.tasks.find((task) => task.task_id === taskId));
}

function getSources(sourceIds) {
  const ids = new Set(sourceIds);
  return state.sources.filter((source) => ids.has(source.source_id));
}

function sourceIdsForCurrentContext() {
  const ruleIds = state.matcher.matchedRules.flatMap((rule) => rule.source_ids);
  const taskIds = getTask()?.source_ids || [];
  return [...new Set([...ruleIds, ...taskIds])];
}
function describeSourceLevel(level) {
  return {
    S: "官方 / 监管 / 法定机构",
    A: "待确认官方入口 / 机构样例",
    B: "NGO / 服务机构",
    C: "国际案例",
    D: "经验 / 媒体样例"
  }[level] || "需确认来源";
}

function describeSourceType(type) {
  return {
    government_hotline: "政府查询入口",
    government_department: "政府部门入口",
    government_enquiry: "政府兜底查询",
    statutory_body: "法定机构说明",
    school_housing: isFamilyPersona() ? "机构住处材料样例" : "学校宿舍 / 住处材料",
    school_student_affairs: isFamilyPersona() ? "机构服务入口" : "学校学生事务",
    school_example: "学校样例来源",
    telecom_regulator: "通信监管来源",
    operator_pending: "运营商官方入口待补",
    institution_pending: "目标机构确认入口待补",
    student_experience: "学生经验来源",
    media_test: "媒体实测样例",
    transport_tool: "官方交通工具",
    weather_tool: "官方天气工具",
    payment_tool: "支付服务入口",
    anti_fraud_hotline: "防骗热线",
    police_emergency: "警方 / 紧急入口",
    healthcare_entry: "医疗服务入口",
    social_service_entry: "社会服务入口",
    newcomer_service_entry: "新来港服务入口"
  }[type] || "可信来源";
}

function isDirectSourceCard(source) {
  if (!source.url) return false;
  if (source.source_type?.includes("pending")) return false;
  if (source.source_type === "student_experience") return false;
  return true;
}

function isSourceReferenceNote(source) {
  return !isDirectSourceCard(source);
}

function groupSources(sources) {
  const cardSources = sources.filter(isDirectSourceCard);
  const groups = [
    ["官方 / 监管 / 法定机构", cardSources.filter((source) => source.source_level === "S")],
    [isFamilyPersona() ? "机构样例 / 公共来源" : "学校样例 / 机构来源", cardSources.filter((source) => source.source_level === "A")],
    ["经验 / 媒体样例", cardSources.filter((source) => ["D", "C"].includes(source.source_level) || source.source_type === "media_test")],
    ["服务与人工兜底", cardSources.filter((source) => !["S", "A", "C", "D"].includes(source.source_level))]
  ].filter(([, items]) => items.length);
  return groups.length ? groups : [["可核验来源", cardSources]];
}
function matchRules() {
  const matches = state.rules.filter((rule) =>
    rule.purposes.some((purpose) => state.matcher.purposes.includes(purpose))
  );
  return isFamilyPersona()
    ? matches.filter((rule) => !rule.rule_id.includes("school"))
    : matches;
}

function updateMatcher(key, value, checked) {
  if (key === "living_status" || key === "arrival_phase") {
    state.matcher[key] = value;
  } else {
    const list = new Set(state.matcher[key]);
    checked ? list.add(value) : list.delete(value);
    state.matcher[key] = [...list];
  }
  state.matcher.matchedRules = matchRules();
  state.api.polishedQuestions = null;
  state.api.lastQuestionRun = null;
  render();
}

function openTask(taskId) {
  state.selectedTaskId = taskId;
  setPage("P2");
}

function openSources(sourceIds) {
  state.selectedSourceIds = sourceIds?.length ? sourceIds : sourceIdsForCurrentContext();
  setPage("P4");
}

function completeAddressLoop() {
  const context = buildQuestionContext();
  const family = isFamilyPersona();
  state.completedTaskIds = [...new Set([...state.completedTaskIds, "housing_materials_001"])];
  state.lastSavedSummary = family
    ? {
        task_id: "housing_materials_001",
        title: "住处与家庭材料已生成确认问题",
        context: `${context.phaseText} · ${context.livingText}`,
        actions: ["已拆分政府 / 社区 / 银行用途", "已生成 1823、IFSC 和银行咨询问题", "下一步联系官方或服务机构确认"],
        impacts: ["政府通知地址", "银行开户", "社区服务", "医疗入口"]
      }
    : {
        task_id: "housing_materials_001",
        title: "住处与材料已生成确认问题",
        context: `${context.phaseText} · ${context.livingText}`,
        actions: ["已拆分学校 / 政府 / 银行用途", "已生成 3 类咨询问题", "下一步联系本校、1823 或目标银行确认"],
        impacts: ["学校记录", "银行开户", "政府通知地址", "后续医疗和社区服务"]
      };
  state.tasks = state.tasks.map((task) =>
    task.task_id === "housing_materials_001"
      ? {
          ...task,
          status: "needs_confirm",
          summary: family
            ? "已完成住处状态、用途和材料拆分；下一步带着问题向 1823、社区服务机构或目标银行确认。"
            : "已完成住处状态、用途和材料拆分；下一步带着问题向本校、政府部门或目标银行确认。",
          next_steps: family
            ? ["用 1823 确认政府服务入口", "向 IFSC 或新来港服务入口确认家庭支持", "向目标银行确认开户地址材料", "保存机构回复，避免把通用入口当成资格结论"]
            : ["联系本校学生事务处 / 宿舍办公室 / Registry", "用 1823 确认政府服务入口", "向目标银行确认开户地址材料", "保存机构回复，避免把样例来源当成通用规则"]
        }
      : task
  );
  state.selectedTaskId = "housing_materials_001";
  setPage("P1");
}

function render() {
  const page = {
    P0: renderWelcome,
    P1: renderRoadmap,
    P2: renderTaskDetail,
    P3: renderMatcher,
    P4: renderSourceDrawer,
    P5: renderQuestionGenerator
  }[state.page];

  app.innerHTML = `${renderShell(page())}`;
  bindEvents();
}

function renderBrandMark() {
  return `
    <div class="brand-lockup">
      <span class="brand-icon" aria-hidden="true"></span>
      <strong>港话通</strong>
      <small>${t("brandTagline")}</small>
    </div>
  `;
}

function renderDemoNav() {
  return `
    <nav class="stepper" aria-label="Demo flow">
      ${["P0", "P1", "P2", "P3", "P4", "P5"]
        .map((page) => `<button class="step ${state.page === page ? "active" : ""}" data-page="${page}">${page}</button>`)
        .join("")}
    </nav>
  `;
}

function renderShell(content) {
  return `
    <div class="app-shell ${state.page === "P0" ? "welcome-shell" : "flow-shell"}">
      <header class="topbar">
        ${renderBrandMark()}
        ${state.page === "P0" ? "" : renderDemoNav()}
        ${renderLanguageAssist()}
      </header>
      <main class="main">${content}</main>
    </div>
  `;
}

function renderWelcome() {
  const profileOptions = ["内地来港读研学生", "新移民 / 来港家庭", "高才通 / 专才", "我帮家人办理"];
  return `
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">${t("welcomeEyebrow")}</p>
        <h1>${t("welcomeTitle")}</h1>
      </div>
      <div class="planning-card">
        <div class="input-wrap">
          <textarea id="profileInput">${state.profile.input}</textarea>
          <button class="voice-placeholder" title="${t("voiceTitle")}" data-action="simulate-voice" type="button">${t("voice")}</button>
        </div>
        <button class="primary hero-cta" data-action="go-roadmap">${t("start")}</button>
        <p class="helper-text">${t("helper")}</p>
        <button class="secondary small ai-subtle" data-action="enhance-profile">${state.api.isLoading ? t("parsing") : t("aiParse")}</button>
      </div>
      <div class="visible-setup" aria-label="身份和阶段选择">
        <div class="setup-group">
          <p class="setup-label">${t("personaQuestion")}</p>
          <div class="choice-row" aria-label="用户身份">
            ${profileOptions
              .map((item) => `<button type="button" class="chip ${item === state.profile.user_group ? "selected" : ""}" data-profile="${item}">${tp(item)}</button>`)
              .join("")}
          </div>
        </div>
        <div class="setup-group">
          <p class="setup-label">${t("stageQuestion")}</p>
          <div class="choice-row" aria-label="抵港阶段">
            ${["抵港前", "刚抵港", "抵港第一周", "第一月"]
              .map((item) => `<button type="button" class="chip ${item === state.profile.arrival_stage ? "selected" : ""}" data-stage="${item}">${ts(item)}</button>`)
              .join("")}
          </div>
        </div>
        ${renderPrepCompletionSetup()}
      </div>
      ${renderApiStatus("profile")}
      <p class="hero-footnote">${t("footer")}</p>
    </section>
  `;
}

function renderPrepCompletionSetup() {
  if (!shouldShowPrepCompletion()) return "";
  const label = state.profile.arrival_stage === "刚抵港" ? "你已经完成哪些前置事项？" : "这些前置事项哪些已经完成？";
  return `
    <div class="setup-group prep-completion-setup" aria-label="前置事项完成情况">
      <p class="setup-label">${label}</p>
      <div class="prep-check-row">
        ${prepTaskItems()
          .map(
            (task) => `
              <label class="prep-check ${isPrepTaskCompleted(task.task_id) ? "checked" : ""}">
                <input type="checkbox" data-prep-done="${task.task_id}" ${isPrepTaskCompleted(task.task_id) ? "checked" : ""} />
                <span>${task.title}</span>
              </label>
            `
          )
          .join("")}
      </div>
      <small>未勾选会进入 P1 的“马上补做 / 本周补齐”，已勾选会降到后续维护。</small>
    </div>
  `;
}

function renderPrepRerankPanel() {
  if (!shouldShowPrepCompletion()) return "";
  const missing = missingPrepTasks();
  const done = completedPrepTasks();
  return `
    <section class="prep-rerank-panel" aria-label="前置漏项补排结果">
      <p class="eyebrow">系统已按当前位置补排</p>
      <h2>不是从头看攻略，而是先补你还没做的事</h2>
      <div class="prep-rerank-grid">
        <div>
          <strong>马上补做</strong>
          ${missing.length ? `<ul>${missing.map((task) => `<li>${task.title}</li>`).join("")}</ul>` : `<p>前置事项已勾选完成，本阶段可以转向学校、住处、银行和公共服务确认。</p>`}
        </div>
        <div>
          <strong>已完成 / 后续维护</strong>
          ${done.length ? `<ul>${done.map((task) => `<li>${task.title}</li>`).join("")}</ul>` : `<p>还没有勾选已完成事项，系统会先把前置任务压到当前补做段。</p>`}
        </div>
      </div>
    </section>
  `;
}
function currentReorderPlan() {
  const stage = state.profile.arrival_stage;
  const family = isFamilyPersona();
  const plans = {
    "抵港前": {
      eyebrow: "普通攻略会怎么做",
      title: "从头按时间看任务",
      before: "用户还没出发，时间线本身是合理的。",
      after: family ? "先整理证件、临时住处、通信和交通，再进入家庭服务入口。" : "先整理通信、证件、临时住处和交通支付，再进入学校/住处/材料任务。",
      impact: "现在重点不是重排，而是提前防漏。"
    },
    "刚抵港": {
      eyebrow: "系统已按当前位置重排",
      title: "不是从头看攻略，而是先补遗漏",
      before: "普通攻略仍会从“到港前”开始列清单。",
      after: family ? "港话通把证件、通信、临时住处和交通支付移入“马上补做”，本周再处理住处、医疗、社区和政府入口。" : "港话通把通信、证件材料、临时住处和交通支付移入“马上补做”，本周再处理学校报到、HKID、租房风险和住处材料。",
      impact: "价值：用户已经走到中途，也能追回前置漏项。"
    },
    "抵港第一周": {
      eyebrow: "系统已按第一周重排",
      title: "先补卡住后续办事的事项",
      before: "普通攻略会把前置准备留在过去时间段里。",
      after: family ? "港话通把仍会影响家庭办事的证件、通信、住处和交通事项压到“本周补齐”，再安排医疗、社区和银行入口。" : "港话通把仍会影响学校、银行、HKID 和住处材料的前置事项压到“本周补齐”。",
      impact: "价值：不是展示过去做什么，而是判断现在还欠什么。"
    },
    "第一月": {
      eyebrow: "系统已按第一个月重排",
      title: "从办事入口转成持续确认",
      before: "普通攻略到第一个月仍会继续罗列任务。",
      after: family ? "港话通把重点改成政府服务、社区/NGO、医疗、银行和地址信息的持续确认。" : "港话通把重点改成住处材料、银行、政府地址、学校记录和医疗社区入口的持续确认。",
      impact: "价值：从一次性 checklist 变成后续维护清单。"
    }
  };
  return plans[stage] || plans["抵港前"];
}

function renderReorderInsight() {
  const plan = currentReorderPlan();
  return `
    <section class="reorder-insight" aria-label="系统重排结果">
      <p class="eyebrow">${plan.eyebrow}</p>
      <h2>${plan.title}</h2>
      <div class="before-after-grid">
        <div>
          <strong>旧方式</strong>
          <p>${plan.before}</p>
        </div>
        <div>
          <strong>港话通</strong>
          <p>${plan.after}</p>
        </div>
      </div>
      <p class="impact-line">${plan.impact}</p>
    </section>
  `;
}

function taskRouting(task) {
  const family = isFamilyPersona();
  const routeMap = {
    telecom: {
      type: "工具入口",
      askFirst: "先问电讯商 / 学校 IT",
      needs: "手机号码状态、验证码接收方式",
      action: "别先查政策，先保证能收验证码。"
    },
    entry_documents: family
      ? {
          type: "政府咨询",
          askFirst: "先问入境处 / 1823",
          needs: "入境身份、证件材料、家庭成员情况",
          action: "先归档材料，再按政府入口确认。"
        }
      : {
          type: "学校确认 + 政府咨询",
          askFirst: "先问学校 Registry，再问入境处 / 1823",
          needs: "录取信、签注/入境材料、学校要求",
          action: "不要用攻略替代学校或政府要求。"
        },
    transport: {
      type: "实时工具",
      askFirst: "先查 HKeMobility / 天文台 / 八达通",
      needs: "出发地、目的地、支付方式、天气状态",
      action: "这是低风险工具题，最终看官方实时入口。"
    },
    housing_materials: family
      ? {
          type: "住处 + 政府/银行确认",
          askFirst: "先问 1823 或目标银行，再问服务机构",
          needs: "住处状态、用途、已有材料、目标机构",
          action: "不要直接问材料能不能用，先拆用途和确认方。"
        }
      : {
          type: "学校/银行/政府分流",
          askFirst: "先问本校办公室，再问目标银行或 1823",
          needs: "住处状态、用途、已有材料、目标机构",
          action: "同一材料按用途分开确认。"
        },
    school_checkin: {
      type: "学校确认",
      askFirst: "先问本校 Registry / 学生事务处",
      needs: "学校、住处状态、学生记录要求",
      action: "学校样例只告诉你入口类型，不代表所有学校。"
    },
    housing_safety: {
      type: "高风险暂停",
      askFirst: "先停付款，问 18222 / 警方 / 学校住宿办",
      needs: "广告、聊天记录、收款信息、签约方式",
      action: "AI 不判断真假，先保存证据并转专业入口。"
    },
    hkid: {
      type: "政府官方入口",
      askFirst: "先问入境处 / 1823",
      needs: "到港日期、身份类别、预约状态",
      action: "只走官方入口，不用攻略替代申请要求。"
    },
    bank_account: {
      type: "\u94f6\u884c\u5f00\u6237\u51c6\u5907",
      askFirst: "\u5148\u95ee\u76ee\u6807\u94f6\u884c\u5b98\u65b9\u5165\u53e3 / \u5206\u884c",
      needs: "\u8eab\u4efd\u8bc1\u660e\u3001\u9999\u6e2f\u624b\u673a\u53f7\u3001\u4f4f\u5740\u8d44\u6599\u3001\u9884\u7ea6\u6216\u5f00\u6237\u6e20\u9053",
      action: "\u53ea\u505a\u5f00\u6237\u51c6\u5907\u548c\u9632\u9a97\u63d0\u9192\uff0c\u4e0d\u63a8\u8350\u94f6\u884c\u3001\u4e0d\u6bd4\u8f83\u4f18\u60e0\u3002"
    },
    settling_in: {
      type: family ? "社区/医疗/银行分流" : "银行/医疗/社区分流",
      askFirst: family ? "按事项问 HAD / IFSC / HA / 目标银行" : "按事项问目标银行 / HA / IFSC / 学校",
      needs: "所在地区、服务需要、目标银行、紧急程度",
      action: "医疗不诊断，银行和社区服务不判断资格。"
    }
  };
  return routeMap[task.category] || {
    type: "服务入口分流",
    askFirst: task.fallback_channels?.[0] || "目标机构",
    needs: (task.required_inputs || []).join("、") || "当前情境",
    action: "先确认负责入口，再执行下一步。"
  };
}

function renderRoutingMini(task) {
  const route = taskRouting(task);
  return `<em class="routing-mini">${route.type} · ${route.askFirst}</em>`;
}

function renderServiceRoutingCard(task) {
  const route = taskRouting(task);
  return `
    <section class="routing-card" aria-label="服务入口分流">
      <p class="eyebrow">服务入口分流</p>
      <h2>这件事先问谁，不让你在入口之间乱跳</h2>
      <div class="routing-grid">
        <p><strong>系统识别为</strong><span>${route.type}</span></p>
        <p><strong>先问谁</strong><span>${route.askFirst}</span></p>
        <p><strong>需要带什么</strong><span>${route.needs}</span></p>
      </div>
      <p class="impact-line">${route.action}</p>
    </section>
  `;
}

function buildUncertaintyBreakdown(rule) {
  const family = isFamilyPersona();
  const targets = family ? "1823 / 目标银行 / IFSC 或服务机构" : "本校办公室 / 目标银行 / 1823";
  return {
    why: family ? "家庭、住处、银行和社区服务的接受标准分属不同机构，港话通不能替它们判断资格。" : "学校、银行和政府部门接受材料的标准不同，学校样例不能推成全港通用规则。",
    missing: rule.confirm_items?.slice(0, 3) || [],
    ask: `把用途、住处状态和材料字段带去问 ${targets}。`
  };
}

function renderUncertaintyBox(rule) {
  const breakdown = buildUncertaintyBreakdown(rule);
  return `
    <div class="uncertainty-box">
      <strong>不是一句 needs_confirm：系统把不确定拆成下一步</strong>
      <p>${breakdown.why}</p>
      <div class="uncertainty-grid">
        <div><span>还缺什么</span><ul>${breakdown.missing.map((item) => `<li>${item}</li>`).join("")}</ul></div>
        <div><span>下一步怎么问</span><p>${breakdown.ask}</p></div>
      </div>
    </div>
  `;
}

function renderQuestionRoutingCard(context) {
  const family = isFamilyPersona();
  return `
    <section class="routing-card question-route-card">
      <p class="eyebrow">不确定性拆解器</p>
      <h2>不能替你下结论，但把问题拆到可以问</h2>
      <div class="routing-grid">
        <p><strong>为什么不能直接答</strong><span>${family ? "家庭服务、医疗、银行和政府事项分属不同机构。" : "学校、银行、政府对同一地址材料要求不同。"}</span></p>
        <p><strong>你现在缺口</strong><span>${context.materialText} · ${context.livingText} · ${context.purposeText}</span></p>
        <p><strong>建议问法</strong><span>${family ? "先问 1823 确认入口，再按事项问服务机构。" : "先问本校哪个办公室，再问目标银行或政府入口。"}</span></p>
      </div>
    </section>
  `;
}
function renderRoadmap() {
  const persona = currentPersona();
  const timeline = currentTimeline();
  const routeLabels = currentRouteLabels();
  const roadmapIntro = `当前主线：${currentStageSemantics().introPrefix}，再进入“住处与材料”深水区。`;
  return `
    <section class="page-head roadmap-head">
      <button class="back-pill" data-page="P0">←</button>
      <div>
        <p class="eyebrow">${t("roadmapEyebrow")}</p>
        <h1>${t("roadmapTitle")}</h1>
        <p class="subtle">${tp(state.profile.user_group)} · ${ts(state.profile.arrival_stage)}。${roadmapIntro}</p>
      </div>
      <div class="stats">
        ${persona.stats.map((item) => `<span>${item}</span>`).join("")}
      </div>
      <div class="route-strip">
        ${routeLabels.map((item, index) => `<span class="${index === routeLabels.length - 1 ? "deep-step" : ""}">${ts(item)}</span>`).join("")}
      </div>
    </section>
    ${renderReorderInsight()}
    ${renderWidthSummary()}
    ${renderTaskMap(timeline)}
    <p class="map-hint">${t("mapHint")}</p>
    <section class="external-row">
      ${["OpenRice / 吃饭", "HKTVmall / 购物", "Google Maps / 地点", "Career Center / 找工作"]
        .map((item) => `<span>${item}</span>`)
        .join("")}
    </section>
  `;
}
function renderWidthSummary() {
  const persona = currentPersona();
  const badges = focusBadges();
  const items = Object.entries(badges).map(([taskId, badge]) => {
    const task = getTask(taskId);
    return `
      <button class="width-pill" data-open-task="${taskId}">
        <strong>${badge.short}</strong>
        <span>${badge.note}</span>
        <small>${task?.title || "查看任务"}</small>
      </button>
    `;
  });

  return `
    <section class="width-summary" aria-label="本轮宽度增强">
      <div>
        <p class="eyebrow">${state.profile.user_group === "新移民 / 来港家庭" ? "第二人群轻量验证" : "本轮宽度增强"}</p>
        <h2>${persona.focusTitle}</h2>
        <p class="subtle">${persona.focusText}</p>
      </div>
      <div class="width-pill-row">${items.join("")}</div>
    </section>
  `;
}

function stageIcon(stage) {
  return {
    pre_arrival: "plane",
    first_week: "home",
    first_month: "tree"
  }[stage] || "dot";
}

function taskIcon(task) {
  const icons = {
    telecom: "phone",
    entry_documents: "doc",
    transport: "bus",
    housing_materials: "key",
    school_checkin: "school",
    family_services: "heart",
    housing_safety: "shield",
    hkid: "id",
    settling_in: "home",
    bank_medical: "bank",
    bank_account: "bank",
    medical_entry: "medical",
    community_support: "heart"
  };
  return icons[task.category] || icons[task.task_id] || "dot";
}

function renderTaskNodeTags(task) {
  const badge = taskBadge(task.task_id);
  const assist = renderTaskAssistBadge(task);
  if (!badge && !assist) return "";
  return `<div class="node-tags">${badge ? `<em>${badge.short}</em>` : ""}${assist}</div>`;
}
function renderCompletedPrepNodes() {
  const done = completedPrepTasks();
  if (!done.length) return "";
  return `
    <div class="completed-prep-nodes" aria-label="已完成前置事项">
      <strong>已完成 / 后续维护</strong>
      ${done
        .map(
          (task) => `
            <button class="completed-prep-node" data-open-task="${task.task_id}">
              <span class="route-icon ${taskIcon(task)}" aria-hidden="true"></span>
              <span>${task.title}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}
function renderTaskMap(timeline) {
  return `
    <section class="task-map" aria-label="第一月任务地图">
      <div class="section-title roadmap-title">
        <div>
          <p class="eyebrow">${t("mapEyebrow")}</p>
          <h2>${currentPersona().mapTitle}</h2>
          <p class="subtle">${currentPersona().mapText}</p>
        </div>
      </div>
      <div class="map-lanes timeline-list">
        ${timeline
          .map(([stage, title, desc]) => {
            const tasks = tasksForTimelineStage(stage);
            return `
              <div class="map-lane timeline-section">
                <div class="map-stage timeline-stage"><span class="route-icon ${stageIcon(stage)}" aria-hidden="true"></span><strong>${ts(title)}</strong><small>${desc}</small></div>
                <div class="map-nodes timeline-nodes">
                  ${tasks.length
                    ? tasks
                    .map(
                      (task) => `
                        <button class="map-node timeline-node ${task.task_depth === "deep" ? "deep-node" : ""} ${taskBadge(task.task_id) ? "width-node" : ""} ${task.risk_level}" data-open-task="${task.task_id}">
                          <span class="route-icon ${taskIcon(task)}" aria-hidden="true"></span>
                          <strong>${task.title}</strong>
                          ${renderTaskNodeTags(task)}
                          <small>${task.summary}</small>
                        </button>
                      `
                    )
                    .join("")
                    : `<div class="empty-stage-note">前置事项已完成，本段转入后续维护。</div>`}
                  ${stage === "pre_arrival" ? renderCompletedPrepNodes() : ""}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}
function renderTaskCard(task) {
  const completed = state.completedTaskIds.includes(task.task_id);
  return `
    <article class="task-card ${task.task_depth === "deep" ? "deep" : ""} ${shallowTaskDetails[task.task_id] ? "enhanced-light" : ""} ${completed ? "completed" : ""}">
      <div class="tag-row">
        <span class="badge priority">${labels.priority[task.priority]}</span>
        <span class="badge risk ${task.risk_level}">${labels.risk[task.risk_level]}</span>
        <span class="badge status">${labels.status[task.status]}</span>
        ${taskBadge(task.task_id) ? `<span class="badge width-badge">${taskBadge(task.task_id).label}</span>` : ""}
        ${renderTaskAssistBadge(task, "card-badge")}
        ${completed ? '<span class="badge done">已生成咨询问题</span>' : ""}
      </div>
      <h3>${task.title}</h3>
      <p>${task.summary}</p>
      ${completed ? renderSavedSummary() : ""}
      <div class="mini-meta">
        <span>${displayStageLabel(task.stage)}</span>
        <span>${task.source_ids.length} 个来源</span>
        ${taskBadge(task.task_id) ? `<span>${taskBadge(task.task_id).note}</span>` : ""}
      </div>
      <div class="card-actions">
        <button class="primary small" data-open-task="${task.task_id}">${task.task_depth === "deep" ? (completed ? "查看已整理结果" : "进入匹配") : "查看步骤"}</button>
        <button class="icon-btn" title="查看来源" data-open-sources="${task.source_ids.join(",")}">来源</button>
      </div>
    </article>
  `;
}

function renderSavedSummary() {
  const summary = state.lastSavedSummary;
  if (!summary) return "";
  return `
    <div class="saved-summary">
      <strong>${summary.title}</strong>
      <p>${summary.context}</p>
      <ul>${summary.actions.map((item) => `<li>${item}</li>`).join("")}</ul>
      <div class="mini-meta">${summary.impacts.map((item) => `<span>影响：${item}</span>`).join("")}</div>
    </div>
  `;
}

function phraseItemsForTask(task) {
  return state.phrases[task.category] || state.phrases[task.task_id] || [];
}

function phraseAssistMeta(type) {
  return {
    onsite: {
      eyebrow: "现场开口",
      title: "到现场先这样开口",
      aria: "现场开口辅助"
    },
    copy_question: {
      eyebrow: "复制给机构问",
      title: "不要现场猜，按用途复制去确认",
      aria: "机构咨询问题"
    },
    email: {
      eyebrow: "邮件 / 官网确认",
      title: "学校事项优先这样问负责办公室",
      aria: "学校邮件确认"
    },
    checklist: {
      eyebrow: "抵港前自查",
      title: "先建一个办事文件夹",
      aria: "办事文件夹提示"
    },
    official_question: {
      eyebrow: "官方入口确认",
      title: "把身份和日期带去问官方入口",
      aria: "官方确认问题"
    },
    risk_escalation: {
      eyebrow: "高风险求证",
      title: "先暂停，再问专业入口",
      aria: "风险求证话术"
    },
    service_routing: {
      eyebrow: "问对服务入口",
      title: "先确认该找哪个机构",
      aria: "服务入口确认"
    }
  }[type] || {
    eyebrow: "本地表达参考",
    title: "把问题说清楚",
    aria: "本地表达参考"
  };
}

function renderLocalPhraseCard(task) {
  const phrases = phraseItemsForTask(task);
  if (!phrases.length) return "";
  const meta = phraseAssistMeta(phrases[0].assist_type);
  return `
    <div class="phrase-card assist-${phrases[0].assist_type || "default"}" aria-label="${meta.aria}">
      <p class="eyebrow">${meta.eyebrow}</p>
      <h2>${meta.title}</h2>
      ${phrases
        .map(
          (item) => `
            <div class="phrase-item">
              <strong>${item.phrase}</strong>
              <span>${item.meaning}</span>
              ${item.jyutping ? `<p class="jyutping-line"><b>发音参考</b>${item.jyutping}</p>` : ""}
              <small>${item.scene} · ${item.note}</small>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTaskInsightSections(task) {
  if (!task.insight_sections?.length && !task.source_note) return "";
  return `
    <section class="task-insight-card" aria-label="任务浅层详情">
      <p class="eyebrow">浅层任务加深</p>
      <h2>${task.title}</h2>
      ${
        task.insight_sections?.length
          ? `<div class="insight-grid">${task.insight_sections
              .map(
                (item) => `
                  <div>
                    <strong>${item.title}</strong>
                    <p>${item.body}</p>
                  </div>
                `
              )
              .join("")}</div>`
          : ""
      }
      ${task.source_note ? `<p class="source-boundary-line">${task.source_note}</p>` : ""}
    </section>
  `;
}

function simulateVoiceInput() {
  if (state.language === "zh-HK") {
    state.profile.input = isFamilyPersona()
      ? "我們一家剛來香港，想用語音問社區、醫療、證件和住處事項應該先找誰。"
      : state.profile.arrival_stage === "抵港前"
        ? "我準備來香港，還沒電話卡和住處，想用語音問到港前要先準備甚麼。"
        : "我剛到香港，還沒電話卡和住處，想用語音問第一週要先辦甚麼。";
  } else if (state.language === "en") {
    state.profile.input = isFamilyPersona()
      ? "My family just arrived in Hong Kong. I want to ask by voice which community, medical, document, and housing services we should contact first."
      : state.profile.arrival_stage === "抵港前"
        ? "I am preparing to come to Hong Kong. I do not have a phone card or housing yet. What should I prepare before arrival?"
        : "I just arrived in Hong Kong. I do not have a phone card or housing yet. What should I do in the first week?";
  } else {
    state.profile.input = isFamilyPersona()
      ? "我们一家刚来香港，想用语音问社区、医疗、证件和住处事项应该先找谁。"
      : state.profile.arrival_stage === "抵港前"
        ? "我准备来香港，还没电话卡和住处，想用语音问到港前要先准备什么。"
        : "我刚到香港，还没电话卡和住处，想用语音问第一周要先办什么。";
  }
  state.api.lastProfileRun = null;
  render();
}

function renderTaskDetail() {
  const task = getTask();
  const isDeep = task.task_id === "housing_materials_001";
  const detailCopy = isFamilyPersona()
    ? {
        why: "你们刚抵港，很多事项还不知道该问哪个部门。路线图会先处理通信、证件、住处、医疗和社区入口；进入这里后，再把政府、社区、银行和住处材料确认拆开。",
        boundary: "港话通不判断福利、公屋、入学、医疗或银行材料一定可用。最终接受情况以政府部门、银行或专业服务机构审核为准。"
      }
    : {
        why: "你还没稳定租房，也没办香港电话卡。路线图会先处理到港前和第一周任务；进入这里后，再把租房、地址信息、住址证明和学校/银行/政府材料确认拆开。",
        boundary: "港话通不判断材料一定可用。最终接受情况以学校、政府部门、银行或目标机构审核为准。"
      };
  return `
    <section class="panel">
      <button class="link-btn" data-page="P1">← 返回路线图</button>
      <p class="eyebrow">P2 任务详情</p>
      <h1>${task.title}</h1>
      <div class="tag-row">
        <span class="badge risk ${task.risk_level}">${labels.risk[task.risk_level]}</span>
        <span class="badge status">${labels.status[task.status]}</span>
      </div>
      <p class="lead">${task.summary}</p>
      ${renderServiceRoutingCard(task)}
      ${renderTaskInsightSections(task)}
      <div class="detail-grid">
        <div>
          <h2>为什么推荐</h2>
          <p>${detailCopy.why}</p>
        </div>
        <div>
          <h2>下一步行动</h2>
          <ol>${task.next_steps.map((step) => `<li>${step}</li>`).join("")}</ol>
        </div>
        <div>
          <h2>边界</h2>
          <p>${detailCopy.boundary}</p>
        </div>
      </div>
      ${renderLocalPhraseCard(task)}
      <div class="button-row">
        ${
          isDeep
            ? '<button class="primary" data-page="P3">进入住处与材料追问</button>'
            : '<button class="primary" data-page="P1">保存并返回路线图</button>'
        }
        <button class="secondary" data-open-sources="${task.source_ids.join(",")}">查看可信来源</button>
      </div>
    </section>
  `;
}

function renderMatcher() {
  const family = isFamilyPersona();
  const phaseOptions = [
    ["pre_arrival", family ? "抵港准备" : "抵港前"],
    ["arrival_week", family ? "安顿第一周" : "抵港第一周"],
    ["first_month", family ? "第一个月" : "抵港第一个月"]
  ];
  const purposeOptions = family
    ? [
        ["government_service", "政府服务 / 1823"],
        ["medical_entry", "医疗入口"],
        ["community_support", "社区 / NGO 支持"],
        ["bank_account", "银行开户"],
        ["family_service", "家庭服务查询"]
      ]
    : [
        ["school_registration", "学校注册 / 资料更新"],
        ["hkid", "HKID / 政府服务"],
        ["bank_account", "银行开户"]
      ];
  const materialOptions = family
    ? [
        ["temporary_accommodation", "临时住宿文件"],
        ["family_or_friend_address_note", "亲友住址相关说明"],
        ["entry_documents", "入境 / 证件材料"],
        ["government_letter", "政府信件"],
        ["bank_or_address_record", "银行或通讯地址文件"],
        ["no_document", "暂时没有"]
      ]
    : [
        ["school_housing_proof", "宿舍证明"],
        ["student_status_letter", "学校信"],
        ["stamped_tenancy_agreement", "已打厘印租约"],
        ["temporary_accommodation", "临时住宿"],
        ["government_letter", "政府信件"],
        ["no_document", "暂时没有"]
      ];
  const livingOptions = family
    ? [
        ["not_decided", "未确定"],
        ["temporary_stay", "酒店 / 短租"],
        ["family_or_friend_home", "亲友家"],
        ["off_campus_rental", "租房 / 自住"]
      ]
    : [
        ["not_decided", "未确定"],
        ["temporary_stay", "酒店 / 短租"],
        ["off_campus_rental", "看房中 / 校外租房"],
        ["school_hall", "学校宿舍"],
        ["family_or_friend_home", "亲友家"]
      ];
  const matcherIntro = family
    ? "家庭场景下不做资格判断，只按政府、银行、社区和医疗入口整理确认问题。"
    : "住址证明不是第一步本身，而是住处、租房、学校/银行/政府材料确认里的关键卡点。";

  return `
    <section class="page-head">
      <button class="link-btn" data-page="P2">← 返回任务详情</button>
      <p class="eyebrow">P3 住处与材料追问</p>
      <h1>先确认阶段和住处，再按用途拆材料问题</h1>
      <p class="subtle">${matcherIntro}</p>
    </section>
    <section class="matcher-layout">
      <div class="panel form-panel">
        <h2>Step 1 / 4 你现在处在哪个阶段？</h2>
        <div class="choice-row">${phaseOptions
          .map(([value, label]) => `<button class="chip ${state.matcher.arrival_phase === value ? "selected" : ""}" data-phase="${value}">${label}</button>`)
          .join("")}</div>
        <h2>Step 2 / 4 你现在的住处状态？</h2>
        <div class="choice-row">${livingOptions
          .map(([value, label]) => `<button class="chip ${state.matcher.living_status === value ? "selected" : ""}" data-living="${value}">${label}</button>`)
          .join("")}</div>
        <h2>Step 3 / 4 可能涉及哪些用途？</h2>
        <div class="check-grid">${purposeOptions.map(([value, label]) => renderCheckbox("purposes", value, label)).join("")}</div>
        <h2>Step 4 / 4 你目前有哪些地址相关材料？</h2>
        <div class="check-grid">${materialOptions.map(([value, label]) => renderCheckbox("materials", value, label)).join("")}</div>
      </div>
      <div class="panel result-panel">
        <p class="eyebrow">住处与材料结果</p>
        <h2>结论：先稳住任务顺序，再按用途分开确认</h2>
        <p class="subtle">当前阶段：${labels.phase[state.matcher.arrival_phase]}；住处状态：${labels.living[state.matcher.living_status]}。已匹配 ${state.matcher.matchedRules.length} 条材料规则，全部输出 <code>needs_confirm</code>，但不止停在提示，而是拆成缺口、确认对象和下一步问法。</p>
        ${state.matcher.matchedRules.map(renderRuleResult).join("")}
        <div class="button-row">
          <button class="primary" data-page="P4">查看可信来源</button>
          <button class="secondary" data-page="P5">生成咨询问题</button>
        </div>
      </div>
    </section>
  `;
}
function renderCheckbox(key, value, label) {
  const checked = state.matcher[key].includes(value) ? "checked" : "";
  return `
    <label class="check">
      <input type="checkbox" data-check-key="${key}" data-check-value="${value}" ${checked} />
      <span>${label}</span>
    </label>
  `;
}

function renderRuleResult(rule) {
  return `
    <article class="rule-card">
      <div class="rule-head">
        <h3>${rule.label}</h3>
        <span class="badge status">${rule.output_status}</span>
      </div>
      <strong>${rule.result_title}</strong>
      <ul>${rule.possible_paths.map((item) => `<li>${item}</li>`).join("")}</ul>
      ${renderUncertaintyBox(rule)}
      <details>
        <summary>需要确认事项和下一步</summary>
        <h4>需要确认</h4>
        <ul>${rule.confirm_items.map((item) => `<li>${item}</li>`).join("")}</ul>
        <h4>下一步</h4>
        <ul>${rule.next_actions.map((item) => `<li>${item}</li>`).join("")}</ul>
        <p>${rule.boundary_note}</p>
      </details>
    </article>
  `;
}

function renderSourceDrawer() {
  const ids = state.selectedSourceIds.length ? state.selectedSourceIds : sourceIdsForCurrentContext();
  const sources = getSources(ids);
  const task = getTask();
  const groups = groupSources(sources);
  const referenceNotes = sources.filter(isSourceReferenceNote);
  return `
    <section class="drawer-page">
      <div class="source-drawer">
        <button class="link-btn" data-page="${state.previousPage || "P1"}">← 返回上一页</button>
        <p class="eyebrow">P4 可信来源抽屉</p>
        <h1>为什么这条建议可信，但仍需机构确认</h1>
        <p class="lead">当前任务：${task?.title || "第一月路线图"}</p>
        <div class="source-summary">
          <div><strong>${sources.filter(isDirectSourceCard).length}</strong><span>可打开来源</span></div>
          <div><strong>${sources.filter((source) => source.source_level === "S").length}</strong><span>S 级官方/监管</span></div>
          <div><strong>${referenceNotes.length}</strong><span>确认路径/经验依据</span></div>
        </div>
        <div class="trust-strip source-warning">
          <strong>边界提示</strong>
          <span>${isFamilyPersona() ? "港话通用来源来拆步骤和准备问题，不替代政府部门、银行、医疗或社区服务机构的最终审核。家庭场景优先使用官方和服务入口，不展示学校样例。" : "港话通用来源来拆步骤和准备问题，不替代学校、银行、政府部门或专业机构的最终审核。学校链接只作为样例，实际要查用户自己的学校入口。"}</span>
        </div>
        ${groups
          .map(
            ([title, items]) => `
              <section class="source-group">
                <h2>${title}</h2>
                <div class="source-list">${items.map(renderSource).join("")}</div>
              </section>
            `
          )
          .join("")}
        ${renderSourceReferenceNotes(referenceNotes)}
        <div class="button-row">
          <button class="primary" data-page="P5">生成咨询问题</button>
          <button class="secondary" data-page="P1">回路线图</button>
        </div>
      </div>
    </section>
  `;
}

function renderSourceReferenceNotes(sources) {
  if (!sources.length) return "";
  return `
    <section class="source-reference-notes" aria-label="确认路径和经验依据">
      <h2>确认路径 / 经验依据</h2>
      <p>这些不作为可直接打开的可信来源卡，只用于说明下一步应该问谁，或解释经验背景。</p>
      <div class="reference-note-list">
        ${sources
          .map(
            (source) => `
              <article>
                <strong>${source.name}</strong>
                <span>${describeSourceType(source.source_type)}</span>
                <p>${source.boundary_note}</p>
                <small>最终确认方：${source.final_decision_maker}</small>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
function renderSource(source) {
  return `
    <article class="source-card">
      <div class="rule-head">
        <div>
          <h3>${source.name}</h3>
          <p class="source-kind">${describeSourceType(source.source_type)}</p>
        </div>
        <span class="source-level">${source.source_level}</span>
      </div>
      <div class="source-meta-grid">
        <p><strong>来源等级</strong><span>${describeSourceLevel(source.source_level)}</span></p>
        <p><strong>机构</strong><span>${source.owner}</span></p>
        <p><strong>最后核验</strong><span>${source.last_verified_at}</span></p>
        <p><strong>最终确认方</strong><span>${source.final_decision_maker}</span></p>
      </div>
      <p class="boundary-note">${source.boundary_note}</p>
      <a href="${source.url}" target="_blank" rel="noreferrer">打开来源链接</a>
    </article>
  `;
}

function renderQuestionGenerator() {
  const questions = buildQuestions();
  const context = buildQuestionContext();
  return `
    <section class="panel">
      <button class="link-btn" data-page="P3">← 返回住处与材料结果</button>
      <p class="eyebrow">P5 咨询问题生成器 / 兜底入口</p>
      <h1>不能替你下结论，但可以帮你问对问题</h1>
      ${renderQuestionRoutingCard(context)}
      <div class="context-card">
        <h2>当前情境</h2>
        <div class="mini-meta">
          <span>${context.phaseText}</span>
          <span>${context.livingText}</span>
          <span>${context.purposeText}</span>
          <span>${context.materialText}</span>
        </div>
        <p>${isFamilyPersona() ? "建议联系顺序：先问 1823 确认政府入口，再按具体事项联系 IFSC、HAD 新来港服务或目标银行。这里不判断资格，只帮你把问题问清楚。" : "建议联系顺序：先问本校应该找哪个办公室，再按具体用途问政府部门或目标银行。学校样例来源只示范入口类型，不代表系统覆盖所有学校。"}</p>
      </div>
      ${renderApiStatus("questions")}
      <div class="question-grid">${questions.map(renderQuestion).join("")}</div>
      <div class="fallbacks">
        ${(isFamilyPersona() ? ["1823 政府查询", "HAD 新来港服务", "IFSC", "目标银行", "18222 防骗咨询", "999 紧急服务", "HA / HA Go"] : ["本校学生事务处", "宿舍办公室 / Registry", "1823 政府查询", "目标银行", "18222 防骗咨询", "999 紧急服务", "NGO / IFSC"])
          .map((item) => `<span>${item}</span>`)
          .join("")}
      </div>
      <div class="button-row">
        <button class="secondary" data-action="polish-questions">${state.api.isLoading ? "润色中..." : "模拟 AI 润色问题"}</button>
        <button class="primary" data-action="complete-loop">保存到任务并回路线图</button>
        <button class="secondary" data-page="P4">查看来源</button>
      </div>
    </section>
  `;
}

function buildQuestionContext() {
  const materialText = state.matcher.materials.map((item) => labels.material[item] || item).join("、") || "暂无文件";
  const livingText = labels.living[state.matcher.living_status] || "未确定";
  const purposeText = state.matcher.purposes.map((item) => labels.purpose[item] || item).join(" / ");
  const phaseText = labels.phase[state.matcher.arrival_phase] || "抵港阶段未确定";
  return { materialText, livingText, purposeText, phaseText };
}

function buildQuestions() {
  return state.api.polishedQuestions || buildTemplateQuestions();
}

function buildTemplateQuestions() {
  const context = buildQuestionContext();
  const templates = isFamilyPersona() ? familyQuestionTemplates : state.templates;
  return templates
    .slice()
    .sort((a, b) => (a.priority_order || 99) - (b.priority_order || 99))
    .map((template) => ({
      ...template,
      text: template.template_text
        .replaceAll("【材料列表】", context.materialText)
        .replaceAll("【居住状态】", context.livingText)
        .replaceAll("【用途】", context.purposeText)
        .replaceAll("【抵港阶段】", context.phaseText)
    }));
}

function renderApiStatus(kind) {
  const run = kind === "profile" ? state.api.lastProfileRun : state.api.lastQuestionRun;
  const title = kind === "profile" ? "P0 API 增强位：自然语言解析" : "P5 API 增强位：咨询问题润色";
  const emptyText =
    kind === "profile"
      ? "当前还没调用增强位。点击后会模拟 HKGAI Modelhub 把输入拆成结构化画像；真实 API 失败时也会保留本地路线图。"
      : "当前先展示模板问题。点击后会模拟 HKGAI Modelhub 润色语气；真实 API 不能改变材料边界和最终确认方。";

  if (!run) {
    return `
      <div class="api-card idle">
        <strong>${title}</strong>
        <p>${emptyText}</p>
        <span>状态：等待调用 · fallback ready</span>
      </div>
    `;
  }

  return `
    <div class="api-card">
      <strong>${title}</strong>
      <p>${run.reason}</p>
      <div class="mini-meta">
        <span>mode: ${run.mode}</span>
        <span>provider: ${run.provider}</span>
        <span>live_api: ${run.used_live_api ? "true" : "false"}</span>
      </div>
      ${run.inferred ? `<p>${run.inferred.summary}</p>` : ""}
    </div>
  `;
}

async function runProfileEnhancement() {
  state.profile.input = document.querySelector("#profileInput")?.value || state.profile.input;
  state.api.isLoading = true;
  render();
  const result = await enhanceProfileInput(state.profile);
  state.api.lastProfileRun = result;
  state.profile = { ...state.profile, ...result.inferred };
  state.api.isLoading = false;
  render();
}

async function runQuestionPolish() {
  const context = buildQuestionContext();
  const baseQuestions = buildTemplateQuestions();
  state.api.isLoading = true;
  render();
  const result = await polishConsultationQuestions(baseQuestions, context);
  state.api.lastQuestionRun = result;
  state.api.polishedQuestions = result.questions;
  state.api.isLoading = false;
  render();
}
function renderQuestion(question) {
  return `
    <article class="question-card">
      <div class="rule-head">
        <div>
          <p class="eyebrow">建议 ${question.priority_order || ""}</p>
          <h3>${question.target_label}</h3>
        </div>
        <button class="ghost small" data-copy="${encodeURIComponent(question.text)}">${state.copied ? "已复制" : "复制"}</button>
      </div>
      <p>${question.why_contact}</p>
      <details open>
        <summary>要确认什么</summary>
        <ul>${(question.confirm_checklist || []).map((item) => `<li>${item}</li>`).join("")}</ul>
      </details>
      <div class="question-text">${question.text}</div>
      <div class="mini-meta">${question.fallback_channels.map((item) => `<span>${item}</span>`).join("")}</div>
    </article>
  `;
}

function bindEvents() {
  document.querySelector(".visible-setup")?.addEventListener("click", (event) => {
    const profileButton = event.target.closest("[data-profile]");
    if (profileButton) {
      applyPersona(profileButton.dataset.profile);
      render();
      return;
    }

    const stageButton = event.target.closest("[data-stage]");
    if (stageButton) {
      state.profile.arrival_stage = stageButton.dataset.stage;
      if (!shouldShowPrepCompletion()) state.completedPrepTaskIds = [];
      syncProfileInput();
      render();
    }
  });
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.page));
  });
  document.querySelector("[data-action='go-roadmap']")?.addEventListener("click", () => {
    state.profile.input = document.querySelector("#profileInput").value;
    setPage("P1");
  });
  document.querySelector("[data-action='enhance-profile']")?.addEventListener("click", runProfileEnhancement);
  document.querySelector("[data-action='simulate-voice']")?.addEventListener("click", simulateVoiceInput);
  document.querySelector("[data-action='complete-loop']")?.addEventListener("click", completeAddressLoop);
  document.querySelector("[data-action='polish-questions']")?.addEventListener("click", runQuestionPolish);
  document.querySelector("[data-action='open-source-current']")?.addEventListener("click", () => {
    openSources(isFamilyPersona()
      ? ["HK-S-208-1823-CONTACT", "HK-S-502-SWD-IFSC", "HK-S-503-HAD-NEW-ARRIVALS"]
      : ["HK-S-003", "HK-S-209-IMMD-HKID", "HK-S-211-HKMA-ACCOUNT-INFO"]);
  });
  document.querySelectorAll("[data-open-task]").forEach((button) => {
    button.addEventListener("click", () => openTask(button.dataset.openTask));
  });
  document.querySelectorAll("[data-open-sources]").forEach((button) => {
    button.addEventListener("click", () => openSources(button.dataset.openSources.split(",")));
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      state.language = button.dataset.language;
      syncProfileInput();
      render();
    });
  });

  document.querySelectorAll("[data-prep-done]").forEach((input) => {
    input.addEventListener("change", () => {
      const taskId = input.dataset.prepDone;
      const completedPrepTaskIds = state.completedPrepTaskIds || [];
      state.completedPrepTaskIds = input.checked
        ? [...new Set([...completedPrepTaskIds, taskId])]
        : completedPrepTaskIds.filter((item) => item !== taskId);
      render();
    });
  });
  document.querySelectorAll("[data-living]").forEach((button) => {
    button.addEventListener("click", () => updateMatcher("living_status", button.dataset.living));
  });
  document.querySelectorAll("[data-phase]").forEach((button) => {
    button.addEventListener("click", () => updateMatcher("arrival_phase", button.dataset.phase));
  });
  document.querySelectorAll("[data-check-key]").forEach((input) => {
    input.addEventListener("change", () => updateMatcher(input.dataset.checkKey, input.dataset.checkValue, input.checked));
  });
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const text = decodeURIComponent(button.dataset.copy);
      try {
        await navigator.clipboard.writeText(text);
        state.copied = true;
      } catch {
        window.prompt("复制以下问题", text);
      }
      render();
    });
  });
}

boot().catch((error) => {
  app.innerHTML = `<main class="main"><section class="panel"><h1>Demo 加载失败</h1><p>${error.message}</p></section></main>`;
});
