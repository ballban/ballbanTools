(function () {
  const {
    quotes, messages, getMonthWorkdayStats, calculateChinaTax, calculateJapanTax, calculateUSTax, calculateKoreaTax
  } = window.WM;

  const STORAGE_KEY = 'work_motivator_prefs_v3';
  const LANGUAGES = ['zh', 'en', 'ja', 'ko'];
  const HTML_LANG = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko' };

  const initialMonthStats = getMonthWorkdayStats(new Date(), 'CN');

  // --- State ---
  const state = {
    language: 'zh',
    country: 'CN',
    grossSalary: 15000,
    cnSocialRate: 18.5,
    deductionRate: null, // Manual total deduction % (JP/US/KR); null follows the salary-based estimate
    useNetForTicker: true,
    workDaysPerMonth: initialMonthStats.totalWorkdays,
    startTime: '09:00',
    workHours: 8, // Paid work time, excluding the break
    breakStartTime: '12:00',
    breakHours: 1,
    settingsCollapsed: false,
    mode: 'schedule', // 'schedule' or 'stopwatch'
    stopwatchRunning: false,
    stopwatchAccumulatedMs: 0,
    stopwatchLastStartMs: null,
    muted: false,
    quoteIndex: 0,
    // One-click Slacking counts & minutes
    slackMinutesTotal: 0,
    slackCounts: {
      coffee: 0,
      restroom: 0,
      stretch: 0,
      phone: 0
    },
    // Computed tax values
    netMonthly: 0,
    socialMonthly: 0,
    taxMonthly: 0
  };

  // Display text (country name, units, preset labels, reward names) lives in i18n.js.
  // rateDecimals: per day / hour / minute / second.
  const countryConfig = {
    CN: {
      flag: '🇨🇳',
      currencyCode: 'CNY',
      symbol: '¥',
      locale: 'zh-CN',
      decimals: 2,
      rateDecimals: [2, 2, 3, 4],
      heroDecimals: 4,
      rewardPriceDecimals: 1,
      salaryStep: 500,
      coinSymbols: ['🧧', '🪙', '💰', '✨'],
      calculateTax: (gross) => calculateChinaTax(gross, state.cnSocialRate),
      defaultSalary: 15000,
      presets: [8000, 12000, 15000, 25000, 35000, 50000],
      rewards: [
        { icon: '☕', id: 'luckin', price: 9.9 },
        { icon: '🍔', id: 'mcdBreakfast', price: 15 },
        { icon: '🧋', id: 'heytea', price: 19 },
        { icon: '🍗', id: 'kfcThursday', price: 49.9 },
        { icon: '🍲', id: 'haidilao', price: 145 },
        { icon: '🎮', id: 'switchGame', price: 299 }
      ]
    },
    JP: {
      flag: '🇯🇵',
      currencyCode: 'JPY',
      symbol: '¥',
      locale: 'ja-JP',
      decimals: 0,
      rateDecimals: [0, 1, 2, 3],
      heroDecimals: 2,
      rewardPriceDecimals: 0,
      salaryStep: 10000,
      coinSymbols: ['💴', '🪙', '✨', '💰'],
      calculateTax: (gross) => calculateJapanTax(gross, state.deductionRate),
      defaultSalary: 350000,
      presets: [220000, 300000, 350000, 500000, 700000, 1000000],
      rewards: [
        { icon: '☕', id: 'sevenCafe', price: 140 },
        { icon: '🐂', id: 'matsuya', price: 480 },
        { icon: '🥤', id: 'frappuccino', price: 605 },
        { icon: '🍜', id: 'ichiran', price: 1180 },
        { icon: '🥩', id: 'yakiniku', price: 7000 },
        { icon: '🏰', id: 'disney', price: 10900 }
      ]
    },
    US: {
      flag: '🇺🇸',
      currencyCode: 'USD',
      symbol: '$',
      locale: 'en-US',
      decimals: 2,
      rateDecimals: [2, 2, 3, 4],
      heroDecimals: 4,
      rewardPriceDecimals: 2,
      salaryStep: 500,
      coinSymbols: ['💵', '🪙', '💰', '✨'],
      calculateTax: (gross) => calculateUSTax(gross, state.deductionRate),
      defaultSalary: 7500,
      presets: [4000, 5000, 7500, 10000, 15000, 25000],
      rewards: [
        { icon: '☕', id: 'bodegaCoffee', price: 3 },
        { icon: '🍕', id: 'joesPizza', price: 4 },
        { icon: '🥤', id: 'starbucksFrappuccino', price: 7.25 },
        { icon: '🍔', id: 'shackBurger', price: 7.69 },
        { icon: '🥪', id: 'katzPastrami', price: 28.95 },
        { icon: '🏙️', id: 'empireState', price: 49 }
      ]
    },
    KR: {
      flag: '🇰🇷',
      currencyCode: 'KRW',
      symbol: '₩',
      locale: 'ko-KR',
      decimals: 0,
      rateDecimals: [0, 0, 1, 2],
      heroDecimals: 2,
      rewardPriceDecimals: 0,
      salaryStep: 100000,
      coinSymbols: ['💸', '🪙', '💰', '✨'],
      calculateTax: (gross) => calculateKoreaTax(gross, state.deductionRate),
      defaultSalary: 4000000,
      presets: [2500000, 3000000, 4000000, 5000000, 7000000, 12000000],
      rewards: [
        { icon: '☕', id: 'megaCoffee', price: 1700 },
        { icon: '🍙', id: 'gimbap', price: 3900 },
        { icon: '🥤', id: 'starbucksAmericano', price: 4700 },
        { icon: '🍜', id: 'jajangmyeon', price: 7800 },
        { icon: '🍗', id: 'bbqChicken', price: 23000 },
        { icon: '🎢', id: 'lotteWorld', price: 64000 }
      ]
    }
  };

  // --- i18n ---
  function t(key, params) {
    const own = messages[state.language] || {};
    const msg = key in own ? own[key] : (key in messages.zh ? messages.zh[key] : key);
    if (typeof msg !== 'string' || !params) return msg;
    return msg.replace(/\{(\w+)\}/g, (m, name) => (name in params ? params[name] : m));
  }

  function getRestLabel(monthStats) {
    const name = monthStats.todayHolidayName;
    if (!name) return t('weekend');
    return t('holidays')[name] || name;
  }

  function getQuotes() {
    return quotes[state.language] || quotes.zh;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = HTML_LANG[state.language];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
    document.getElementById('selectLanguage').value = state.language;
  }


  // --- Persistence (localStorage: Chrome does not store cookies for file:// pages) ---
  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  let todayKey = getTodayKey();

  function resetDailyCounters() {
    state.slackMinutesTotal = 0;
    state.slackCounts = { coffee: 0, restroom: 0, stretch: 0, phone: 0 };
    state.stopwatchRunning = false;
    state.stopwatchAccumulatedMs = 0;
    state.stopwatchLastStartMs = null;
  }

  function savePreferences() {
    const payload = {
      language: state.language,
      country: state.country,
      grossSalary: state.grossSalary,
      cnSocialRate: state.cnSocialRate,
      deductionRate: state.deductionRate,
      useNetForTicker: state.useNetForTicker,
      startTime: state.startTime,
      paidWorkHours: state.workHours,
      breakStartTime: state.breakStartTime,
      breakHours: state.breakHours,
      settingsCollapsed: state.settingsCollapsed,
      mode: state.mode,
      muted: state.muted,
      dayKey: todayKey,
      stopwatchRunning: state.stopwatchRunning,
      stopwatchAccumulatedMs: state.stopwatchAccumulatedMs,
      stopwatchLastStartMs: state.stopwatchLastStartMs,
      slackMinutesTotal: state.slackMinutesTotal,
      slackCounts: state.slackCounts
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save preferences', e);
    }
  }

  function loadPreferences() {
    let parsed;
    try {
      parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      console.warn('Ignoring unreadable saved preferences', e);
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;

    const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
    if (LANGUAGES.includes(parsed.language)) state.language = parsed.language;
    if (parsed.country in countryConfig) state.country = parsed.country;
    if (isNum(parsed.grossSalary) && parsed.grossSalary >= 0) state.grossSalary = parsed.grossSalary;
    if (isNum(parsed.cnSocialRate)) state.cnSocialRate = parsed.cnSocialRate;
    // Saves from before US/KR support stored the Japan-only override as `jpDeductionRate`.
    const savedDeductionRate = 'deductionRate' in parsed ? parsed.deductionRate : parsed.jpDeductionRate;
    if (isNum(savedDeductionRate)) state.deductionRate = savedDeductionRate;
    if (typeof parsed.useNetForTicker === 'boolean') state.useNetForTicker = parsed.useNetForTicker;
    if (typeof parsed.startTime === 'string' && /^\d{2}:\d{2}$/.test(parsed.startTime)) state.startTime = parsed.startTime;
    // Older saves stored `workHours` as a span that included the break, so they are intentionally not read.
    if (isNum(parsed.paidWorkHours) && parsed.paidWorkHours > 0) state.workHours = parsed.paidWorkHours;
    if (typeof parsed.breakStartTime === 'string' && /^\d{2}:\d{2}$/.test(parsed.breakStartTime)) state.breakStartTime = parsed.breakStartTime;
    if (isNum(parsed.breakHours) && parsed.breakHours >= 0) state.breakHours = parsed.breakHours;
    if (typeof parsed.settingsCollapsed === 'boolean') state.settingsCollapsed = parsed.settingsCollapsed;
    if (parsed.mode === 'schedule' || parsed.mode === 'stopwatch') state.mode = parsed.mode;
    if (typeof parsed.muted === 'boolean') state.muted = parsed.muted;

    if (parsed.dayKey === todayKey) {
      if (isNum(parsed.slackMinutesTotal)) state.slackMinutesTotal = parsed.slackMinutesTotal;
      if (parsed.slackCounts && typeof parsed.slackCounts === 'object') {
        state.slackCounts = Object.assign({ coffee: 0, restroom: 0, stretch: 0, phone: 0 }, parsed.slackCounts);
      }
      if (isNum(parsed.stopwatchAccumulatedMs)) state.stopwatchAccumulatedMs = parsed.stopwatchAccumulatedMs;
      if (parsed.stopwatchRunning === true && isNum(parsed.stopwatchLastStartMs)) {
        state.stopwatchRunning = true;
        state.stopwatchLastStartMs = parsed.stopwatchLastStartMs;
      }
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('saveToast');
    document.getElementById('saveToastText').textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2400);
  }

  // --- Audio Synthesizer (Web Audio API) ---
  let audioCtx = null;
  function playCoinSound() {
    if (state.muted) return;
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.075); // E6
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } catch (e) {
      // Ignore audio error
    }
  }

  // --- Formatting Helpers ---
  function formatCurrency(val, decimals) {
    const cfg = countryConfig[state.country];
    const d = typeof decimals === 'number' ? decimals : cfg.decimals;
    return cfg.symbol + formatNumber(val, d);
  }

  function formatNumber(val, decimals) {
    return (Number(val) || 0).toLocaleString(countryConfig[state.country].locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatDuration(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  function parseTimeToSeconds(str, fallback) {
    const [h, m] = (str || fallback).split(':').map(Number);
    return ((h || 0) * 60 + (m || 0)) * 60;
  }

  function formatHours(hours) {
    return String(Math.round(hours * 100) / 100);
  }

  // Paid work time only; clock-out is pushed back by any break that falls inside the work day.
  function getDailyWorkSeconds() {
    const startSecondsOfDay = parseTimeToSeconds(state.startTime, '09:00');
    const totalWorkSeconds = Math.round(Math.max(0.5, Math.min(24, Number(state.workHours) || 8)) * 3600);

    const breakSeconds = Math.round(Math.max(0, Number(state.breakHours) || 0) * 3600);
    const rawBreakStart = parseTimeToSeconds(state.breakStartTime, '12:00');
    let breakStartSecondsOfDay = Math.max(startSecondsOfDay, rawBreakStart);
    let breakEndSecondsOfDay = Math.max(startSecondsOfDay, rawBreakStart + breakSeconds);
    if (breakStartSecondsOfDay >= startSecondsOfDay + totalWorkSeconds) {
      // Break starts after the paid hours are already done, so it does not affect today.
      breakStartSecondsOfDay = breakEndSecondsOfDay = startSecondsOfDay + totalWorkSeconds;
    }
    const endSecondsOfDay = startSecondsOfDay + totalWorkSeconds + (breakEndSecondsOfDay - breakStartSecondsOfDay);
    return { startSecondsOfDay, endSecondsOfDay, breakStartSecondsOfDay, breakEndSecondsOfDay, totalWorkSeconds };
  }

  function getPaidSecondsUntil(secondsOfDay) {
    const { startSecondsOfDay, endSecondsOfDay, breakStartSecondsOfDay, breakEndSecondsOfDay } = getDailyWorkSeconds();
    const t = Math.min(endSecondsOfDay, Math.max(startSecondsOfDay, secondsOfDay));
    const breakElapsed = Math.max(0, Math.min(t, breakEndSecondsOfDay) - breakStartSecondsOfDay);
    return t - startSecondsOfDay - breakElapsed;
  }

  function formatClock(secondsOfDay) {
    const totalMinutes = Math.floor(secondsOfDay / 60) % (24 * 60);
    return String(Math.floor(totalMinutes / 60)).padStart(2, '0') + ':' + String(totalMinutes % 60).padStart(2, '0');
  }

  function getComputedEndTimeString() {
    return formatClock(getDailyWorkSeconds().endSecondsOfDay);
  }

  function getActiveMonthlyBasis() {
    return state.useNetForTicker ? state.netMonthly : state.grossSalary;
  }

  // --- Update Collapse / Expand View ---
  function renderSettingsCollapseState() {
    const panel = document.getElementById('settingsPanel');
    const collapsedBar = document.getElementById('collapsedSettingsBar');
    const headerBtnLabel = document.getElementById('headerToggleSettingsLabel');

    if (state.settingsCollapsed) {
      panel.classList.add('hidden');
      collapsedBar.classList.remove('hidden');
      headerBtnLabel.textContent = t('header.expandSettings');
    } else {
      panel.classList.remove('hidden');
      collapsedBar.classList.add('hidden');
      headerBtnLabel.textContent = t('header.collapseSettings');
    }

    const cfg = countryConfig[state.country];
    document.getElementById('summaryCountryBadge').textContent = t('summary.country', {
      flag: cfg.flag, name: t('country.' + state.country), code: cfg.currencyCode, symbol: cfg.symbol
    });
    document.getElementById('summaryGrossText').textContent =
      formatCurrency(state.grossSalary, 0);
    document.getElementById('summaryNetText').textContent =
      formatCurrency(state.netMonthly);
    const endStr = getComputedEndTimeString();
    const paidHoursStr = formatHours(getDailyWorkSeconds().totalWorkSeconds / 3600);
    const breakStr = state.breakHours > 0
      ? t('summary.break', { start: state.breakStartTime, hours: formatHours(state.breakHours) })
      : '';
    document.getElementById('summaryScheduleText').textContent = t('summary.schedule', {
      start: state.startTime, end: endStr, breakText: breakStr, paid: paidHoursStr, days: state.workDaysPerMonth
    });
    const endHint = document.getElementById('autoEndTimeHint');
    if (endHint) endHint.textContent = t('settings.endHint', { time: endStr });
    const paidHint = document.getElementById('paidHoursHint');
    if (paidHint) paidHint.textContent = t('settings.hours', { n: paidHoursStr });
    const breakEndHint = document.getElementById('breakEndHint');
    if (breakEndHint) {
      breakEndHint.textContent = state.breakHours > 0
        ? t('settings.breakEndHint', {
          time: formatClock(parseTimeToSeconds(state.breakStartTime, '12:00') + Math.round(state.breakHours * 3600))
        })
        : t('settings.noBreak');
    }
  }

  // --- Recalculate Tax & Update Static UI ---
  function updateTaxCalculation() {
    const monthStats = getMonthWorkdayStats(new Date(), state.country);
    state.workDaysPerMonth = monthStats.totalWorkdays;

    const res = countryConfig[state.country].calculateTax(state.grossSalary);

    const usesDeductionRate = typeof res.autoDeductionRate === 'number';
    if (usesDeductionRate) {
      const rate = state.deductionRate === null ? res.autoDeductionRate : state.deductionRate;
      document.getElementById('sliderDeductionRate').value = rate;
      document.getElementById('labelDeductionRate').textContent = rate.toFixed(1) + '%';
      document.getElementById('btnAutoDeductionRate').textContent = t(
        state.deductionRate === null ? 'settings.autoRate' : 'settings.manualRate',
        { rate: res.autoDeductionRate.toFixed(1) }
      );
    }

    state.netMonthly = res.net;
    state.socialMonthly = res.social;
    state.taxMonthly = res.tax;

    const gross = Math.max(1, res.gross);
    const netPct = Math.min(100, Math.max(0, (res.net / gross) * 100));
    const socialPct = Math.min(100, Math.max(0, (res.social / gross) * 100));
    const taxPct = Math.min(100, Math.max(0, (res.tax / gross) * 100));

    const c = state.country;
    document.getElementById('annualGrossHint').textContent =
      t('settings.annualGross', { amount: formatCurrency(res.gross * 12, 0) });
    document.getElementById('takeHomePercentBadge').textContent =
      t('result.takeHome.' + c, { pct: netPct.toFixed(1) });

    document.getElementById('displayNetMonthly').textContent =
      formatCurrency(res.net);
    document.getElementById('displayNetAnnual').textContent =
      formatCurrency(res.net * 12, 0);

    document.getElementById('barNet').style.width = netPct + '%';
    document.getElementById('barSocial').style.width = socialPct + '%';
    document.getElementById('barTax').style.width = taxPct + '%';

    document.getElementById('labelBreakdownNet').textContent = t('result.net.' + c);
    document.getElementById('labelBreakdownSocial').textContent = t('result.social.' + c);
    document.getElementById('labelBreakdownTax').textContent = t('result.tax.' + c);

    document.getElementById('valBreakdownNet').textContent = formatCurrency(res.net, 0);
    document.getElementById('valBreakdownSocial').textContent = formatCurrency(res.social, 0);
    document.getElementById('valBreakdownTax').textContent = formatCurrency(res.tax, 0);

    document.getElementById('taxFormulaNote').textContent = t('result.note.' + c);

    document.getElementById('autoWorkDaysDisplay').textContent = t('settings.days', { n: monthStats.totalWorkdays });
    document.getElementById('rateDayLabel').textContent = t('rate.day', { n: monthStats.totalWorkdays });

    updateRatesAndSlackingDisplay();
    renderSettingsCollapseState();
  }

  function updateRatesAndSlackingDisplay() {
    const monthlyBasis = getActiveMonthlyBasis();
    const days = Math.max(1, Number(state.workDaysPerMonth) || 21);
    const { totalWorkSeconds } = getDailyWorkSeconds();
    const hoursPerDay = totalWorkSeconds / 3600;

    const perDay = monthlyBasis / days;
    const perHour = perDay / hoursPerDay;
    const perMinute = perHour / 60;
    const perSecond = perMinute / 60;

    const [dayDigits, hourDigits, minuteDigits, secondDigits] = countryConfig[state.country].rateDecimals;
    document.getElementById('ratePerDay').textContent = formatCurrency(perDay, dayDigits);
    document.getElementById('ratePerHour').textContent = formatCurrency(perHour, hourDigits);
    document.getElementById('ratePerMinute').textContent = formatCurrency(perMinute, minuteDigits);
    document.getElementById('ratePerSecond').textContent = formatCurrency(perSecond, secondDigits);

    // Update one-click slacking card prices & counts
    const slackItems = [
      { key: 'coffee', min: 10 },
      { key: 'restroom', min: 15 },
      { key: 'stretch', min: 3 },
      { key: 'phone', min: 5 }
    ];
    slackItems.forEach(item => {
      const itemWorth = perMinute * item.min;
      const priceEl = document.getElementById('slackPrice-' + item.key);
      const timesEl = document.getElementById('slackTimes-' + item.key);
      const minutesEl = document.getElementById('slackCount-' + item.key);
      if (priceEl) {
        priceEl.textContent = t('slack.price', { amount: formatCurrency(itemWorth) });
      }
      if (timesEl) {
        timesEl.textContent = t('slack.times', { n: state.slackCounts[item.key] || 0 });
      }
      if (minutesEl) {
        minutesEl.textContent = t('slack.minutesBadge', { n: item.min });
      }
    });

    const totalSlackEarned = state.slackMinutesTotal * perMinute;
    document.getElementById('slackingMinutesLabel').textContent =
      t('slack.totalMinutes', { n: state.slackMinutesTotal });
    document.getElementById('slackingTotalEarned').textContent =
      formatCurrency(totalSlackEarned);
  }

  // --- Render Presets & Country UI ---
  function renderCountryUI() {
    const cfg = countryConfig[state.country];

    const countrySelect = document.getElementById('selectCountry');
    Array.from(countrySelect.options).forEach(opt => {
      opt.textContent = countryConfig[opt.value].flag + ' ' + t('settings.country' + opt.value);
    });
    countrySelect.value = state.country;
    document.querySelectorAll('.currency-symbol').forEach(el => {
      el.textContent = cfg.symbol;
    });

    document.getElementById('currencyBadge').textContent = t('currency.' + state.country);

    document.getElementById('labelGrossUnit').textContent = t('unit.' + state.country);
    document.getElementById('inputCurrencySuffix').textContent = t('suffix.' + state.country);
    document.getElementById('inputGrossSalary').value = state.grossSalary;
    document.getElementById('inputGrossSalary').step = String(cfg.salaryStep);
    document.getElementById('sliderCnSocialRate').value = state.cnSocialRate;
    document.getElementById('labelCnSocialRate').textContent = state.cnSocialRate.toFixed(1) + '%';
    document.getElementById('inputStartTime').value = state.startTime;
    document.getElementById('inputWorkHours').value = state.workHours;
    document.getElementById('inputBreakStartTime').value = state.breakStartTime;
    document.getElementById('inputBreakHours').value = state.breakHours;
    document.getElementById('autoEndTimeHint').textContent = t('settings.endHint', { time: getComputedEndTimeString() });

    if (state.useNetForTicker) {
      document.getElementById('btnUseNet').className = 'px-2.5 py-1 rounded-md font-medium bg-amber-500 text-slate-950 transition';
      document.getElementById('btnUseGross').className = 'px-2.5 py-1 rounded-md font-medium text-slate-400 hover:text-white transition';
    } else {
      document.getElementById('btnUseGross').className = 'px-2.5 py-1 rounded-md font-medium bg-amber-500 text-slate-950 transition';
      document.getElementById('btnUseNet').className = 'px-2.5 py-1 rounded-md font-medium text-slate-400 hover:text-white transition';
    }
    document.getElementById('tickerTitleLabel').textContent = t('hero.todayTitle', {
      basis: t(state.useNetForTicker ? 'hero.basisNet' : 'hero.basisGross')
    });

    const isCN = state.country === 'CN';
    document.getElementById('cnTaxOptions').classList.toggle('hidden', !isCN);
    document.getElementById('deductionTaxOptions').classList.toggle('hidden', isCN);
    if (!isCN) {
      document.getElementById('labelDeductionRateTitle').textContent = t('settings.deductionLabel.' + state.country);
    }

    renderSalaryPresets();
  }

  function renderSalaryPresets() {
    const presetContainer = document.getElementById('salaryPresetContainer');
    presetContainer.innerHTML = '';
    const labels = t('presets.' + state.country);
    countryConfig[state.country].presets.forEach((value, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = Number(state.grossSalary) === value;
      btn.className = 'px-2.5 py-1 rounded-lg text-xs font-mono-num transition border ' +
        (active
          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600');
      btn.textContent = labels[i];
      btn.addEventListener('click', () => {
        state.grossSalary = value;
        state.deductionRate = null;
        document.getElementById('inputGrossSalary').value = value;
        renderSalaryPresets();
        updateTaxCalculation();
        savePreferences();
      });
      presetContainer.appendChild(btn);
    });
  }

  // --- Render Tangible Rewards ---
  function renderRewardsGrid(earnedToday) {
    const cfg = countryConfig[state.country];
    const grid = document.getElementById('rewardsGrid');
    grid.innerHTML = '';

    const itemTexts = t('rewards.items');
    cfg.rewards.forEach(item => {
      const [name, unit] = itemTexts[item.id];
      const count = earnedToday / item.price;
      const pct = Math.min(100, (count % 1) * 100);
      const fullUnits = Math.floor(count);

      const card = document.createElement('div');
      card.className = 'bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${item.icon}</span>
            <div>
              <div class="text-xs font-semibold text-slate-100">${name}</div>
              <div class="text-[11px] font-mono-num text-slate-400">${t('rewards.unitPrice', { price: formatCurrency(item.price, cfg.rewardPriceDecimals) })}</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-md text-xs font-mono-num font-bold ${fullUnits >= 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-900 text-slate-400'}">
            ${t('rewards.count', { count: count.toFixed(1), unit })}
          </span>
        </div>
        <div class="space-y-1">
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-amber-400 to-emerald-400" style="width: ${pct.toFixed(1)}%"></div>
          </div>
          <div class="flex justify-between text-[10px] text-slate-400">
            <span>${t('rewards.earned', { n: fullUnits, unit })}</span>
            <span>${t('rewards.next', { unit, pct: pct.toFixed(0) })}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // --- Floating Coin Particle Celebration ---
  function spawnCelebrationCoins(originBtn, customBadgeText) {
    playCoinSound();
    const symbols = countryConfig[state.country].coinSymbols;
    const rect = originBtn
      ? originBtn.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 40 };

    if (customBadgeText) {
      const badge = document.createElement('div');
      badge.className = 'coin-particle font-mono-num font-extrabold text-sm sm:text-base text-amber-300 bg-slate-900/95 border border-amber-400/50 px-2.5 py-1 rounded-full shadow-lg select-none';
      badge.textContent = customBadgeText;
      badge.style.left = Math.max(16, Math.min(window.innerWidth - 120, rect.left + rect.width / 2 - 40)) + 'px';
      badge.style.top = (rect.top - 8) + 'px';
      document.body.appendChild(badge);
      setTimeout(() => {
        if (badge.parentNode) badge.parentNode.removeChild(badge);
      }, 1200);
    }

    for (let i = 0; i < 7; i++) {
      const el = document.createElement('div');
      el.className = 'coin-particle text-xl select-none';
      el.textContent = symbols[i % symbols.length];
      const offsetX = (Math.random() - 0.5) * 150;
      const offsetY = (Math.random() - 0.5) * 25;
      el.style.left = Math.max(16, Math.min(window.innerWidth - 36, rect.left + rect.width / 2 + offsetX)) + 'px';
      el.style.top = (rect.top + offsetY) + 'px';
      document.body.appendChild(el);
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 1200);
    }
  }

  // --- Real-Time Earnings ---
  function computeLiveEarnings(now) {
    const monthStats = getMonthWorkdayStats(now, state.country);
    const monthlyBasis = getActiveMonthlyBasis();
    const dailyIncome = monthlyBasis / monthStats.totalWorkdays;
    const { startSecondsOfDay, endSecondsOfDay, breakStartSecondsOfDay, breakEndSecondsOfDay, totalWorkSeconds } = getDailyWorkSeconds();

    let phase;
    let workedSecondsToday = 0;
    let secondsToStart = 0;
    let secondsToEnd = 0;
    let secondsToBreakEnd = 0;

    if (state.mode === 'schedule') {
      const currentSecondsOfDay =
        now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
      if (!monthStats.isTodayWorkday) {
        phase = 'restDay';
      } else if (currentSecondsOfDay < startSecondsOfDay) {
        phase = 'beforeWork';
        secondsToStart = startSecondsOfDay - currentSecondsOfDay;
      } else if (currentSecondsOfDay >= endSecondsOfDay) {
        phase = 'afterWork';
        workedSecondsToday = totalWorkSeconds;
      } else {
        phase = currentSecondsOfDay >= breakStartSecondsOfDay && currentSecondsOfDay < breakEndSecondsOfDay
          ? 'onBreak'
          : 'working';
        workedSecondsToday = getPaidSecondsUntil(currentSecondsOfDay);
        secondsToEnd = endSecondsOfDay - currentSecondsOfDay;
        secondsToBreakEnd = breakEndSecondsOfDay - currentSecondsOfDay;
      }
    } else {
      phase = 'stopwatch';
      let totalElapsedMs = state.stopwatchAccumulatedMs;
      if (state.stopwatchRunning && state.stopwatchLastStartMs !== null) {
        totalElapsedMs += now.getTime() - state.stopwatchLastStartMs;
      }
      workedSecondsToday = totalElapsedMs / 1000;
      secondsToEnd = Math.max(0, totalWorkSeconds - workedSecondsToday);
    }

    const earnedToday = workedSecondsToday * (dailyIncome / totalWorkSeconds);
    const progressPercent = Math.min(100, (workedSecondsToday / totalWorkSeconds) * 100);
    // Manual stopwatch time on a rest day still counts as extra work this month.
    const todayContribution = (monthStats.isTodayWorkday || phase === 'stopwatch') ? earnedToday : 0;
    const monthCumulativeEarned = Math.min(monthlyBasis, monthStats.pastWorkdays * dailyIncome + todayContribution);

    return {
      monthStats, monthlyBasis, phase, workedSecondsToday, secondsToStart, secondsToEnd, secondsToBreakEnd,
      earnedToday, progressPercent, monthCumulativeEarned
    };
  }

  function handleDayRollover() {
    const key = getTodayKey();
    if (key === todayKey) return;
    todayKey = key;
    resetDailyCounters();
    renderModeUI();
    updateTaxCalculation();
    savePreferences();
  }

  // --- Real-Time Tick Loop ---
  let lastRewardRenderTime = 0;

  function tick() {
    handleDayRollover();
    const now = new Date();
    const nowMs = now.getTime();
    const live = computeLiveEarnings(now);
    const { monthStats, monthlyBasis, earnedToday, progressPercent, monthCumulativeEarned } = live;
    state.workDaysPerMonth = monthStats.totalWorkdays;

    const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2, '0'))
      .join(':');
    document.getElementById('currentClockDisplay').textContent = t('hero.clock', { time: timeStr });
    document.getElementById('todayDateBadge').textContent = t('hero.date', {
      month: monthStats.month, day: monthStats.todayDate, weekday: t('weekdays')[now.getDay()]
    });

    const statusEl = document.getElementById('liveStatusText');
    const progressEl = document.getElementById('workProgressText');
    const remainingEl = document.getElementById('timeRemainingText');
    const pctStr = progressPercent.toFixed(2);
    if (live.phase === 'restDay') {
      statusEl.textContent = t('status.restDay');
      progressEl.textContent = t('progress.restDay', { label: getRestLabel(monthStats) });
      remainingEl.textContent = t('remaining.restDay');
    } else if (live.phase === 'beforeWork') {
      statusEl.textContent = t('status.beforeWork');
      progressEl.textContent = t('progress.beforeWork');
      remainingEl.textContent = t('remaining.beforeWork', { time: formatDuration(live.secondsToStart) });
    } else if (live.phase === 'afterWork') {
      statusEl.textContent = t('status.afterWork');
      progressEl.textContent = t('progress.afterWork');
      remainingEl.textContent = t('remaining.afterWork');
    } else if (live.phase === 'onBreak') {
      statusEl.textContent = t('status.onBreak');
      progressEl.textContent = t('progress.working', { pct: pctStr });
      remainingEl.textContent = t('remaining.onBreak', { time: formatDuration(live.secondsToBreakEnd) });
    } else if (live.phase === 'working') {
      statusEl.textContent = t('status.working');
      progressEl.textContent = t('progress.working', { pct: pctStr });
      remainingEl.textContent = t('remaining.working', { time: formatDuration(live.secondsToEnd) });
    } else {
      document.getElementById('stopwatchElapsedText').textContent =
        t('stopwatch.elapsed', { time: formatDuration(live.workedSecondsToday) });
      statusEl.textContent = t(state.stopwatchRunning ? 'status.stopwatchRunning' : 'status.stopwatchPaused');
      progressEl.textContent = t('progress.stopwatch', { pct: pctStr });
      remainingEl.textContent = t('remaining.stopwatch', { time: formatDuration(live.secondsToEnd) });
    }

    const cfg = countryConfig[state.country];
    document.getElementById('heroLiveAmount').textContent = formatNumber(earnedToday, cfg.heroDecimals);
    document.getElementById('workProgressBar').style.width = Math.max(0, progressPercent) + '%';

    // --- Monthly Cumulative Income ---
    const monthProgressPct = monthlyBasis > 0
      ? Math.min(100, (monthCumulativeEarned / monthlyBasis) * 100)
      : 0;
    const monthRemaining = Math.max(0, monthlyBasis - monthCumulativeEarned);

    document.getElementById('monthCumulativeAmount').textContent = formatNumber(monthCumulativeEarned, cfg.decimals);

    const currentWorkdayIndex = monthStats.pastWorkdays + (monthStats.isTodayWorkday ? 1 : 0);
    const monthParams = {
      index: currentWorkdayIndex, total: monthStats.totalWorkdays, past: monthStats.pastWorkdays, month: monthStats.month
    };
    document.getElementById('monthCalendarBadge').textContent =
      t(monthStats.isTodayWorkday ? 'month.badgeWorkday' : 'month.badgeRest', monthParams);

    document.getElementById('monthWorkdaysSummary').textContent = monthStats.isTodayWorkday
      ? t('month.summaryWorkday', monthParams)
      : t('month.summaryRest', Object.assign({ label: getRestLabel(monthStats) }, monthParams));

    document.getElementById('monthProgressPercentText').textContent =
      t('month.progress', { pct: monthProgressPct.toFixed(1) });
    document.getElementById('monthRemainingIncomeText').textContent =
      t('month.remaining', { amount: formatCurrency(monthRemaining, 0) });
    document.getElementById('monthProgressBar').style.width = monthProgressPct + '%';

    if (nowMs - lastRewardRenderTime > 400) {
      renderRewardsGrid(earnedToday);
      updateQuoteRotation(nowMs);
      lastRewardRenderTime = nowMs;
    }

    requestAnimationFrame(tick);
  }

  // requestAnimationFrame pauses in background tabs, so the title uses its own timer.
  function updateDocumentTitle() {
    handleDayRollover();
    const { earnedToday } = computeLiveEarnings(new Date());
    document.title = formatCurrency(earnedToday) + ' · ' + t('app.name');
  }

  // --- Event Listeners ---
  function handleSaveAndCollapse() {
    state.settingsCollapsed = true;
    savePreferences();
    renderSettingsCollapseState();
    showToast(t('toast.saved'));
    playCoinSound();
  }

  document.getElementById('btnSaveAndCollapse').addEventListener('click', handleSaveAndCollapse);
  document.getElementById('btnTopSaveSettings').addEventListener('click', handleSaveAndCollapse);

  document.getElementById('btnExpandSettings').addEventListener('click', () => {
    state.settingsCollapsed = false;
    savePreferences();
    renderSettingsCollapseState();
  });

  document.getElementById('btnHeaderToggleSettings').addEventListener('click', () => {
    state.settingsCollapsed = !state.settingsCollapsed;
    savePreferences();
    renderSettingsCollapseState();
  });

  function switchCountry(country) {
    if (state.country === country) return;
    state.country = country;
    state.grossSalary = countryConfig[country].defaultSalary;
    state.deductionRate = null;
    renderCountryUI();
    updateTaxCalculation();
    renderRewardsGrid(0);
    savePreferences();
  }

  document.getElementById('selectCountry').addEventListener('change', (e) => switchCountry(e.target.value));

  const salaryInput = document.getElementById('inputGrossSalary');
  // Do not write back to the field while typing, otherwise clearing it immediately turns into 0.
  salaryInput.addEventListener('input', (e) => {
    state.grossSalary = Math.max(0, Number(e.target.value) || 0);
    state.deductionRate = null;
    renderSalaryPresets();
    updateTaxCalculation();
    savePreferences();
  });
  salaryInput.addEventListener('change', (e) => {
    e.target.value = state.grossSalary;
  });

  document.getElementById('sliderCnSocialRate').addEventListener('input', (e) => {
    state.cnSocialRate = Number(e.target.value) || 18.5;
    document.getElementById('labelCnSocialRate').textContent = state.cnSocialRate.toFixed(1) + '%';
    updateTaxCalculation();
    savePreferences();
  });

  document.querySelectorAll('.cn-rate-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = Number(btn.getAttribute('data-cn-rate')) || 18.5;
      state.cnSocialRate = r;
      document.getElementById('sliderCnSocialRate').value = r;
      document.getElementById('labelCnSocialRate').textContent = r.toFixed(1) + '%';
      updateTaxCalculation();
      savePreferences();
    });
  });

  document.getElementById('sliderDeductionRate').addEventListener('input', (e) => {
    state.deductionRate = Number(e.target.value);
    updateTaxCalculation();
    savePreferences();
  });

  document.getElementById('btnAutoDeductionRate').addEventListener('click', () => {
    state.deductionRate = null;
    updateTaxCalculation();
    savePreferences();
  });

  function setTickerBasis(useNet) {
    state.useNetForTicker = useNet;
    renderCountryUI();
    updateRatesAndSlackingDisplay();
    savePreferences();
  }

  document.getElementById('btnUseNet').addEventListener('click', () => setTickerBasis(true));
  document.getElementById('btnUseGross').addEventListener('click', () => setTickerBasis(false));

  document.getElementById('inputStartTime').addEventListener('change', (e) => {
    state.startTime = e.target.value || '09:00';
    updateRatesAndSlackingDisplay();
    renderSettingsCollapseState();
    savePreferences();
  });

  document.getElementById('inputWorkHours').addEventListener('input', (e) => {
    state.workHours = Math.max(0.5, Math.min(24, Number(e.target.value) || 8));
    updateRatesAndSlackingDisplay();
    renderSettingsCollapseState();
    savePreferences();
  });

  document.getElementById('inputBreakStartTime').addEventListener('change', (e) => {
    state.breakStartTime = e.target.value || '12:00';
    updateRatesAndSlackingDisplay();
    renderSettingsCollapseState();
    savePreferences();
  });

  // Same as the salary field: do not write back while typing, so clearing the field does not snap to 0.
  const breakHoursInput = document.getElementById('inputBreakHours');
  breakHoursInput.addEventListener('input', (e) => {
    state.breakHours = Math.max(0, Math.min(12, Number(e.target.value) || 0));
    updateRatesAndSlackingDisplay();
    renderSettingsCollapseState();
    savePreferences();
  });
  breakHoursInput.addEventListener('change', (e) => {
    e.target.value = state.breakHours;
  });

  // Mode switching
  function renderModeUI() {
    const isStopwatch = state.mode === 'stopwatch';
    const activeClass = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition';
    const inactiveClass = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition';
    document.getElementById('btnModeSchedule').className = isStopwatch ? inactiveClass : activeClass;
    document.getElementById('btnModeStopwatch').className = isStopwatch ? activeClass : inactiveClass;
    document.getElementById('stopwatchControls').classList.toggle('hidden', !isStopwatch);
    document.getElementById('btnStopwatchToggle').textContent = t(state.stopwatchRunning
      ? 'stopwatch.pause'
      : (state.stopwatchAccumulatedMs > 0 ? 'stopwatch.resume' : 'stopwatch.start'));
  }

  document.getElementById('btnModeSchedule').addEventListener('click', () => {
    state.mode = 'schedule';
    renderModeUI();
    savePreferences();
  });

  document.getElementById('btnModeStopwatch').addEventListener('click', () => {
    state.mode = 'stopwatch';
    if (!state.stopwatchRunning && state.stopwatchAccumulatedMs === 0) {
      state.stopwatchRunning = true;
      state.stopwatchLastStartMs = Date.now();
    }
    renderModeUI();
    savePreferences();
  });

  document.getElementById('btnStopwatchToggle').addEventListener('click', () => {
    if (state.stopwatchRunning) {
      state.stopwatchAccumulatedMs += Date.now() - state.stopwatchLastStartMs;
      state.stopwatchRunning = false;
      state.stopwatchLastStartMs = null;
    } else {
      state.stopwatchRunning = true;
      state.stopwatchLastStartMs = Date.now();
    }
    renderModeUI();
    savePreferences();
  });

  document.getElementById('btnStopwatchReset').addEventListener('click', () => {
    state.stopwatchRunning = false;
    state.stopwatchAccumulatedMs = 0;
    state.stopwatchLastStartMs = null;
    renderModeUI();
    savePreferences();
  });

  document.getElementById('btnCheerCoins').addEventListener('click', (e) => {
    spawnCelebrationCoins(e.currentTarget);
  });

  // Automatic 1-minute quote rotation
  let lastQuoteSwitchMs = Date.now();
  state.quoteIndex = Math.floor(Math.random() * getQuotes().length);

  function renderQuote() {
    const list = getQuotes();
    document.getElementById('motivationalQuote').textContent = list[state.quoteIndex % list.length];
  }

  function updateQuoteRotation(nowMs) {
    const elapsedSec = Math.floor((nowMs - lastQuoteSwitchMs) / 1000);
    if (elapsedSec >= 60) {
      lastQuoteSwitchMs = nowMs;
      state.quoteIndex = (state.quoteIndex + 1 + Math.floor(Math.random() * 7)) % getQuotes().length;
      renderQuote();
    }
  }

  function renderMuteUI() {
    document.getElementById('muteIcon').textContent = state.muted ? '🔇' : '🔊';
  }

  document.getElementById('btnMuteToggle').addEventListener('click', () => {
    state.muted = !state.muted;
    renderMuteUI();
    savePreferences();
  });

  // One-Click Slacking Buttons (+10m, +15m, +3m, +5m)
  document.querySelectorAll('.slack-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = btn.getAttribute('data-slack-key');
      const addMinutes = Number(btn.getAttribute('data-slack-min')) || 5;
      state.slackMinutesTotal += addMinutes;
      state.slackCounts[key] = (state.slackCounts[key] || 0) + 1;

      const monthlyBasis = getActiveMonthlyBasis();
      const days = Math.max(1, Number(state.workDaysPerMonth) || 21);
      const { totalWorkSeconds } = getDailyWorkSeconds();
      const perMinute = (monthlyBasis / days) / (totalWorkSeconds / 60);
      const addedMoney = perMinute * addMinutes;

      updateRatesAndSlackingDisplay();
      savePreferences();
      spawnCelebrationCoins(
        e.currentTarget,
        t('slack.coinBadge', { n: addMinutes, amount: formatCurrency(addedMoney) })
      );
    });
  });

  document.getElementById('btnResetSlack').addEventListener('click', () => {
    state.slackMinutesTotal = 0;
    state.slackCounts = { coffee: 0, restroom: 0, stretch: 0, phone: 0 };
    updateRatesAndSlackingDisplay();
    savePreferences();
  });

  function switchLanguage(language) {
    if (state.language === language || !LANGUAGES.includes(language)) return;
    state.language = language;
    applyStaticTranslations();
    renderCountryUI();
    renderModeUI();
    updateTaxCalculation();
    renderQuote();
    lastRewardRenderTime = 0;
    updateDocumentTitle();
    savePreferences();
  }

  document.getElementById('selectLanguage').addEventListener('change', (e) => switchLanguage(e.target.value));

  // Initialize: load saved preferences first
  loadPreferences();
  applyStaticTranslations();
  renderCountryUI();
  renderModeUI();
  renderMuteUI();
  renderQuote();
  updateTaxCalculation();
  requestAnimationFrame(tick);
  updateDocumentTitle();
  setInterval(updateDocumentTitle, 1000);
})();
