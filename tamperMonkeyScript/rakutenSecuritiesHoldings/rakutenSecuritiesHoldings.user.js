// ==UserScript==
// @name         楽天証券 口座別保有商品表示拡張
// @namespace    https://github.com/ballban/ballbanTools
// @version      1.6.0
// @description  楽天証券の国内株式保有商品一覧に、変化率・変動額・評価損益金額・評価損益率を表示します
// @author       ballban
// @icon         https://www.rakuten-sec.co.jp/favicon.ico
// @match        https://*.rakuten-sec.co.jp/app/ass_jp_stk_possess_lst.do*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const TABLE_SELECTOR = '#poss-tbl-sp, #poss-tbl-gfn';
  const STYLE_ID = 'tm-rakuten-holdings-style';
  const PREVIOUS_DAY_CELL = 'tm-rakuten-previous-day-total-cell';
  const PREVIOUS_DAY_HEADER = 'tm-rakuten-previous-day-total-header';
  const PERCENTAGE_LINE = 'tm-rakuten-percentage-line';
  const PERCENTAGE_HEADER = 'tm-rakuten-percentage-header';
  const PERCENT_FIXED_ROW = 'tm-rakuten-percent-fixed-row';
  const ENHANCED_MARKET_CELL = 'tm-rakuten-enhanced-market-cell';
  const TOTAL_CHANGE_LINE = 'tm-rakuten-total-change-line';
  const TOTAL_CHANGE_CENTERED_LINE = 'tm-rakuten-total-change-centered-line';
  const TOTAL_CHANGE_HEADER = 'tm-rakuten-total-change-header';
  const MARKET_VALUE_HEADER = 'tm-rakuten-market-value-header';
  const MARKET_TOTAL_LINE = 'tm-rakuten-market-total-line';

  let enhancementScheduled = false;

  function directCells(row) {
    return Array.from(row.children).filter(function (element) {
      return element.tagName === 'TD' || element.tagName === 'TH';
    });
  }

  function normalizedText(element) {
    return (element && element.textContent ? element.textContent : '')
      .replace(/[\s\u00a0]+/g, '')
      .trim();
  }

  function columnStart(row, targetCell) {
    let start = 0;

    for (const cell of directCells(row)) {
      if (cell === targetCell) {
        return start;
      }
      start += Math.max(cell.colSpan || 1, 1);
    }

    return -1;
  }

  function cellAtColumn(row, targetColumn) {
    if (targetColumn < 0) {
      return null;
    }

    let start = 0;
    for (const cell of directCells(row)) {
      const span = Math.max(cell.colSpan || 1, 1);
      if (targetColumn >= start && targetColumn < start + span) {
        return cell;
      }
      start += span;
    }

    return null;
  }

  function parseNumber(text) {
    if (!text) {
      return null;
    }

    const normalized = String(text)
      .replace(/[０-９]/g, function (character) {
        return String.fromCharCode(character.charCodeAt(0) - 0xfee0);
      })
      .replace(/[＋]/g, '+')
      .replace(/[−ー－]/g, '-')
      .replace(/[，]/g, ',')
      .replace(/,/g, '')
      .replace(/\s+/g, '');
    const match = normalized.match(/[+-]?(?:\d+(?:\.\d+)?|\.\d+)/);

    if (!match) {
      return null;
    }

    const value = Number(match[0]);
    return Number.isFinite(value) ? value : null;
  }

  function formatNumber(value, maximumFractionDigits, minimumFractionDigits) {
    if (!Number.isFinite(value)) {
      return '—';
    }

    const rounded = Math.round((value + Number.EPSILON) * 1e6) / 1e6;
    return rounded.toLocaleString('ja-JP', {
      maximumFractionDigits: maximumFractionDigits,
      minimumFractionDigits: minimumFractionDigits || 0,
    });
  }

  function formatSigned(value, maximumFractionDigits, minimumFractionDigits) {
    if (!Number.isFinite(value)) {
      return '—';
    }

    if (Math.abs(value) < 1e-10) {
      return formatNumber(0, maximumFractionDigits, minimumFractionDigits);
    }

    const sign = value > 0 ? '+' : '-';
    return sign + formatNumber(Math.abs(value), maximumFractionDigits, minimumFractionDigits);
  }

  function valueClass(value) {
    if (value > 0) {
      return 'up';
    }
    if (value < 0) {
      return 'down';
    }
    return '';
  }

  function setValueLine(line, value, suffix, maximumFractionDigits, minimumFractionDigits, lineClass) {
    const targetLineClass = lineClass || PERCENTAGE_LINE;
    const hasValue = Number.isFinite(value);
    const text = hasValue
      ? formatSigned(value, maximumFractionDigits, minimumFractionDigits) + ' ' + suffix
      : '—';
    const className = hasValue ? valueClass(value) : '';
    const cacheKey = targetLineClass + '|' + text + '|' + className;

    if (line.dataset.tmValue === cacheKey) {
      return;
    }

    line.dataset.tmValue = cacheKey;
    line.className = 'mbody ' + targetLineClass;
    line.replaceChildren();

    const nobr = document.createElement('nobr');
    if (className) {
      const valueSpan = document.createElement('span');
      valueSpan.className = className;
      valueSpan.textContent = text;
      nobr.appendChild(valueSpan);
    } else {
      nobr.textContent = text;
    }
    line.appendChild(nobr);
  }


  function currentValueFromCell(currentCell) {
    const firstBody = Array.from(currentCell.children).find(function (element) {
      return element.classList.contains('mbody')
        && !element.classList.contains('stockval_area_0')
        && !element.classList.contains('stockval_area_1');
    });

    return parseNumber(firstBody ? firstBody.textContent : currentCell.textContent);
  }

  function stockValueArea(currentCell, areaClass) {
    return Array.from(currentCell.children).find(function (element) {
      return element.classList.contains(areaClass);
    }) || null;
  }

  function changeFromArea(area) {
    return area ? parseNumber(area.textContent) : null;
  }
  function areaIsVisible(area) {
    return Boolean(area) && window.getComputedStyle(area).display !== 'none';
  }

  function selectedChangeFromCell(currentCell) {
    const dayArea = stockValueArea(currentCell, 'stockval_area_0');
    const monthArea = stockValueArea(currentCell, 'stockval_area_1');
    const selectedArea = areaIsVisible(monthArea) && !areaIsVisible(dayArea)
      ? monthArea
      : (dayArea || monthArea);
    return changeFromArea(selectedArea);
  }


  function quantityFromRow(row, quantityColumn) {
    const quantityCell = cellAtColumn(row, quantityColumn);
    return parseNumber(quantityCell ? quantityCell.textContent : '');
  }

  function percentageFromChange(currentValue, changeValue) {
    if (!Number.isFinite(currentValue) || !Number.isFinite(changeValue)) {
      return null;
    }

    const previousValue = currentValue - changeValue;
    if (Math.abs(previousValue) < 1e-12) {
      return null;
    }

    return changeValue / previousValue * 100;
  }

  function updatePercentageLine(area, currentValue) {
    if (!area) {
      return;
    }

    let line = Array.from(area.children).find(function (element) {
      return element.classList.contains(PERCENTAGE_LINE);
    });
    if (!line) {
      line = document.createElement('div');
      line.className = 'mbody ' + PERCENTAGE_LINE;
      area.appendChild(line);
    }

    setValueLine(
      line,
      percentageFromChange(currentValue, changeFromArea(area)),
      '%',
      2,
      2,
    );
  }
  function updateTotalChangeLine(currentCell, totalChange, centered) {
    if (!currentCell) {
      return;
    }

    let line = Array.from(currentCell.children).find(function (element) {
      return element.classList.contains(TOTAL_CHANGE_LINE);
    });
    if (!line) {
      line = document.createElement('div');
      currentCell.appendChild(line);
    }

    const lineClass = centered
      ? TOTAL_CHANGE_LINE + ' ' + TOTAL_CHANGE_CENTERED_LINE
      : TOTAL_CHANGE_LINE;
    setValueLine(line, totalChange, '円', 1, 1, lineClass);
  }
  function markMarketValueCell(marketCell) {
    if (!marketCell) {
      return;
    }

    const totalLine = Array.from(marketCell.children).find(function (element) {
      return !element.classList.contains('profitloss_area_0')
        && !element.classList.contains('profitloss_area_1');
    });
    if (totalLine) {
      totalLine.classList.add(MARKET_TOTAL_LINE);
    }
  }



  function updateStockRow(row, currentCell, quantityColumn) {
    const currentValue = currentValueFromCell(currentCell);
    const dayArea = stockValueArea(currentCell, 'stockval_area_0');
    const monthArea = stockValueArea(currentCell, 'stockval_area_1');
    updatePercentageLine(dayArea, currentValue);
    updatePercentageLine(monthArea, currentValue);
    const quantity = quantityFromRow(row, quantityColumn);
    const selectedChange = selectedChangeFromCell(currentCell);
    const totalChange = Number.isFinite(selectedChange) && Number.isFinite(quantity)
      ? selectedChange * quantity
      : null;

    updateTotalChangeLine(currentCell, totalChange);
    markMarketValueCell(currentCell.nextElementSibling);
    row.classList.add(PERCENT_FIXED_ROW);
  }

  function findCurrentCell(row, currentColumn) {
    return directCells(row).find(function (cell) {
      return cell.classList.contains('cell-05');
    }) || cellAtColumn(row, currentColumn);
  }

  function isSummaryRow(row) {
    return Array.from(row.classList).some(function (className) {
      return /-acc-amt-value-line$/.test(className);
    });
  }


  function findQuantityHeader(headerRow) {
    return directCells(headerRow).find(function (cell) {
      return normalizedText(cell).includes('保有数量');
    }) || null;
  }

  function findCurrentHeader(headerRow) {
    return directCells(headerRow).find(function (cell) {
      return normalizedText(cell).includes('現在値')
        && !cell.classList.contains(PREVIOUS_DAY_HEADER);
    }) || null;
  }

  function findMarketHeader(headerRow) {
    return directCells(headerRow).find(function (cell) {
      return cell.classList.contains(PREVIOUS_DAY_HEADER)
        || (normalizedText(cell).includes('時価評価額')
          && normalizedText(cell).includes('評価損益'));
    }) || null;
  }

  function ensurePercentageHeader(currentHeader) {
    if (!Array.from(currentHeader.children).some(function (element) {
      return element.classList.contains(PERCENTAGE_HEADER);
    })) {
      const percentageHeader = document.createElement('div');
      percentageHeader.className = 'mbody ' + PERCENTAGE_HEADER;
      const percentageLabel = document.createElement('nobr');
      percentageLabel.textContent = '変化率';
      percentageHeader.appendChild(percentageLabel);
      currentHeader.appendChild(percentageHeader);
    }

    const totalChangeHeader = Array.from(currentHeader.children).find(function (element) {
      return element.classList.contains(TOTAL_CHANGE_HEADER);
    });
    if (totalChangeHeader) {
      const label = totalChangeHeader.querySelector('nobr');
      if (label) {
        label.textContent = '変動額';
      }
    } else {
      const newTotalChangeHeader = document.createElement('div');
      newTotalChangeHeader.className = 'mbody ' + TOTAL_CHANGE_HEADER;
      const totalChangeLabel = document.createElement('nobr');
      totalChangeLabel.textContent = '変動額';
      newTotalChangeHeader.appendChild(totalChangeLabel);
      currentHeader.appendChild(newTotalChangeHeader);
    }
  }

  function markMarketValueHeader(headerRow) {
    const marketHeader = findMarketHeader(headerRow);
    if (!marketHeader) {
      return null;
    }

    const valueHeader = directCells(headerRow).find(function (cell) {
      return !cell.classList.contains(PREVIOUS_DAY_HEADER)
        && normalizedText(cell).includes('時価評価額')
        && normalizedText(cell).includes('評価損益');
    });
    if (valueHeader) {
      valueHeader.classList.add(MARKET_VALUE_HEADER);
    }

    return valueHeader;
  }

  function summaryValue(summaryRow) {
    let total = 0;
    let hasValue = false;
    let previous = summaryRow.previousElementSibling;

    while (previous) {
      if (isSummaryRow(previous)) {
        break;
      }

      const currentCell = directCells(previous).find(function (cell) {
        return cell.classList.contains('cell-05');
      });
      if (currentCell) {
        const selectedChange = selectedChangeFromCell(currentCell);
        const quantityColumn = previous.dataset.tmQuantityColumn
          ? Number(previous.dataset.tmQuantityColumn)
          : -1;
        const quantity = quantityFromRow(previous, quantityColumn);
        if (Number.isFinite(selectedChange) && Number.isFinite(quantity)) {
          total += selectedChange * quantity;
          hasValue = true;
        }
      }

      previous = previous.previousElementSibling;
    }

    return hasValue ? total : null;
  }

  function enhanceSummaryRow(summaryRow) {
    const cells = directCells(summaryRow);
    let marketCell = cells.find(function (cell) {
      return cell.classList.contains(ENHANCED_MARKET_CELL)
        || (cell.querySelector('.profitloss_area_0')
          && cell.querySelector('.profitloss_area_1'));
    });

    if (!marketCell) {
      return;
    }

    if (!marketCell.classList.contains(ENHANCED_MARKET_CELL)) {
      marketCell.classList.add(ENHANCED_MARKET_CELL);
    }

    markMarketValueCell(marketCell);
    const totalChange = summaryValue(summaryRow);
    updateTotalChangeLine(marketCell.previousElementSibling, totalChange, true);
    summaryRow.classList.add(PERCENT_FIXED_ROW);
  }

  function removePreviousDayColumn(table) {
    for (const row of Array.from(table.querySelectorAll('tbody > tr'))) {
      if (row.dataset.tmRakutenColspanAdjusted === '1') {
        const colspanCell = directCells(row).find(function (cell) {
          return cell.hasAttribute('colspan');
        });
        const colspan = colspanCell ? Number(colspanCell.getAttribute('colspan')) : NaN;
        if (Number.isFinite(colspan) && colspan > 1) {
          colspanCell.setAttribute('colspan', String(colspan - 1));
        }
        delete row.dataset.tmRakutenColspanAdjusted;
      }

      for (const cell of directCells(row)) {
        if (cell.classList.contains(PREVIOUS_DAY_CELL)
          || cell.classList.contains(PREVIOUS_DAY_HEADER)) {
          cell.remove();
        }
      }
    }
  }

  function scopedSelector(selector) {
    return ['#poss-tbl-sp', '#poss-tbl-gfn'].map(function (tableSelector) {
      return tableSelector + ' ' + selector;
    }).join(', ');
  }

  function addStyles() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = [
      scopedSelector('.' + TOTAL_CHANGE_LINE) + ' { white-space: nowrap; text-align: right !important; }',
      scopedSelector('.' + TOTAL_CHANGE_CENTERED_LINE) + ' { text-align: center !important; }',
      scopedSelector('.' + MARKET_TOTAL_LINE) + ' { display: block !important; white-space: nowrap; }',
      scopedSelector('tr.' + PERCENT_FIXED_ROW + ' > td .profitloss_area_0') + ' { display: block !important; }',
      scopedSelector('tr.' + PERCENT_FIXED_ROW + ' > td .profitloss_area_1') + ' { display: block !important; }',
      scopedSelector('.' + MARKET_VALUE_HEADER + ' > .printOff') + ' { display: none !important; }',
    ].join('\n');
  }

  function enhanceTable(table) {
    removePreviousDayColumn(table);
    const rows = Array.from(table.querySelectorAll('tbody > tr'));
    const headerRow = rows.find(function (row) {
      return findCurrentHeader(row) && findMarketHeader(row);
    });
    if (!headerRow) {
      return;
    }

    const currentHeader = findCurrentHeader(headerRow);
    const quantityHeader = findQuantityHeader(headerRow);
    const marketHeader = markMarketValueHeader(headerRow);
    if (!currentHeader || !quantityHeader || !marketHeader) {
      return;
    }

    ensurePercentageHeader(currentHeader);

    const quantityColumn = columnStart(headerRow, quantityHeader);
    const currentColumn = columnStart(headerRow, currentHeader);
    if (quantityColumn < 0 || currentColumn < 0) {
      return;
    }

    for (const row of rows) {
      if (row === headerRow) {
        continue;
      }

      const currentCell = findCurrentCell(row, currentColumn);
      if (currentCell && stockValueArea(currentCell, 'stockval_area_0')) {
        row.dataset.tmQuantityColumn = String(quantityColumn);
        updateStockRow(row, currentCell, quantityColumn);
        continue;
      }

      if (isSummaryRow(row)) {
        enhanceSummaryRow(row);
      }
    }
  }

  function scheduleEnhancement() {
    if (enhancementScheduled) {
      return;
    }

    enhancementScheduled = true;
    const run = function () {
      enhancementScheduled = false;
      const tables = Array.from(document.querySelectorAll(TABLE_SELECTOR));
      if (tables.length === 0) {
        return;
      }
      addStyles();
      for (const table of tables) {
        enhanceTable(table);
      }
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(run);
    } else {
      window.setTimeout(run, 0);
    }
  }

  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style'],
    characterData: true,
    childList: true,
    subtree: true,
  });

  scheduleEnhancement();
})();
