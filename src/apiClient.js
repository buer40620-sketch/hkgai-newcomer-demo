const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function enhanceProfileInput(profile) {
  await sleep(520);

  const input = profile.input || "";
  const inferred = {
    user_group: input.includes("读研") || input.includes("学生") ? "内地来港读研学生" : profile.user_group,
    arrival_stage: input.includes("第一周") ? "抵港第一周" : profile.arrival_stage,
    main_blocker: input.includes("租房") || input.includes("住") ? "住处与材料" : "第一月任务顺序",
    intent_tags: inferTags(input),
    summary: "已把自然语言输入拆成用户身份、抵港阶段、主要卡点和任务意图。当前为本地 mock fallback，后续可替换为 HKGAI Modelhub 返回。"
  };

  return {
    mode: "mock_fallback",
    provider: "local-api-adapter",
    used_live_api: false,
    reason: "未配置后端和 HKGAI 凭证；GitHub Pages 版本不能暴露 API Key。",
    inferred
  };
}

export async function polishConsultationQuestions(questions, context) {
  await sleep(520);

  return {
    mode: "mock_fallback",
    provider: "local-api-adapter",
    used_live_api: false,
    reason: "当前使用本地模板润色；真实接入时可由 HKGAI Modelhub 改写语气，但不能改变风险边界。",
    questions: questions.map((question) => ({
      ...question,
      text: [
        "【可直接发送】",
        question.text,
        "",
        `补充背景：我目前处于${context.phaseText}，住处状态是${context.livingText}。请以贵机构最新要求为准，如需转介也请告知正确入口。`
      ].join("\n")
    }))
  };
}

function inferTags(input) {
  const tags = [];
  if (input.includes("电话") || input.includes("验证码")) tags.push("telecom");
  if (input.includes("租房") || input.includes("住")) tags.push("housing_materials");
  if (input.includes("银行") || input.includes("开户")) tags.push("bank_account");
  if (input.includes("HKID") || input.includes("身份证")) tags.push("hkid");
  if (input.includes("第一周") || input.includes("到港")) tags.push("first_week_plan");
  return tags.length ? tags : ["first_month_plan"];
}
