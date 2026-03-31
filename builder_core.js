// ╔══════════════════════════════════════════════════════════════════════════╗
//  CONC Hub Builder — Core Pipeline (ported from generate_all.py)
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── Config ──────────────────────────────────────────────────────────────────
const DAYS      = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// (week, day_index) → [display_str, dateNum]
const DATE_MAP = {
  '1,0':['May 17',17],'1,1':['May 18',18],'1,2':['May 19',19],'1,3':['May 20',20],
  '1,4':['May 21',21],'1,5':['May 22',22],'1,6':['May 23',23],
  '2,0':['May 24',24],'2,1':['May 25',25],'2,2':['May 26',26],'2,3':['May 27',27],
  '2,4':['May 28',28],'2,5':['May 29',29],'2,6':['May 30',30],
  '3,0':['May 31',31],'3,1':['Jun 1',1],'3,2':['Jun 2',2],'3,3':['Jun 3',3],
  '3,4':['Jun 4',4],'3,5':['Jun 5',5],'3,6':['Jun 6',6],
  '4,0':['Jun 7',7],'4,1':['Jun 8',8],'4,2':['Jun 9',9],'4,3':['Jun 10',10],
  '4,4':['Jun 11',11],'4,5':['Jun 12',12],'4,6':['Jun 13',13],
};
const WEEK_RANGES = {
  1:'May 17–23, 2026', 2:'May 24–30, 2026',
  3:'May 31–Jun 6, 2026', 4:'Jun 7–13, 2026'
};
const WEEK_NOTE = 'Remediation · All food HOT from Bloor or LAN · Rex = portion & serve only';

const SECTION_ORDER  = ['SEND AM','LUNCH','PRODUCTION','DINNER','SEND PM'];
const SECTION_IDS    = {'SEND AM':'send-am','LUNCH':'lunch','PRODUCTION':'production',
                        'DINNER':'dinner','SEND PM':'send-pm'};
const SECTION_LABELS = {'send-am':'▲ Send AM','lunch':'☀ Lunch','production':'⚙ Production',
                        'dinner':'🌙 Dinner','send-pm':'▼ Send PM'};

const LONG_COOK_ITEMS = [
  'massaman','arroz con pollo','fried rice','white chili','white chilli',
  'sous vide','sausage pasta sauce',
  'west african peanut stew','caribbean stew','beef & vegetable stew',
  'vegan chili','chickpea shakshuka','beef stroganoff'
];
const OVERNIGHT_ITEMS = ['philly steak overnight'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function safeInt(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function jsStr(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function detectStream(item) {
  const l = item.toLowerCase();
  if (l.includes('vegan') || l.includes('(veg)') || l.includes('vegetarian')) return 'Vegan';
  if (l.includes('halal')) return 'Halal';
  return 'Regular';
}

function labourTimes(row) {
  let cookMin = safeInt(String(row.cook_min || '').replace(' min','').trim());
  const typ = (row.type || '').toUpperCase();
  const itemLower = (row.item || '').toLowerCase();
  if (typ === 'HEAT') return [15, 0];
  if (OVERNIGHT_ITEMS.some(k => itemLower.includes(k))) return [30, cookMin];
  if (LONG_COOK_ITEMS.some(k => itemLower.includes(k))) return [Math.floor(cookMin/2), cookMin];
  return [cookMin, cookMin];
}

function deriveDestFridge(row) {
  const override = String(row.dest_override || '').trim();
  if (override) return override;
  const hold = row.hold_days || 0;
  if (!hold) return '';
  return hold <= 2 ? 'Bloor' : 'Rex';
}

// ── Source Loader (SheetJS) ─────────────────────────────────────────────────

async function loadSource(file) {
  const buf = await file.arrayBuffer();
  const wb  = XLSX.read(buf, { type: 'array' });
  const rows = [];
  let headers = null;

  for (const sheetName of wb.SheetNames) {
    if (sheetName.toUpperCase() === 'README') continue;
    const ws   = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (data.length === 0) continue;

    if (!headers) {
      headers = data[0].map(h => h ? String(h).trim() : null).filter(Boolean);
    }

    for (let ri = 1; ri < data.length; ri++) {
      const raw = data[ri];
      const itemVal = raw[4]; // col E = item
      if (!itemVal) continue;

      const r = {};
      headers.forEach((h, ci) => {
        const v = raw[ci];
        r[h] = (v !== null && v !== undefined) ? v : '';
      });

      // Normalise types
      r.week     = safeInt(r.week);
      r.cook_min = String(r.cook_min || '');
      r.hold_days    = safeInt(r.hold_days);
      r.dest_fridge  = deriveDestFridge(r);
      r.hotel_equiv  = r.hotel_equiv === '' ? '' : r.hotel_equiv;

      rows.push(r);
    }
  }
  return rows;
}

// ── Validation ──────────────────────────────────────────────────────────────

function validateSource(rows) {
  const warnings = [], errors = [];

  rows.forEach((r, i) => {
    const wk     = r.week || 0;
    const day    = r.day || '';
    const item   = r.item || '';
    const typ    = r.type || '';
    const period = r.period || '';
    const site   = r.site || '';
    const tag    = `Wk${wk} ${String(day).slice(0,3)} R${i+1}`;

    if (!item)  errors.push(`${tag}: missing item name`);
    if (!typ)   errors.push(`${tag}: missing type — ${item.slice(0,40)}`);
    if (!site)  warnings.push(`${tag}: missing site — ${item.slice(0,40)}`);

    if (period === 'SEND AM' || period === 'SEND PM') {
      if (r.hotel_equiv === null || r.hotel_equiv === undefined || r.hotel_equiv === '')
        warnings.push(`${tag}: SEND missing hotel_equiv — ${item.slice(0,40)}`);
      if (!r.van_run)
        warnings.push(`${tag}: SEND missing van_run — ${item.slice(0,40)}`);
    }

    if (period === 'PRODUCTION') {
      if (!r.serves_week) warnings.push(`${tag}: PRODUCTION missing serves_week — ${item.slice(0,40)}`);
      if (!r.serves_day)  warnings.push(`${tag}: PRODUCTION missing serves_day — ${item.slice(0,40)}`);
    }

    if (typ === 'COOK' || typ === 'HEAT') {
      const cm = String(r.cook_min || '').trim();
      if (!cm || cm === '0') warnings.push(`${tag}: ${typ} missing cook_min — ${item.slice(0,40)}`);
    }
  });

  // dateNum collision check
  const dnOwners = {};
  rows.forEach(r => {
    const wk = r.week;
    const dayUpper = String(r.day || '').trim().toUpperCase();
    if (DAYS.includes(dayUpper) && wk) {
      const di = DAYS.indexOf(dayUpper);
      const key = `${wk},${di}`;
      if (DATE_MAP[key]) {
        const dn = DATE_MAP[key][1];
        if (!dnOwners[dn]) dnOwners[dn] = new Set();
        dnOwners[dn].add(wk);
      }
    }
  });
  for (const [dn, wks] of Object.entries(dnOwners)) {
    if (wks.size > 1) {
      errors.push(`dateNum COLLISION: dateNum=${dn} used by weeks ${[...wks].sort()} — MEALS keys will overwrite`);
    }
  }

  const sendCount = rows.filter(r => r.period === 'SEND AM' || r.period === 'SEND PM').length;
  const sendNoHe  = rows.filter(r =>
    (r.period === 'SEND AM' || r.period === 'SEND PM') &&
    (r.hotel_equiv === null || r.hotel_equiv === undefined || r.hotel_equiv === '')
  ).length;
  const coldChain = rows.filter(r => (r.hold_days || 0) > 0).length;

  return {
    warnings, errors,
    stats: { total_rows: rows.length, send_rows: sendCount,
             send_missing_hotel_equiv: sendNoHe, cold_chain_items: coldChain }
  };
}

// ── Hub Data Generators ─────────────────────────────────────────────────────

function buildServes(row, wk, dayIdx) {
  const period = row.period || '';
  const raw    = String(row.prod_date_raw || '');
  if (['SEND AM','SEND PM','LUNCH','DINNER'].includes(period)) return null;

  if (raw.startsWith('Serves:'))   return '→ ' + raw.replace('Serves:','').trim();
  if (raw.startsWith('Produced:')) {
    const txt = raw.replace('Produced:','').trim();
    if (txt.toLowerCase().includes('same day')) return null;
    if (txt.toLowerCase().includes('prev. cycle') || txt.toLowerCase().includes('prev cycle'))
      return '→ Prev. cycle';
    return '→ ' + txt;
  }
  return null;
}

function buildRoute(row) {
  const pats = ['Bloor → Rex','LAN → Rex','GC → Rex','Rex → Bloor','Vendor → Rex'];
  for (const src of [row.notes || '', row.item || '']) {
    const s = String(src);
    for (const pat of pats) { if (s.includes(pat)) return pat; }
    const m = s.match(/((?:Bloor|LAN|GC|Rex|Vendor)\s*→\s*(?:Bloor|LAN|GC|Rex))/);
    if (m) return m[1];
  }
  return 'Bloor → Rex';
}

function buildFlag(row) {
  const combined = (String(row.notes || '') + String(row.item || '')).toLowerCase();
  if (combined.includes('⚠') || combined.includes('no recipe')) return 'warn';
  return null;
}

function sCall(row, wk, dayIdx) {
  const typ   = jsStr(row.type);
  const item  = jsStr(row.item);
  const qty   = jsStr(row.qty || '');
  const site  = jsStr(row.site || '');
  const notes = String(row.notes || '');
  const cook  = String(row.cook_min || '');
  const period = row.period || '';

  const opts = {};
  if (cook) opts.time = cook === '480' ? 'Overnight' : `${cook} min`;

  if (period === 'SEND AM' || period === 'SEND PM') {
    opts.route = buildRoute(row);
    if (notes && notes !== opts.route) opts.notes = notes;
  } else {
    if (notes) opts.notes = notes;
  }

  const serves = buildServes(row, wk, dayIdx);
  if (serves) opts.serves = serves;
  const flag = buildFlag(row);
  if (flag) opts.flag = flag;

  const optsStr = Object.entries(opts).map(([k,v]) => `${k}:'${jsStr(v)}'`).join(',');
  if (optsStr) return `S('${typ}','${item}','${qty}','${site}',{${optsStr}})`;
  return `S('${typ}','${item}','${qty}','${site}')`;
}

function vanLoadSum(sectionRows) {
  let total = 0, hasData = false;
  for (const r of sectionRows) {
    const v = parseFloat(r.hotel_equiv || 0);
    if (v > 0) { total += v; hasData = true; }
  }
  if (!hasData) return `~${sectionRows.length} items`;
  const fmt = total === Math.floor(total) ? Math.floor(total) : total;
  return `${fmt} HOTELS (hot)`;
}

function buildWkData(rows, wk) {
  // Organise by day → section
  const byDay = {};
  rows.filter(r => r.week === wk).forEach(r => {
    const dayUpper = String(r.day || '').trim().toUpperCase();
    if (!DAYS.includes(dayUpper)) return;
    if (!byDay[dayUpper]) byDay[dayUpper] = {};
    if (!byDay[dayUpper][r.period]) byDay[dayUpper][r.period] = [];
    byDay[dayUpper][r.period].push(r);
  });

  const dayObjects = [];
  DAYS.forEach((dayUpper, dayIdx) => {
    const key = `${wk},${dayIdx}`;
    const [dateStr, dateNum] = DATE_MAP[key];
    const dayName = DAY_NAMES[dayIdx];
    const dayData = byDay[dayUpper] || {};

    const sectionsJs = [];
    for (const period of SECTION_ORDER) {
      const secRows = dayData[period] || [];
      if (!secRows.length) continue;
      const sid   = SECTION_IDS[period];
      const label = SECTION_LABELS[sid];
      const itemsJs = secRows.map(r => sCall(r, wk, dayIdx)).join(',\n');

      if (period === 'SEND AM' || period === 'SEND PM') {
        const vl = vanLoadSum(secRows);
        sectionsJs.push(`{id:'${sid}',label:'${label}',vanLoad:'${jsStr(vl)}',items:[${itemsJs}]}`);
      } else {
        sectionsJs.push(`{id:'${sid}',label:'${label}',items:[${itemsJs}]}`);
      }
    }
    dayObjects.push(
      `{dayName:'${dayName}',date:'${dateStr}',dateNum:${dateNum},` +
      `sections:[${sectionsJs.join(',\n')}]}`
    );
  });

  return `const WK${wk}=[${dayObjects.join(',\n')}];`;
}

function buildMeals(rows) {
  const meals = {};
  // Initialise all dateNums
  for (const r of rows) {
    const wk = r.week;
    const dayUpper = String(r.day || '').trim().toUpperCase();
    if (!DAYS.includes(dayUpper) || !wk) continue;
    const di = DAYS.indexOf(dayUpper);
    const key = `${wk},${di}`;
    if (!DATE_MAP[key]) continue;
    const dn = DATE_MAP[key][1];
    if (!meals[dn]) meals[dn] = { lunch: '', dinner: '' };
  }

  // Extract meal names per dateNum + period
  function extractMealName(items) {
    const names = [];
    for (const r of items) {
      let name = (r.item || '');
      name = name.replace(/\s*\(.*?\)/g, '');
      name = name.replace(/\s*→.*$/, '');
      name = name.replace(/^(Cook|Heat|Reheat|Steam|Roast|Bake)\s+/i, '');
      name = name.trim();
      if (name && !names.includes(name)) names.push(name);
    }
    return names.slice(0, 4).join(', ');
  }

  const byDatePeriod = {};
  rows.filter(r => r.period === 'LUNCH' || r.period === 'DINNER').forEach(r => {
    const wk = r.week;
    const dayUpper = String(r.day || '').trim().toUpperCase();
    if (!DAYS.includes(dayUpper) || !wk) return;
    const di = DAYS.indexOf(dayUpper);
    const key = `${wk},${di}`;
    if (!DATE_MAP[key]) return;
    const dn = DATE_MAP[key][1];
    const pk = `${dn},${r.period}`;
    if (!byDatePeriod[pk]) byDatePeriod[pk] = [];
    byDatePeriod[pk].push(r);
  });

  for (const [pk, items] of Object.entries(byDatePeriod)) {
    const [dnStr, period] = pk.split(',');
    const dn = parseInt(dnStr, 10);
    if (!meals[dn]) meals[dn] = { lunch: '', dinner: '' };
    meals[dn][period === 'LUNCH' ? 'lunch' : 'dinner'] = extractMealName(items);
  }

  // Sort by calendar order
  const dateOrder = [];
  for (let wk = 1; wk <= 4; wk++)
    for (let di = 0; di < 7; di++) dateOrder.push(DATE_MAP[`${wk},${di}`][1]);

  const sorted = Object.entries(meals).sort((a, b) => {
    const ai = dateOrder.indexOf(parseInt(a[0]));
    const bi = dateOrder.indexOf(parseInt(b[0]));
    return ai - bi;
  });

  const parts = sorted.map(([dn, m]) =>
    `${dn}:{lunch:'${jsStr(m.lunch)}',dinner:'${jsStr(m.dinner)}'}`
  );
  return 'const MEALS={' + parts.join(',\n') + '};';
}

// ── MOVES ───────────────────────────────────────────────────────────────────

function parseQtyStr(row) {
  const y = String(row.yield || '').trim();
  if (y) {
    if (y.includes('/') && !y.toLowerCase().includes('hotel')) return y.split('/')[0].trim();
    return y;
  }
  const q = String(row.qty || '').trim();
  return q || '?';
}

function holdClass(hold) {
  if (hold <= 2) return 'g';
  if (hold <= 6) return 'y';
  return 'r';
}

function absDay(wk, dayUpper) {
  if (!DAYS.includes(dayUpper)) return null;
  return (wk - 1) * 7 + DAYS.indexOf(dayUpper);
}

function datenumFromAbs(ad) {
  if (ad < 0 || ad > 27) return null;
  const wk = Math.floor(ad / 7) + 1;
  const di = ad % 7;
  const key = `${wk},${di}`;
  if (!DATE_MAP[key]) return null;
  return { wk, di, dn: DATE_MAP[key][1] };
}

function buildMoves(rows) {
  const moves = {}; // dateNum → [entries]

  const coldItems = rows.filter(r =>
    r.dest_fridge === 'Rex' && (r.hold_days || 0) > 0 && r.type === 'COOK'
  );

  for (const r of coldItems) {
    const wk = r.week;
    const dayUpper = String(r.day || '').trim().toUpperCase();
    const hold = r.hold_days;
    const item = r.item;
    const qty  = parseQtyStr(r);
    const hc   = holdClass(hold);
    const servesWk  = safeInt(r.serves_week);
    const servesDay = String(r.serves_day || '').trim().toUpperCase();

    const prodAbs = absDay(wk, dayUpper);
    if (prodAbs === null) continue;

    // Clean display name
    let display = item.replace(/\s*\(.*?\)/g, '').trim();
    display = display.replace(/^(Cook|Heat|Reheat|Steam|Roast|Bake)\s+/i, '').trim();

    // SEND: day after production, PM van
    const sendAbs = prodAbs + 1;
    const sendInfo = datenumFromAbs(sendAbs);
    if (sendInfo) {
      const servesStr = buildServes(r, wk, DAYS.indexOf(dayUpper));
      if (!moves[sendInfo.dn]) moves[sendInfo.dn] = [];
      moves[sendInfo.dn].push({
        dir: 'SEND', item: display, from: 'Bloor', to: 'Rex',
        qty, run: 'PM', hold: `${hold}d`, holdClass: hc,
        notes: 'Hold at Rex until pull',
        serves: servesStr || '',
      });
    }

    // PULL: day before service, AM van
    if (servesWk && DAYS.includes(servesDay)) {
      const serveAbs = absDay(servesWk, servesDay);
      if (serveAbs !== null) {
        const pullAbs  = serveAbs - 1;
        const pullInfo = datenumFromAbs(pullAbs);
        if (pullInfo) {
          const prodDayName = DAY_NAMES[DAYS.indexOf(dayUpper)];
          if (!moves[pullInfo.dn]) moves[pullInfo.dn] = [];
          moves[pullInfo.dn].push({
            dir: 'PULL', item: display, from: 'Rex',
            to: 'Bloor (reheat → Rex hot)',
            qty, run: 'AM', hold: `${hold}d`, holdClass: hc,
            notes: 'For service',
            produced: `Wk. ${wk} ${prodDayName}`,
          });
        }
      }
    }
  }

  // Sort by calendar order, build JS
  const dateOrder = [];
  for (let wk = 1; wk <= 4; wk++)
    for (let di = 0; di < 7; di++) dateOrder.push(DATE_MAP[`${wk},${di}`][1]);

  const parts = [];
  for (const dn of dateOrder) {
    if (!moves[dn]) continue;
    const entryStrs = moves[dn].map(m => {
      const fields = [
        `dir:'${m.dir}'`, `item:'${jsStr(m.item)}'`,
        `from:'${m.from}'`, `to:'${jsStr(m.to)}'`,
        `qty:'${jsStr(m.qty)}'`, `run:'${m.run}'`,
        `hold:'${m.hold}'`, `holdClass:'${m.holdClass}'`,
        `notes:'${jsStr(m.notes)}'`,
      ];
      if (m.serves) fields.push(`serves:'${jsStr(m.serves)}'`);
      if (m.produced) fields.push(`produced:'${jsStr(m.produced)}'`);
      return '{' + fields.join(',') + '}';
    });
    parts.push(`${dn}:[${entryStrs.join(',')}]`);
  }
  return 'const MOVES={' + parts.join(',\n') + '};';
}

function buildWeeksObj() {
  const parts = [];
  for (let wk = 1; wk <= 4; wk++) {
    parts.push(
      `${wk}:{number:${wk},range:'${WEEK_RANGES[wk]}',` +
      `note:'${jsStr(WEEK_NOTE)}',days:[...WK${wk}]}`
    );
  }
  return 'const WEEKS={' + parts.join(',\n') + '};';
}

// ── Static Fallback ─────────────────────────────────────────────────────────

function buildStaticFallback(rows) {
  const TYPE_COLORS = {
    'SEND AM':['#c00','#fff'], 'SEND PM':['#c55a11','#fff'],
    'COOK':['#375623','#fff'], 'HEAT':['#7f6000','#fff'],
    'PREP':['#1f3864','#fff'], 'SOUP':['#375623','#fff'],
  };
  const SITE_COLORS = { Bloor:'#b4c6e7', LAN:'#fff2cc', GC:'#d9d9d9', Rex:'#c5d9a4' };
  const SEC_COLORS  = { 'send-am':'#c00', lunch:'#1f3864', production:'#f2f2f2',
                         dinner:'#375623', 'send-pm':'#c55a11' };
  const SEC_TEXT    = { 'send-am':'#fff', lunch:'#fff', production:'#555',
                         dinner:'#fff', 'send-pm':'#fff' };

  // Group by (wk, day) → period → rows
  const byDay = {};
  for (const r of rows) {
    const wk  = r.week;
    const day = String(r.day || '').trim().toUpperCase();
    if (!DAYS.includes(day)) continue;
    const dk = `${wk},${day}`;
    if (!byDay[dk]) byDay[dk] = {};
    if (!byDay[dk][r.period]) byDay[dk][r.period] = [];
    byDay[dk][r.period].push(r);
  }

  const h = ['<div id="sf">'];

  // Mobile banner
  h.push(`<div id="sf-mob" style="position:sticky;top:0;z-index:100;background:#2e75b6;` +
    `color:#fff;padding:10px 16px;font-size:13px;font-family:sans-serif;text-align:center">` +
    `📱 For the full interactive version: click <b>Open → Open in app</b><br>` +
    `<span style="font-size:11px;opacity:.8">Click 'Trust it' when prompted — the file is from your shared Kitchen folder</span></div>`);

  // Title
  h.push(`<div style="text-align:center;padding:20px 10px 10px;font-family:sans-serif">` +
    `<div style="font-size:20px;font-weight:700">CONC Kitchen — Production Hub</div>` +
    `<div style="font-size:12px;color:#666;margin-top:4px">May 17 – Jun 13, 2026 · Remediation</div></div>`);

  // Week jump links
  const jumps = [1,2,3,4].map(w =>
    `<a href="#sf-wk${w}" style="background:#2c2a26;color:#fff;padding:8px 16px;` +
    `border-radius:8px;text-decoration:none;font-size:13px;font-family:sans-serif">Wk ${w}</a>`
  ).join(' ');
  h.push(`<div style="display:flex;gap:8px;justify-content:center;padding:8px 0">${jumps}</div>`);

  for (let wk = 1; wk <= 4; wk++) {
    h.push(`<div id="sf-wk${wk}" style="background:#2c2a26;color:#fff;font-family:sans-serif;` +
      `font-size:15px;font-weight:700;padding:10px 16px;margin-top:16px;` +
      `scroll-margin-top:60px">Week ${wk} — ${WEEK_RANGES[wk]}</div>`);

    DAYS.forEach((dayUpper, dayIdx) => {
      const dmKey = `${wk},${dayIdx}`;
      const [dateStr, dateNum] = DATE_MAP[dmKey];
      const dayName = DAY_NAMES[dayIdx];
      const dayRows = byDay[`${wk},${dayUpper}`] || {};
      const hasRows = SECTION_ORDER.some(p => (dayRows[p] || []).length > 0);
      if (!hasRows) return;

      // Count summary
      const counts = [];
      for (const [period, label] of [['LUNCH','Lunch'],['SEND AM','AM'],
           ['PRODUCTION','Prod'],['DINNER','Dinner'],['SEND PM','PM']]) {
        const c = (dayRows[period] || []).length;
        if (c) counts.push(`${label}:${c}`);
      }
      const summary = counts.join(' · ') + ' ▸';

      h.push(`<details style="margin:2px 0;font-family:sans-serif">` +
        `<summary style="background:#2c2a26;color:#fff;padding:7px 12px;` +
        `font-size:13px;cursor:pointer;display:flex;justify-content:space-between">` +
        `<span style="font-weight:700">${dayName} ${dateStr}</span>` +
        `<span style="font-size:11px;opacity:.7">${summary}</span></summary>`);

      for (const period of SECTION_ORDER) {
        const secRows = dayRows[period] || [];
        if (!secRows.length) continue;
        const sid   = SECTION_IDS[period];
        const label = SECTION_LABELS[sid];
        const bg    = SEC_COLORS[sid] || '#eee';
        const fg    = SEC_TEXT[sid] || '#000';

        h.push(`<div style="background:${bg};color:${fg};padding:5px 9px;` +
          `font-size:10px;text-transform:uppercase;font-weight:700;` +
          `border-radius:5px;margin:2px 0">${label}</div>`);

        for (const r of secRows) {
          const typ  = r.type || '';
          const item = r.item || '';
          const rQty = String(r.qty || '');
          const rSite = r.site || '';
          const cook = String(r.cook_min || '');
          const [tc, tf] = TYPE_COLORS[typ] || ['#888','#fff'];
          const sc = SITE_COLORS[rSite] || '#eee';
          const timeStr = cook === '480' ? 'Overnight' : (cook ? `${cook} min` : '');
          const detail = [rQty, timeStr].filter(Boolean).join(' · ');
          const serves = buildServes(r, wk, dayIdx);
          const servesSpan = serves
            ? `<span style="background:#fff3cd;color:#856404;border-radius:3px;padding:1px 4px;font-size:9px;margin-left:4px">${serves}</span>`
            : '';

          h.push(`<div style="font-size:12px;line-height:1.6;border-left:3px solid #e8e4dd;` +
            `padding:4px 8px;margin:1px 0">` +
            `<span style="background:${tc};color:${tf};font-size:8px;text-transform:uppercase;` +
            `padding:1px 4px;border-radius:3px;margin-right:4px">${typ}</span>` +
            `<b>${item}</b>` +
            `<span style="background:${sc};font-size:9px;padding:1px 4px;` +
            `border-radius:3px;margin-left:4px">${rSite}</span>` +
            servesSpan +
            (detail ? `<div style="font-size:10px;color:#666;font-family:monospace">${detail}</div>` : '') +
            `</div>`);
        }
      }
      h.push('</details>');
    });
  }
  h.push('</div>');
  return h.join('\n');
}

// ── FRIDGE Extraction ───────────────────────────────────────────────────────

function extractFridge(hubHtml) {
  const marker = 'const FRIDGE=';
  const start  = hubHtml.indexOf(marker);
  if (start === -1) return null;

  let i = hubHtml.indexOf('{', start);
  if (i === -1) return null;

  let depth = 0;
  while (i < hubHtml.length) {
    if (hubHtml[i] === '{') depth++;
    else if (hubHtml[i] === '}') {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        if (end < hubHtml.length && hubHtml[end] === ';') end++;
        return hubHtml.slice(start, end);
      }
    }
    i++;
  }
  return null;
}

// Analyse FRIDGE block for summary info
function fridgeSummary(fridgeBlock) {
  if (!fridgeBlock || fridgeBlock === 'const FRIDGE={};') return { days: 0, entries: 0 };
  const dayMatches = fridgeBlock.match(/\d+:\{/g);
  const days = dayMatches ? dayMatches.length : 0;
  const itemMatches = fridgeBlock.match(/n:'/g);
  const entries = itemMatches ? itemMatches.length : 0;
  return { days, entries };
}

// ── Hub Assembly ────────────────────────────────────────────────────────────

function assembleHub(rows, fridgeBlock) {
  const shellHtml = TPL_SHELL;
  const rcpBlock  = TPL_RCP;
  const logicJs   = TPL_LOGIC;

  const sHelper    = "function S(type,item,qty,site,opts={}){return{type,item,qty,site,...opts}}";
  const movesBlock = buildMoves(rows);
  const mealsBlock = buildMeals(rows);
  const wkBlocks   = [1,2,3,4].map(wk => buildWkData(rows, wk));
  const weeksBlock = buildWeeksObj();
  const staticFb   = buildStaticFallback(rows);

  if (!fridgeBlock) fridgeBlock = 'const FRIDGE={};';

  const dataBlock = [sHelper, fridgeBlock, movesBlock, mealsBlock, ...wkBlocks, weeksBlock, rcpBlock].join('\n');

  const out =
    shellHtml +
    '\n\n' +
    staticFb +
    "\n<script>\ndocument.body.classList.add('js-ready');\n" +
    dataBlock +
    '\n' + logicJs +
    '\n</script>\n</body>\n</html>\n';

  return out;
}

// ── JS Validation ───────────────────────────────────────────────────────────

function validateJs(hubHtml) {
  const results = { ok: true, errors: [] };

  // Extract script block
  const scriptStart = hubHtml.indexOf('<script>');
  const scriptEnd   = hubHtml.lastIndexOf('</script>');
  if (scriptStart === -1 || scriptEnd === -1) {
    results.ok = false;
    results.errors.push('Could not find <script> block');
    return results;
  }
  const jsOnly = hubHtml.slice(scriptStart + 8, scriptEnd);

  // Check duplicate const declarations
  const constChecks = ['const FRIDGE=','const MOVES=','const MEALS=',
    'const WK1=','const WK2=','const WK3=','const WK4=',
    'const WEEKS=','const RCP=','const RCP_KEYS=',
    'function rcpUrl','function S('];

  for (const pat of constChecks) {
    const count = hubHtml.split(pat).length - 1;
    if (count !== 1) {
      results.ok = false;
      results.errors.push(`'${pat}' appears ${count}x (expected 1)`);
    }
  }

  // Syntax check via new Function()
  try {
    new Function(jsOnly);
  } catch (e) {
    results.ok = false;
    results.errors.push(`JS syntax error: ${e.message}`);
  }

  return results;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
//  UI CONTROLLER
// ╚══════════════════════════════════════════════════════════════════════════╝

let sourceFile    = null;
let hubFile       = null;
let sourceRows    = null;
let fridgeBlock   = null;
let assembledHtml = null;

const $ = id => document.getElementById(id);

// ── Upload handlers ─────────────────────────────────────────────────────────

function setupDrop(dropId, inputId, fileNameId, onFile) {
  const drop  = $(dropId);
  const input = $(inputId);

  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.add('over');
  }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.remove('over');
  }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) onFile(input.files[0]);
  });
}

function onSourceFile(file) {
  sourceFile = file;
  const el = $('srcFileName');
  el.textContent = `✓ ${file.name} (${(file.size/1024).toFixed(0)} KB)`;
  el.classList.remove('hidden');
  $('dropSource').classList.add('loaded');
  $('btnBuild').disabled = !sheetjsReady();
  if (!sheetjsReady()) updateSheetjsStatus();
  resetOutput();
}

function onHubFile(file) {
  hubFile = file;
  const el = $('hubFileName');
  el.textContent = `✓ ${file.name} (${(file.size/1024).toFixed(0)} KB)`;
  el.classList.remove('hidden');
  $('dropHub').classList.add('loaded');
  resetOutput();

  // Read and extract FRIDGE immediately for preview
  file.text().then(html => {
    fridgeBlock = extractFridge(html);
    const info = $('fridgeInfo');
    info.classList.remove('hidden');
    if (fridgeBlock) {
      const s = fridgeSummary(fridgeBlock);
      info.className = 'fridge-info has-data';
      info.textContent = `FRIDGE: ${s.days} days, ~${s.entries} entries`;
    } else {
      info.className = 'fridge-info empty';
      info.textContent = 'No FRIDGE block found — will use empty';
      fridgeBlock = null;
    }
  });
}

function resetOutput() {
  assembledHtml = null;
  $('btnDownload').classList.add('hidden');
  $('outputCard').classList.add('hidden');
  $('logPanel').classList.add('hidden');
  $('statsBar').classList.add('hidden');
}

// ── Build ───────────────────────────────────────────────────────────────────

async function doBuild() {
  // Guard: SheetJS must be loaded
  if (!sheetjsReady()) {
    updateSheetjsStatus();
    addLog('err', 'Build failed: SheetJS library not loaded. See instructions above to load it manually.');
    $('logPanel').classList.remove('hidden');
    return;
  }

  const btn  = $('btnBuild');
  const prog = $('progress');
  const log  = $('logPanel');

  btn.disabled = true;
  prog.classList.remove('hidden');
  prog.textContent = 'Loading source table…';
  log.innerHTML = '';
  log.classList.remove('hidden');
  $('statsBar').classList.add('hidden');
  $('outputCard').classList.add('hidden');
  $('btnDownload').classList.add('hidden');

  await tick();

  try {
    // Step 1: Load source
    sourceRows = await loadSource(sourceFile);
    addLog('info', `Loaded ${sourceRows.length} rows from ${sourceFile.name}`);

    // Check basic structure
    if (!sourceRows.length) throw new Error('Source table is empty — no data rows found');
    const sampleRow = sourceRows[0];
    const requiredCols = ['week','day','period','type','item','site'];
    const missing = requiredCols.filter(c => !(c in sampleRow));
    if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}. Check that headers are in row 1.`);

    await tick();
    prog.textContent = 'Validating…';

    // Step 2: Validate
    const { warnings, errors, stats } = validateSource(sourceRows);

    // Show stats
    $('statRows').textContent = stats.total_rows;
    $('statSend').textContent = stats.send_rows;
    $('statCold').textContent = stats.cold_chain_items;
    $('statsBar').classList.remove('hidden');

    if (errors.length) {
      addLog('section', 'Errors');
      errors.forEach(e => addLog('err', e));
    }
    if (warnings.length) {
      addLog('section', `Warnings (${warnings.length})`);
      warnings.forEach(w => addLog('warn', w));
    }
    if (!errors.length && !warnings.length) {
      addLog('ok', 'All validation checks passed');
    }
    if (errors.length) {
      addLog('err', `Build blocked — ${errors.length} error(s) must be fixed`);
      btn.disabled = false;
      prog.classList.add('hidden');
      return;
    }

    await tick();
    prog.textContent = 'Building hub…';

    // Step 3: Assemble
    assembledHtml = assembleHub(sourceRows, fridgeBlock);

    // Count MOVES and MEALS for stats
    const moveSends = (assembledHtml.match(/dir:'SEND'/g) || []).length;
    const movePulls = (assembledHtml.match(/dir:'PULL'/g) || []).length;
    $('statMoves').textContent = `${moveSends}S + ${movePulls}P`;
    const mealsCount = (assembledHtml.match(/lunch:'/g) || []).length;
    $('statMeals').textContent = mealsCount;

    addLog('section', 'Assembly');
    addLog('ok', `Hub assembled: ${(assembledHtml.length / 1024).toFixed(0)} KB`);
    addLog('info', `MOVES: ${moveSends} SENDs + ${movePulls} PULLs`);
    addLog('info', `MEALS: ${mealsCount} day entries`);

    if (!fridgeBlock) {
      addLog('warn', 'FRIDGE: empty (no template hub uploaded)');
    } else {
      const s = fridgeSummary(fridgeBlock);
      addLog('ok', `FRIDGE: carried forward (${s.days} days, ~${s.entries} entries)`);
    }

    await tick();
    prog.textContent = 'Validating JS…';

    // Step 4: JS validation
    const jsResult = validateJs(assembledHtml);
    addLog('section', 'JS Validation');
    if (jsResult.ok) {
      addLog('ok', 'All const declarations unique · Syntax check passed');
    } else {
      jsResult.errors.forEach(e => addLog('err', e));
    }

    // Step 5: Show output
    const outCard = $('outputCard');
    outCard.classList.remove('hidden');
    const outStats = $('outputStats');
    outStats.innerHTML =
      `<span>Size: <span class="stat-val">${(assembledHtml.length / 1024).toFixed(0)} KB</span></span>` +
      `<span>Static fallback: <span class="stat-val">included</span></span>` +
      `<span>JS valid: <span class="stat-val">${jsResult.ok ? '✓' : '✗'}</span></span>`;

    // Enable download (even with JS warnings — they may be non-fatal)
    $('btnDownload').classList.remove('hidden');

    prog.classList.add('hidden');

  } catch (err) {
    addLog('err', `Build failed: ${err.message}`);
    prog.classList.add('hidden');
  }

  btn.disabled = false;
}

function addLog(type, msg) {
  const log = $('logPanel');
  const div = document.createElement('div');
  if (type === 'section') {
    div.className = 'log-section';
  } else {
    div.className = `log-line log-${type}`;
    const prefix = type === 'ok' ? '✓ ' : type === 'warn' ? '⚠ ' : type === 'err' ? '✗ ' : '  ';
    msg = prefix + msg;
  }
  div.textContent = msg;
  log.appendChild(div);
}

function doDownload() {
  if (!assembledHtml) return;
  const blob = new Blob([assembledHtml], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'CONC_Production_Hub.html';
  a.click();
  URL.revokeObjectURL(url);
}

function tick() { return new Promise(r => setTimeout(r, 10)); }

// ── Init ────────────────────────────────────────────────────────────────────

// ── SheetJS detection & fallback ────────────────────────────────────────────

function sheetjsReady() {
  return typeof XLSX !== 'undefined' && XLSX.read && XLSX.utils;
}

function updateSheetjsStatus() {
  const card = $('sheetjsCard');
  const status = $('sheetjsStatus');
  const icon = $('sheetjsIcon');
  const msg = $('sheetjsMsg');
  const fix = $('sheetjsFix');

  if (sheetjsReady()) {
    status.className = 'sheetjs-status ok';
    icon.textContent = '✓';
    msg.textContent = 'SheetJS loaded — ready to build';
    card.classList.add('ok');
    fix.classList.add('hidden');
  } else {
    status.className = 'sheetjs-status fail';
    icon.textContent = '✗';
    msg.textContent = 'SheetJS not loaded — CDN may be blocked';
    fix.classList.remove('hidden');
  }
}

function loadSheetjsManual(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const script = document.createElement('script');
      script.textContent = reader.result;
      document.head.appendChild(script);
      if (sheetjsReady()) {
        updateSheetjsStatus();
        // Re-enable build button if source already loaded
        if (sourceFile) $('btnBuild').disabled = false;
      } else {
        $('sheetjsMsg').textContent = 'File loaded but XLSX not detected — wrong file?';
      }
    } catch (e) {
      $('sheetjsMsg').textContent = 'Error loading: ' + e.message;
    }
  };
  reader.readAsText(file);
}

// Setup SheetJS manual drop zone
(function setupSheetjsDrop() {
  const drop = $('dropSheetjs');
  const input = $('sheetjsInput');
  if (!drop || !input) return;

  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.add('over');
  }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); drop.classList.remove('over');
  }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0];
    if (f) loadSheetjsManual(f);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) loadSheetjsManual(input.files[0]);
  });
})();

// Check after a delay (CDN may still be loading)
setTimeout(updateSheetjsStatus, 1500);
// Also check immediately in case it loaded fast
if (document.readyState === 'complete') updateSheetjsStatus();
else window.addEventListener('load', () => setTimeout(updateSheetjsStatus, 200));

// ── Main setup ──────────────────────────────────────────────────────────────

setupDrop('dropSource', 'srcInput', 'srcFileName', onSourceFile);
setupDrop('dropHub', 'hubInput', 'hubFileName', onHubFile);
$('btnBuild').addEventListener('click', doBuild);
$('btnDownload').addEventListener('click', doDownload);
