(function (WM) {
  // --- Public Holidays ---
  // China publishes each year's schedule (including make-up workdays) in a State Council
  // notice, so it cannot be computed; years missing here fall back to Mon-Fri.
  const CN_HOLIDAY_SCHEDULES = {
    2026: {
      off: [
        ['2026-01-01', '2026-01-03', '元旦'],
        ['2026-02-15', '2026-02-23', '春节'],
        ['2026-04-04', '2026-04-06', '清明节'],
        ['2026-05-01', '2026-05-05', '劳动节'],
        ['2026-06-19', '2026-06-21', '端午节'],
        ['2026-09-25', '2026-09-27', '中秋节'],
        ['2026-10-01', '2026-10-07', '国庆节']
      ],
      work: ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10']
    },
    2027: {
      off: [
        ['2027-01-01', '2027-01-03', '元旦'],
        ['2027-02-05', '2027-02-13', '春节'],
        ['2027-04-03', '2027-04-05', '清明节'],
        ['2027-05-01', '2027-05-05', '劳动节'],
        ['2027-06-09', '2027-06-09', '端午节'],
        ['2027-09-15', '2027-09-15', '中秋节'],
        ['2027-10-01', '2027-10-07', '国庆节']
      ],
      work: ['2027-01-31', '2027-02-14', '2027-05-08', '2027-09-26', '2027-10-09']
    }
  };

  function dateKey(year, month, day) {
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  // Rules of the current 国民の祝日に関する法律. The equinox formula is the standard
  // approximation valid for 1980-2099; the official dates are announced each February.
  function buildJapanHolidays(year) {
    const holidays = new Map();
    const add = (month, day, name) => holidays.set(dateKey(year, month, day), name);
    const nthMonday = (month, n) => {
      const firstDow = new Date(year, month - 1, 1).getDay();
      return 1 + ((8 - firstDow) % 7) + (n - 1) * 7;
    };
    const yearsSince1980 = year - 1980;
    const leapShift = Math.floor(yearsSince1980 / 4);

    add(1, 1, '元日');
    add(1, nthMonday(1, 2), '成人の日');
    add(2, 11, '建国記念の日');
    add(2, 23, '天皇誕生日');
    add(3, Math.floor(20.8431 + 0.242194 * yearsSince1980 - leapShift), '春分の日');
    add(4, 29, '昭和の日');
    add(5, 3, '憲法記念日');
    add(5, 4, 'みどりの日');
    add(5, 5, 'こどもの日');
    add(7, nthMonday(7, 3), '海の日');
    add(8, 11, '山の日');
    add(9, nthMonday(9, 3), '敬老の日');
    add(9, Math.floor(23.2488 + 0.242194 * yearsSince1980 - leapShift), '秋分の日');
    add(10, nthMonday(10, 2), 'スポーツの日');
    add(11, 3, '文化の日');
    add(11, 23, '勤労感謝の日');

    const statutory = new Map(holidays);
    const keyOf = (d) => dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());

    // 国民の休日: a weekday sandwiched between two statutory holidays.
    for (let d = new Date(year, 0, 2); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
      const key = keyOf(d);
      if (statutory.has(key) || d.getDay() === 0) continue;
      const prev = new Date(d); prev.setDate(d.getDate() - 1);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      if (statutory.has(keyOf(prev)) && statutory.has(keyOf(next))) holidays.set(key, '国民の休日');
    }

    // 振替休日: a statutory holiday on Sunday moves to the next day that is not a holiday.
    statutory.forEach((name, key) => {
      const [y, m, day] = key.split('-').map(Number);
      const d = new Date(y, m - 1, day);
      if (d.getDay() !== 0) return;
      do { d.setDate(d.getDate() + 1); } while (holidays.has(keyOf(d)));
      holidays.set(keyOf(d), '振替休日');
    });

    return holidays;
  }

  function buildChinaCalendar(year) {
    const schedule = CN_HOLIDAY_SCHEDULES[year];
    if (!schedule) return null;
    const parseDate = (s) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const holidays = new Map();
    schedule.off.forEach(([from, to, name]) => {
      const end = parseDate(to);
      for (let d = parseDate(from); d <= end; d.setDate(d.getDate() + 1)) {
        holidays.set(dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()), name);
      }
    });
    return { holidays, makeupWorkdays: new Set(schedule.work) };
  }

  const calendarCache = new Map();
  function getYearCalendar(country, year) {
    const cacheKey = country + year;
    if (!calendarCache.has(cacheKey)) {
      calendarCache.set(cacheKey, country === 'JP'
        ? { holidays: buildJapanHolidays(year), makeupWorkdays: new Set() }
        : buildChinaCalendar(year));
    }
    return calendarCache.get(cacheKey);
  }

  // holidayName is null on ordinary weekends; the UI owns the translated weekend label.
  function getDayInfo(country, year, month, day) {
    const dow = new Date(year, month - 1, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const calendar = getYearCalendar(country, year);
    if (!calendar) return { isWorkday: !isWeekend, holidayName: null };
    const key = dateKey(year, month, day);
    if (calendar.makeupWorkdays.has(key)) return { isWorkday: true, holidayName: null };
    const holidayName = calendar.holidays.get(key);
    if (holidayName) return { isWorkday: false, holidayName };
    return { isWorkday: !isWeekend, holidayName: null };
  }

  // --- Calculate Calendar Month Workdays (weekends and public holidays excluded) ---
  function getMonthWorkdayStats(dateObj, country) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const todayDate = dateObj.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();

    let totalWorkdays = 0;
    let pastWorkdays = 0;
    let today = null;

    for (let d = 1; d <= daysInMonth; d++) {
      const info = getDayInfo(country, year, month, d);
      if (d === todayDate) today = info;
      if (info.isWorkday) {
        totalWorkdays++;
        if (d < todayDate) pastWorkdays++;
      }
    }

    return {
      year,
      month,
      todayDate,
      totalWorkdays: Math.max(1, totalWorkdays),
      pastWorkdays,
      isTodayWorkday: today.isWorkday,
      todayHolidayName: today.holidayName
    };
  }

  WM.getMonthWorkdayStats = getMonthWorkdayStats;
})(window.WM = window.WM || {});
