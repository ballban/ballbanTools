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
  function applyDeductionRate(g, socialMonthly, taxMonthly, deductionRatePercent) {
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
    return applyDeductionRate(g, socialMonthly, taxMonthly, deductionRatePercent);
  }

  // --- United States (New York City resident), tax year 2026 ---
  // Single filer, standard deduction, wages only; pre-tax benefits such as 401(k) and health
  // premiums are not modeled.
  const US_FEDERAL_BRACKETS = [
    [12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24],
    [256225, 0.32], [640600, 0.35], [Infinity, 0.37]
  ];
  const NY_STATE_BRACKETS = [
    [8500, 0.039], [11700, 0.044], [13900, 0.0515], [80650, 0.054], [215400, 0.059],
    [1077550, 0.0685], [5000000, 0.0965], [25000000, 0.103], [Infinity, 0.109]
  ];
  const NYC_BRACKETS = [[12000, 0.03078], [25000, 0.03762], [50000, 0.03819], [Infinity, 0.03876]];

  // Brackets given as [upper bound, marginal rate].
  function marginalTax(amount, brackets) {
    let tax = 0;
    let lower = 0;
    for (const [upper, rate] of brackets) {
      if (amount <= lower) break;
      tax += (Math.min(amount, upper) - lower) * rate;
      lower = upper;
    }
    return tax;
  }

  // NY "tax benefit recapture": above $107,650 of NY AGI the benefit of the lower brackets is
  // phased out over $50,000 per step, until the top bracket rate applies to all taxable income.
  const NY_RECAPTURE = [
    { maxTaxable: 215400, agiStart: 107650, base: 0, increment: 567 },
    { maxTaxable: 1077550, agiStart: 215400, base: 567, increment: 2047 },
    { maxTaxable: 5000000, agiStart: 1077550, base: 2614, increment: 30172 },
    { maxTaxable: 25000000, agiStart: 5000000, base: 32786, increment: 32500 }
  ];

  function newYorkStateTax(agi, taxable) {
    const ordinary = marginalTax(taxable, NY_STATE_BRACKETS);
    if (agi <= 107650) return ordinary;
    if (agi > 25000000) return taxable * 0.109;
    const phaseIn = (start) => Math.min(50000, Math.max(0, agi - start)) / 50000;
    if (taxable <= 80650) return ordinary + Math.max(0, taxable * 0.059 - ordinary) * phaseIn(107650);
    const row = NY_RECAPTURE.find(r => taxable <= r.maxTaxable);
    return ordinary + row.base + row.increment * phaseIn(row.agiStart);
  }

  function calculateUSTax(grossMonthly, deductionRatePercent) {
    const g = Math.max(0, Number(grossMonthly) || 0);
    const annual = g * 12;

    const socialSecurity = Math.min(annual, 184500) * 0.062;
    const medicare = annual * 0.0145 + Math.max(0, annual - 200000) * 0.009;
    const disability = Math.min(annual * 0.005, 0.60 * 52);
    const paidFamilyLeave = Math.min(annual * 0.00432, 411.91);
    const annualSocial = socialSecurity + medicare + disability + paidFamilyLeave;

    const federal = marginalTax(Math.max(0, annual - 16100), US_FEDERAL_BRACKETS);
    const nyTaxable = Math.max(0, annual - 8000);
    const nyState = newYorkStateTax(annual, nyTaxable);
    const city = marginalTax(nyTaxable, NYC_BRACKETS);

    return applyDeductionRate(g, annualSocial / 12, (federal + nyState + city) / 12, deductionRatePercent);
  }

  // --- South Korea (Seoul), 2026 ---
  // Single, no dependents, all pay taxable (non-taxable meal allowance not modeled). Annual
  // year-end settlement rather than the monthly withholding table.
  const KR_INCOME_TAX_BRACKETS = [
    [14000000, 0.06, 0],
    [50000000, 0.15, 1260000],
    [88000000, 0.24, 5760000],
    [150000000, 0.35, 15440000],
    [300000000, 0.38, 19940000],
    [500000000, 0.40, 25940000],
    [1000000000, 0.42, 35940000],
    [Infinity, 0.45, 65940000]
  ];

  // 근로소득공제, capped at 20M.
  function koreaEmploymentDeduction(annualGross) {
    let d;
    if (annualGross <= 5000000) d = annualGross * 0.7;
    else if (annualGross <= 15000000) d = 3500000 + (annualGross - 5000000) * 0.4;
    else if (annualGross <= 45000000) d = 7500000 + (annualGross - 15000000) * 0.15;
    else if (annualGross <= 100000000) d = 12000000 + (annualGross - 45000000) * 0.05;
    else d = 14750000 + (annualGross - 100000000) * 0.02;
    return Math.min(20000000, d);
  }

  // 근로소득세액공제 with its salary-based limit.
  function koreaEmploymentTaxCredit(calculatedTax, annualGross) {
    const credit = calculatedTax <= 1300000 ? calculatedTax * 0.55 : 715000 + (calculatedTax - 1300000) * 0.3;
    let limit;
    if (annualGross <= 33000000) limit = 740000;
    else if (annualGross <= 70000000) limit = Math.max(660000, 740000 - (annualGross - 33000000) * 0.008);
    else if (annualGross <= 120000000) limit = Math.max(500000, 660000 - (annualGross - 70000000) / 2);
    else limit = Math.max(200000, 500000 - (annualGross - 120000000) / 2);
    return Math.min(credit, limit);
  }

  // Employee-side rates; pension uses the 2026.7-2027.6 기준소득월액 cap.
  const KR_SOCIAL = {
    pension: 0.0475,
    pensionCap: 6590000,
    health: 0.03595,
    healthMonthlyCap: 4591740,
    longTermCareOfHealth: 0.1314,
    employment: 0.009
  };

  function calculateKoreaTax(grossMonthly, deductionRatePercent) {
    const g = Math.max(0, Number(grossMonthly) || 0);
    const annualGross = g * 12;

    const pension = Math.min(g, KR_SOCIAL.pensionCap) * KR_SOCIAL.pension;
    const health = Math.min(g * KR_SOCIAL.health, KR_SOCIAL.healthMonthlyCap);
    const longTermCare = health * KR_SOCIAL.longTermCareOfHealth;
    const employment = g * KR_SOCIAL.employment;
    const socialMonthly = pension + health + longTermCare + employment;

    const earnedIncome = annualGross - koreaEmploymentDeduction(annualGross);
    const baseTaxable = earnedIncome - 1500000 - pension * 12;
    // The insurance-premium deduction and the 130,000 standard credit cannot be combined;
    // year-end settlement takes whichever leaves less tax.
    const taxAfterCredits = (taxable, extraCredit) => {
      const calculated = progressiveTax(Math.max(0, taxable), KR_INCOME_TAX_BRACKETS);
      return Math.max(0, calculated - koreaEmploymentTaxCredit(calculated, annualGross) - extraCredit);
    };
    const incomeTax = Math.min(
      taxAfterCredits(baseTaxable - (health + longTermCare + employment) * 12, 0),
      taxAfterCredits(baseTaxable, 130000)
    );
    const taxMonthly = incomeTax * 1.1 / 12; // plus 10% local income tax

    return applyDeductionRate(g, socialMonthly, taxMonthly, deductionRatePercent);
  }

  WM.calculateChinaTax = calculateChinaTax;
  WM.calculateJapanTax = calculateJapanTax;
  WM.calculateUSTax = calculateUSTax;
  WM.calculateKoreaTax = calculateKoreaTax;
})(window.WM = window.WM || {});
