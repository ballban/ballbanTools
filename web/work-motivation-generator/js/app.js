(function () {
  const { quotes, getMonthWorkdayStats, calculateChinaTax, calculateJapanTax } = window.WM;

  const STORAGE_KEY = 'work_motivator_prefs_v3';

  const initialMonthStats = getMonthWorkdayStats(new Date(), 'CN');

  // --- State ---
  const state = {
    country: 'CN',
    grossSalary: 15000,
    cnSocialRate: 18.5,
    jpAgeGroup: 'under40',
    jpResidentTax: 'standard',
    useNetForTicker: true,
    workDaysPerMonth: initialMonthStats.totalWorkdays,
    startTime: '09:00',
    workHours: 9, // 含默认 1 小时休息，即默认 09:00 - 18:00
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

  const countryConfig = {
    CN: {
      name: '中国',
      flag: '🇨🇳',
      currencyCode: 'CNY',
      symbol: '¥',
      unitLabel: '人民币 元/月',
      suffixLabel: 'CNY/月',
      defaultSalary: 15000,
      presets: [
        { label: '8千', value: 8000 },
        { label: '1.2万', value: 12000 },
        { label: '1.5万', value: 15000 },
        { label: '2.5万', value: 25000 },
        { label: '3.5万', value: 35000 },
        { label: '5万', value: 50000 }
      ],
      rewards: [
        { icon: '☕', name: '瑞幸生椰拿铁', price: 9.9, unit: '杯' },
        { icon: '🍔', name: '麦当劳早餐套组', price: 15, unit: '份' },
        { icon: '🧋', name: '喜茶多肉葡萄', price: 19, unit: '杯' },
        { icon: '🍗', name: '疯狂星期四套餐', price: 49.9, unit: '顿' },
        { icon: '🍲', name: '海底捞单人畅吃', price: 145, unit: '顿' },
        { icon: '🎮', name: 'Switch 热门游戏卡带', price: 299, unit: '张' }
      ]
    },
    JP: {
      name: '日本',
      flag: '🇯🇵',
      currencyCode: 'JPY',
      symbol: '¥',
      unitLabel: '日元 円/月',
      suffixLabel: 'JPY/月',
      defaultSalary: 350000,
      presets: [
        { label: '22万円', value: 220000 },
        { label: '30万円', value: 300000 },
        { label: '35万円', value: 350000 },
        { label: '50万円', value: 500000 },
        { label: '70万円', value: 700000 },
        { label: '100万円', value: 1000000 }
      ],
      rewards: [
        { icon: '☕', name: 'セブンカフェ コーヒー', price: 120, unit: '杯' },
        { icon: '🐂', name: '松屋 牛めし並盛', price: 430, unit: '碗' },
        { icon: '🥤', name: 'スタバ フラペチーノ', price: 680, unit: '杯' },
        { icon: '🍜', name: '一蘭 天然とんこつラーメン', price: 1080, unit: '碗' },
        { icon: '🥩', name: '国産牛焼肉食べ放題', price: 3980, unit: '顿' },
        { icon: '🏰', name: 'ディズニー 1デーパス', price: 9400, unit: '张' }
      ]
    }
  };


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
      country: state.country,
      grossSalary: state.grossSalary,
      cnSocialRate: state.cnSocialRate,
      jpAgeGroup: state.jpAgeGroup,
      jpResidentTax: state.jpResidentTax,
      useNetForTicker: state.useNetForTicker,
      startTime: state.startTime,
      workHours: state.workHours,
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
    if (parsed.country === 'CN' || parsed.country === 'JP') state.country = parsed.country;
    if (isNum(parsed.grossSalary) && parsed.grossSalary >= 0) state.grossSalary = parsed.grossSalary;
    if (isNum(parsed.cnSocialRate)) state.cnSocialRate = parsed.cnSocialRate;
    if (parsed.jpAgeGroup === 'under40' || parsed.jpAgeGroup === 'over40') state.jpAgeGroup = parsed.jpAgeGroup;
    if (parsed.jpResidentTax === 'standard' || parsed.jpResidentTax === 'firstYear') state.jpResidentTax = parsed.jpResidentTax;
    if (typeof parsed.useNetForTicker === 'boolean') state.useNetForTicker = parsed.useNetForTicker;
    if (typeof parsed.startTime === 'string' && /^\d{2}:\d{2}$/.test(parsed.startTime)) state.startTime = parsed.startTime;
    if (isNum(parsed.workHours) && parsed.workHours > 0) state.workHours = parsed.workHours;
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
    const num = Number(val) || 0;
    if (state.country === 'JP') {
      const d = typeof decimals === 'number' ? decimals : 0;
      return '¥' + num.toLocaleString('ja-JP', {
        minimumFractionDigits: d,
        maximumFractionDigits: d
      });
    } else {
      const d = typeof decimals === 'number' ? decimals : 2;
      return '¥' + num.toLocaleString('zh-CN', {
        minimumFractionDigits: d,
        maximumFractionDigits: d
      });
    }
  }

  function formatDuration(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  function getDailyWorkSeconds() {
    const [sh, sm] = (state.startTime || '09:00').split(':').map(Number);
    const startMin = (sh || 0) * 60 + (sm || 0);
    const durationHours = Math.max(0.5, Math.min(24, Number(state.workHours) || 9));
    const totalWorkSeconds = Math.round(durationHours * 3600);
    const startSecondsOfDay = startMin * 60;
    const endSecondsOfDay = startSecondsOfDay + totalWorkSeconds;
    return { startSecondsOfDay, endSecondsOfDay, totalWorkSeconds };
  }

  function getComputedEndTimeString() {
    const { endSecondsOfDay } = getDailyWorkSeconds();
    const totalMinutes = Math.floor(endSecondsOfDay / 60) % (24 * 60);
    const eh = Math.floor(totalMinutes / 60);
    const em = totalMinutes % 60;
    return String(eh).padStart(2, '0') + ':' + String(em).padStart(2, '0');
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
      headerBtnLabel.textContent = '展开薪资设置';
    } else {
      panel.classList.remove('hidden');
      collapsedBar.classList.add('hidden');
      headerBtnLabel.textContent = '收起薪资设置';
    }

    const cfg = countryConfig[state.country];
    const isJP = state.country === 'JP';
    document.getElementById('summaryCountryBadge').textContent =
      `${cfg.flag} ${cfg.name} (${cfg.currencyCode} ¥)`;
    document.getElementById('summaryGrossText').textContent =
      formatCurrency(state.grossSalary, 0);
    document.getElementById('summaryNetText').textContent =
      formatCurrency(state.netMonthly, isJP ? 0 : 2);
    const endStr = getComputedEndTimeString();
    document.getElementById('summaryScheduleText').textContent =
      `${state.startTime} - ${endStr} (${state.workHours}h含休) · 本月 ${state.workDaysPerMonth} 个标准工作日`;
    const endHint = document.getElementById('autoEndTimeHint');
    if (endHint) endHint.textContent = `${endStr} 下班`;
  }

  // --- Recalculate Tax & Update Static UI ---
  function updateTaxCalculation() {
    const monthStats = getMonthWorkdayStats(new Date(), state.country);
    state.workDaysPerMonth = monthStats.totalWorkdays;

    const res = state.country === 'CN'
      ? calculateChinaTax(state.grossSalary, state.cnSocialRate)
      : calculateJapanTax(state.grossSalary, state.jpAgeGroup, state.jpResidentTax);

    state.netMonthly = res.net;
    state.socialMonthly = res.social;
    state.taxMonthly = res.tax;

    const gross = Math.max(1, res.gross);
    const netPct = Math.min(100, Math.max(0, (res.net / gross) * 100));
    const socialPct = Math.min(100, Math.max(0, (res.social / gross) * 100));
    const taxPct = Math.min(100, Math.max(0, (res.tax / gross) * 100));

    const isJP = state.country === 'JP';
    document.getElementById('annualGrossHint').textContent =
      '年薪约 ' + formatCurrency(res.gross * 12, 0);
    document.getElementById('takeHomePercentBadge').textContent =
      (isJP ? '手取り率 ' : '到手率 ') + netPct.toFixed(1) + '%';

    document.getElementById('displayNetMonthly').textContent =
      formatCurrency(res.net, isJP ? 0 : 2);
    document.getElementById('displayNetAnnual').textContent =
      formatCurrency(res.net * 12, 0);

    document.getElementById('barNet').style.width = netPct + '%';
    document.getElementById('barSocial').style.width = socialPct + '%';
    document.getElementById('barTax').style.width = taxPct + '%';

    document.getElementById('labelBreakdownNet').textContent = isJP ? '手取り月収' : '税后到手';
    document.getElementById('labelBreakdownSocial').textContent = isJP ? '社会保険料' : '五险一金';
    document.getElementById('labelBreakdownTax').textContent = isJP ? '所得税+住民税' : '个人所得税';

    document.getElementById('valBreakdownNet').textContent = formatCurrency(res.net, 0);
    document.getElementById('valBreakdownSocial').textContent = formatCurrency(res.social, 0);
    document.getElementById('valBreakdownTax').textContent = formatCurrency(res.tax, 0);

    document.getElementById('taxFormulaNote').textContent = isJP
      ? '注：按令和8年分所得税（給与所得控除、基礎控除）、令和8年度住民税及协会けんぽ东京费率估算，未计奖金和其他扣除。'
      : '注：按个税起征点 ¥5,000/月，扣除五险一金后按综合所得阶梯税率估算，未计专项附加扣除。';

    document.getElementById('autoWorkDaysDisplay').textContent = monthStats.hasHolidayData
      ? `${monthStats.totalWorkdays} 天 (${monthStats.month}月，已扣除节假日)`
      : `${monthStats.totalWorkdays} 天 (${monthStats.month}月，未收录${monthStats.year}年节假日，按周一至周五计)`;
    document.getElementById('rateDayNote').textContent =
      `按本月${monthStats.totalWorkdays}日`;

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

    const isJP = state.country === 'JP';
    document.getElementById('ratePerDay').textContent = formatCurrency(perDay, isJP ? 0 : 2);
    document.getElementById('ratePerHour').textContent = formatCurrency(perHour, isJP ? 1 : 2);
    document.getElementById('ratePerMinute').textContent = formatCurrency(perMinute, isJP ? 2 : 3);
    document.getElementById('ratePerSecond').textContent = formatCurrency(perSecond, isJP ? 3 : 4);

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
      if (priceEl) {
        priceEl.textContent = '≈ +' + formatCurrency(itemWorth, isJP ? 0 : 2) + '/次';
      }
      if (timesEl) {
        timesEl.textContent = '已点 ' + (state.slackCounts[item.key] || 0) + ' 次';
      }
    });

    const totalSlackEarned = state.slackMinutesTotal * perMinute;
    document.getElementById('slackingMinutesLabel').textContent =
      `今日累计摸鱼 ${state.slackMinutesTotal} 分钟`;
    document.getElementById('slackingTotalEarned').textContent =
      formatCurrency(totalSlackEarned, isJP ? 0 : 2);
  }

  // --- Render Presets & Country UI ---
  function renderCountryUI() {
    const cfg = countryConfig[state.country];
    const isCN = state.country === 'CN';

    const btnCN = document.getElementById('btnCountryCN');
    const btnJP = document.getElementById('btnCountryJP');
    if (isCN) {
      btnCN.className = 'py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-amber-500 text-slate-950 shadow';
      btnJP.className = 'py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white';
    } else {
      btnJP.className = 'py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-amber-500 text-slate-950 shadow';
      btnCN.className = 'py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white';
    }

    document.getElementById('currencyBadge').textContent = isCN
      ? 'CNY (人民币 ¥)'
      : 'JPY (日本円 ¥)';

    document.getElementById('labelGrossUnit').textContent = cfg.unitLabel;
    document.getElementById('inputCurrencySuffix').textContent = cfg.suffixLabel;
    document.getElementById('inputGrossSalary').value = state.grossSalary;
    document.getElementById('inputGrossSalary').step = isCN ? '500' : '10000';
    document.getElementById('sliderCnSocialRate').value = state.cnSocialRate;
    document.getElementById('labelCnSocialRate').textContent = state.cnSocialRate.toFixed(1) + '%';
    document.getElementById('selectJpAgeGroup').value = state.jpAgeGroup;
    document.getElementById('selectJpResidentTax').value = state.jpResidentTax;
    document.getElementById('inputStartTime').value = state.startTime;
    document.getElementById('inputWorkHours').value = state.workHours;
    document.getElementById('autoEndTimeHint').textContent = getComputedEndTimeString() + ' 下班';

    if (state.useNetForTicker) {
      document.getElementById('btnUseNet').className = 'px-2.5 py-1 rounded-md font-medium bg-amber-500 text-slate-950 transition';
      document.getElementById('btnUseGross').className = 'px-2.5 py-1 rounded-md font-medium text-slate-400 hover:text-white transition';
      document.getElementById('tickerBasisLabel').textContent = '税后净收入';
    } else {
      document.getElementById('btnUseGross').className = 'px-2.5 py-1 rounded-md font-medium bg-amber-500 text-slate-950 transition';
      document.getElementById('btnUseNet').className = 'px-2.5 py-1 rounded-md font-medium text-slate-400 hover:text-white transition';
      document.getElementById('tickerBasisLabel').textContent = '税前总收入';
    }

    document.getElementById('cnTaxOptions').classList.toggle('hidden', !isCN);
    document.getElementById('jpTaxOptions').classList.toggle('hidden', isCN);

    renderSalaryPresets();
  }

  function renderSalaryPresets() {
    const presetContainer = document.getElementById('salaryPresetContainer');
    presetContainer.innerHTML = '';
    countryConfig[state.country].presets.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = Number(state.grossSalary) === p.value;
      btn.className = 'px-2.5 py-1 rounded-lg text-xs font-mono-num transition border ' +
        (active
          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600');
      btn.textContent = p.label;
      btn.addEventListener('click', () => {
        state.grossSalary = p.value;
        document.getElementById('inputGrossSalary').value = p.value;
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

    cfg.rewards.forEach(item => {
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
              <div class="text-xs font-semibold text-slate-100">${item.name}</div>
              <div class="text-[11px] font-mono-num text-slate-400">单价 ${formatCurrency(item.price, state.country === 'JP' ? 0 : 1)}</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-md text-xs font-mono-num font-bold ${fullUnits >= 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-900 text-slate-400'}">
            × ${count.toFixed(1)} ${item.unit}
          </span>
        </div>
        <div class="space-y-1">
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-amber-400 to-emerald-400" style="width: ${pct.toFixed(1)}%"></div>
          </div>
          <div class="flex justify-between text-[10px] text-slate-400">
            <span>已稳赚 ${fullUnits} ${item.unit}</span>
            <span>下一${item.unit}进度 ${pct.toFixed(0)}%</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // --- Floating Coin Particle Celebration ---
  function spawnCelebrationCoins(originBtn, customBadgeText) {
    playCoinSound();
    const symbols = state.country === 'JP' ? ['💴', '🪙', '✨', '💰'] : ['🧧', '🪙', '💰', '✨'];
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
    const { startSecondsOfDay, endSecondsOfDay, totalWorkSeconds } = getDailyWorkSeconds();

    let phase;
    let workedSecondsToday = 0;
    let secondsToStart = 0;
    let secondsToEnd = 0;

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
        phase = 'working';
        workedSecondsToday = currentSecondsOfDay - startSecondsOfDay;
        secondsToEnd = endSecondsOfDay - currentSecondsOfDay;
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
      monthStats, monthlyBasis, phase, workedSecondsToday, secondsToStart, secondsToEnd,
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
    document.getElementById('currentClockDisplay').textContent = '当前时间 ' + timeStr;
    const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    document.getElementById('todayDateBadge').textContent =
      `${monthStats.month}月${monthStats.todayDate}日 (${weekNames[now.getDay()]})`;

    const statusEl = document.getElementById('liveStatusText');
    const progressEl = document.getElementById('workProgressText');
    const remainingEl = document.getElementById('timeRemainingText');
    if (live.phase === 'restDay') {
      statusEl.textContent = '今日休息';
      progressEl.textContent = `今天是${monthStats.todayRestLabel}，不计薪`;
      remainingEl.textContent = '好好休息，养足精神！';
    } else if (live.phase === 'beforeWork') {
      statusEl.textContent = '待上班发车';
      progressEl.textContent = '今日尚未到上班时间';
      remainingEl.textContent = '距离上班还有 ' + formatDuration(live.secondsToStart);
    } else if (live.phase === 'afterWork') {
      statusEl.textContent = '今日已圆满下班';
      progressEl.textContent = '🎉 今日搬砖目标 100% 达成！';
      remainingEl.textContent = '已下班，尽情享受生活吧！';
    } else if (live.phase === 'working') {
      statusEl.textContent = '实时入账中';
      progressEl.textContent = '今日搬砖进度：' + progressPercent.toFixed(2) + '%';
      remainingEl.textContent = '距离下班还有 ' + formatDuration(live.secondsToEnd);
    } else {
      document.getElementById('stopwatchElapsedText').textContent =
        '已累计工作: ' + formatDuration(live.workedSecondsToday);
      statusEl.textContent = state.stopwatchRunning ? '手动计时入账中' : '计时已暂停';
      progressEl.textContent = '今日计时进度：' + progressPercent.toFixed(2) + '%';
      remainingEl.textContent = '距离满工时还剩 ' + formatDuration(live.secondsToEnd);
    }

    const isJP = state.country === 'JP';
    const decimals = isJP ? 2 : 4;
    document.getElementById('heroLiveAmount').textContent = earnedToday.toLocaleString(
      isJP ? 'ja-JP' : 'zh-CN',
      { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
    );
    document.getElementById('workProgressBar').style.width = Math.max(0, progressPercent) + '%';

    // --- Monthly Cumulative Income ---
    const monthProgressPct = monthlyBasis > 0
      ? Math.min(100, (monthCumulativeEarned / monthlyBasis) * 100)
      : 0;
    const monthRemaining = Math.max(0, monthlyBasis - monthCumulativeEarned);

    const monthDecimals = isJP ? 0 : 2;
    document.getElementById('monthCumulativeAmount').textContent = monthCumulativeEarned.toLocaleString(
      isJP ? 'ja-JP' : 'zh-CN',
      { minimumFractionDigits: monthDecimals, maximumFractionDigits: monthDecimals }
    );

    const currentWorkdayIndex = monthStats.pastWorkdays + (monthStats.isTodayWorkday ? 1 : 0);
    document.getElementById('monthCalendarBadge').textContent =
      monthStats.isTodayWorkday
        ? `本月第 ${currentWorkdayIndex} / ${monthStats.totalWorkdays} 个工作日`
        : `已完成 ${monthStats.pastWorkdays} / ${monthStats.totalWorkdays} 个工作日`;

    document.getElementById('monthWorkdaysSummary').textContent =
      `${monthStats.month}月共 ${monthStats.totalWorkdays} 个工作日，已过 ${monthStats.pastWorkdays} 个完整工作日` +
      (monthStats.isTodayWorkday ? ' + 今日实时入账中' : `（今日${monthStats.todayRestLabel}休息）`);

    document.getElementById('monthProgressPercentText').textContent =
      `本月进度：${monthProgressPct.toFixed(1)}%`;
    document.getElementById('monthRemainingIncomeText').textContent =
      `待入账 ${formatCurrency(monthRemaining, 0)}`;
    document.getElementById('monthProgressBar').style.width = monthProgressPct + '%';

    if (nowMs - lastRewardRenderTime > 400) {
      renderRewardsGrid(earnedToday);
      updateQuoteRotation(nowMs);
      lastRewardRenderTime = nowMs;
    }

    requestAnimationFrame(tick);
  }

  // requestAnimationFrame pauses in background tabs, so the title uses its own timer.
  const BASE_TITLE = '上班鼓励器';
  function updateDocumentTitle() {
    handleDayRollover();
    const { earnedToday } = computeLiveEarnings(new Date());
    document.title = formatCurrency(earnedToday, state.country === 'JP' ? 0 : 2) + ' · ' + BASE_TITLE;
  }

  // --- Event Listeners ---
  function handleSaveAndCollapse() {
    state.settingsCollapsed = true;
    savePreferences();
    renderSettingsCollapseState();
    showToast('设置已自动保存');
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
    renderCountryUI();
    updateTaxCalculation();
    renderRewardsGrid(0);
    savePreferences();
  }

  document.getElementById('btnCountryCN').addEventListener('click', () => switchCountry('CN'));
  document.getElementById('btnCountryJP').addEventListener('click', () => switchCountry('JP'));

  const salaryInput = document.getElementById('inputGrossSalary');
  // Do not write back to the field while typing, otherwise clearing it immediately turns into 0.
  salaryInput.addEventListener('input', (e) => {
    state.grossSalary = Math.max(0, Number(e.target.value) || 0);
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

  document.getElementById('selectJpAgeGroup').addEventListener('change', (e) => {
    state.jpAgeGroup = e.target.value;
    updateTaxCalculation();
    savePreferences();
  });

  document.getElementById('selectJpResidentTax').addEventListener('change', (e) => {
    state.jpResidentTax = e.target.value;
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
    state.workHours = Math.max(0.5, Math.min(24, Number(e.target.value) || 9));
    updateRatesAndSlackingDisplay();
    renderSettingsCollapseState();
    savePreferences();
  });

  // Mode switching
  function renderModeUI() {
    const isStopwatch = state.mode === 'stopwatch';
    const activeClass = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition';
    const inactiveClass = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition';
    document.getElementById('btnModeSchedule').className = isStopwatch ? inactiveClass : activeClass;
    document.getElementById('btnModeStopwatch').className = isStopwatch ? activeClass : inactiveClass;
    document.getElementById('stopwatchControls').classList.toggle('hidden', !isStopwatch);
    document.getElementById('btnStopwatchToggle').textContent = state.stopwatchRunning
      ? '⏸️ 暂停计时'
      : (state.stopwatchAccumulatedMs > 0 ? '▶️ 继续计时赚钱' : '▶️ 开始计时赚钱');
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
  state.quoteIndex = Math.floor(Math.random() * quotes.length);
  document.getElementById('motivationalQuote').textContent = quotes[state.quoteIndex];

  function updateQuoteRotation(nowMs) {
    const elapsedSec = Math.floor((nowMs - lastQuoteSwitchMs) / 1000);
    if (elapsedSec >= 60) {
      lastQuoteSwitchMs = nowMs;
      state.quoteIndex = (state.quoteIndex + 1 + Math.floor(Math.random() * 7)) % quotes.length;
      document.getElementById('motivationalQuote').textContent = quotes[state.quoteIndex];
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
        `+${addMinutes}分钟 (${formatCurrency(addedMoney, state.country === 'JP' ? 0 : 2)})`
      );
    });
  });

  document.getElementById('btnResetSlack').addEventListener('click', () => {
    state.slackMinutesTotal = 0;
    state.slackCounts = { coffee: 0, restroom: 0, stretch: 0, phone: 0 };
    updateRatesAndSlackingDisplay();
    savePreferences();
  });

  // Initialize: load saved preferences first
  loadPreferences();
  renderCountryUI();
  renderModeUI();
  renderMuteUI();
  updateTaxCalculation();
  requestAnimationFrame(tick);
  updateDocumentTitle();
  setInterval(updateDocumentTitle, 1000);
})();
