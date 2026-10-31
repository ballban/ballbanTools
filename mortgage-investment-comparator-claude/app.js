'use strict';
// ---------- Parameter schema ----------
// scope "preset": value comes from the selected scenario preset.
// scope "global": shared across scenarios (loan terms, markets, evaluation settings).
const GROUPS = [
  { id: 'property', title: '房产（物件）', open: true },
  { id: 'loan', title: '房贷（住宅ローン）', open: true },
  { id: 'own', title: '持有成本（維持費）', open: false },
  { id: 'rent', title: '租房（賃貸）', open: true },
  { id: 'invest', title: '差额投资', open: true },
  { id: 'eval', title: '经济环境与评估', open: false },
];

const PARAMS = [
  // Property
  { id: 'price', g: 'property', scope: 'preset', label: '购房价格', unit: '万円', step: 100, min: 0 },
  { id: 'landShare', g: 'property', scope: 'preset', label: '土地占房价比例', unit: '%', step: 1, min: 0, max: 100,
    help: '土地部分不折旧，随地价涨跌；建筑部分随房龄折旧。' },
  { id: 'buildingAge', g: 'property', scope: 'preset', label: '购入时房龄', unit: '年', step: 1, min: 0, int: true },
  { id: 'usefulLife', g: 'property', scope: 'preset', label: '建筑价值年限', unit: '年', step: 1, min: 1, int: true,
    help: '建筑市值（线性）降到残值时的房龄。参考税法耐用年限：钢筋混凝土 47 年，木造 22 年。' },
  { id: 'residualPct', g: 'property', scope: 'preset', label: '建筑残值', unit: '% 新建价', step: 1, min: 0, max: 100 },
  { id: 'newPremium', g: 'property', scope: 'preset', label: '买入后立即贬值', unit: '%', step: 1, min: 0, max: 50,
    help: '新房溢价（新築プレミアム）：开发商利润和销售费用，转手时二手买家不会为此买单。' },
  { id: 'purchaseCostPct', g: 'property', scope: 'preset', label: '购房杂费（諸費用）', unit: '% 房价', step: 0.5, min: 0,
    help: '登记费、贷款手续费、中介费（二手房为 3%+6 万+消费税）、印花税、不动产取得税、修缮基金一次性缴纳等。' },
  { id: 'renovation', g: 'property', scope: 'preset', label: '购入时装修费', unit: '万円', step: 50, min: 0 },
  { id: 'landGrowth', g: 'property', scope: 'preset', label: '地价涨幅', unit: '%/年', step: 0.1 },
  { id: 'buildingGrowth', g: 'property', scope: 'global', label: '建筑造价涨幅', unit: '%/年', step: 0.1,
    help: '推高（正在折旧的）建筑的重置价值。' },

  // Loan
  { id: 'downPaymentPct', g: 'loan', scope: 'global', label: '首付（頭金）', unit: '% 房价', step: 5, min: 0, max: 100,
    help: '购房杂费另外用现金支付。' },
  { id: 'loanYears', g: 'loan', scope: 'global', label: '贷款年限', unit: '年', step: 1, min: 1, max: 50, int: true },
  { id: 'rateMode', g: 'loan', scope: 'global', label: '利率类型', type: 'select',
    options: [['variable', '浮动利率（変動）'], ['fixed', '固定利率（Flat 35）']] },
  { id: 'rateInitial', g: 'loan', scope: 'global', label: '第 1 年利率', unit: '%', step: 0.05, min: 0,
    help: '2026 年 10 月：大银行浮动利率（优惠后）约 1.2–1.7%；Flat 35（21–35 年期）3.83%。切换利率类型时会自动填入该类型的典型利率。' },
  { id: 'rateRise', g: 'loan', scope: 'global', label: '浮动：每年变化', unit: '百分点/年', step: 0.01, variableOnly: true,
    help: '每年重新计算月供（忽略“5 年规则 / 125% 规则”）。默认路径升至 2.8%，假设日银政策利率（2026 年 9 月为 1.25%）升至 2% 左右。' },
  { id: 'rateCap', g: 'loan', scope: 'global', label: '浮动：利率上限', unit: '%', step: 0.1, min: 0, variableOnly: true },
  { id: 'dedYears', g: 'loan', scope: 'preset', label: '房贷减税期限（住宅ローン控除）', unit: '年', step: 1, min: 0, int: true },
  { id: 'dedCap', g: 'loan', scope: 'preset', label: '减税：贷款余额上限', unit: '万円', step: 500, min: 0 },
  { id: 'dedRate', g: 'loan', scope: 'global', label: '减税比例', unit: '% 余额', step: 0.1, min: 0 },
  { id: 'taxCapacity', g: 'loan', scope: 'global', label: '每年可抵扣的税额', unit: '万円/年', step: 5, min: 0,
    help: '上限 = 所得税 + 最多 9.75 万的住民税，取决于家庭收入。' },

  // Owner running costs
  { id: 'mgmtFee', g: 'own', scope: 'preset', label: '管理费（管理費）', unit: '万円/月', step: 0.1, min: 0,
    help: '仅公寓。随通胀上涨。' },
  { id: 'repairFund', g: 'own', scope: 'preset', label: '修缮基金（修繕積立金）', unit: '万円/月', step: 0.1, min: 0,
    help: '仅公寓。新建公寓起步低，之后分阶段上调（段階増額）。' },
  { id: 'repairFundGrowth', g: 'own', scope: 'preset', label: '修缮基金涨幅', unit: '%/年', step: 0.5 },
  { id: 'propTaxPct', g: 'own', scope: 'preset', label: '固定资产税 + 都市计划税', unit: '% 房价/年', step: 0.01, min: 0,
    help: '新房减税前的第 1 年税额，按占购房价格的百分比计。' },
  { id: 'taxReliefYears', g: 'own', scope: 'preset', label: '新房减税期限', unit: '年', step: 1, min: 0, int: true,
    help: '建筑部分税额减半：独栋 3 年、公寓 5 年；長期優良住宅再加 2 年。' },
  { id: 'taxReliefPct', g: 'own', scope: 'preset', label: '减税期内税额减少', unit: '% 税额', step: 1, min: 0, max: 100 },
  { id: 'propTaxTrend', g: 'own', scope: 'preset', label: '房产税每年变化', unit: '%/年', step: 0.1,
    help: '建筑评估额随房龄下降，土地评估额随地价变化。' },
  { id: 'insurance', g: 'own', scope: 'preset', label: '火灾保险 + 地震保险', unit: '万円/年', step: 0.5, min: 0 },
  { id: 'maintenance', g: 'own', scope: 'preset', label: '日常维护（业主自付）', unit: '万円/年', step: 1, min: 0,
    help: '热水器、家电、壁纸、小修小补等。随通胀上涨。' },
  { id: 'majorFirstAge', g: 'own', scope: 'preset', label: '大修：首次大修时的房龄', unit: '年', step: 1, min: 1, int: true },
  { id: 'majorInterval', g: 'own', scope: 'preset', label: '大修：之后每隔', unit: '年', step: 1, min: 0, int: true },
  { id: 'majorCost', g: 'own', scope: 'preset', label: '大修：每次费用（按现价）', unit: '万円', step: 10, min: 0,
    help: '独栋：屋顶、外墙、给排水。公寓：室内翻新（厨房、浴室、户内管道）。' },

  // Renting
  { id: 'rent', g: 'rent', scope: 'preset', label: '同等房屋的月租', unit: '万円/月', step: 0.5, min: 0,
    help: '与所购房屋的面积、地段、品质相同。' },
  { id: 'rentGrowth', g: 'rent', scope: 'preset', label: '房租涨幅', unit: '%/年', step: 0.1,
    help: '同一套房随房龄增长的租金变化。1995–2025 年 CPI 房租基本持平，而 2026 年挂牌租金同比上涨 8–11%。' },
  { id: 'moveInMonths', g: 'rent', scope: 'preset', label: '入住时不退还的费用', unit: '个月房租', step: 0.5, min: 0,
    help: '礼金 + 中介费 + 担保公司费用 + 换锁费等。押金（敷金）假设会退还。' },
  { id: 'renewalMonths', g: 'rent', scope: 'preset', label: '续约费（更新料，每 2 年）', unit: '个月房租', step: 0.5, min: 0 },
  { id: 'moveInterval', g: 'rent', scope: 'global', label: '租房者每隔几年搬家', unit: '年', step: 1, min: 0, int: true,
    help: '0 = 不搬家。每次搬家都要再付搬家费和入住费用。' },
  { id: 'movingCost', g: 'rent', scope: 'global', label: '每次搬家费用（按现价）', unit: '万円', step: 5, min: 0 },
  { id: 'lifeInsPct', g: 'rent', scope: 'global', label: '租房者寿险（对标团信）', unit: '% 贷款/年', step: 0.05, min: 0,
    help: '买房者身故时，贷款由团信（団信，已含在利率中）清偿。租房者需要购买保额相当的定期寿险。' },

  // Investing
  { id: 'returnPct', g: 'invest', scope: 'global', label: '投资收益率（扣除费用后）', unit: '%/年', step: 0.1,
    help: '名义年化（几何平均）收益率，例如全球股票指数基金；也是蒙特卡洛模拟的中位路径。MSCI ACWI（日元计）2000 年以来约 8.8%/年，部分得益于日元贬值。' },
  { id: 'volPct', g: 'invest', scope: 'global', label: '波动率（蒙特卡洛）', unit: '%/年', step: 1, min: 0 },
  { id: 'nisaLifetime', g: 'invest', scope: 'global', label: 'NISA 终身额度（家庭）', unit: '万円', step: 100, min: 0,
    help: '每个成年人 1,800 万（夫妻合计 3,600 万、每年 720 万）。NISA 内的收益免税，超出部分进入课税账户。' },
  { id: 'nisaAnnual', g: 'invest', scope: 'global', label: 'NISA 年度额度（家庭）', unit: '万円/年', step: 10, min: 0 },
  { id: 'gainsTax', g: 'invest', scope: 'global', label: 'NISA 以外的收益税率', unit: '%', step: 0.001, min: 0 },
  { id: 'mcRuns', g: 'invest', scope: 'global', label: '蒙特卡洛模拟次数', unit: '条路径', step: 100, min: 0, max: 5000, int: true,
    help: '0 = 不模拟市场波动。' },

  // Evaluation
  { id: 'horizon', g: 'eval', scope: 'global', label: '评估期', unit: '年', step: 1, min: 1, max: 60, int: true },
  { id: 'startAge', g: 'eval', scope: 'global', label: '购房时年龄', unit: '岁', step: 1, min: 18, int: true },
  { id: 'inflation', g: 'eval', scope: 'global', label: '通胀率（CPI）', unit: '%/年', step: 0.1,
    help: '用于管理费、保险、维护、维修和搬家费用的上涨，以及换算成今日币值。1995–2025 年 CPI 平均约 0.5%/年；日银目标 2%。' },
  { id: 'sellCostPct', g: 'eval', scope: 'global', label: '卖房费用', unit: '% 市值', step: 0.5, min: 0 },
  { id: 'liquidate', g: 'eval', scope: 'global', type: 'check', label: '按变现口径计算：房产扣除卖房费用，课税账户扣除收益税' },
  { id: 'realTerms', g: 'eval', scope: 'global', type: 'check', label: '按今日币值显示（扣除通胀）' },
];
const PARAM_BY_ID = Object.fromEntries(PARAMS.map(p => [p.id, p]));

// ---------- Formatting helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function man(v, digits = 0) {
  if (!isFinite(v)) return '—';
  return (Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function big(v) {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 10000) return (v / 10000).toFixed(a >= 100000 ? 1 : 2) + '億円';
  return man(v) + '万円';
}
function signed(v) { return (v >= 0 ? '+' : '−') + big(Math.abs(v)); }
function pct(v, d = 1) { return (v * 100).toFixed(d) + '%'; }

// ---------- Defaults & scenario presets ----------
// Typical year-1 rate per rate type (Oct 2026): major-bank variable after discounts / Flat 35 (21–35-year term).
const TYPICAL_RATE = { variable: 1.3, fixed: 3.83 };
const DEFAULTS = {
  buildingGrowth: 1.5, downPaymentPct: 10, loanYears: 35, rateMode: 'variable', rateInitial: TYPICAL_RATE.variable, rateRise: 0.1, rateCap: 2.8,
  dedRate: 0.7, taxCapacity: 30, moveInterval: 8, movingCost: 20, lifeInsPct: 0.1,
  returnPct: 5, volPct: 18, nisaLifetime: 1800, nisaAnnual: 360, gainsTax: 20.315, mcRuns: 1000,
  horizon: 35, startAge: 35, inflation: 1.5, sellCostPct: 4, liquidate: true, realTerms: false,
};

// Prices: 不動産経済研究所 (new condos) and REINS (resales, new ready-built houses), calendar 2025.
// Building depreciation fitted to REINS price-by-age bands: condo 40 years to 10%, wooden house 35 years to 0.
const PRESETS = {
  'capital-condo-new': { title: '首都圈 · 公寓 · 新房',
    note: '2025 年首都圈新建公寓均价：9,182 万，66㎡（139 万/㎡；东京 23 区为 1.36 亿）。' +
      '首都圈新建公寓每 70㎡ 每月约管理费 2.2 万 + 修缮基金 1.0 万，修缮基金会逐步上调。' +
      '房租：首都圈公寓租金约 4,300 円/㎡（2026 年 9 月）→ 28 万（毛租金回报率 3.7%）。' +
      '减税上限按 ZEH 水准住宅计：3,500 万（有孩子或年轻夫妇家庭为 4,500 万）。',
    values: {
      price: 9200, landShare: 30, buildingAge: 0, usefulLife: 40, residualPct: 10, newPremium: 5, purchaseCostPct: 4.5, renovation: 0, landGrowth: 1.0,
      dedYears: 13, dedCap: 3500, mgmtFee: 2.0, repairFund: 1.0, repairFundGrowth: 3.5, propTaxPct: 0.4, taxReliefYears: 5, taxReliefPct: 35, propTaxTrend: -1.5,
      insurance: 3, maintenance: 5, majorFirstAge: 25, majorInterval: 25, majorCost: 250, rent: 28, rentGrowth: 1.0, moveInMonths: 2, renewalMonths: 1 } },
  'capital-condo-used': { title: '首都圈 · 公寓 · 二手',
    note: '2025 年首都圈二手公寓平均成交：5,200 万，62.7㎡，房龄 26.6 年。' +
      '这个房龄通常需要翻新（厨房、浴室、地板）→ 购入时装修 300 万。' +
      '老房租金约 3,350 円/㎡ → 21 万（毛租金回报率 4.8%）。' +
      '普通二手房减税：余额上限 2,000 万，10 年。' +
      '评估期结束时房龄 62 年，房产价值和是否重建都有很大不确定性。',
    values: {
      price: 5200, landShare: 50, buildingAge: 27, usefulLife: 40, residualPct: 10, newPremium: 0, purchaseCostPct: 7, renovation: 300, landGrowth: 1.0,
      dedYears: 10, dedCap: 2000, mgmtFee: 1.3, repairFund: 1.3, repairFundGrowth: 2.5, propTaxPct: 0.35, taxReliefYears: 0, taxReliefPct: 0, propTaxTrend: -0.5,
      insurance: 2.5, maintenance: 6, majorFirstAge: 25, majorInterval: 25, majorCost: 250, rent: 21, rentGrowth: 1.0, moveInMonths: 2, renewalMonths: 1 } },
  'capital-house-new': { title: '首都圈 · 独栋 · 新房',
    note: '2025 年首都圈新建独栋（建売）平均成交：4,532 万，土地 115㎡，建筑面积 99㎡。' +
      '木造房屋 30–35 年后价值接近零，长期价值主要来自土地（郊区地价按 +0.5%/年）。' +
      '维护：屋顶、外墙、厨卫等每 15 年约 250 万，另加每年 6 万（30 年合计 400–800 万较为常见）。' +
      '房租：埼玉/千叶/神奈川的家庭型独栋约 13–20 万 → 17 万。独栋出租房源稀少，请查看当地实际房源。',
    values: {
      price: 4500, landShare: 60, buildingAge: 0, usefulLife: 35, residualPct: 0, newPremium: 8, purchaseCostPct: 7, renovation: 0, landGrowth: 0.5,
      dedYears: 13, dedCap: 3500, mgmtFee: 0, repairFund: 0, repairFundGrowth: 0, propTaxPct: 0.5, taxReliefYears: 3, taxReliefPct: 30, propTaxTrend: -2,
      insurance: 10, maintenance: 6, majorFirstAge: 15, majorInterval: 15, majorCost: 250, rent: 17, rentGrowth: 1.0, moveInMonths: 2, renewalMonths: 1 } },
  'capital-house-used': { title: '首都圈 · 独栋 · 二手',
    note: '2025 年首都圈二手独栋平均成交：3,917 万，土地 148㎡，房龄 24 年。' +
      '建筑约占房价的 17%，大约 11 年后价值归零。' +
      '购入时装修 350 万；房龄 30 年和 45 年时再做屋顶、外墙工程。' +
      '较旧的 3–4LDK 独栋房租约 14.5 万（毛租金回报率 4.4%）。',
    values: {
      price: 3900, landShare: 83, buildingAge: 24, usefulLife: 35, residualPct: 0, newPremium: 0, purchaseCostPct: 7.5, renovation: 350, landGrowth: 0.5,
      dedYears: 10, dedCap: 2000, mgmtFee: 0, repairFund: 0, repairFundGrowth: 0, propTaxPct: 0.33, taxReliefYears: 0, taxReliefPct: 0, propTaxTrend: 0.5,
      insurance: 9, maintenance: 8, majorFirstAge: 15, majorInterval: 15, majorCost: 250, rent: 14.5, rentGrowth: 1.0, moveInMonths: 2, renewalMonths: 1 } },
  'regional-condo-new': { title: '非首都圈 · 公寓 · 新房',
    note: '按大阪、名古屋、福冈这类大城市设定；小城市房价更低，地价走势也更弱。' +
      '2025 年近畿圈新建公寓均价：5,328 万，56㎡（95 万/㎡；东海约 4,450 万）。' +
      '近畿新建公寓每 70㎡ 每月约管理费 1.4 万 + 修缮基金 0.8 万。' +
      '房租：大阪市公寓约 3,450 円/㎡，名古屋约 2,300 円/㎡ → 新房 18 万（毛租金回报率 4.1%）。' +
      '续约费：大阪 0，名古屋/福冈约 0.5 个月，京都 1 个月以上。',
    values: {
      price: 5300, landShare: 25, buildingAge: 0, usefulLife: 40, residualPct: 10, newPremium: 8, purchaseCostPct: 5, renovation: 0, landGrowth: 0.5,
      dedYears: 13, dedCap: 3500, mgmtFee: 1.15, repairFund: 0.65, repairFundGrowth: 3.5, propTaxPct: 0.45, taxReliefYears: 5, taxReliefPct: 35, propTaxTrend: -1.5,
      insurance: 2.5, maintenance: 5, majorFirstAge: 25, majorInterval: 25, majorCost: 250, rent: 18, rentGrowth: 0.5, moveInMonths: 1.5, renewalMonths: 0.5 } },
  'regional-condo-used': { title: '非首都圈 · 公寓 · 二手',
    note: '2025 年二手公寓：近畿 3,124 万（67.6㎡，房龄 28 年），爱知 2,567 万 → 取 2,900 万。' +
      '老楼修缮基金较高，购入时翻新 250 万。' +
      '较旧的 68㎡ 公寓房租约 2,000 円/㎡ → 13.5 万（毛租金回报率 5.6%）。',
    values: {
      price: 2900, landShare: 47, buildingAge: 28, usefulLife: 40, residualPct: 10, newPremium: 0, purchaseCostPct: 7.5, renovation: 250, landGrowth: 0.5,
      dedYears: 10, dedCap: 2000, mgmtFee: 1.1, repairFund: 1.2, repairFundGrowth: 2.5, propTaxPct: 0.45, taxReliefYears: 0, taxReliefPct: 0, propTaxTrend: -0.5,
      insurance: 2, maintenance: 6, majorFirstAge: 25, majorInterval: 25, majorCost: 250, rent: 13.5, rentGrowth: 0.5, moveInMonths: 1.5, renewalMonths: 0.5 } },
  'regional-house-new': { title: '非首都圈 · 独栋 · 新房',
    note: '2025 年新建独栋：近畿 3,691 万，爱知 3,496 万 → 取 3,600 万。' +
      '土地较便宜，所以会折旧的建筑占比更大（55%）。' +
      '地价涨幅取 0%：大阪/名古屋住宅地 1996–2026 年平均每年下跌约 1–2%，但 2013 年以来每年上涨约 0.5–1%。' +
      '较新的 4LDK 独栋房租约 14 万（毛租金回报率 4.7%）。',
    values: {
      price: 3600, landShare: 45, buildingAge: 0, usefulLife: 35, residualPct: 0, newPremium: 10, purchaseCostPct: 7.5, renovation: 0, landGrowth: 0,
      dedYears: 13, dedCap: 3500, mgmtFee: 0, repairFund: 0, repairFundGrowth: 0, propTaxPct: 0.55, taxReliefYears: 3, taxReliefPct: 30, propTaxTrend: -2,
      insurance: 7, maintenance: 6, majorFirstAge: 15, majorInterval: 15, majorCost: 250, rent: 14, rentGrowth: 0.5, moveInMonths: 1.5, renewalMonths: 0.5 } },
  'regional-house-used': { title: '非首都圈 · 独栋 · 二手',
    note: '2025 年二手独栋：近畿 2,177 万（房龄 32 年），爱知 2,718 万 → 取 2,400 万，房龄 28 年。' +
      '建筑几乎已折旧完毕，房价基本就是地价。' +
      '购入后不久（房龄 30 年）就要做屋顶、外墙工程。' +
      '较旧的 4LDK 独栋房租约 10.5 万（毛租金回报率 5.3%）。',
    values: {
      price: 2400, landShare: 80, buildingAge: 28, usefulLife: 35, residualPct: 0, newPremium: 0, purchaseCostPct: 8, renovation: 350, landGrowth: 0,
      dedYears: 10, dedCap: 2000, mgmtFee: 0, repairFund: 0, repairFundGrowth: 0, propTaxPct: 0.38, taxReliefYears: 0, taxReliefPct: 0, propTaxTrend: 0,
      insurance: 6, maintenance: 8, majorFirstAge: 15, majorInterval: 15, majorCost: 250, rent: 10.5, rentGrowth: 0.5, moveInMonths: 1.5, renewalMonths: 0.5 } },
};

const METHOD_HTML = `
<h2>模型说明</h2>
<h3>两个家庭的预算相同</h3>
<ul>
  <li><b>买房每年的住房支出</b> = 房贷还款 + 管理费 + 修缮基金 + 固定资产税 + 保险 + 日常维护 + 大修 − 房贷减税。</li>
  <li><b>租房每年的住房支出</b> = 房租 + 续约费 + 搬家时的搬家费和入住费用 + 用来替代团信的定期寿险。</li>
  <li>每年两个家庭的预算相同，都等于两者支出中较高的那个，支出较少的一方把差额拿去投资。
    买房更贵时，这正是“把买房的钱拿去付房租，剩下的投资”。
    租房更贵时（在当前的低利率下很常见，房贷还清后则必然如此），由买房一方投资差额，这样双方都不会出现赤字。</li>
  <li>购房时，买房者支付首付、购房杂费和装修费；租房者支付入住费用，并把剩下的钱拿去投资。</li>
</ul>
<h3>房产价值</h3>
<ul>
  <li>土地部分按地价涨幅变化。建筑部分在“建筑价值年限”内线性降到残值，同时其重置价值随建筑造价上涨。</li>
  <li>新房买入后立即损失新房溢价。二手房从同一条折旧曲线的中途开始。</li>
  <li>按变现口径时，房产按扣除卖房费用后的价值计算，课税投资账户按扣除收益税后的价值计算。</li>
</ul>
<h3>房贷、减税与投资</h3>
<ul>
  <li>按月等额本息还款（元利均等）。浮动利率每年调整一次并重新计算月供；“5 年规则 / 125% 规则”只影响还款时间，因此忽略。</li>
  <li>房贷减税 = 减税比例 × 年末贷款余额（不超过上限），且不超过实际缴纳的税额。</li>
  <li>投资的钱先放进 NISA（受年度和终身额度限制，收益免税），超出部分进入课税账户。投入时间在一年中均匀分布。</li>
  <li>蒙特卡洛模拟：年收益率服从对数正态分布，中位数等于设定的收益率。房租、房价和利率仍按设定路径变化，所以区间只反映投资部分的市场风险。</li>
</ul>
<h3>模型未包含的因素，需要自行权衡</h3>
<ul>
  <li><b>评估期之后</b>：买房者只需负担持有成本，租房者却要终身付房租。可以把评估期设为 45–55 年来覆盖老年阶段。年纪大了以后，租房签约也可能变难。</li>
  <li><b>执行力</b>：租房者必须每年坚持投资差额，并在市场暴跌时拿得住。房贷则相当于强制储蓄。</li>
  <li><b>未模拟的风险</b>：房价波动、地震和自然灾害、公寓管理问题（修缮基金不足、重建），以及在人口减少的地区出售老房。</li>
  <li><b>灵活性</b>：因工作、家庭或孩子上学需要搬家时，租房的成本更低。卖房要付约 4% 的费用，另加税费。</li>
  <li><b>同等房屋的租金</b>是最敏感的参数。与新建公寓或独栋相当的家庭型出租房很少，独栋尤其少。请查看目标地区的实际房源。</li>
  <li>未纳入：卖房时 3,000 万円的特别扣除、购房资金赠与免税、继承，以及减税上限以外的所得税细节。</li>
</ul>`;
const SOURCES = [
  ['房价与地价', [
    ['不動産経済研究所', '2025 年新建公寓市场动向（全国、首都圈、近畿）', 'https://www.fudousankeizai.co.jp/share/mansion/660/zm2025.pdf'],
    ['不動産経済研究所', '首都圈新建公寓均价长期序列', 'https://www.fudousankeizai.co.jp/60th/csv/shutoken-heikin-kakaku.csv'],
    ['東京カンテイ', '2025 年中部圈新建公寓市场', 'https://www.kantei.ne.jp/wp-content/uploads/125hakusyo-chubuM.pdf'],
    ['REINS（東日本）', '2025 年首都圈二手市场：公寓、独栋、新建独栋', 'https://www.reins.or.jp/pdf/trend/sf/sf_2025.pdf'],
    ['REINS（東日本）', '2025 年首都圈按房龄划分的成交价格（用于拟合折旧）', 'https://www.reins.or.jp/pdf/trend/rt/rt_202602.pdf'],
    ['近畿レインズ', '近畿圈年度市场报告', 'https://www.kinkireins.or.jp/nenpo/1756/'],
    ['中部レインズ', '中部圈季度市场报告（2025 年 10–12 月）', 'https://www.chubu-reins.or.jp/reinspdf/data/ks29.pdf'],
    ['住宅金融支援機構', 'Flat 35 利用者调查 2025 财年（房价、首付、年龄）', 'https://www.jhf.go.jp/about/research/loan/flat35/2025.html'],
    ['国土交通省', '2026 年地价公示：1995 年以来的逐年变动率', 'https://www.mlit.go.jp/tochi_fudousan_kensetsugyo/content/001986208.xlsx'],
  ]],
  ['持有成本', [
    ['東京カンテイ', '2025 年新建公寓管理费与修缮基金（70㎡ 换算）', 'https://www.kantei.ne.jp/wp-content/uploads/running-cost-new2025.pdf'],
    ['REINS（東日本）', '二手公寓管理费与修缮基金', 'https://www.reins.or.jp/pdf/trend/rt/rt_202605.pdf'],
    ['国土交通省', '修缮基金分阶段上调的指南', 'https://www.mlit.go.jp/report/press/house03_hh_000204.html'],
    ['東京都主税局', '固定资产税与都市计划税规则', 'https://www.tax.metro.tokyo.lg.jp/kazei/real_estate/kotei_tosi'],
    ['損害保険料率算出機構', '火灾保险参考费率调整（+13%，2024 年 10 月）', 'https://www.giroj.or.jp/news/2023/20230628_1.html'],
    ['jishin-hoken.jp', '各都道府县地震保险保费试算', 'https://www.jishin-hoken.jp/price/'],
  ]],
  ['房租与租房费用', [
    ['東京カンテイ', '各地区公寓租金（2026 年 9 月，円/㎡）', 'https://www.kantei.ne.jp/wp-content/uploads/T202609.pdf'],
    ['総務省統計局（e-Stat）', 'CPI 民营房租（1995–2025）', 'https://www.e-stat.go.jp/dbview?sid=0003427113'],
    ['日本不動産研究所', '不动产投资家调查（2025 年 10 月，住宅资本化率）', 'https://www.reinet.or.jp/wp-content/uploads/2025/11/published-document_main_the-japanese-real-estate-investor-survey_202510.pdf'],
    ['国土交通省', '2025 年住宅市场动向调查（押金、礼金、中介费）', 'https://www.mlit.go.jp/report/press/content/002012180.pdf'],
    ['日本賃貸住宅管理協会', '租赁市场景气调查（平均居住年限）', 'https://www.jpm.jp/marketdata/pdf/tankan26.pdf'],
    ['SUUMO', '家庭搬家费用行情', 'https://hikkoshi.suumo.jp/soba/type_kazoku/'],
    ['国土交通省', '住宅安全网法修订（老年人租房），2025 年 10 月', 'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk7_000054.html'],
  ]],
  ['利率、税收与投资', [
    ['日本銀行', '2026 年货币政策会议决定', 'https://www.boj.or.jp/en/mopo/mpmdeci/state_2026/index.htm'],
    ['日本銀行', '经济与物价展望（2026 年 10 月）', 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k261030b.pdf'],
    ['財務省', '国债收益率（每日）', 'https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm.csv'],
    ['住宅金融支援機構', 'Flat 35 利率历史', 'https://www.flat35.com/kinri/kinri_suii.html'],
    ['国土交通省', '房贷减税（住宅ローン減税）2026–2030', 'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk2_000017.html'],
    ['国土交通省', '中介费上限', 'https://www.mlit.go.jp/totikensangyo/const/1_6_bf_000013.html'],
    ['金融庁', 'NISA 额度', 'https://www.fsa.go.jp/policy/nisa2/know/index.html'],
    ['国税庁', '上市股票收益的税率（20.315%）', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1463.htm'],
    ['MSCI', 'MSCI ACWI（日元，净回报）资料表', 'https://www.msci.com/documents/10199/255599/msci-acwi-index-jpy-net.pdf'],
  ]],
];

const SOURCES_HTML = `
<h2>过去 30 年的数据与来源</h2>
<h3>历史数据（1995–2026）</h3>
<ul>
  <li><b>地价</b>：1996–2026 年住宅地价平均是下跌的（东京 −1.2%/年，大阪 −1.9%，名古屋 −0.6%），但 2013 年以来一直在上涨（东京 +1.4%/年，大阪 +0.5%，名古屋 +1.1%）。预设假设 +0–1%/年。</li>
  <li><b>首都圈新建公寓</b>：4,148 万（1995）→ 5,518 万（2015）→ 9,182 万（2025），主要受市中心选址、建筑成本上涨和低利率推动。</li>
  <li><b>物价与房租</b>：1995–2025 年 CPI 平均每年上涨约 0.5%，2022 年以来在 2% 以上（日银预测 2026–27 财年为 2.5–2.6%）。CPI 房租反映的是存量房随房龄变化的租金，30 年来基本持平；2026 年公寓挂牌租金同比上涨 8–11%。默认值：CPI 1.5%/年，房租 +0.5–1%/年。</li>
  <li><b>房贷利率</b>：长期固定利率约 5.5%（1995）→ 2.8%（2005）→ 1.5%（2015）→ 1.3%（2020）→ Flat 35 3.83%（2026 年 10 月）。日银政策利率 1.25%（2026 年 9 月），10 年期国债收益率 2.9%。默认浮动利率路径：从 1.3% 起每年上升 0.1 个百分点，到 2.8% 为止。</li>
  <li><b>全球股票</b>（MSCI ACWI，日元计，净回报）：2000 年以来约 8.8%/年，波动率 15–18%，部分得益于日元贬值。默认值 5%/年是刻意偏保守的取值。</li>
</ul>
<h3>数据来源</h3>
${SOURCES.map(([group, items]) => `<h4>${group}</h4><ul>` + items.map(([pub, title, url]) =>
    `<li>${pub} — <a href="${url}" target="_blank" rel="noopener">${title}</a></li>`).join('') + '</ul>').join('\n')}
<p class="sub">预设值是基于上述来源取整后的判断，不是某套具体房产的报价。</p>`;

// ---------- Simulation model ----------
// Building value ratio vs. a new building: linear decline to the residual at `life` years.
function depRatio(age, life, residual) {
  if (life <= 0 || age >= life) return residual;
  return 1 - (1 - residual) * age / life;
}

function newPortfolio() { return { nisaV: 0, nisaB: 0, taxV: 0, taxB: 0 }; }
// Adds `amount` at cost basis; `growth` lets mid-year contributions earn part of the year's return.
function contribute(pf, amount, nisaRoom, growth) {
  if (!(amount > 0)) return 0;
  const toNisa = Math.min(amount, Math.max(0, nisaRoom));
  pf.nisaV += toNisa * growth; pf.nisaB += toNisa;
  pf.taxV += (amount - toNisa) * growth; pf.taxB += amount - toNisa;
  return toNisa;
}
function portfolioValue(pf, taxRate) {
  return pf.nisaV + pf.taxV - Math.max(0, pf.taxV - pf.taxB) * taxRate;
}

// p: parameter values; returns: array of annual returns (decimal) for years 1..horizon.
function simulate(p, returns) {
  const H = Math.max(1, Math.round(p.horizon));
  const infl = p.inflation / 100;
  const sell = p.liquidate ? p.sellCostPct / 100 : 0;
  const gTax = p.liquidate ? p.gainsTax / 100 : 0;
  const price = p.price;
  const loan0 = Math.max(0, price * (1 - p.downPaymentPct / 100));
  const down = price - loan0;
  const haircut = 1 - p.newPremium / 100;
  const land0 = price * p.landShare / 100 * haircut;
  const bldg0 = price * (1 - p.landShare / 100) * haircut;
  const a0 = Math.round(p.buildingAge);
  const life = p.usefulLife, res = p.residualPct / 100;
  const dep0 = depRatio(a0, life, res);
  const loanMonths = Math.round(p.loanYears) * 12;

  const owner = newPortfolio(), renter = newPortfolio();
  let usedO = 0, usedR = 0; // NISA annual allowance used in the current year

  const ownerInit = down + price * p.purchaseCostPct / 100 + p.renovation;
  const renterInit = p.rent * p.moveInMonths;
  const budget0 = Math.max(ownerInit, renterInit);
  const room0 = Math.min(p.nisaAnnual, p.nisaLifetime);
  usedO = contribute(owner, budget0 - ownerInit, room0, 1);
  usedR = contribute(renter, budget0 - renterInit, room0, 1);

  const rows = [{
    t: 0, age: p.startAge, rate: NaN, loanPay: 0, interest: 0, mgmt: 0, repair: 0, tax: 0, ins: 0, maint: 0, major: 0, ded: 0,
    ownerInit, ownerOut: ownerInit, rentPaid: 0, rentExtra: renterInit, lifeIns: 0, renterOut: renterInit,
    ownerInv: budget0 - ownerInit, renterInv: budget0 - renterInit, loanBal: loan0, land: land0, bldg: bldg0,
    prop: land0 + bldg0, ownerPf: portfolioValue(owner, gTax), renterPf: portfolioValue(renter, gTax),
    ownerNW: (land0 + bldg0) * (1 - sell) - loan0 + portfolioValue(owner, gTax), renterNW: portfolioValue(renter, gTax),
    cpiFlow: 1, cpiStock: 1,
  }];

  let bal = loan0, sinceMove = 0, totalInterest = 0;
  for (let t = 1; t <= H; t++) {
    const c = Math.pow(1 + infl, t - 1);
    const balStart = bal;

    let rate = NaN, loanPay = 0, interest = 0;
    if (bal > 1e-6 && t <= p.loanYears) {
      if (p.rateMode === 'fixed') rate = p.rateInitial;
      else {
        const lo = Math.min(p.rateInitial, p.rateCap), hi = Math.max(p.rateInitial, p.rateCap);
        rate = Math.min(hi, Math.max(lo, p.rateInitial + p.rateRise * (t - 1)));
      }
      const i = rate / 100 / 12;
      const nRem = loanMonths - (t - 1) * 12;
      const pmt = i > 0 ? bal * i / (1 - Math.pow(1 + i, -nRem)) : bal / nRem;
      for (let m = 0; m < 12 && bal > 1e-9; m++) {
        const it = bal * i;
        const pr = Math.min(pmt - it, bal);
        bal -= pr; interest += it; loanPay += it + pr;
      }
    }
    totalInterest += interest;

    const ded = t <= p.dedYears ? Math.min(p.dedRate / 100 * Math.min(bal, p.dedCap), p.taxCapacity) : 0;
    const mgmt = p.mgmtFee * 12 * c;
    const repair = p.repairFund * 12 * Math.pow(1 + p.repairFundGrowth / 100, t - 1);
    const tax = price * p.propTaxPct / 100 * Math.pow(1 + p.propTaxTrend / 100, t - 1) *
      (t <= p.taxReliefYears ? 1 - p.taxReliefPct / 100 : 1);
    const ins = p.insurance * c;
    const maint = p.maintenance * c;
    const age = a0 + t;
    const first = Math.round(p.majorFirstAge), every = Math.round(p.majorInterval);
    const major = (p.majorCost > 0 && age >= first && (age === first || (every > 0 && (age - first) % every === 0))) ? p.majorCost * c : 0;
    const ownerOut = loanPay + mgmt + repair + tax + ins + maint + major - ded;

    const monthlyRent = p.rent * Math.pow(1 + p.rentGrowth / 100, t - 1);
    const rentPaid = monthlyRent * 12;
    let rentExtra = 0;
    sinceMove++;
    if (p.moveInterval > 0 && t % Math.round(p.moveInterval) === 0 && t < H) {
      rentExtra += p.movingCost * c + p.moveInMonths * monthlyRent;
      sinceMove = 0;
    } else if (p.renewalMonths > 0 && sinceMove % 2 === 0) {
      rentExtra += p.renewalMonths * monthlyRent;
    }
    const lifeIns = p.lifeInsPct / 100 * balStart;
    const renterOut = rentPaid + rentExtra + lifeIns;

    // Same total budget for both: the cheaper side invests the difference.
    const budget = Math.max(ownerOut, renterOut);
    const ownerInv = budget - ownerOut, renterInv = budget - renterOut;
    const r = returns[t - 1];
    const g = 1 + r;
    for (const pf of [owner, renter]) { pf.nisaV *= g; pf.taxV *= g; }
    const half = Math.sqrt(Math.max(0, g));
    if (t > 1) { usedO = 0; usedR = 0; }
    usedO += contribute(owner, ownerInv, Math.min(p.nisaAnnual - usedO, p.nisaLifetime - owner.nisaB), half);
    usedR += contribute(renter, renterInv, Math.min(p.nisaAnnual - usedR, p.nisaLifetime - renter.nisaB), half);

    const land = land0 * Math.pow(1 + p.landGrowth / 100, t);
    const bldg = dep0 > 0 ? bldg0 * Math.pow(1 + p.buildingGrowth / 100, t) * depRatio(age, life, res) / dep0 : 0;
    const prop = land + bldg;
    const ownerPf = portfolioValue(owner, gTax), renterPf = portfolioValue(renter, gTax);

    rows.push({
      t, age: p.startAge + t, rate, loanPay, interest, mgmt, repair, tax, ins, maint, major, ded, ownerOut,
      rentPaid, rentExtra, lifeIns, renterOut, ownerInv, renterInv, loanBal: bal, land, bldg, prop,
      ownerPf, renterPf, ownerNW: prop * (1 - sell) - bal + ownerPf, renterNW: renterPf,
      cpiFlow: c, cpiStock: Math.pow(1 + infl, t),
    });
  }
  return { rows, H, loan0, down, ownerInit, renterInit, totalInterest };
}

function constReturns(p) { return new Array(Math.max(1, Math.round(p.horizon))).fill(p.returnPct / 100); }

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Log-normal annual returns whose median equals the deterministic return.
function monteCarlo(p, runs, seed = 20261031) {
  const H = Math.max(1, Math.round(p.horizon));
  if (!(runs > 0) || !(p.volPct > 0)) return null;
  const rand = mulberry32(seed);
  const mu = Math.log(1 + p.returnPct / 100), sigma = p.volPct / 100;
  const own = Array.from({ length: H + 1 }, () => []), ren = Array.from({ length: H + 1 }, () => []);
  let renterWins = 0;
  for (let k = 0; k < runs; k++) {
    const rets = new Array(H);
    for (let t = 0; t < H; t++) {
      let u = 0; while (u === 0) u = rand();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
      rets[t] = Math.exp(mu + sigma * z) - 1;
    }
    const { rows } = simulate(p, rets);
    for (let t = 0; t <= H; t++) { own[t].push(rows[t].ownerNW); ren[t].push(rows[t].renterNW); }
    if (rows[H].renterNW > rows[H].ownerNW) renterWins++;
  }
  const band = arr => arr.map(a => { a.sort((x, y) => x - y); return { p10: quantile(a, .1), p50: quantile(a, .5), p90: quantile(a, .9) }; });
  return { owner: band(own), renter: band(ren), renterWinProb: renterWins / runs, runs };
}

// Investment return at which both households end with the same net worth.
function breakEvenReturn(p) {
  const diff = r => { const q = { ...p, returnPct: r }; const { rows, H } = simulate(q, constReturns(q)); return rows[H].renterNW - rows[H].ownerNW; };
  let lo = -10, hi = 25, dlo = diff(lo), dhi = diff(hi);
  if (dlo > 0) return -Infinity;
  if (dhi < 0) return Infinity;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2, dm = diff(mid);
    if (dm > 0) { hi = mid; dhi = dm; } else { lo = mid; dlo = dm; }
  }
  return (lo + hi) / 2;
}

// ---------- UI state ----------
const state = { scenario: { region: 'capital', type: 'condo', cond: 'new' }, values: {} };
const presetKey = s => `${s.region}-${s.type}-${s.cond}`;
const currentPreset = () => PRESETS[presetKey(state.scenario)];
function baselineFor(id) {
  if (id === 'rateInitial') return TYPICAL_RATE[state.values.rateMode];
  return PARAM_BY_ID[id].scope === 'preset' ? currentPreset().values[id] : DEFAULTS[id];
}

function fieldHtml(p) {
  const tag = p.scope === 'preset' ? '<span class="tag" title="随场景预设载入">预设</span>' : '';
  const help = p.help ? `<span class="help">${esc(p.help)}</span>` : '';
  if (p.type === 'check') {
    return `<div class="field check" data-id="${p.id}"><label><input type="checkbox" id="in-${p.id}"><span>${esc(p.label)}</span></label>${help}</div>`;
  }
  const ctl = p.type === 'select'
    ? `<select id="in-${p.id}">${p.options.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select>`
    : `<input type="number" id="in-${p.id}" step="${p.step ?? 'any'}"${p.min != null ? ` min="${p.min}"` : ''}${p.max != null ? ` max="${p.max}"` : ''} inputmode="decimal">`;
  return `<div class="field" data-id="${p.id}"><div class="row"><label for="in-${p.id}">${esc(p.label)}${tag}</label>` +
    `<div class="ctl">${ctl}<span class="unit">${esc(p.unit || '')}</span></div></div>${help}</div>`;
}

function renderParams() {
  const host = $('#paramGroups');
  host.innerHTML = GROUPS.map(g =>
    `<details class="group" ${g.open ? 'open' : ''}><summary>${esc(g.title)}</summary><div class="fields">` +
    PARAMS.filter(p => p.g === g.id).map(fieldHtml).join('') + '</div></details>').join('');
  const handler = e => {
    const field = e.target.closest('.field');
    if (!field) return;
    const def = PARAM_BY_ID[field.dataset.id], el = e.target;
    let v;
    if (def.type === 'check') v = el.checked;
    else if (def.type === 'select') v = el.value;
    else {
      v = parseFloat(el.value);
      if (!isFinite(v)) return;
      if (def.int) v = Math.round(v);
      if (def.min != null) v = Math.max(def.min, v);
      if (def.max != null) v = Math.min(def.max, v);
    }
    // Switching the rate type loads that type's typical rate unless the user has typed their own.
    if (def.id === 'rateMode' && state.values.rateInitial === TYPICAL_RATE[state.values.rateMode]) {
      state.values.rateInitial = TYPICAL_RATE[v];
      $('#in-rateInitial').value = TYPICAL_RATE[v];
    }
    state.values[def.id] = v;
    refreshFieldStates();
    scheduleRecalc();
  };
  host.addEventListener('input', handler);
  host.addEventListener('change', handler);
}

function writeInputs() {
  for (const p of PARAMS) {
    const el = $('#in-' + p.id), v = state.values[p.id];
    if (p.type === 'check') el.checked = !!v; else el.value = v;
  }
  refreshFieldStates();
}

function refreshFieldStates() {
  const fixed = state.values.rateMode === 'fixed';
  for (const p of PARAMS) {
    const f = document.querySelector(`.field[data-id="${p.id}"]`);
    f.classList.toggle('changed', state.values[p.id] !== baselineFor(p.id));
    const off = p.variableOnly && fixed;
    f.classList.toggle('disabled', !!off);
    $('input,select', f).disabled = !!off;
  }
}

function loadPreset(resetGlobals) {
  const pv = currentPreset().values;
  if (resetGlobals) state.values = { ...DEFAULTS };
  for (const p of PARAMS) if (p.scope === 'preset') state.values[p.id] = pv[p.id];
  document.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b =>
    b.classList.toggle('active', b.dataset.value === state.scenario[seg.dataset.key])));
  const pr = currentPreset();
  $('#presetNote').innerHTML = `<b>${esc(pr.title)}</b><br>${pr.note}`;
  writeInputs();
  scheduleRecalc();
}

// ---------- Display helpers (nominal vs. today's yen) ----------
function displayer(p) {
  const real = !!p.realTerms;
  return { real, flow: (v, row) => real ? v / row.cpiFlow : v, stock: (v, row) => real ? v / row.cpiStock : v };
}

// ---------- Charts ----------
const charts = {};
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function setChartData(chart, labels, datasets) {
  const old = chart.data.datasets;
  if (old.length === datasets.length && old.every((d, i) => d.label === datasets[i].label)) {
    old.forEach((d, i) => Object.assign(d, datasets[i]));
    chart.data.labels = labels;
  } else chart.data = { labels, datasets };
  chart.update('none');
}
function moneyTooltip(ctx) {
  const v = ctx.parsed.y;
  return v == null ? null : `${ctx.dataset.label}: ${man(v)}万円`;
}
function baseOptions(extra = {}) {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { boxWidth: 12, filter: (item, data) => !data.datasets[item.datasetIndex].noLegend } },
      tooltip: { callbacks: { label: moneyTooltip } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 8 } },
      y: { ticks: { callback: v => Math.abs(v) >= 10000 ? (v / 10000) + '億' : v + '万' }, grid: { color: cssVar('--line') } },
    },
    ...extra,
  };
}
function ensureCharts() {
  if (typeof Chart === 'undefined') return false;
  if (charts.nw) return true;
  Chart.defaults.color = cssVar('--muted');
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  const titleCb = items => items.length ? `第 ${items[0].label} 年（${state.values.startAge + Number(items[0].label)} 岁）` : '';
  const o1 = baseOptions(); o1.plugins.tooltip.callbacks.title = titleCb;
  charts.nw = new Chart($('#chartNW'), { type: 'line', data: { labels: [], datasets: [] }, options: o1 });
  const o2 = baseOptions(); o2.plugins.tooltip.callbacks.title = titleCb;
  o2.scales.x.stacked = true; o2.scales.y.stacked = true;
  charts.cf = new Chart($('#chartCF'), { type: 'bar', data: { labels: [], datasets: [] }, options: o2 });
  const o3 = baseOptions(); o3.plugins.tooltip.callbacks.title = titleCb; o3.scales.y.stacked = true;
  charts.bs = new Chart($('#chartBS'), { type: 'line', data: { labels: [], datasets: [] }, options: o3 });
  return true;
}

function renderCharts(p, det, mc) {
  if (!ensureCharts()) {
    document.querySelectorAll('.chart-box').forEach(b => b.innerHTML = '<p class="err">Chart.js 加载失败（可能处于离线状态）。下方的数字和表格仍可正常使用。</p>');
    return;
  }
  const D = displayer(p), rows = det.rows, buy = cssVar('--buy'), rent = cssVar('--rent');
  const labels = rows.map(r => String(r.t));
  const defl = t => D.real ? Math.pow(1 + p.inflation / 100, t) : 1;
  const nwSets = [];
  if (mc) {
    const band = (b, key) => b.map((x, t) => x[key] / defl(t));
    nwSets.push(
      { label: '租房 P90', data: band(mc.renter, 'p90'), borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: cssVar('--rent-soft'), noLegend: true },
      { label: '租房 P10', data: band(mc.renter, 'p10'), borderWidth: 0, pointRadius: 0, fill: false, noLegend: true },
      { label: '买房 P90', data: band(mc.owner, 'p90'), borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: cssVar('--buy-soft'), noLegend: true },
      { label: '买房 P10', data: band(mc.owner, 'p10'), borderWidth: 0, pointRadius: 0, fill: false, noLegend: true });
  }
  nwSets.push(
    { label: '买房净资产', data: rows.map(r => D.stock(r.ownerNW, r)), borderColor: buy, backgroundColor: buy, borderWidth: 2.5, pointRadius: 0, tension: .15 },
    { label: '租房净资产', data: rows.map(r => D.stock(r.renterNW, r)), borderColor: rent, backgroundColor: rent, borderWidth: 2.5, pointRadius: 0, tension: .15 },
    { label: '买房：房产市值', data: rows.map(r => D.stock(r.prop, r)), borderColor: buy, backgroundColor: buy, borderWidth: 1.2, borderDash: [5, 4], pointRadius: 0, hidden: false });
  setChartData(charts.nw, labels, nwSets);
  $('#nwSub').textContent = '实线：按设定收益率计算的预期路径' +
    (mc ? `。阴影区间：${mc.runs.toLocaleString()} 条模拟市场路径的第 10–90 百分位` : '') +
    `。买房净资产 = 房产市值${p.liquidate ? '（扣除卖房费用）' : ''} − 贷款余额 + 投资。` +
    (D.real ? '按今日币值。' : '名义金额。');

  const yrs = rows.slice(1), cfLabels = yrs.map(r => String(r.t));
  const f = (fn) => yrs.map(r => D.flow(fn(r), r));
  setChartData(charts.cf, cfLabels, [
    { label: '房贷还款', data: f(r => r.loanPay), backgroundColor: '#1e40af', stack: 'buy' },
    { label: '管理费 + 修缮基金', data: f(r => r.mgmt + r.repair), backgroundColor: '#3b82f6', stack: 'buy' },
    { label: '房产税 + 保险', data: f(r => r.tax + r.ins), backgroundColor: '#93c5fd', stack: 'buy' },
    { label: '维护 + 大修', data: f(r => r.maint + r.major), backgroundColor: '#818cf8', stack: 'buy' },
    { label: '房贷减税', data: f(r => -r.ded), backgroundColor: '#10b981', stack: 'buy' },
    { label: '房租', data: f(r => r.rentPaid), backgroundColor: '#ea580c', stack: 'rent' },
    { label: '续约 / 搬家', data: f(r => r.rentExtra), backgroundColor: '#fdba74', stack: 'rent' },
    { label: '租房者寿险', data: f(r => r.lifeIns), backgroundColor: '#fcd34d', stack: 'rent' },
    { label: '买房投资额', type: 'line', data: f(r => r.ownerInv), borderColor: buy, backgroundColor: buy, borderDash: [4, 3], pointRadius: 0, borderWidth: 2, stack: 'li1' },
    { label: '租房投资额', type: 'line', data: f(r => r.renterInv), borderColor: rent, backgroundColor: rent, borderDash: [4, 3], pointRadius: 0, borderWidth: 2, stack: 'li2' },
  ]);

  setChartData(charts.bs, labels, [
    { label: '土地价值', data: rows.map(r => D.stock(r.land, r)), borderColor: '#0891b2', backgroundColor: 'rgba(8,145,178,.30)', fill: 'origin', pointRadius: 0, stack: 'v' },
    { label: '建筑价值', data: rows.map(r => D.stock(r.bldg, r)), borderColor: '#64748b', backgroundColor: 'rgba(100,116,139,.30)', fill: '-1', pointRadius: 0, stack: 'v' },
    { label: '贷款余额', data: rows.map(r => D.stock(r.loanBal, r)), borderColor: '#dc2626', backgroundColor: '#dc2626', borderWidth: 2, pointRadius: 0, stack: 'l' },
    { label: '房产净值（市值 − 贷款）', data: rows.map(r => D.stock(r.prop - r.loanBal, r)), borderColor: buy, backgroundColor: buy, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, stack: 'e' },
  ]);
}

// ---------- Verdict, KPIs, tables ----------
function crossings(rows) {
  const out = [];
  for (let t = 1; t < rows.length; t++) {
    const a = rows[t - 1].renterNW - rows[t - 1].ownerNW, b = rows[t].renterNW - rows[t].ownerNW;
    if ((a > 0) !== (b > 0)) out.push({ t, buyerAhead: b <= 0 });
  }
  return out;
}

function renderVerdict(p, det, mc, be) {
  const D = displayer(p), last = det.rows[det.H];
  const o = D.stock(last.ownerNW, last), r = D.stock(last.renterNW, last), diff = r - o;
  const winner = diff > 0 ? '<span class="hl-rent">租房 + 投资</span>' : '<span class="hl-buy">买房</span>';
  const cr = crossings(det.rows);
  let crossTxt = '';
  if (cr.length) {
    const c = cr[cr.length - 1];
    crossTxt = c.buyerAhead
      ? `买房在第 ${c.t} 年（${p.startAge + c.t} 岁）反超租房${cr.length > 1 ? '，此后一直领先' : ''}。`
      : `租房在第 ${c.t} 年（${p.startAge + c.t} 岁）反超买房${cr.length > 1 ? '，此后一直领先' : ''}。`;
  } else crossTxt = diff > 0 ? '租房每一年都领先。' : '买房每一年都领先。';
  let beTxt;
  if (be === Infinity) beTxt = '只要投资收益率不超过 25%/年，都是买房更划算。';
  else if (be === -Infinity) beTxt = '即使投资收益率为 −10%/年，也是租房更划算。';
  else beTxt = `投资收益率为 <b>${be.toFixed(2)}%/年</b> 时两者打平（你设定的是 ${p.returnPct}%）：` +
    (be > p.returnPct ? '投资收益率必须超过这个水平，租房才更划算。' : '只要投资收益率保持在这个水平之上，租房就更划算。');
  const mcTxt = mc ? `<p>在 ${mc.runs.toLocaleString()} 条模拟市场路径中（波动率 ${p.volPct}%/年），租房最终领先的占 <b>${pct(mc.renterWinProb, 0)}</b>。` +
    `租房最终净资产的第 10–90 百分位：${big(mc.renter[det.H].p10 / (D.real ? last.cpiStock : 1))} – ${big(mc.renter[det.H].p90 / (D.real ? last.cpiStock : 1))}。</p>` : '';
  $('#verdict').innerHTML =
    `<h2>${det.H} 年后（${p.startAge + det.H} 岁），${winner}领先 ${big(Math.abs(diff))}</h2>` +
    `<p><span class="hl-buy">买房</span>：房产价值 ${big(D.stock(last.prop, last))}（土地 ${big(D.stock(last.land, last))} + 建筑 ${big(D.stock(last.bldg, last))}）` +
    `${last.loanBal > 1 ? `，剩余贷款 ${big(D.stock(last.loanBal, last))}` : '，贷款已还清'}` +
    `${last.ownerPf > 1 ? `，投资 ${big(D.stock(last.ownerPf, last))}` : ''} → 净资产 <b>${big(o)}</b>。` +
    `<span class="hl-rent">租房</span>：投资组合 → 净资产 <b>${big(r)}</b>${p.liquidate ? '（已扣收益税）' : ''}。` +
    `${D.real ? '按今日币值。' : '名义金额。'}</p>` +
    `<p>${crossTxt}${beTxt}</p>${mcTxt}`;
}

function renderKpis(p, det, mc) {
  const D = displayer(p), rows = det.rows, last = rows[det.H], y1 = rows[1];
  const sum = (fn) => rows.reduce((s, r) => s + D.flow(fn(r), r), 0);
  const ownerMonthly = (y1.loanPay + y1.mgmt + y1.repair + y1.tax + y1.ins + y1.maint - y1.ded) / 12;
  const diff = D.stock(last.renterNW - last.ownerNW, last);
  const k = (cls, key, val, d) => `<div class="kpi ${cls}"><div class="k">${key}</div><div class="v">${val}</div>${d ? `<div class="d">${d}</div>` : ''}</div>`;
  $('#kpis').innerHTML = [
    k('buy', `第 ${det.H} 年买房净资产`, big(D.stock(last.ownerNW, last)), `其中房产 ${big(D.stock(last.prop, last))}`),
    k('rent', `第 ${det.H} 年租房净资产`, big(D.stock(last.renterNW, last)), mc ? `模拟中位数 ${big(mc.renter[det.H].p50 / (D.real ? last.cpiStock : 1))}` : ''),
    k('diff', '租房 − 买房', signed(diff), mc ? `${pct(mc.renterWinProb, 0)} 的市场路径中租房更划算` : ''),
    k('buy', '第 1 年买房月支出', man(ownerMonthly, 1) + '万円', `房贷 ${man(y1.loanPay / 12, 1)} + 持有成本 ${man((y1.mgmt + y1.repair + y1.tax + y1.ins + y1.maint) / 12, 1)} − 减税 ${man(y1.ded / 12, 1)}`),
    k('rent', '第 1 年月租', man(p.rent, 1) + '万円', `房租每年涨 ${p.rentGrowth}% → 第 ${det.H} 年 ${man(p.rent * Math.pow(1 + p.rentGrowth / 100, det.H - 1) / (D.real ? last.cpiFlow : 1), 1)}万`),
    k('buy', '买房首期现金', big(det.ownerInit), `首付 ${big(det.down)} + 购房杂费${p.renovation ? ' + 装修' : ''}；贷款 ${big(det.loan0)}`),
    k('buy', '利息总额', big(sum(r => r.interest)), `房贷减税总额 ${big(sum(r => r.ded))}`),
    k('', `${det.H} 年住房总支出（买房）`, `${big(sum(r => r.ownerOut))}`, `租房：${big(sum(r => r.renterOut))}`),
  ].join('');
}

const TABLE_COLS = [
  { key: 't', h: '年', cls: 'l', fmt: v => v },
  { key: 'age', h: '年龄', cls: 'l', fmt: v => v },
  { key: 'rate', h: '利率', u: '%', fmt: v => isFinite(v) ? v.toFixed(2) : '' },
  { key: 'loanPay', h: '房贷还款', cls: 'buy', flow: true },
  { key: r => r.mgmt + r.repair, h: '管理费+修缮基金', cls: 'buy', flow: true },
  { key: r => r.tax + r.ins, h: '税+保险', cls: 'buy', flow: true },
  { key: r => r.maint + r.major, h: '维护+大修', cls: 'buy', flow: true },
  { key: r => -r.ded, h: '房贷减税', cls: 'buy', flow: true },
  { key: 'ownerOut', h: '买房合计', cls: 'buy', flow: true, bold: true },
  { key: 'rentPaid', h: '房租', cls: 'rent', flow: true },
  { key: r => r.rentExtra + r.lifeIns, h: '杂费+寿险', cls: 'rent', flow: true },
  { key: 'renterOut', h: '租房合计', cls: 'rent', flow: true, bold: true },
  { key: 'ownerInv', h: '买房投资额', cls: 'buy', flow: true },
  { key: 'renterInv', h: '租房投资额', cls: 'rent', flow: true },
  { key: 'loanBal', h: '贷款余额', cls: 'buy' },
  { key: 'prop', h: '房产市值', cls: 'buy' },
  { key: 'ownerPf', h: '买房投资组合', cls: 'buy' },
  { key: 'ownerNW', h: '买房净资产', cls: 'buy', bold: true },
  { key: 'renterNW', h: '租房净资产', cls: 'rent', bold: true },
  { key: r => r.renterNW - r.ownerNW, h: '租房 − 买房', diff: true, bold: true },
];
function cellValue(col, r, D) {
  const raw = typeof col.key === 'function' ? col.key(r) : r[col.key];
  if (col.fmt) return { raw, text: col.fmt(raw) };
  const v = col.flow ? D.flow(raw, r) : D.stock(raw, r);
  return { raw: v, text: man(v) };
}
function renderTable(p, det) {
  const D = displayer(p);
  const head = '<thead><tr>' + TABLE_COLS.map(c => `<th class="${c.cls || ''}">${esc(c.h)}<span class="u">${c.u || (c.fmt ? '' : '万円')}</span></th>`).join('') + '</tr></thead>';
  const body = det.rows.map(r => '<tr>' + TABLE_COLS.map(c => {
    const { raw, text } = cellValue(c, r, D);
    const cls = [c.cls || '', c.diff ? (raw > 0 ? 'rent' : 'buy') : ''].join(' ');
    return `<td class="${cls}">${c.bold ? `<b>${text}</b>` : text}</td>`;
  }).join('') + '</tr>').join('');
  $('#yearTable').innerHTML = head + '<tbody>' + body + '</tbody>';
  $('#tableSub').textContent = `第 0 年 = 购房 / 入住（买房：首付 + 购房杂费${p.renovation ? ' + 装修' : ''}；租房：入住费用）。` +
    `支出为全年合计，余额为年末值。${D.real ? '按今日币值。' : '名义金额（万円）。'}`;
}

function downloadCsv() {
  const p = { ...state.values }, det = simulate(p, constReturns(p)), D = displayer(p);
  const lines = [TABLE_COLS.map(c => `"${c.h}${c.u ? ` (${c.u})` : c.fmt ? '' : ' (万円)'}"`).join(',')];
  for (const r of det.rows) lines.push(TABLE_COLS.map(c => {
    const { raw } = cellValue(c, r, D);
    return typeof raw === 'number' && isFinite(raw) ? (c.fmt ? raw : raw.toFixed(1)) : '';
  }).join(','));
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `买房vs租房-${presetKey(state.scenario)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderMatrix() {
  const g = {};
  for (const p of PARAMS) if (p.scope === 'global') g[p.id] = state.values[p.id];
  const cur = presetKey(state.scenario);
  const rowsHtml = Object.entries(PRESETS).map(([key, pr]) => {
    const p = { ...g, ...pr.values };
    const det = simulate(p, constReturns(p)), last = det.rows[det.H], y1 = det.rows[1], D = displayer(p);
    const mc = monteCarlo(p, Math.min(p.mcRuns, 400));
    const be = breakEvenReturn(p);
    const diff = D.stock(last.renterNW - last.ownerNW, last);
    const ownerMonthly = (y1.loanPay + y1.mgmt + y1.repair + y1.tax + y1.ins + y1.maint - y1.ded) / 12;
    const beTxt = be === Infinity ? '> 25%' : be === -Infinity ? '< −10%' : be.toFixed(2) + '%';
    return `<tr data-key="${key}" class="${key === cur ? 'current' : ''}"><td class="l">${esc(pr.title)}</td>` +
      `<td>${man(p.price)}</td><td>${man(p.rent, 1)}</td><td>${man(ownerMonthly, 1)}</td>` +
      `<td class="buy">${man(D.stock(last.ownerNW, last))}</td><td class="rent">${man(D.stock(last.renterNW, last))}</td>` +
      `<td class="${diff > 0 ? 'rent' : 'buy'}"><b>${diff > 0 ? '+' : ''}${man(diff)}</b></td><td>${beTxt}</td>` +
      `<td>${mc ? pct(mc.renterWinProb, 0) : '—'}</td></tr>`;
  }).join('');
  $('#matrix').innerHTML = '<thead><tr><th class="l">场景</th><th>房价<span class="u">万円</span></th><th>月租<span class="u">万円/月</span></th>' +
    '<th class="buy">第 1 年买房月支出<span class="u">万円/月</span></th><th class="buy">买房净资产<span class="u">万円，期末</span></th>' +
    '<th class="rent">租房净资产<span class="u">万円，期末</span></th><th>租房 − 买房<span class="u">万円</span></th>' +
    '<th>盈亏平衡收益率<span class="u">%/年</span></th><th>租房胜率<span class="u">市场路径占比</span></th></tr></thead><tbody>' + rowsHtml + '</tbody>';
}

// ---------- Main loop ----------
let recalcTimer = 0, matrixTimer = 0;
function scheduleRecalc() {
  clearTimeout(recalcTimer);
  recalcTimer = setTimeout(recalc, 80);
}
function recalc() {
  const p = { ...state.values };
  const det = simulate(p, constReturns(p));
  const mc = monteCarlo(p, p.mcRuns);
  const be = breakEvenReturn(p);
  renderVerdict(p, det, mc, be);
  renderKpis(p, det, mc);
  renderCharts(p, det, mc);
  renderTable(p, det);
  clearTimeout(matrixTimer);
  matrixTimer = setTimeout(renderMatrix, 150);
}

function init() {
  renderParams();
  document.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.scenario[seg.dataset.key] = b.dataset.value;
    loadPreset(false);
  }));
  $('#resetPreset').addEventListener('click', () => loadPreset(false));
  $('#resetAll').addEventListener('click', () => loadPreset(true));
  $('#csvBtn').addEventListener('click', downloadCsv);
  $('#matrix').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-key]');
    if (!tr) return;
    const [region, type, cond] = tr.dataset.key.split('-');
    state.scenario = { region, type, cond };
    loadPreset(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#method').innerHTML = METHOD_HTML;
  $('#sources').innerHTML = SOURCES_HTML;
  loadPreset(true);
}
init();
