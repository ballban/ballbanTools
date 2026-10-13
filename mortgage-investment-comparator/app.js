(function () {
  'use strict';

  var calculator = window.MortgageComparator;
  if (!calculator) {
    throw new Error('Calculator module must load before the app module');
  }

  var fieldErrorIds = {
    housePrice: 'error-housePrice',
    downPaymentMode: 'error-downPaymentMode',
    downPaymentPercentage: 'error-downPaymentPercentage',
    downPaymentAmount: 'error-downPaymentAmount',
    mortgageAnnualRate: 'error-mortgageAnnualRate',
    rateChangeYear: 'error-rateChangeYear',
    mortgageAnnualRateAfterChange: 'error-mortgageAnnualRateAfterChange',
    loanTermYears: 'error-loanTermYears',
    horizonYears: 'error-horizonYears',
    mortgageTaxCreditRate: 'error-mortgageTaxCreditRate',
    mortgageTaxCreditYears: 'error-mortgageTaxCreditYears',
    mortgageTaxCreditLoanCap: 'error-mortgageTaxCreditLoanCap',
    landAnnualGrowthRate: 'error-landAnnualGrowthRate',
    buildingStructure: 'error-buildingStructure',
    buildingAgeYears: 'error-buildingAgeYears',
    landSharePercentage: 'error-landSharePercentage',
    purchaseFeeRate: 'error-purchaseFeeRate',
    sellingFeeRate: 'error-sellingFeeRate',
    monthlyOwnerCost: 'error-monthlyOwnerCost',
    ownerCostAnnualGrowthRate: 'error-ownerCostAnnualGrowthRate',
    repairIntervalYears: 'error-repairIntervalYears',
    repairCost: 'error-repairCost',
    monthlyRent: 'error-monthlyRent',
    rentAnnualGrowthRate: 'error-rentAnnualGrowthRate',
    rentAgingRate: 'error-rentAgingRate',
    renewalIntervalYears: 'error-renewalIntervalYears',
    renewalFeeMonths: 'error-renewalFeeMonths',
    investmentAnnualReturnRate: 'error-investmentAnnualReturnRate',
    investmentTaxRate: 'error-investmentTaxRate',
  };

  var moneyFormatter = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  });

  // Prices and rents are rounded from public 2026 market statistics; the
  // sources are listed under the profile buttons in index.html.
  var propertyProfiles = {
    'center-used-condo': {
      housePrice: 86000000,
      landAnnualGrowthRate: 2,
      buildingStructure: 'rc',
      buildingAgeYears: 22,
      landSharePercentage: 50,
      monthlyOwnerCost: 58000,
      repairIntervalYears: 15,
      repairCost: 0,
      monthlyRent: 260000,
      rentAnnualGrowthRate: 2,
      mortgageTaxCreditYears: 10,
      mortgageTaxCreditLoanCap: 20000000,
    },
    'center-used-house': {
      housePrice: 78000000,
      landAnnualGrowthRate: 2,
      buildingStructure: 'wood',
      buildingAgeYears: 20,
      landSharePercentage: 80,
      monthlyOwnerCost: 25000,
      repairIntervalYears: 15,
      repairCost: 2000000,
      monthlyRent: 300000,
      rentAnnualGrowthRate: 1.5,
      mortgageTaxCreditYears: 10,
      mortgageTaxCreditLoanCap: 20000000,
    },
    'suburb-used-condo': {
      housePrice: 34000000,
      landAnnualGrowthRate: 1,
      buildingStructure: 'rc',
      buildingAgeYears: 25,
      landSharePercentage: 35,
      monthlyOwnerCost: 38000,
      repairIntervalYears: 15,
      repairCost: 0,
      monthlyRent: 135000,
      rentAnnualGrowthRate: 1.5,
      mortgageTaxCreditYears: 10,
      mortgageTaxCreditLoanCap: 20000000,
    },
    'suburb-used-house': {
      housePrice: 40000000,
      landAnnualGrowthRate: 1,
      buildingStructure: 'wood',
      buildingAgeYears: 22,
      landSharePercentage: 70,
      monthlyOwnerCost: 15000,
      repairIntervalYears: 15,
      repairCost: 2000000,
      monthlyRent: 170000,
      rentAnnualGrowthRate: 1.2,
      mortgageTaxCreditYears: 10,
      mortgageTaxCreditLoanCap: 20000000,
    },
    'suburb-new-condo': {
      housePrice: 67000000,
      landAnnualGrowthRate: 1,
      buildingStructure: 'rc',
      buildingAgeYears: 0,
      landSharePercentage: 25,
      monthlyOwnerCost: 35000,
      repairIntervalYears: 15,
      repairCost: 0,
      monthlyRent: 180000,
      rentAnnualGrowthRate: 1.5,
      mortgageTaxCreditYears: 13,
      mortgageTaxCreditLoanCap: 30000000,
    },
    'suburb-new-house': {
      housePrice: 51000000,
      landAnnualGrowthRate: 1,
      buildingStructure: 'wood',
      buildingAgeYears: 0,
      landSharePercentage: 55,
      monthlyOwnerCost: 15000,
      repairIntervalYears: 15,
      repairCost: 2000000,
      monthlyRent: 180000,
      rentAnnualGrowthRate: 1.2,
      mortgageTaxCreditYears: 13,
      mortgageTaxCreditLoanCap: 30000000,
    },
    'outer-used-house': {
      housePrice: 25000000,
      landAnnualGrowthRate: -0.5,
      buildingStructure: 'wood',
      buildingAgeYears: 25,
      landSharePercentage: 70,
      monthlyOwnerCost: 12000,
      repairIntervalYears: 15,
      repairCost: 2000000,
      monthlyRent: 110000,
      rentAnnualGrowthRate: 0.5,
      mortgageTaxCreditYears: 10,
      mortgageTaxCreditLoanCap: 20000000,
    },
    'outer-new-house': {
      housePrice: 37000000,
      landAnnualGrowthRate: -0.5,
      buildingStructure: 'wood',
      buildingAgeYears: 0,
      landSharePercentage: 40,
      monthlyOwnerCost: 12000,
      repairIntervalYears: 15,
      repairCost: 2000000,
      monthlyRent: 130000,
      rentAnnualGrowthRate: 0.5,
      mortgageTaxCreditYears: 13,
      mortgageTaxCreditLoanCap: 30000000,
    },
  };
  var currentResult = null;
  var storageKey = 'mortgage-investment-comparator-input-v3';
  var legacyStorageKeys = [
    'mortgage-investment-comparator-input-v2',
    'mortgage-investment-comparator-input-v1',
  ];
  var selectedProfileId = 'center-used-condo';
  var persistedFieldIds = [
    'housePrice',
    'downPaymentMode',
    'downPaymentPercentage',
    'downPaymentAmount',
    'mortgageAnnualRate',
    'rateChangeYear',
    'mortgageAnnualRateAfterChange',
    'loanTermYears',
    'horizonYears',
    'mortgageTaxCreditRate',
    'mortgageTaxCreditYears',
    'mortgageTaxCreditLoanCap',
    'landAnnualGrowthRate',
    'buildingStructure',
    'buildingAgeYears',
    'landSharePercentage',
    'purchaseFeeRate',
    'sellingFeeRate',
    'monthlyOwnerCost',
    'ownerCostAnnualGrowthRate',
    'repairIntervalYears',
    'repairCost',
    'monthlyRent',
    'rentAnnualGrowthRate',
    'rentAgingRate',
    'renewalIntervalYears',
    'renewalFeeMonths',
    'investmentAnnualReturnRate',
    'investmentTaxRate',
    'table-range',
  ];

  function get(id) {
    var element = document.getElementById(id);
    if (!element) {
      throw new Error('Missing required element: ' + id);
    }
    return element;
  }

  function readNumber(id) {
    var value = get(id).value.trim();
    return value === '' ? Number.NaN : Number(value);
  }

  function saveInputState() {
    var state = {};
    persistedFieldIds.forEach(function (id) {
      var element = get(id);
      state[id] =
        element.type === 'checkbox' ? element.checked : element.value;
    });
    state.profileId = selectedProfileId;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('无法保存当前参数到浏览器本地存储。', error);
    }
  }

  function restoreInputState() {
    try {
      var saved = window.localStorage.getItem(storageKey);
      var legacyKey = null;
      for (var index = 0; !saved && index < legacyStorageKeys.length; index += 1) {
        saved = window.localStorage.getItem(legacyStorageKeys[index]);
        legacyKey = saved ? legacyStorageKeys[index] : null;
      }
      if (!saved) {
        return;
      }

      var state = JSON.parse(saved);
      if (
        legacyKey === 'mortgage-investment-comparator-input-v1' &&
        state.purchaseFeeRate === '0'
      ) {
        state.purchaseFeeRate = String(calculator.defaultInput.purchaseFeeRate);
      }
      // Older versions saved the former 20-year default; the comparison is
      // meant to end when the loan is paid off.
      if (legacyKey && 'loanTermYears' in state) {
        state.horizonYears = state.loanTermYears;
      }
      selectedProfileId =
        state.profileId && propertyProfiles[state.profileId]
          ? state.profileId
          : null;
      if (
        !('landAnnualGrowthRate' in state) &&
        'houseAnnualGrowthRate' in state
      ) {
        state.landAnnualGrowthRate = state.houseAnnualGrowthRate;
      }
      if (selectedProfileId) {
        var profile = propertyProfiles[selectedProfileId];
        Object.keys(profile).forEach(function (id) {
          if (!(id in state)) {
            state[id] = String(profile[id]);
          }
        });
      }
      persistedFieldIds.forEach(function (id) {
        var element = get(id);
        if (!(id in state)) {
          return;
        }
        if (element.type === 'checkbox') {
          element.checked = state[id] === true;
        } else if (typeof state[id] === 'string') {
          element.value = state[id];
        }
      });
      if (legacyKey) {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      }
    } catch (error) {
      console.warn('无法读取浏览器中保存的参数，已使用默认值。', error);
    }
  }

  function clearInputState() {
    try {
      [storageKey].concat(legacyStorageKeys).forEach(function (key) {
        window.localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('无法清除浏览器中保存的参数。', error);
    }
    selectedProfileId = 'center-used-condo';
  }

  function updateProfileButtons() {
    document.querySelectorAll('[data-profile-id]').forEach(function (button) {
      button.classList.toggle(
        'active',
        button.dataset.profileId === selectedProfileId,
      );
    });
  }

  function applyProfile(profileId) {
    var profile = propertyProfiles[profileId];
    if (!profile) {
      return;
    }

    Object.keys(profile).forEach(function (id) {
      get(id).value = String(profile[id]);
    });
    selectedProfileId = profileId;
    saveAndRender();
    setText(
      'form-status',
      '已切换到“' + getProfileLabel(profileId) + '”，参数已保存。',
    );
  }

  function getProfileLabel(profileId) {
    var button = document.querySelector(
      '[data-profile-id="' + profileId + '"]',
    );
    return button ? button.dataset.profileLabel : '房屋画像';
  }

  // Only fields a profile overwrites make the inputs diverge from it; loan,
  // investment and other shared assumptions keep the profile selected.
  function isPropertyInput(element) {
    return element.id in propertyProfiles['center-used-condo'];
  }

  function readInput() {
    var downPaymentModeValue = get('downPaymentMode').value;

    return {
      housePrice: readNumber('housePrice'),
      downPaymentMode:
        downPaymentModeValue === 'fixed' ? 'fixed' : 'percentage',
      downPaymentPercentage: readNumber('downPaymentPercentage'),
      downPaymentAmount: readNumber('downPaymentAmount'),
      mortgageAnnualRate: readNumber('mortgageAnnualRate'),
      rateChangeYear: readNumber('rateChangeYear'),
      mortgageAnnualRateAfterChange: readNumber(
        'mortgageAnnualRateAfterChange',
      ),
      loanTermYears: readNumber('loanTermYears'),
      horizonYears: readNumber('horizonYears'),
      mortgageTaxCreditRate: readNumber('mortgageTaxCreditRate'),
      mortgageTaxCreditYears: readNumber('mortgageTaxCreditYears'),
      mortgageTaxCreditLoanCap: readNumber('mortgageTaxCreditLoanCap'),
      landAnnualGrowthRate: readNumber('landAnnualGrowthRate'),
      buildingStructure: get('buildingStructure').value,
      buildingAgeYears: readNumber('buildingAgeYears'),
      landSharePercentage: readNumber('landSharePercentage'),
      purchaseFeeRate: readNumber('purchaseFeeRate'),
      sellingFeeRate: readNumber('sellingFeeRate'),
      monthlyOwnerCost: readNumber('monthlyOwnerCost'),
      ownerCostAnnualGrowthRate: readNumber('ownerCostAnnualGrowthRate'),
      repairIntervalYears: readNumber('repairIntervalYears'),
      repairCost: readNumber('repairCost'),
      monthlyRent: readNumber('monthlyRent'),
      rentAnnualGrowthRate: readNumber('rentAnnualGrowthRate'),
      rentAgingRate: readNumber('rentAgingRate'),
      renewalIntervalYears: readNumber('renewalIntervalYears'),
      renewalFeeMonths: readNumber('renewalFeeMonths'),
      investmentAnnualReturnRate: readNumber('investmentAnnualReturnRate'),
      investmentTaxRate: readNumber('investmentTaxRate'),
    };
  }

  function setText(id, text) {
    get(id).textContent = text;
  }

  function formatMoney(value) {
    if (!Number.isFinite(value)) {
      return '—';
    }
    return moneyFormatter.format(value);
  }

  function formatRate(value) {
    return Number.isFinite(value) ? value.toFixed(1) + '%' : '—';
  }

  function formatWholePercent(value) {
    return Number.isFinite(value) ? Math.round(value) + '%' : '—';
  }

  function formatTaxRate(value) {
    return Number.isFinite(value)
      ? String(Number(value.toFixed(3))) + '%'
      : '—';
  }

  function formatYears(value) {
    return Number.isFinite(value) ? value + ' 年' : '—';
  }

  function updateRangeConstraints() {
    var housePrice = readNumber('housePrice');
    var safeHousePrice =
      Number.isFinite(housePrice) && housePrice > 0
        ? housePrice
        : Number(get('housePrice').max);
    var downPaymentAmount = get('downPaymentAmount');
    var currentDownPayment = Number(downPaymentAmount.value);
    downPaymentAmount.max = String(safeHousePrice);
    if (Number.isFinite(currentDownPayment) && currentDownPayment > safeHousePrice) {
      downPaymentAmount.value = String(safeHousePrice);
    }

    var loanTerm = readNumber('loanTermYears');
    var safeLoanTerm =
      Number.isFinite(loanTerm) && loanTerm >= 1 ? loanTerm : 1;
    var horizon = get('horizonYears');
    // A horizon sitting at the slider maximum tracks the loan term, so the
    // default comparison always ends when the loan is paid off.
    var horizonFollowsLoanTerm =
      Number(horizon.value) >= Number(horizon.max);
    horizon.max = String(safeLoanTerm);
    if (horizonFollowsLoanTerm || Number(horizon.value) > safeLoanTerm) {
      horizon.value = String(safeLoanTerm);
    }

    var rateChangeYear = get('rateChangeYear');
    rateChangeYear.max = String(safeLoanTerm - 1);
    if (Number(rateChangeYear.value) > safeLoanTerm - 1) {
      rateChangeYear.value = String(safeLoanTerm - 1);
    }
  }

  function updateRangeOutputs(input) {
    setText('housePrice-output', formatMoney(input.housePrice));
    setText(
      'downPaymentPercentage-output',
      formatWholePercent(input.downPaymentPercentage),
    );
    setText(
      'downPaymentAmount-output',
      formatMoney(input.downPaymentAmount),
    );
    setText('mortgageAnnualRate-output', formatRate(input.mortgageAnnualRate));
    setText(
      'rateChangeYear-output',
      input.rateChangeYear > 0
        ? '第 ' + input.rateChangeYear + ' 年后'
        : '不变',
    );
    setText(
      'mortgageAnnualRateAfterChange-output',
      formatRate(input.mortgageAnnualRateAfterChange),
    );
    setText('loanTermYears-output', formatYears(input.loanTermYears));
    setText('horizonYears-output', formatYears(input.horizonYears));
    setText(
      'mortgageTaxCreditRate-output',
      formatRate(input.mortgageTaxCreditRate),
    );
    setText(
      'mortgageTaxCreditYears-output',
      formatYears(input.mortgageTaxCreditYears),
    );
    setText(
      'mortgageTaxCreditLoanCap-output',
      formatMoney(input.mortgageTaxCreditLoanCap),
    );
    setText(
      'landAnnualGrowthRate-output',
      formatRate(input.landAnnualGrowthRate),
    );
    setText('buildingAgeYears-output', formatYears(input.buildingAgeYears));
    setText(
      'landSharePercentage-output',
      formatWholePercent(input.landSharePercentage),
    );
    setText('sellingFeeRate-output', formatRate(input.sellingFeeRate));
    setText('purchaseFeeRate-output', formatRate(input.purchaseFeeRate));
    setText(
      'monthlyOwnerCost-output',
      formatMoney(input.monthlyOwnerCost) + ' / 月',
    );
    setText(
      'ownerCostAnnualGrowthRate-output',
      formatRate(input.ownerCostAnnualGrowthRate),
    );
    setText(
      'repairIntervalYears-output',
      Number.isFinite(input.repairIntervalYears)
        ? '每 ' + input.repairIntervalYears + ' 年'
        : '—',
    );
    setText(
      'repairCost-output',
      input.repairCost > 0 ? formatMoney(input.repairCost) : '不计',
    );
    setText(
      'monthlyRent-output',
      formatMoney(input.monthlyRent) + ' / 月',
    );
    setText('rentAnnualGrowthRate-output', formatRate(input.rentAnnualGrowthRate));
    setText(
      'rentAgingRate-output',
      formatRate(input.rentAgingRate) + ' / 年',
    );
    setText(
      'renewalIntervalYears-output',
      Number.isFinite(input.renewalIntervalYears)
        ? '每 ' + input.renewalIntervalYears + ' 年'
        : '—',
    );
    setText(
      'renewalFeeMonths-output',
      Number.isFinite(input.renewalFeeMonths)
        ? input.renewalFeeMonths + ' 个月房租'
        : '—',
    );
    setText(
      'investmentAnnualReturnRate-output',
      formatRate(input.investmentAnnualReturnRate),
    );
    setText('investmentTaxRate-output', formatTaxRate(input.investmentTaxRate));
  }

  // Axis ticks are round multiples, so 万 / 亿 units read naturally and match
  // the amounts used elsewhere on the page.
  function formatCompactMoney(value) {
    var absoluteValue = Math.abs(value);
    var sign = value < 0 ? '-' : '';
    if (absoluteValue >= 100000000) {
      return (
        sign + '￥' + Number((absoluteValue / 100000000).toFixed(2)) + ' 亿'
      );
    }
    if (absoluteValue >= 10000) {
      return (
        sign +
        '￥' +
        Math.round(absoluteValue / 10000).toLocaleString('ja-JP') +
        ' 万'
      );
    }
    return formatMoney(value);
  }

  function niceStep(roughStep) {
    var magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    var fraction = roughStep / magnitude;
    var niceFraction =
      fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
    return niceFraction * magnitude;
  }

  function formatSignedMoney(value) {
    if (Math.abs(value) < 0.5) {
      return '结果接近';
    }
    return value > 0
      ? '租房 + 投资路径高 ' + formatMoney(value)
      : '买房路径高 ' + formatMoney(Math.abs(value));
  }

  function formatFlow(value) {
    if (Math.abs(value) < 0.5) {
      return formatMoney(0);
    }
    return (value > 0 ? '投入 ' : '取出 ') + formatMoney(Math.abs(value));
  }

  function updateInputVisibility() {
    var isFixedDownPayment = get('downPaymentMode').value === 'fixed';

    get('percentage-field').classList.toggle(
      'hidden',
      isFixedDownPayment,
    );
    get('fixed-field').classList.toggle('hidden', !isFixedDownPayment);
    get('downPaymentPercentage').disabled = isFixedDownPayment;
    get('downPaymentAmount').disabled = !isFixedDownPayment;
  }

  function displayValidationErrors(errors) {
    Object.keys(fieldErrorIds).forEach(function (field) {
      setText(fieldErrorIds[field], '');
    });

    Object.keys(errors).forEach(function (field) {
      if (fieldErrorIds[field]) {
        setText(fieldErrorIds[field], errors[field]);
      }
    });

    setText(
      'form-status',
      Object.keys(errors).length > 0
        ? '请修正标记为红色的输入项。'
        : '结果会随输入实时更新，参数会自动保存在本浏览器。',
    );
  }

  function setSummaryToEmpty() {
    [
      'summary-initial-expenses',
      'summary-down-payment',
      'summary-purchase-fees',
      'summary-monthly-buy-cost',
      'summary-monthly-buy-cost-detail',
      'summary-repair-detail',
      'summary-total-tax-credit',
      'summary-tax-credit-detail',
      'summary-home-equity',
      'summary-final-land-value',
      'summary-final-building-value',
      'summary-house-value',
      'summary-final-loan',
      'summary-final-selling-cost',
      'summary-building-life',
      'summary-initial-investment',
      'summary-rent-range',
      'summary-renewal-detail',
      'summary-investment-contribution-range',
      'summary-investment-contribution-breakdown',
      'summary-rent-total-assets',
      'summary-rent-total-detail',
      'summary-horizon',
      'summary-horizon-note',
      'summary-difference',
      'summary-total-buy-outflow',
      'summary-total-rent-outflow',
      'summary-total-rent',
      'summary-total-renewal-fees',
      'summary-total-rent-investment',
      'summary-total-rent-withdrawal',
      'summary-rent-withdrawal-note',
      'summary-total-mortgage-paid',
      'summary-total-interest-paid',
      'summary-total-principal-paid',
      'summary-house-appreciation',
      'summary-investment-gain',
      'summary-investment-tax',
      'summary-investment-tax-note',
      'chart-buy-total',
      'chart-rent-total',
      'chart-difference',
    ].forEach(function (id) {
      setText(id, '—');
    });
    setText('chart-difference-label', '期末差额');
    renderBreakEvenItems(['—']);
    get('summary-difference').className = 'summary-value';
    get('chart-difference').className = 'chart-key-value';
  }

  function formatRegularGap(periodLabel, snapshot) {
    var gap = snapshot.buyHousingCost - snapshot.rentPaid;
    return (
      periodLabel +
      '买房 ' +
      formatMoney(snapshot.buyHousingCost) +
      ' − 房租 ' +
      formatMoney(snapshot.rentPaid) +
      (gap >= 0 ? ' → 投入 ' : ' → 取出 ') +
      formatMoney(Math.abs(gap))
    );
  }

  function countMonths(snapshots, key) {
    return snapshots.filter(function (snapshot) {
      return snapshot[key] > 0;
    }).length;
  }

  function renderSummary(result) {
    var input = result.input;
    var summary = result.summary;
    var snapshots = result.snapshots;
    var firstSnapshot = snapshots[0];
    var finalSnapshot = snapshots[snapshots.length - 1];
    var money = function (value) {
      return formatMoney(value);
    };

    setText('summary-initial-expenses', money(summary.initialExpenses));
    setText('summary-down-payment', money(summary.initialDownPayment));
    setText('summary-purchase-fees', money(summary.purchaseFees));
    setText(
      'summary-monthly-buy-cost',
      money(summary.initialMonthlyBuyCost) +
        ' → ' +
        money(summary.finalMonthlyBuyCost) +
        ' / 月',
    );
    setText(
      'summary-monthly-buy-cost-detail',
      '月供 ' +
        money(summary.monthlyPayment) +
        (summary.monthlyPaymentAfterRateChange === null
          ? '（固定）'
          : ' → 第 ' +
            input.rateChangeYear +
            ' 年后 ' +
            money(summary.monthlyPaymentAfterRateChange) +
            '（利率 ' +
            formatRate(input.mortgageAnnualRateAfterChange) +
            '）') +
        ' + 持有成本 ' +
        money(summary.initialMonthlyOwnerCost) +
        ' → ' +
        money(summary.finalMonthlyOwnerCost),
    );
    var repairYears = snapshots
      .filter(function (snapshot) {
        return snapshot.repairCost > 0;
      })
      .map(function (snapshot) {
        return snapshot.month / 12;
      });
    setText(
      'summary-repair-detail',
      repairYears.length > 0
        ? '另有大修 ' +
            repairYears.length +
            ' 次（第 ' +
            repairYears.join('、') +
            ' 年末），共 ' +
            money(summary.totalRepairCost)
        : input.repairCost > 0
          ? '模拟期内没有到大修年份'
          : '未计大修费用',
    );

    var taxCreditYears = countMonths(snapshots, 'mortgageTaxCredit');
    setText('summary-total-tax-credit', money(summary.totalMortgageTaxCredit));
    setText(
      'summary-tax-credit-detail',
      taxCreditYears > 0
        ? '年末贷款余额（上限 ' +
            money(input.mortgageTaxCreditLoanCap) +
            '）× ' +
            formatRate(input.mortgageTaxCreditRate) +
            '，共 ' +
            taxCreditYears +
            ' 年；退税抵减当年买房成本，租房侧当月少投入相同金额'
        : '未产生控除（期间、控除率、限度额或贷款余额为 0）',
    );

    setText('summary-home-equity', money(summary.finalHomeEquity));
    setText('summary-final-land-value', money(summary.finalLandValue));
    setText('summary-final-building-value', money(summary.finalBuildingValue));
    setText('summary-house-value', money(summary.finalHouseValue));
    setText('summary-final-loan', money(summary.finalRemainingLoan));
    setText('summary-final-selling-cost', money(summary.finalSellingCost));
    setText(
      'summary-building-life',
      input.buildingAgeYears > 0
        ? '建筑物按簡便法剩余耐用年数 ' +
            summary.buildingRemainingLifeYears +
            ' 年（法定 ' +
            summary.buildingUsefulLifeYears +
            ' 年）直线折旧至 0'
        : '建筑物按法定耐用年数 ' +
            summary.buildingUsefulLifeYears +
            ' 年直线折旧至 0',
    );

    setText('summary-initial-investment', money(summary.initialInvestment));
    setText(
      'summary-rent-range',
      money(summary.initialMonthlyRent) +
        ' → ' +
        money(summary.finalMonthlyRent) +
        ' / 月',
    );
    var renewalCount = countMonths(snapshots, 'renewalFee');
    var agingNote =
      input.rentAgingRate > 0
        ? '含房龄折价每年 ' + formatRate(input.rentAgingRate) + '；'
        : '';
    setText(
      'summary-renewal-detail',
      agingNote +
      (renewalCount > 0
        ? '另有更新料：每 ' +
            input.renewalIntervalYears +
            ' 年付 ' +
            input.renewalFeeMonths +
            ' 个月房租，共 ' +
            renewalCount +
            ' 次'
        : '模拟期内没有更新料'),
    );
    setText(
      'summary-investment-contribution-range',
      formatFlow(firstSnapshot.buyHousingCost - firstSnapshot.rentPaid) +
        ' → ' +
        formatFlow(finalSnapshot.buyHousingCost - finalSnapshot.rentPaid) +
        ' / 月',
    );
    setText(
      'summary-investment-contribution-breakdown',
      formatRegularGap('首月：', firstSnapshot) +
        '；' +
        formatRegularGap('期末：', finalSnapshot) +
        '。控除退税月份少投入，大修月份多投入，更新料月份多取出',
    );
    setText('summary-rent-total-assets', money(summary.finalRentTotalAssets));
    setText(
      'summary-rent-total-detail',
      summary.finalRentInvestmentBalance < 0
        ? '投资账户已用尽，欠款 ' + money(-summary.finalRentInvestmentBalance)
        : '投资账户 ' +
            money(summary.finalRentInvestmentBalance) +
            ' − 期末变现收益税 ' +
            money(summary.finalRentInvestmentTax),
    );

    setText('summary-horizon', formatYears(input.horizonYears));
    setText(
      'summary-horizon-note',
      input.horizonYears >= input.loanTermYears
        ? '等于贷款期限，期末贷款已还清'
        : '短于贷款期限，房屋净资产已扣除剩余贷款 ' +
            money(summary.finalRemainingLoan),
    );
    setText(
      'summary-difference',
      formatSignedMoney(summary.finalDifference),
    );
    setText('summary-total-buy-outflow', money(summary.totalBuyCashOutflow));
    setText('summary-total-rent-outflow', money(summary.totalRentCashOutflow));
    setText('summary-total-rent', money(summary.totalRentPaid));
    setText('summary-total-renewal-fees', money(summary.totalRenewalFees));
    setText(
      'summary-total-rent-investment',
      money(summary.initialInvestment + summary.totalRentInvestmentDeposits),
    );
    setText(
      'summary-total-rent-withdrawal',
      money(summary.totalRentInvestmentWithdrawals),
    );
    var firstWithdrawal = snapshots.find(function (snapshot) {
      return snapshot.rentInvestmentContribution < 0;
    });
    setText(
      'summary-rent-withdrawal-note',
      !firstWithdrawal
        ? '整个期间都没有取出'
        : '首次取出在' +
            formatMonth(firstWithdrawal, true) +
            '；' +
            (summary.lowestRentInvestmentBalance < 0
              ? '账户曾用尽，最大欠款 ' +
                money(-summary.lowestRentInvestmentBalance)
              : '账户最低余额 ' + money(summary.lowestRentInvestmentBalance)),
    );
    setText('summary-total-mortgage-paid', money(summary.totalMortgagePaid));
    setText('summary-total-interest-paid', money(summary.totalInterestPaid));
    setText('summary-total-principal-paid', money(summary.totalPrincipalPaid));
    setText('summary-house-appreciation', money(summary.houseAppreciation));
    setText('summary-investment-gain', money(summary.rentInvestmentGain));
    setText('summary-investment-tax', money(summary.finalInvestmentTax));
    setText(
      'summary-investment-tax-note',
      input.investmentTaxRate > 0
        ? '按 ' +
            formatTaxRate(input.investmentTaxRate) +
            ' 对收益课税：期间取出时 ' +
            money(summary.totalWithdrawalTax) +
            ' + 期末全部变现 ' +
            money(summary.finalRentInvestmentTax)
        : '税率为 0%（如 NISA），不扣税',
    );

    var resultClass =
      Math.abs(summary.finalDifference) < 0.5
        ? 'neutral'
        : summary.finalDifference > 0
          ? 'positive'
          : 'negative';
    get('summary-difference').className = 'summary-value ' + resultClass;

    setText('chart-buy-total', money(summary.finalBuyTotalAssets));
    setText('chart-rent-total', money(summary.finalRentTotalAssets));
    setText(
      'chart-difference-label',
      resultClass === 'neutral'
        ? '期末差额'
        : summary.rentWins
          ? '租房路径高出'
          : '买房路径高出',
    );
    setText(
      'chart-difference',
      resultClass === 'neutral'
        ? '结果接近'
        : money(Math.abs(summary.finalDifference)),
    );
    get('chart-difference').className = 'chart-key-value ' + resultClass;
  }

  var svgNamespace = 'http://www.w3.org/2000/svg';

  function createSvgElement(tagName) {
    return document.createElementNS(svgNamespace, tagName);
  }

  function setSvgAttributes(element, attributes) {
    Object.keys(attributes).forEach(function (name) {
      element.setAttribute(name, String(attributes[name]));
    });
  }

  function createSvgText(text, x, y, className) {
    var element = createSvgElement('text');
    element.textContent = text;
    setSvgAttributes(element, { x: x, y: y, class: className });
    return element;
  }

  // Geometry and hover elements of the latest render. Pointer and keyboard
  // handlers are bound once to the SVG and read this state.
  var chartView = null;
  var chartActiveIndex = null;
  var chartSnapshots = [];

  function renderChartTooltip(snapshot) {
    var tooltip = get('chart-tooltip');
    tooltip.replaceChildren();
    var heading = document.createElement('strong');
    heading.textContent = formatMonth(snapshot, false) + '末';
    var buyLine = document.createElement('span');
    buyLine.textContent = '买房总资产：' + formatMoney(snapshot.buyTotalAssets);
    var buyDetailLine = document.createElement('span');
    buyDetailLine.textContent =
      '（房屋 ' +
      formatMoney(snapshot.houseValue) +
      ' − 贷款 ' +
      formatMoney(snapshot.remainingLoan) +
      ' − 出售费用 ' +
      formatMoney(snapshot.sellingCost) +
      '）';
    var rentLine = document.createElement('span');
    rentLine.textContent = '租房总资产：' + formatMoney(snapshot.rentTotalAssets);
    var rentDetailLine = document.createElement('span');
    var netContribution = snapshot.cumulativeRentNetContribution;
    rentDetailLine.textContent =
      '（首付 ' +
      formatMoney(currentResult.summary.initialDownPayment) +
      ' + 购房费用 ' +
      formatMoney(currentResult.summary.purchaseFees) +
      (netContribution >= 0
        ? ' + 买房多花的钱累计投入 ' + formatMoney(netContribution)
        : ' − 房租多出的钱累计取出 ' + formatMoney(-netContribution)) +
      ' + 投资收益 ' +
      formatMoney(snapshot.cumulativeInvestmentReturn) +
      (snapshot.cumulativeRentInvestmentTax > 0.5
        ? ' − 税金 ' + formatMoney(snapshot.cumulativeRentInvestmentTax)
        : '') +
      '）';
    var differenceLine = document.createElement('span');
    differenceLine.textContent =
      '差额：' + formatSignedMoney(snapshot.difference);
    tooltip.append(
      heading,
      buyLine,
      buyDetailLine,
      rentLine,
      rentDetailLine,
      differenceLine,
    );
  }

  function showChartIndex(index) {
    if (!chartView) {
      return;
    }
    var lastIndex = chartView.snapshots.length - 1;
    var safeIndex = Math.max(0, Math.min(lastIndex, index));
    var snapshot = chartView.snapshots[safeIndex];
    var x = chartView.xForIndex(safeIndex);
    var buyY = chartView.yForValue(snapshot.buyTotalAssets);
    var rentY = chartView.yForValue(snapshot.rentTotalAssets);
    chartActiveIndex = safeIndex;

    setSvgAttributes(chartView.guide, { x1: x, x2: x });
    setSvgAttributes(chartView.buyMarker, { cx: x, cy: buyY });
    setSvgAttributes(chartView.rentMarker, { cx: x, cy: rentY });
    chartView.hover.classList.add('active');

    var tooltip = get('chart-tooltip');
    renderChartTooltip(snapshot);
    tooltip.hidden = false;
    // Place the tooltip beside the guide line so it never covers the markers.
    var gap = 14;
    var left = x + gap;
    if (left + tooltip.offsetWidth > chartView.width - 8) {
      left = x - gap - tooltip.offsetWidth;
    }
    var top = Math.min(buyY, rentY) - tooltip.offsetHeight / 2;
    tooltip.style.left = Math.max(8, left) + 'px';
    tooltip.style.top =
      Math.max(8, Math.min(chartView.height - tooltip.offsetHeight - 8, top)) +
      'px';
  }

  function hideChartIndex() {
    get('chart-tooltip').hidden = true;
    if (chartView) {
      chartView.hover.classList.remove('active');
    }
  }

  function renderChart(monthlySnapshots) {
    chartSnapshots = monthlySnapshots;
    // The chart works in whole years: one point per year-end snapshot.
    var snapshots = monthlySnapshots.filter(function (snapshot) {
      return snapshot.month % 12 === 0;
    });
    var chart = get('comparison-chart');
    var frame = get('chart-frame');
    // Draw in CSS pixels so labels and strokes keep their size as the
    // sticky chart area resizes, instead of scaling a fixed viewBox.
    var width = frame.clientWidth || 960;
    var height = frame.clientHeight || 380;
    var padding = {
      top: 24,
      right: 24,
      bottom: 48,
      left: width < 520 ? 72 : 88,
    };
    var innerWidth = width - padding.left - padding.right;
    var innerHeight = height - padding.top - padding.bottom;
    var previousIndex = chartActiveIndex;

    hideChartIndex();
    chartView = null;
    chartActiveIndex = null;
    chart.replaceChildren();
    chart.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

    if (snapshots.length === 0) {
      chart.append(
        createSvgText(
          '输入有效参数后显示图表',
          width / 2,
          height / 2,
          'chart-empty',
        ),
      );
      return;
    }

    var values = [];
    snapshots.forEach(function (snapshot) {
      values.push(snapshot.buyTotalAssets, snapshot.rentTotalAssets);
    });
    var dataMin = Math.min.apply(Math, [0].concat(values));
    var dataMax = Math.max.apply(Math, [1].concat(values));
    var tickStep = niceStep((dataMax - dataMin) / 4);
    var yMin = Math.floor(dataMin / tickStep) * tickStep;
    var yMax = Math.ceil(dataMax / tickStep) * tickStep;
    var yRange = yMax - yMin || 1;
    var lastIndex = snapshots.length - 1;
    var xForIndex = function (index) {
      return padding.left + (index / Math.max(1, lastIndex)) * innerWidth;
    };
    var yForValue = function (value) {
      return padding.top + ((yMax - value) / yRange) * innerHeight;
    };

    var grid = createSvgElement('g');
    var tickCount = Math.round(yRange / tickStep);
    for (var tickIndex = 0; tickIndex <= tickCount; tickIndex += 1) {
      var gridValue = yMin + tickStep * tickIndex;
      var gridY = yForValue(gridValue);
      var gridLine = createSvgElement('line');
      setSvgAttributes(gridLine, {
        x1: padding.left,
        x2: width - padding.right,
        y1: gridY,
        y2: gridY,
        class:
          Math.abs(gridValue) < tickStep / 2
            ? 'chart-grid-line chart-zero-line'
            : 'chart-grid-line',
      });
      grid.append(
        gridLine,
        createSvgText(
          formatCompactMoney(gridValue),
          padding.left - 12,
          gridY + 4,
          'chart-axis-label',
        ),
      );
    }
    chart.append(grid);

    var yearWidth = innerWidth / Math.max(1, lastIndex);
    var minLabelGap = 40;
    var labelStep =
      [1, 5, 10].find(function (step) {
        return step * yearWidth >= minLabelGap;
      }) || 20;
    var axisY = height - padding.bottom;
    var xAxis = createSvgElement('g');
    snapshots.forEach(function (snapshot, index) {
      var x = xForIndex(index);
      if (snapshot.year % 5 === 0) {
        var yearLine = createSvgElement('line');
        setSvgAttributes(yearLine, {
          x1: x,
          x2: x,
          y1: padding.top,
          y2: axisY,
          class: 'chart-year-line',
        });
        xAxis.append(yearLine);
      }
      var yearTick = createSvgElement('line');
      setSvgAttributes(yearTick, {
        x1: x,
        x2: x,
        y1: axisY,
        y2: axisY + (snapshot.year % 5 === 0 ? 7 : 4),
        class: 'chart-year-tick',
      });
      xAxis.append(yearTick);
      // The final year is always labelled; drop a regular label that would
      // collide with it.
      var isLast = index === lastIndex;
      if (
        isLast ||
        (snapshot.year % labelStep === 0 &&
          (lastIndex - index) * yearWidth >= minLabelGap)
      ) {
        xAxis.append(
          createSvgText(
            snapshot.year + ' 年',
            x,
            height - 16,
            'chart-axis-label chart-axis-label-x',
          ),
        );
      }
    });
    chart.append(xAxis);

    var series = [
      {
        key: 'buyTotalAssets',
        color: '#e07a5f',
        className: 'chart-line chart-line-house',
      },
      {
        key: 'rentTotalAssets',
        color: '#2a9d8f',
        className: 'chart-line chart-line-investment',
      },
    ];

    series.forEach(function (seriesItem) {
      var path = createSvgElement('path');
      var pathData = snapshots
        .map(function (snapshot, index) {
          return (
            (index === 0 ? 'M' : 'L') +
            ' ' +
            xForIndex(index) +
            ' ' +
            yForValue(snapshot[seriesItem.key])
          );
        })
        .join(' ');
      setSvgAttributes(path, {
        d: pathData,
        stroke: seriesItem.color,
        class: seriesItem.className,
      });
      chart.append(path);
    });

    var hover = createSvgElement('g');
    setSvgAttributes(hover, { class: 'chart-hover' });
    var guide = createSvgElement('line');
    setSvgAttributes(guide, {
      y1: padding.top,
      y2: height - padding.bottom,
      class: 'chart-guide',
    });
    var markers = series.map(function (seriesItem) {
      var marker = createSvgElement('circle');
      setSvgAttributes(marker, {
        r: 5,
        fill: seriesItem.color,
        class: 'chart-marker',
      });
      return marker;
    });
    hover.append(guide, markers[0], markers[1]);
    chart.append(hover);

    chartView = {
      snapshots: snapshots,
      width: width,
      height: height,
      paddingLeft: padding.left,
      innerWidth: innerWidth,
      xForIndex: xForIndex,
      yForValue: yForValue,
      hover: hover,
      guide: guide,
      buyMarker: markers[0],
      rentMarker: markers[1],
    };

    if (document.activeElement === chart && previousIndex !== null) {
      showChartIndex(previousIndex);
    }
  }

  function chartIndexFromPointer(event) {
    var rect = get('comparison-chart').getBoundingClientRect();
    var ratio =
      (event.clientX - rect.left - chartView.paddingLeft) / chartView.innerWidth;
    return Math.round(ratio * (chartView.snapshots.length - 1));
  }

  function bindChartInteractions() {
    var chart = get('comparison-chart');
    var showFromPointer = function (event) {
      if (chartView) {
        showChartIndex(chartIndexFromPointer(event));
      }
    };
    // Touch taps fire pointerdown without a preceding pointermove.
    chart.addEventListener('pointerdown', showFromPointer);
    chart.addEventListener('pointermove', showFromPointer);
    chart.addEventListener('pointerleave', function () {
      if (document.activeElement !== chart) {
        hideChartIndex();
      }
    });
    chart.addEventListener('focus', function () {
      if (chartView) {
        showChartIndex(
          chartActiveIndex === null
            ? chartView.snapshots.length - 1
            : chartActiveIndex,
        );
      }
    });
    chart.addEventListener('blur', hideChartIndex);
    chart.addEventListener('keydown', function (event) {
      if (!chartView) {
        return;
      }
      if (event.key === 'Escape') {
        hideChartIndex();
        return;
      }
      var lastIndex = chartView.snapshots.length - 1;
      var current = chartActiveIndex === null ? lastIndex : chartActiveIndex;
      var steps = {
        ArrowLeft: -1,
        ArrowDown: -1,
        ArrowRight: 1,
        ArrowUp: 1,
        PageDown: -5,
        PageUp: 5,
        Home: -Infinity,
        End: Infinity,
      };
      if (!(event.key in steps)) {
        return;
      }
      event.preventDefault();
      var step = steps[event.key];
      showChartIndex(
        step === -Infinity ? 0 : step === Infinity ? lastIndex : current + step,
      );
    });
  }

  function formatMonth(snapshot, monthly) {
    if (!monthly) {
      return '第 ' + snapshot.year + ' 年';
    }
    return (
      '第 ' +
      snapshot.year +
      ' 年第 ' +
      (((snapshot.month - 1) % 12) + 1) +
      ' 个月'
    );
  }

  function createTableCell(text, className) {
    var cell = document.createElement('td');
    cell.textContent = text;
    if (className) {
      cell.className = className;
    }
    return cell;
  }

  function renderTable(result) {
    var tableBody = get('detail-table-body');
    var monthly = get('table-range').value === 'monthly';
    var periodLabel = monthly ? '（当月）' : '（当年）';
    setText('table-contribution-heading', '租房侧投入 / 取出' + periodLabel);
    setText('table-buy-cost-heading', '买房成本' + periodLabel);
    setText('table-rent-cost-heading', '租房成本' + periodLabel);

    var rows = [];
    result.snapshots.forEach(function (snapshot) {
      var previousRow = rows[rows.length - 1];
      if (!monthly && previousRow && previousRow.snapshot.year === snapshot.year) {
        previousRow.snapshot = snapshot;
        previousRow.contribution += snapshot.rentInvestmentContribution;
        previousRow.buyCost += snapshot.buyNetHousingCost;
        previousRow.rentCost += snapshot.rentHousingCost;
        return;
      }
      rows.push({
        snapshot: snapshot,
        contribution: snapshot.rentInvestmentContribution,
        buyCost: snapshot.buyNetHousingCost,
        rentCost: snapshot.rentHousingCost,
      });
    });

    tableBody.replaceChildren();
    rows.forEach(function (row) {
      var snapshot = row.snapshot;
      var tableRow = document.createElement('tr');
      tableRow.append(
        createTableCell(formatMonth(snapshot, monthly)),
        createTableCell(formatMoney(snapshot.houseValue)),
        createTableCell(formatMoney(snapshot.landValue)),
        createTableCell(formatMoney(snapshot.buildingValue)),
        createTableCell(formatMoney(snapshot.remainingLoan)),
        createTableCell(formatMoney(snapshot.buyTotalAssets)),
        createTableCell(formatFlow(row.contribution)),
        createTableCell(formatMoney(snapshot.rentTotalAssets)),
        createTableCell(formatMoney(row.buyCost)),
        createTableCell(formatMoney(row.rentCost)),
        createTableCell(formatMoney(snapshot.difference)),
      );
      tableBody.append(tableRow);
    });
  }

  function clearTable() {
    var tableBody = get('detail-table-body');
    var row = document.createElement('tr');
    var cell = createTableCell('输入有效参数后显示明细', 'table-empty');
    cell.colSpan = 11;
    row.append(cell);
    tableBody.replaceChildren(row);
  }

  function csvCell(value) {
    var text = String(value);
    return /[",\r\n]/.test(text)
      ? '"' + text.replaceAll('"', '""') + '"'
      : text;
  }

  var csvColumns = [
    ['month', '月份'],
    ['houseValue', '房屋价值'],
    ['landValue', '土地价值'],
    ['buildingValue', '建筑物价值'],
    ['scheduledPayment', '月供'],
    ['interestPaid', '其中利息'],
    ['principalPaid', '其中本金'],
    ['remainingLoan', '剩余贷款'],
    ['ownerCost', '持有成本'],
    ['buyHousingCost', '买房成本（月供 + 持有成本）'],
    ['repairCost', '大修费用'],
    ['mortgageTaxCredit', '住宅ローン控除'],
    ['buyNetHousingCost', '买房净成本（+ 大修 − 控除）'],
    ['rentPaid', '月租'],
    ['renewalFee', '更新料'],
    ['rentHousingCost', '租房成本'],
    ['rentInvestmentContribution', '租房侧投入（负数为取出）'],
    ['investmentReturn', '租房侧当月投资收益'],
    ['withdrawalTax', '取出时缴纳的收益税'],
    ['rentInvestmentBalance', '租房侧投资余额（税前，负数为欠款）'],
    ['rentInvestmentValue', '租房侧投资价值（税后）'],
    ['homeEquityBeforeSellingCost', '房屋净资产（未扣出售费用）'],
    ['sellingCost', '出售费用'],
    ['buyTotalAssets', '买房总资产（房屋净资产）'],
    ['rentTotalAssets', '租房总资产'],
    ['cumulativeBuyCashOutflow', '买房累计现金流出'],
    ['cumulativeRentCashOutflow', '租房累计现金流出'],
    ['difference', '差额（租房 − 买房）'],
  ];

  function exportCsv(result) {
    var rows = [
      csvColumns.map(function (column) {
        return column[1];
      }),
    ];
    result.snapshots.forEach(function (snapshot) {
      rows.push(
        csvColumns.map(function (column) {
          var value = snapshot[column[0]];
          return typeof value === 'number' ? Math.round(value) : value;
        }),
      );
    });

    var csv =
      '\uFEFF' +
      rows
        .map(function (row) {
          return row.map(csvCell).join(',');
        })
        .join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'mortgage-investment-comparison.csv';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderBreakEvenItems(items) {
    var list = get('break-even-list');
    list.replaceChildren.apply(
      list,
      items.map(function (item) {
        var listItem = document.createElement('li');
        listItem.textContent = item;
        return listItem;
      }),
    );
  }

  function withValue(key) {
    return function (input, value) {
      var copy = Object.assign({}, input);
      copy[key] = value;
      return copy;
    };
  }

  // Bisection ranges stay inside the validated slider ranges so every probe
  // is a valid simulation input.
  var breakEvenAssumptions = [
    {
      label: '房贷年利率',
      key: 'mortgageAnnualRate',
      low: 0,
      high: 10,
      format: formatPreciseRate,
      // A scheduled rate change keeps its step size as the base rate moves.
      apply: function (input, value) {
        var copy = Object.assign({}, input, { mortgageAnnualRate: value });
        if (input.rateChangeYear > 0) {
          copy.mortgageAnnualRateAfterChange = Math.min(
            10,
            Math.max(
              0,
              input.mortgageAnnualRateAfterChange +
                value -
                input.mortgageAnnualRate,
            ),
          );
        }
        return copy;
      },
    },
    {
      label: '年化投资收益率',
      key: 'investmentAnnualReturnRate',
      low: -20,
      high: 20,
      format: formatPreciseRate,
    },
    {
      label: '土地年增长率',
      key: 'landAnnualGrowthRate',
      low: -10,
      high: 10,
      format: formatPreciseRate,
    },
    {
      label: '年租金增长率',
      key: 'rentAnnualGrowthRate',
      low: -10,
      high: 10,
      format: formatPreciseRate,
    },
    {
      label: '当前月租',
      key: 'monthlyRent',
      low: 0,
      high: 500000,
      format: function (value) {
        return formatMoney(Math.round(value / 100) * 100);
      },
    },
  ];

  function formatPreciseRate(value) {
    return value.toFixed(2) + '%';
  }

  function winnerLabel(rentWins) {
    return rentWins ? '租房' : '买房';
  }

  function renderBreakEven(input) {
    renderBreakEvenItems(
      breakEvenAssumptions.map(function (assumption) {
        var result = calculator.findBreakEven(
          input,
          assumption.apply || withValue(assumption.key),
          assumption.low,
          assumption.high,
        );
        var prefix =
          assumption.label +
          '（当前 ' +
          assumption.format(input[assumption.key]) +
          (assumption.key === 'mortgageAnnualRate' && input.rateChangeYear > 0
            ? '，变动后利率同幅调整'
            : '') +
          '）：';
        if (result.value === null) {
          return (
            prefix +
            '在 ' +
            assumption.format(assumption.low) +
            ' ～ ' +
            assumption.format(assumption.high) +
            ' 范围内始终' +
            winnerLabel(result.rentWinsAtLow) +
            '更划算'
          );
        }
        return (
          prefix +
          '平衡点 ' +
          assumption.format(result.value) +
          '，低于它' +
          winnerLabel(result.rentWinsAtLow) +
          '更划算，高于它' +
          winnerLabel(result.rentWinsAtHigh) +
          '更划算'
        );
      }),
    );
  }

  function parametersAsText(input) {
    var downPaymentLine =
      input.downPaymentMode === 'fixed'
        ? '头金: 固定金额 ' + formatMoney(input.downPaymentAmount)
        : '头金: 房价的 ' + input.downPaymentPercentage + '%';
    return [
      '房屋价格: ' + formatMoney(input.housePrice),
      downPaymentLine,
      '房贷年利率: ' + input.mortgageAnnualRate + '%',
      input.rateChangeYear > 0
        ? '利率变动: 第 ' +
          input.rateChangeYear +
          ' 年后改为 ' +
          input.mortgageAnnualRateAfterChange +
          '%（按剩余期限重算月供）'
        : '利率变动: 不变',
      '贷款期限: ' + input.loanTermYears + ' 年',
      '模拟期限: ' + input.horizonYears + ' 年',
      '住宅ローン控除率: ' + input.mortgageTaxCreditRate + '%',
      '控除期间: ' + input.mortgageTaxCreditYears + ' 年',
      '控除对象借入限度额: ' + formatMoney(input.mortgageTaxCreditLoanCap),
      '土地年增长率: ' + input.landAnnualGrowthRate + '%',
      '建筑物结构: ' + (input.buildingStructure === 'rc' ? 'RC' : '木造'),
      '购买时建筑年龄: ' + input.buildingAgeYears + ' 年',
      '土地占比: ' + input.landSharePercentage + '%',
      '购房费用比例: ' + input.purchaseFeeRate + '%',
      '出售费用比例: ' + input.sellingFeeRate + '%',
      '每月持有成本: ' + formatMoney(input.monthlyOwnerCost),
      '持有成本年增长率: ' + input.ownerCostAnnualGrowthRate + '%',
      '大修: ' +
        (input.repairCost > 0
          ? '每 ' +
            input.repairIntervalYears +
            ' 年（按建筑物房龄） ' +
            formatMoney(input.repairCost)
          : '不计'),
      '当前月租: ' + formatMoney(input.monthlyRent),
      '年租金增长率: ' + input.rentAnnualGrowthRate + '%',
      '房龄租金折价: 每年 ' + input.rentAgingRate + '%',
      '更新周期: 每 ' + input.renewalIntervalYears + ' 年',
      '更新料: ' + input.renewalFeeMonths + ' 个月房租',
      '年化投资收益率: ' + input.investmentAnnualReturnRate + '%',
      '投资收益税率: ' + input.investmentTaxRate + '%',
      '投资启动金: 买房初期费用（头金 + 购房费用）',
      '租房侧每月投入: 买房月度成本（月供 + 持有成本 + 大修 − 控除退税）− 租房月度成本（月租 + 更新料），为负时从投资账户取出',
      '买房路径总资产: 仅房屋净资产（房屋价值 − 剩余贷款 − 出售费用）',
    ].join('\n');
  }

  function render() {
    updateInputVisibility();
    updateRangeConstraints();
    var input = readInput();
    updateRangeOutputs(input);
    updateProfileButtons();
    var errors = calculator.validateSimulationInput(input);
    displayValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      currentResult = null;
      setSummaryToEmpty();
      renderChart([]);
      clearTable();
      return;
    }

    currentResult = calculator.simulate(input);
    renderSummary(currentResult);
    renderBreakEven(input);
    renderChart(currentResult.snapshots);
    renderTable(currentResult);
  }

  function saveAndRender() {
    // render() applies the constraints too, but only after saving. A saved
    // horizon left below the loan term stops following it after a reload.
    updateRangeConstraints();
    saveInputState();
    render();
  }

  document.querySelectorAll('[data-profile-id]').forEach(function (button) {
    button.addEventListener('click', function () {
      applyProfile(button.dataset.profileId);
    });
  });

  var form = get('simulator-form');
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    saveAndRender();
  });
  form.addEventListener('input', function (event) {
    if (event.target && isPropertyInput(event.target)) {
      selectedProfileId = null;
    }
    saveAndRender();
  });
  form.addEventListener('change', function (event) {
    if (event.target && isPropertyInput(event.target)) {
      selectedProfileId = null;
    }
    saveAndRender();
  });
  get('table-range').addEventListener('change', function () {
    saveInputState();
    if (currentResult) {
      renderTable(currentResult);
    }
  });

  get('reset-button').addEventListener('click', function () {
    form.reset();
    get('table-range').value = 'yearly';
    clearInputState();
    render();
  });

  get('copy-button').addEventListener('click', function () {
    var input = readInput();
    var errors = calculator.validateSimulationInput(input);
    if (Object.keys(errors).length > 0) {
      displayValidationErrors(errors);
      return;
    }
    if (!navigator.clipboard) {
      setText('form-status', '当前浏览器不允许访问剪贴板，请手动复制参数。');
      return;
    }
    navigator.clipboard
      .writeText(parametersAsText(input))
      .then(function () {
        setText('form-status', '当前参数已复制。');
      })
      .catch(function (error) {
        var message =
          error instanceof Error ? error.message : '剪贴板写入失败。';
        setText('form-status', '复制失败：' + message);
      });
  });

  get('export-button').addEventListener('click', function () {
    if (!currentResult) {
      setText('form-status', '请先修正输入项，再导出 CSV。');
      return;
    }
    exportCsv(currentResult);
    setText('form-status', 'CSV 明细已开始下载。');
  });

  bindChartInteractions();
  new ResizeObserver(function () {
    renderChart(chartSnapshots);
  }).observe(get('chart-frame'));

  restoreInputState();
  render();
})();
