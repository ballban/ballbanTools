(function (WM) {
  // --- Tax Calculation Logic ---
  // Each bracket: [upper bound (inclusive), rate, quick deduction].
  function progressiveTax(amount, brackets) {
    if (amount <= 0) return 0;
    const [, rate, quick] = brackets.find(([upper]) => amount <= upper);
    return Math.max(0, amount * rate - quick);
  }

  const CN_MONTHLY_BRACKETS = [
    [3000, 0.03, 0],
    [12000, 0.10, 210],
    [25000, 0.20, 1410],
    [35000, 0.25, 2660],
    [55000, 0.30, 4410],
    [80000, 0.35, 7160],
    [Infinity, 0.45, 15160]
  ];

  function calculateChinaTax(gross, socialRatePercent) {
    const g = Math.max(0, Number(gross) || 0);
    const social = g * (socialRatePercent / 100);
    const taxable = Math.max(0, g - social - 5000);
    const tax = progressiveTax(taxable, CN_MONTHLY_BRACKETS);
    const net = Math.max(0, g - social - tax);
    return { gross: g, social, tax, net };
  }

  const JP_INCOME_TAX_BRACKETS = [
    [1950000, 0.05, 0],
    [3300000, 0.10, 97500],
    [6950000, 0.20, 427500],
    [9000000, 0.23, 636000],
    [18000000, 0.33, 1536000],
    [40000000, 0.40, 2796000],
    [Infinity, 0.45, 4796000]
  ];

  // 給与所得控除: the bracket formulas plus a minimum guarantee that differs by tax year.
  function japanEmploymentDeduction(annualGross, minimum) {
    let bracket;
    if (annualGross <= 3600000) bracket = annualGross * 0.3 + 80000;
    else if (annualGross <= 6600000) bracket = annualGross * 0.2 + 440000;
    else if (annualGross <= 8500000) bracket = annualGross * 0.1 + 1100000;
    else bracket = 1950000;
    return Math.min(annualGross, Math.max(minimum, bracket));
  }

  // 令和8年分 所得税 基礎控除 (includes the 2026-2027 特例加算).
  function japanIncomeTaxBasicDeduction(totalIncome) {
    if (totalIncome <= 4890000) return 1040000;
    if (totalIncome <= 6550000) return 670000;
    if (totalIncome <= 23500000) return 620000;
    if (totalIncome <= 24000000) return 480000;
    if (totalIncome <= 24500000) return 320000;
    if (totalIncome <= 25000000) return 160000;
    return 0;
  }

  // 令和8年度 住民税 基礎控除.
  function japanResidentTaxBasicDeduction(totalIncome) {
    if (totalIncome <= 24000000) return 430000;
    if (totalIncome <= 24500000) return 290000;
    if (totalIncome <= 25000000) return 150000;
    return 0;
  }

  // Employee-side rates for FY2026, assuming Tokyo 協会けんぽ and under 40 (no 介護保険).
  // Health-type premiums and pension are capped at their standard-remuneration maximums.
  const JP_SOCIAL = {
    health: 0.04925,
    childSupport: 0.00115,
    pension: 0.0915,
    employment: 0.005,
    healthCap: 1390000,
    pensionCap: 650000
  };

  // Without deductionRatePercent the total deduction comes from the model. With it, the total is
  // forced to that share of gross and split between social insurance and tax in the model's ratio.
  function calculateJapanTax(grossMonthly, deductionRatePercent) {
    const g = Math.max(0, Number(grossMonthly) || 0);
    const annualGross = g * 12;

    const socialMonthly = Math.min(g, JP_SOCIAL.healthCap) * (JP_SOCIAL.health + JP_SOCIAL.childSupport)
      + Math.min(g, JP_SOCIAL.pensionCap) * JP_SOCIAL.pension
      + g * JP_SOCIAL.employment;
    const annualSocial = socialMonthly * 12;

    const incomeIT = annualGross - japanEmploymentDeduction(annualGross, 740000);
    const taxableIT = Math.max(0, incomeIT - annualSocial - japanIncomeTaxBasicDeduction(incomeIT));
    const annualIT = progressiveTax(taxableIT, JP_INCOME_TAX_BRACKETS) * 1.021;

    const incomeRT = annualGross - japanEmploymentDeduction(annualGross, 650000);
    const taxableRT = Math.max(0, incomeRT - annualSocial - japanResidentTaxBasicDeduction(incomeRT));
    const annualRT = taxableRT > 0 ? taxableRT * 0.10 + 5000 : 0;

    const taxMonthly = (annualIT + annualRT) / 12;
    const modelDeduction = Math.min(g, socialMonthly + taxMonthly);
    const autoDeductionRate = g > 0 ? (modelDeduction / g) * 100 : 0;

    if (typeof deductionRatePercent !== 'number' || !Number.isFinite(deductionRatePercent)) {
      return { gross: g, social: socialMonthly, tax: taxMonthly, net: g - modelDeduction, autoDeductionRate };
    }

    const deduction = g * Math.min(100, Math.max(0, deductionRatePercent)) / 100;
    const socialShare = modelDeduction > 0 ? socialMonthly / (socialMonthly + taxMonthly) : 1;
    return {
      gross: g,
      social: deduction * socialShare,
      tax: deduction * (1 - socialShare),
      net: g - deduction,
      autoDeductionRate
    };
  }

  WM.calculateChinaTax = calculateChinaTax;
  WM.calculateJapanTax = calculateJapanTax;
})(window.WM = window.WM || {});
