(function () {
  'use strict';

  var calculator = window.MortgageComparator;
  if (!calculator) {
    throw new Error('Calculator module must load before the app module');
  }

  var fieldErrorIds = {
    currency: 'error-currency',
    housePrice: 'error-housePrice',
    downPaymentMode: 'error-downPaymentMode',
    downPaymentPercentage: 'error-downPaymentPercentage',
    downPaymentAmount: 'error-downPaymentAmount',
    mortgageAnnualRate: 'error-mortgageAnnualRate',
    loanTermYears: 'error-loanTermYears',
    horizonYears: 'error-horizonYears',
    landAnnualGrowthRate: 'error-landAnnualGrowthRate',
    buildingStructure: 'error-buildingStructure',
    buildingAgeYears: 'error-buildingAgeYears',
    landSharePercentage: 'error-landSharePercentage',
    purchaseFeeRate: 'error-purchaseFeeRate',
    sellingFeeRate: 'error-sellingFeeRate',
    monthlyOwnerCost: 'error-monthlyOwnerCost',
    monthlyRent: 'error-monthlyRent',
    rentAnnualGrowthRate: 'error-rentAnnualGrowthRate',
    investmentAnnualReturnRate: 'error-investmentAnnualReturnRate',
    monthlyContributionBasis: 'error-monthlyContributionBasis',
    customMonthlyContribution: 'error-customMonthlyContribution',
  };

  var currencyLocales = {
    JPY: 'ja-JP',
    USD: 'en-US',
    EUR: 'de-DE',
  };

  var propertyProfiles = {
    'metro-used-condo': {
      housePrice: 52000000,
      landAnnualGrowthRate: 2,
      buildingStructure: 'rc',
      buildingAgeYears: 15,
      landSharePercentage: 35,
      monthlyOwnerCost: 37000,
      monthlyRent: 120000,
      rentAnnualGrowthRate: 2,
    },
    'metro-used-house': {
      housePrice: 42000000,
      landAnnualGrowthRate: 1,
      buildingStructure: 'wood',
      buildingAgeYears: 18,
      landSharePercentage: 70,
      monthlyOwnerCost: 28000,
      monthlyRent: 170000,
      rentAnnualGrowthRate: 1.2,
    },
    'metro-new-home': {
      housePrice: 60000000,
      landAnnualGrowthRate: 2,
      buildingStructure: 'wood',
      buildingAgeYears: 0,
      landSharePercentage: 50,
      monthlyOwnerCost: 35000,
      monthlyRent: 180000,
      rentAnnualGrowthRate: 1.8,
    },
    'outer-suburban-house': {
      housePrice: 28000000,
      landAnnualGrowthRate: -0.5,
      buildingStructure: 'wood',
      buildingAgeYears: 25,
      landSharePercentage: 75,
      monthlyOwnerCost: 20000,
      monthlyRent: 90000,
      rentAnnualGrowthRate: 0.8,
    },
  };

  var currentResult = null;
  var storageKey = 'mortgage-investment-comparator-input-v2';
  var legacyStorageKey = 'mortgage-investment-comparator-input-v1';
  var selectedProfileId = 'metro-used-condo';
  var persistedFieldIds = [
    'currency',
    'housePrice',
    'downPaymentMode',
    'downPaymentPercentage',
    'downPaymentAmount',
    'mortgageAnnualRate',
    'loanTermYears',
    'horizonYears',
    'landAnnualGrowthRate',
    'buildingStructure',
    'buildingAgeYears',
    'landSharePercentage',
    'purchaseFeeRate',
    'sellingFeeRate',
    'monthlyOwnerCost',
    'monthlyRent',
    'rentAnnualGrowthRate',
    'investmentAnnualReturnRate',
    'monthlyContributionBasis',
    'customMonthlyContribution',
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
      var loadedFromLegacy = false;
      if (!saved) {
        saved = window.localStorage.getItem(legacyStorageKey);
        loadedFromLegacy = Boolean(saved);
      }
      if (!saved) {
        return;
      }

      var state = JSON.parse(saved);
      if (loadedFromLegacy && state.purchaseFeeRate === '0') {
        state.purchaseFeeRate = String(calculator.defaultInput.purchaseFeeRate);
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
      if (
        selectedProfileId &&
        propertyProfiles[selectedProfileId]
      ) {
        ['buildingStructure', 'buildingAgeYears', 'landSharePercentage'].forEach(
          function (id) {
            if (!(id in state)) {
              state[id] = propertyProfiles[selectedProfileId][id];
            }
          },
        );
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
      if (loadedFromLegacy) {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      }
    } catch (error) {
      console.warn('无法读取浏览器中保存的参数，已使用默认值。', error);
    }
  }

  function clearInputState() {
    try {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(legacyStorageKey);
    } catch (error) {
      console.warn('无法清除浏览器中保存的参数。', error);
    }
    selectedProfileId = 'metro-used-condo';
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
    updateRangeConstraints();
    saveInputState();
    render();
    setText(
      'form-status',
      '已切换到“' + getProfileLabel(profileId) + '”，参数已保存。',
    );
  }

  function getProfileLabel(profileId) {
    var button = document.querySelector(
      '[data-profile-id="' + profileId + '"] strong',
    );
    return button ? button.textContent : '房屋画像';
  }

  function isPropertyInput(element) {
    return [
      'housePrice',
      'downPaymentMode',
      'downPaymentPercentage',
      'downPaymentAmount',
      'mortgageAnnualRate',
      'loanTermYears',
      'horizonYears',
      'landAnnualGrowthRate',
      'buildingStructure',
      'buildingAgeYears',
      'landSharePercentage',
      'purchaseFeeRate',
      'sellingFeeRate',
      'monthlyOwnerCost',
      'monthlyRent',
      'rentAnnualGrowthRate',
    ].includes(element.id);
  }

  function readInput() {
    var downPaymentModeValue = get('downPaymentMode').value;
    var contributionBasisValue = get('monthlyContributionBasis').value;

    return {
      currency: get('currency').value,
      housePrice: readNumber('housePrice'),
      downPaymentMode:
        downPaymentModeValue === 'fixed' ? 'fixed' : 'percentage',
      downPaymentPercentage: readNumber('downPaymentPercentage'),
      downPaymentAmount: readNumber('downPaymentAmount'),
      mortgageAnnualRate: readNumber('mortgageAnnualRate'),
      loanTermYears: readNumber('loanTermYears'),
      horizonYears: readNumber('horizonYears'),
      landAnnualGrowthRate: readNumber('landAnnualGrowthRate'),
      buildingStructure: get('buildingStructure').value,
      buildingAgeYears: readNumber('buildingAgeYears'),
      landSharePercentage: readNumber('landSharePercentage'),
      purchaseFeeRate: readNumber('purchaseFeeRate'),
      sellingFeeRate: readNumber('sellingFeeRate'),
      monthlyOwnerCost: readNumber('monthlyOwnerCost'),
      monthlyRent: readNumber('monthlyRent'),
      rentAnnualGrowthRate: readNumber('rentAnnualGrowthRate'),
      investmentAnnualReturnRate: readNumber('investmentAnnualReturnRate'),
      monthlyContributionBasis:
        contributionBasisValue === 'mortgage-plus-owner-cost' ||
        contributionBasisValue === 'custom'
          ? contributionBasisValue
          : 'mortgage-only',
      customMonthlyContribution: readNumber('customMonthlyContribution'),
    };
  }

  function setText(id, text) {
    get(id).textContent = text;
  }

  function formatMoney(value, currency) {
    if (!Number.isFinite(value)) {
      return '—';
    }
    var safeCurrency = currencyLocales[currency] ? currency : 'JPY';
    return new Intl.NumberFormat(currencyLocales[safeCurrency], {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatRate(value) {
    return Number.isFinite(value) ? value.toFixed(1) + '%' : '—';
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
    horizon.max = String(safeLoanTerm);
    if (Number(horizon.value) > safeLoanTerm) {
      horizon.value = String(safeLoanTerm);
    }
  }

  function updateRangeOutputs(input) {
    setText('housePrice-output', formatMoney(input.housePrice, input.currency));
    setText(
      'downPaymentPercentage-output',
      formatRate(input.downPaymentPercentage),
    );
    setText(
      'downPaymentAmount-output',
      formatMoney(input.downPaymentAmount, input.currency),
    );
    setText('mortgageAnnualRate-output', formatRate(input.mortgageAnnualRate));
    setText(
      'loanTermYears-output',
      Number.isFinite(input.loanTermYears) ? input.loanTermYears + ' 年' : '—',
    );
    setText(
      'horizonYears-output',
      Number.isFinite(input.horizonYears) ? input.horizonYears + ' 年' : '—',
    );
    setText(
      'landAnnualGrowthRate-output',
      formatRate(input.landAnnualGrowthRate),
    );
    setText(
      'buildingAgeYears-output',
      Number.isFinite(input.buildingAgeYears)
        ? input.buildingAgeYears + ' 年'
        : '—',
    );
    setText(
      'landSharePercentage-output',
      formatRate(input.landSharePercentage),
    );
    setText('sellingFeeRate-output', formatRate(input.sellingFeeRate));
    setText('purchaseFeeRate-output', formatRate(input.purchaseFeeRate));
    setText(
      'monthlyOwnerCost-output',
      formatMoney(input.monthlyOwnerCost, input.currency) + ' / 月',
    );
    setText(
      'monthlyRent-output',
      formatMoney(input.monthlyRent, input.currency) + ' / 月',
    );
    setText('rentAnnualGrowthRate-output', formatRate(input.rentAnnualGrowthRate));
    setText(
      'investmentAnnualReturnRate-output',
      formatRate(input.investmentAnnualReturnRate),
    );
    setText(
      'customMonthlyContribution-output',
      formatMoney(input.customMonthlyContribution, input.currency) + ' / 月',
    );
  }

  function formatCompactMoney(value, currency) {
    var absoluteValue = Math.abs(value);
    var prefix = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '¥';
    var sign = value < 0 ? '-' : '';
    if (absoluteValue >= 1000000000) {
      return sign + prefix + (absoluteValue / 1000000000).toFixed(1) + 'B';
    }
    if (absoluteValue >= 1000000) {
      return sign + prefix + (absoluteValue / 1000000).toFixed(1) + 'M';
    }
    if (absoluteValue >= 1000) {
      return sign + prefix + Math.round(absoluteValue / 1000) + 'K';
    }
    return formatMoney(value, currency);
  }

  function formatSignedMoney(value, currency) {
    if (Math.abs(value) < 0.5) {
      return '结果接近';
    }
    return value > 0
      ? '租房 + 投资路径高 ' + formatMoney(value, currency)
      : '买房路径高 ' + formatMoney(Math.abs(value), currency);
  }

  function updateInputVisibility() {
    var isFixedDownPayment = get('downPaymentMode').value === 'fixed';
    var isCustomContribution =
      get('monthlyContributionBasis').value === 'custom';

    get('percentage-field').classList.toggle(
      'hidden',
      isFixedDownPayment,
    );
    get('fixed-field').classList.toggle('hidden', !isFixedDownPayment);
    get('downPaymentPercentage').disabled = isFixedDownPayment;
    get('downPaymentAmount').disabled = !isFixedDownPayment;

    get('custom-contribution-field').classList.toggle(
      'hidden',
      !isCustomContribution,
    );
    get('customMonthlyContribution').disabled = !isCustomContribution;
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
      'summary-monthly-payment',
      'summary-monthly-owner-cost',
      'summary-monthly-buy-cost',
      'summary-horizon',
      'summary-house-value',
      'summary-final-land-value',
      'summary-final-building-value',
      'summary-final-loan',
      'summary-final-selling-cost',
      'summary-home-equity',
      'summary-investment-contribution-range',
      'summary-investment-contribution-breakdown',
      'summary-investment-balance',
      'summary-difference',
      'summary-winner',
      'summary-initial-investment',
      'summary-total-buy-outflow',
      'summary-total-rent',
      'summary-total-investment',
      'summary-total-mortgage-paid',
      'summary-total-interest-paid',
      'summary-total-principal-paid',
      'summary-house-appreciation',
      'summary-investment-gain',
    ].forEach(function (id) {
      setText(id, '—');
    });
    get('summary-difference').className = 'summary-value';
    get('summary-winner').className = 'summary-value';
  }

  function formatInvestmentBreakdown(
    periodLabel,
    rent,
    contribution,
    input,
    summary,
  ) {
    if (input.monthlyContributionBasis === 'custom') {
      return (
        periodLabel +
        '自定义投入 ' +
        formatMoney(input.customMonthlyContribution, input.currency) +
        ' / 月（不减房租）'
      );
    }

    var baseLabel =
      input.monthlyContributionBasis === 'mortgage-only'
        ? '房贷还款'
        : '买房总成本';
    var baseAmount =
      input.monthlyContributionBasis === 'mortgage-only'
        ? summary.monthlyPayment
        : summary.monthlyBuyCost;
    var result =
      periodLabel +
      baseLabel +
      ' ' +
      formatMoney(baseAmount, input.currency) +
      ' − 房租 ' +
      formatMoney(rent, input.currency) +
      ' = ' +
      formatMoney(contribution, input.currency) +
      ' / 月';

    return contribution < 0 ? result + '（负数表示提取）' : result;
  }

  function renderSummary(result) {
    var input = result.input;
    var summary = result.summary;
    setText(
      'summary-initial-expenses',
      formatMoney(summary.initialExpenses, input.currency),
    );
    setText(
      'summary-down-payment',
      formatMoney(summary.initialDownPayment, input.currency),
    );
    setText(
      'summary-purchase-fees',
      formatMoney(summary.purchaseFees, input.currency),
    );
    setText(
      'summary-monthly-payment',
      formatMoney(summary.monthlyPayment, input.currency) + ' / 月',
    );
    setText(
      'summary-monthly-owner-cost',
      formatMoney(input.monthlyOwnerCost, input.currency) + ' / 月',
    );
    setText(
      'summary-monthly-buy-cost',
      formatMoney(summary.monthlyBuyCost, input.currency) + ' / 月',
    );
    setText('summary-horizon', input.horizonYears + ' 年');
    setText(
      'summary-house-value',
      formatMoney(summary.finalHouseValue, input.currency),
    );
    setText(
      'summary-final-land-value',
      formatMoney(summary.finalLandValue, input.currency),
    );
    setText(
      'summary-final-building-value',
      formatMoney(summary.finalBuildingValue, input.currency),
    );
    setText(
      'summary-final-loan',
      formatMoney(summary.finalRemainingLoan, input.currency),
    );
    setText(
      'summary-final-selling-cost',
      formatMoney(summary.finalSellingCost, input.currency),
    );
    setText(
      'summary-home-equity',
      formatMoney(summary.finalHomeEquity, input.currency),
    );
    setText(
      'summary-investment-contribution-range',
      formatMoney(
        summary.initialMonthlyInvestmentContribution,
        input.currency,
      ) +
        ' → ' +
        formatMoney(summary.finalMonthlyInvestmentContribution, input.currency) +
        ' / 月',
    );
    setText(
      'summary-investment-contribution-breakdown',
      formatInvestmentBreakdown(
        '首月',
        summary.initialMonthlyRent,
        summary.initialMonthlyInvestmentContribution,
        input,
        summary,
      ) +
        '；' +
        formatInvestmentBreakdown(
          '期末',
          summary.finalMonthlyRent,
          summary.finalMonthlyInvestmentContribution,
          input,
          summary,
        ),
    );
    setText(
      'summary-investment-balance',
      formatMoney(summary.finalInvestmentBalance, input.currency),
    );
    setText(
      'summary-difference',
      formatSignedMoney(summary.finalDifference, input.currency),
    );
    setText(
      'summary-winner',
      Math.abs(summary.finalDifference) < 0.5
        ? '结果接近'
        : summary.investmentWins
        ? '租房 + 投资路径的金融资产更高'
          : '买房路径的房屋净资产更高',
    );
    setText(
      'summary-initial-investment',
      formatMoney(summary.initialInvestment, input.currency),
    );
    setText(
      'summary-total-buy-outflow',
      formatMoney(summary.totalBuyCashOutflow, input.currency),
    );
    setText(
      'summary-total-rent',
      formatMoney(summary.totalRentPaid, input.currency),
    );
    setText(
      'summary-total-investment',
      formatMoney(summary.totalInvestmentContributions, input.currency),
    );
    setText(
      'summary-total-mortgage-paid',
      formatMoney(summary.totalMortgagePaid, input.currency),
    );
    setText(
      'summary-total-interest-paid',
      formatMoney(summary.totalInterestPaid, input.currency),
    );
    setText(
      'summary-total-principal-paid',
      formatMoney(summary.totalPrincipalPaid, input.currency),
    );
    setText(
      'summary-house-appreciation',
      formatMoney(summary.houseAppreciation, input.currency),
    );
    setText(
      'summary-investment-gain',
      formatMoney(summary.investmentGain, input.currency),
    );

    var resultClass =
      Math.abs(summary.finalDifference) < 0.5
        ? 'neutral'
        : summary.finalDifference > 0
          ? 'positive'
          : 'negative';
    get('summary-difference').className = 'summary-value ' + resultClass;
    get('summary-winner').className = 'summary-value ' + resultClass;
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

  function showChartTooltip(snapshot, target, currency) {
    var tooltip = get('chart-tooltip');
    var chartFrame = get('chart-frame');
    var pointRect = target.getBoundingClientRect();
    var frameRect = chartFrame.getBoundingClientRect();

    tooltip.replaceChildren();
    var heading = document.createElement('strong');
    heading.textContent = '第 ' + snapshot.month + ' 个月';
    var houseLine = document.createElement('span');
    houseLine.textContent =
      '房屋净资产：' + formatMoney(snapshot.homeEquity, currency);
    var investmentLine = document.createElement('span');
    investmentLine.textContent =
      '投资余额：' + formatMoney(snapshot.investmentBalance, currency);
    tooltip.append(heading, houseLine, investmentLine);
    tooltip.hidden = false;

    var left = pointRect.left - frameRect.left + pointRect.width / 2;
    var top = pointRect.top - frameRect.top - tooltip.offsetHeight - 12;
    tooltip.style.left = Math.max(8, left - tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = Math.max(8, top) + 'px';
  }

  function hideChartTooltip() {
    get('chart-tooltip').hidden = true;
  }

  function renderChart(snapshots, currency) {
    var chart = get('comparison-chart');
    var width = 960;
    var height = 380;
    var padding = { top: 24, right: 24, bottom: 48, left: 82 };
    var innerWidth = width - padding.left - padding.right;
    var innerHeight = height - padding.top - padding.bottom;

    hideChartTooltip();
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
      values.push(snapshot.homeEquity, snapshot.investmentBalance);
    });
    var yMin = Math.min.apply(Math, [0].concat(values));
    var yMax = Math.max.apply(Math, [1].concat(values));
    var yRange = yMax - yMin || 1;
    var xForIndex = function (index) {
      return (
        padding.left +
        (index / Math.max(1, snapshots.length - 1)) * innerWidth
      );
    };
    var yForValue = function (value) {
      return padding.top + ((yMax - value) / yRange) * innerHeight;
    };

    var grid = createSvgElement('g');
    for (var gridIndex = 0; gridIndex <= 4; gridIndex += 1) {
      var gridValue = yMax - (yRange * gridIndex) / 4;
      var gridY = yForValue(gridValue);
      var gridLine = createSvgElement('line');
      setSvgAttributes(gridLine, {
        x1: padding.left,
        x2: width - padding.right,
        y1: gridY,
        y2: gridY,
        class: 'chart-grid-line',
      });
      grid.append(
        gridLine,
        createSvgText(
          formatCompactMoney(gridValue, currency),
          padding.left - 12,
          gridY + 4,
          'chart-axis-label',
        ),
      );
    }
    chart.append(grid);

    var labelIndices = {};
    labelIndices[0] = true;
    labelIndices[snapshots.length - 1] = true;
    snapshots.forEach(function (snapshot, index) {
      if (snapshot.month % 12 === 0) {
        labelIndices[index] = true;
      }
    });
    var labels = createSvgElement('g');
    Object.keys(labelIndices)
      .map(Number)
      .sort(function (left, right) {
        return left - right;
      })
      .forEach(function (index) {
        var snapshot = snapshots[index];
        if (!snapshot) {
          return;
        }
        labels.append(
          createSvgText(
            snapshot.year + ' 年',
            xForIndex(index),
            height - 16,
            'chart-axis-label chart-axis-label-x',
          ),
        );
      });
    chart.append(labels);

    var series = [
      {
        key: 'homeEquity',
        color: '#e07a5f',
        className: 'chart-line chart-line-house',
      },
      {
        key: 'investmentBalance',
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

    var points = createSvgElement('g');
    snapshots.forEach(function (snapshot, index) {
      series.forEach(function (seriesItem) {
        var point = createSvgElement('circle');
        setSvgAttributes(point, {
          cx: xForIndex(index),
          cy: yForValue(snapshot[seriesItem.key]),
          r: 4,
          fill: seriesItem.color,
          class: 'chart-point',
          tabindex: 0,
        });
        point.addEventListener('pointerenter', function () {
          showChartTooltip(snapshot, point, currency);
        });
        point.addEventListener('pointermove', function () {
          showChartTooltip(snapshot, point, currency);
        });
        point.addEventListener('pointerleave', hideChartTooltip);
        point.addEventListener('focus', function () {
          showChartTooltip(snapshot, point, currency);
        });
        point.addEventListener('blur', hideChartTooltip);
        points.append(point);
      });
    });
    chart.append(points);
  }

  function formatMonth(snapshot, monthly) {
    if (!monthly) {
      return snapshot.year + ' 年';
    }
    return (
      snapshot.year +
      ' 年 ' +
      (((snapshot.month - 1) % 12) + 1) +
      ' 月'
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
    var snapshots = monthly
      ? result.snapshots
      : result.snapshots.filter(function (snapshot) {
          return (
            snapshot.month % 12 === 0 ||
            snapshot.month === result.snapshots.length
          );
        });

    tableBody.replaceChildren();
    snapshots.forEach(function (snapshot) {
      var row = document.createElement('tr');
      row.append(
        createTableCell(formatMonth(snapshot, monthly)),
        createTableCell(formatMoney(snapshot.houseValue, result.input.currency)),
        createTableCell(formatMoney(snapshot.landValue, result.input.currency)),
        createTableCell(
          formatMoney(snapshot.buildingValue, result.input.currency),
        ),
        createTableCell(
          formatMoney(snapshot.remainingLoan, result.input.currency),
        ),
        createTableCell(formatMoney(snapshot.homeEquity, result.input.currency)),
        createTableCell(
          formatMoney(snapshot.investmentBalance, result.input.currency),
        ),
        createTableCell(formatMoney(snapshot.rentPaid, result.input.currency)),
        createTableCell(
          formatMoney(snapshot.investmentContribution, result.input.currency),
        ),
        createTableCell(formatMoney(snapshot.difference, result.input.currency)),
      );
      tableBody.append(row);
    });
  }

  function clearTable() {
    var tableBody = get('detail-table-body');
    var row = document.createElement('tr');
    var cell = createTableCell('输入有效参数后显示月度明细', 'table-empty');
    cell.colSpan = 10;
    row.append(cell);
    tableBody.replaceChildren(row);
  }

  function csvCell(value) {
    var text = String(value);
    return /[",\r\n]/.test(text)
      ? '"' + text.replaceAll('"', '""') + '"'
      : text;
  }

  function exportCsv(result) {
    var rows = [
      [
        '月份',
        '房屋价值',
        '土地价值',
        '建筑物价值',
        '剩余贷款',
        '房屋净资产',
        '投资余额',
        '当月租金',
        '投资净投入',
        '差额',
      ],
    ];
    result.snapshots.forEach(function (snapshot) {
      rows.push([
        snapshot.month,
        snapshot.houseValue,
        snapshot.landValue,
        snapshot.buildingValue,
        snapshot.remainingLoan,
        snapshot.homeEquity,
        snapshot.investmentBalance,
        snapshot.rentPaid,
        snapshot.investmentContribution,
        snapshot.difference,
      ]);
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

  function parametersAsText(input) {
    return [
      '货币: ' + input.currency,
      '房屋价格: ' + input.housePrice,
      '头金方式: ' + input.downPaymentMode,
      '头金比例: ' + input.downPaymentPercentage + '%',
      '头金金额: ' + input.downPaymentAmount,
      '房贷年利率: ' + input.mortgageAnnualRate + '%',
      '贷款期限: ' + input.loanTermYears + ' 年',
      '模拟期限: ' + input.horizonYears + ' 年',
      '土地年增长率: ' + input.landAnnualGrowthRate + '%',
      '建筑物结构: ' + input.buildingStructure,
      '购买时建筑年龄: ' + input.buildingAgeYears + ' 年',
      '土地占比: ' + input.landSharePercentage + '%',
      '购房费用比例: ' + input.purchaseFeeRate + '%',
      '出售费用比例: ' + input.sellingFeeRate + '%',
      '每月持有成本: ' + input.monthlyOwnerCost,
      '当前月租: ' + input.monthlyRent,
      '年租金增长率: ' + input.rentAnnualGrowthRate + '%',
      '年化投资收益率: ' + input.investmentAnnualReturnRate + '%',
      '投资启动金: 买房初期费用（头金 + 购房费用）',
      '每月投入基准: ' + input.monthlyContributionBasis,
      '自定义月投入: ' + input.customMonthlyContribution,
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
      renderChart([], input.currency);
      clearTable();
      return;
    }

    currentResult = calculator.simulate(input);
    renderSummary(currentResult);
    renderChart(currentResult.snapshots, input.currency);
    renderTable(currentResult);
  }

  document.querySelectorAll('[data-profile-id]').forEach(function (button) {
    button.addEventListener('click', function () {
      applyProfile(button.dataset.profileId);
    });
  });

  var form = get('simulator-form');
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    saveInputState();
    render();
  });
  form.addEventListener('input', function (event) {
    if (event.target && isPropertyInput(event.target)) {
      selectedProfileId = null;
    }
    saveInputState();
    render();
  });
  form.addEventListener('change', function (event) {
    if (event.target && isPropertyInput(event.target)) {
      selectedProfileId = null;
    }
    saveInputState();
    render();
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

  restoreInputState();
  render();
})();
