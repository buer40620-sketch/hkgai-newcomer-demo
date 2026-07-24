import { enhanceProfileInput, polishConsultationQuestions } from "./apiClient.js";

const app = document.querySelector("#app");

const state = {
  page: "P0",
  selectedTaskId: "housing_materials_001",
  selectedSourceIds: [],
  previousPage: "P1",
  tasks: [],
  sources: [],
  rules: [],
  templates: [],
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
  lastSavedSummary: null,
  api: {
    isLoading: false,
    lastProfileRun: null,
    lastQuestionRun: null,
    polishedQuestions: null
  }
};



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

function focusBadges() {
  return currentPersona().focusBadges || widthEnhancementBadges;
}

function taskBadge(taskId) {
  return focusBadges()[taskId];
}

function applyPersona(userGroup) {
  const persona = personaConfigs[userGroup] || personaConfigs["内地来港读研学生"];
  state.profile.user_group = persona.userGroup;
  state.profile.arrival_stage = persona.arrivalStage || state.profile.arrival_stage;
  state.profile.main_blocker = persona.mainBlocker || state.profile.main_blocker;
  state.profile.input = persona.input || state.profile.input;
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
  const [tasks, sources, rules, templates] = await Promise.all([
    fetchJson("./src/data/tasks.json"),
    fetchJson("./src/data/sources.json"),
    fetchJson("./src/data/address_proof_rules.json"),
    fetchJson("./src/data/question_templates.json")
  ]);

  state.tasks = tasks;
  state.sources = sources;
  state.rules = rules;
  state.templates = templates;
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
    S: "官方 / 法定机构",
    A: isFamilyPersona() ? "机构样例 / 公共机构" : "学校 / 公共机构",
    B: "NGO / 服务机构",
    C: "国际案例",
    D: "痛点线索"
  }[level] || "需确认来源";
}

function describeSourceType(type) {
  return {
    government_hotline: "政府查询入口",
    government_department: "政府部门入口",
    government_enquiry: "政府兜底查询",
    statutory_body: "法定机构说明",
    school_housing: isFamilyPersona() ? "机构住处材料样例" : "学校宿舍 / 住处材料",
    school_student_affairs: isFamilyPersona() ? "机构服务入口" : "学校学生事务"
  }[type] || "可信来源";
}

function groupSources(sources) {
  const groups = [
    ["官方 / 法定机构", sources.filter((source) => source.source_level === "S")],
    [isFamilyPersona() ? "机构样例 / 公共来源" : "学校样例 / 机构来源", sources.filter((source) => source.source_level === "A")],
    ["服务与人工兜底", sources.filter((source) => !["S", "A"].includes(source.source_level))]
  ].filter(([, items]) => items.length);
  return groups.length ? groups : [["当前来源", sources]];
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

function renderShell(content) {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div>
          <div class="brand">港话通</div>
          <p class="muted">新来港第一月任务导航</p>
        </div>
        <nav class="stepper" aria-label="Demo flow">
          ${["P0", "P1", "P2", "P3", "P4", "P5"]
            .map((page) => `<button class="step ${state.page === page ? "active" : ""}" data-page="${page}">${page}</button>`)
            .join("")}
        </nav>
        <div class="note">
          主线保底使用本地 mock。第 9 步先加入 API 适配层：可增强 P0 解析和 P5 问题润色，失败时自动回退。
        </div>
      </aside>
      <main class="main">${content}</main>
    </div>
  `;
}

function renderWelcome() {
  const persona = currentPersona();
  const profileOptions = ["内地来港读研学生", "新移民 / 来港家庭", "高才通 / 专才", "我帮家人办理"];
  return `
    <section class="panel hero-panel">
      <p class="eyebrow">P0 欢迎 / 身份选择</p>
      <h1>${persona.welcomeTitle}</h1>
      <textarea id="profileInput">${state.profile.input}</textarea>
      <div class="choice-row" aria-label="用户身份">
        ${profileOptions
          .map((item) => `<button class="chip ${item === state.profile.user_group ? "selected" : ""}" data-profile="${item}">${item}</button>`)
          .join("")}
      </div>
      <div class="choice-row" aria-label="抵港阶段">
        ${["抵港前", "刚抵港", "抵港第一周", "第一月"]
          .map((item) => `<button class="chip ${item === state.profile.arrival_stage ? "selected" : ""}" data-stage="${item}">${item}</button>`)
          .join("")}
      </div>
      <div class="trust-strip">
        <strong>可信提示</strong>
        <span>答案会标注官方来源、最终确认方和需要确认的边界。</span>
      </div>
      ${renderApiStatus("profile")}
      <div class="button-row">
        <button class="secondary" data-action="enhance-profile">${state.api.isLoading ? "解析中..." : "模拟 HKGAI 解析"}</button>
        <button class="primary" data-action="go-roadmap">生成我的路线图</button>
      </div>
    </section>
  `;
}

function renderRoadmap() {
  const persona = currentPersona();
  const timeline = persona.timeline || personaConfigs["内地来港读研学生"].timeline;
  return `
    <section class="page-head">
      <p class="eyebrow">P1 第一月任务路线图</p>
      <h1>${state.profile.user_group} · ${state.profile.arrival_stage}</h1>
      <p class="subtle">${persona.roadmapIntro}</p>
      <div class="stats">
        ${persona.stats.map((item) => `<span>${item}</span>`).join("")}
      </div>
      <div class="route-strip">
        ${persona.routeLabels.map((item, index) => `<span class="${index === persona.routeLabels.length - 1 ? "deep-step" : ""}">${item}</span>`).join("")}
      </div>
    </section>
    ${renderWidthSummary()}
    ${renderTaskMap(timeline)}
    ${timeline
      .map(([stage, title, desc]) => {
        const tasks = tasksForCurrentPersona().filter((task) => task.stage === stage);
        return `
          <section class="section-band">
            <div class="section-title"><div><h2>${title}</h2><p class="subtle">${desc}</p></div><button class="ghost" data-action="open-source-current">查看路线图来源</button></div>
            <div class="task-grid ${stage === "first_month" ? "compact" : "featured"}">${tasks.map(renderTaskCard).join("")}</div>
          </section>
        `;
      })
      .join("")}
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

function renderTaskMap(timeline) {
  return `
    <section class="task-map" aria-label="第一月任务地图">
      <div class="section-title">
        <div>
          <p class="eyebrow">任务地图 / 轻探索版</p>
          <h2>${currentPersona().mapTitle}</h2>
          <p class="subtle">${currentPersona().mapText}</p>
        </div>
      </div>
      <div class="map-lanes">
        ${timeline
          .map(([stage, title]) => {
            const tasks = tasksForCurrentPersona().filter((task) => task.stage === stage);
            return `
              <div class="map-lane">
                <div class="map-stage">${title}</div>
                <div class="map-nodes">
                  ${tasks
                    .map(
                      (task, index) => `
                        <button class="map-node ${task.task_depth === "deep" ? "deep-node" : ""} ${taskBadge(task.task_id) ? "width-node" : ""} ${task.risk_level}" data-open-task="${task.task_id}">
                          <span>${index + 1}</span>
                          <strong>${task.title}</strong>
                          ${taskBadge(task.task_id) ? `<em>${taskBadge(task.task_id).short}</em>` : ""}
                          <small>${labels.status[task.status]}</small>
                        </button>
                      `
                    )
                    .join("")}
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
        ${completed ? '<span class="badge done">已生成咨询问题</span>' : ""}
      </div>
      <h3>${task.title}</h3>
      <p>${task.summary}</p>
      ${completed ? renderSavedSummary() : ""}
      <div class="mini-meta">
        <span>${labels.stage[task.stage]}</span>
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
        <p class="subtle">当前阶段：${labels.phase[state.matcher.arrival_phase]}；住处状态：${labels.living[state.matcher.living_status]}。已匹配 ${state.matcher.matchedRules.length} 条材料规则，全部输出 <code>needs_confirm</code>。</p>
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
  return `
    <section class="drawer-page">
      <div class="source-drawer">
        <button class="link-btn" data-page="${state.previousPage || "P1"}">← 返回上一页</button>
        <p class="eyebrow">P4 可信来源抽屉</p>
        <h1>为什么这条建议可信，但仍需机构确认</h1>
        <p class="lead">当前任务：${task?.title || "第一月路线图"}</p>
        <div class="source-summary">
          <div><strong>${sources.length}</strong><span>条来源</span></div>
          <div><strong>${sources.filter((source) => source.source_level === "S").length}</strong><span>S 级官方/法定</span></div>
          <div><strong>${sources.filter((source) => source.source_level === "A").length}</strong><span>A 级机构样例</span></div>
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
        <div class="button-row">
          <button class="primary" data-page="P5">生成咨询问题</button>
          <button class="secondary" data-page="P1">回路线图</button>
        </div>
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
      <div class="mini-meta">${source.task_tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
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
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.page));
  });
  document.querySelector("[data-action='go-roadmap']")?.addEventListener("click", () => {
    state.profile.input = document.querySelector("#profileInput").value;
    setPage("P1");
  });
  document.querySelector("[data-action='enhance-profile']")?.addEventListener("click", runProfileEnhancement);
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
  document.querySelectorAll("[data-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      applyPersona(button.dataset.profile);
      render();
    });
  });
  document.querySelectorAll("[data-stage]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.arrival_stage = button.dataset.stage;
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





