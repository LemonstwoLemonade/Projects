// Weekly scorecard: grades the SAME engine.js the page runs, over the last 30 days, using archived forecasts.
//   1. Offshore waves vs NOAA buoys (forecasts made 1-3 days ahead)
//   2. Wind type at the beach (offshore / side / onshore / glassy) vs coastal weather stations
//   3. Surf height vs the NWS same-day surf forecast (IEM archive), days 0-2 ahead, by wave size
// Writes validation.json, which the page displays. Run: node validate.js
const E = require('./engine.js'); const fs = require('fs');
const UA = {'User-Agent': 'FLSurfWatch validation'};
const DAYS = 30, FT = 3.28084, NOW = Date.now(), START = NOW - DAYS * 864e5;
const get = async (u, tries = 3) => { for (let i = 0; i < tries; i++) { try { const r = await fetch(u, {headers: UA}); if (r.ok) return r; throw new Error(r.status + ' ' + u); } catch (e) { if (i === tries - 1) throw e; await new Promise(r => setTimeout(r, 4000 * (i + 1))); } } };
const J = async u => (await get(u)).json(), T = async u => (await get(u)).text();
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const r2 = x => x == null ? null : Math.round(x * 100) / 100;
const angd = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };

const WAVE_BUOYS = {'41112': ['Fernandina Beach', 'Atlantic', [30.709, -81.292]], '41117': ['St. Augustine', 'Atlantic', [29.999, -81.079]], '41113': ['Cape Canaveral', 'Atlantic', [28.4, -80.533]],
  '41114': ['Fort Pierce', 'Atlantic', [27.564, -80.215]], '41122': ['Hollywood Beach', 'Atlantic', [26.001, -80.096]], '42036': ['West Tampa', 'Gulf', [28.5, -84.505]], '42098': ['Tampa Bay entrance', 'Gulf', [27.59, -82.931]]};
const WIND_STNS = {FRDF1: ['fernandina', [30.675, -81.465]], MYPF1: ['jaxbeach', [30.398, -81.428]], SAUF1: ['staug', [29.857, -81.264]], TRDF1: ['cocoa', [28.416, -80.593]], LKWF1: ['lakeworth', [26.613, -80.034]],
  VAKF1: ['miami', [25.731, -80.162]], PCBF1: ['pcb', [30.213, -85.88]], CWBF1: ['stpete', [27.978, -82.832]], '42012': ['pensacola', [30.061, -87.547]], '42039': ['destin', [28.768, -86.024]]};

async function ndbc(id) {  // hourly observations (m/s, m, deg)
  const out = {};
  for (const line of (await T(`https://www.ndbc.noaa.gov/data/realtime2/${id}.txt`)).split('\n').slice(2)) {
    const p = line.trim().split(/\s+/); if (p.length < 15) continue;
    let t = Date.UTC(+p[0], +p[1] - 1, +p[2], +p[3], +p[4]); t = Math.round(t / 36e5) * 36e5; if (t < START) break;
    const n = v => (v === 'MM' ? null : +v), row = {wdir: n(p[5]), wspd: n(p[6]), wvht: n(p[8])};
    out[t] = out[t] || row; for (const k in row) if (out[t][k] == null) out[t][k] = row[k];
  }
  return out;
}
const pct = x => Math.round(x * 1000) / 10;

async function waves() {
  const res = {Atlantic: {1: [], 2: [], 3: []}, Gulf: {1: [], 2: [], 3: []}};
  for (const [id, [, coast, [lat, lon]]] of Object.entries(WAVE_BUOYS)) {
    let ob; try { ob = await ndbc(id); } catch (e) { continue; }
    const models = E.WAVE_MODELS[coast], vars = [];
    for (const v of ['wave_height', 'wave_period', 'wave_direction']) for (const d of [1, 2, 3]) vars.push(`${v}_previous_day${d}`);
    const h = (await J(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=${vars}&past_days=${DAYS}&forecast_days=1&timezone=GMT&models=${models}`)).hourly;
    const col = (v, m) => h[`${v}_${m}`] !== undefined ? h[`${v}_${m}`] : h[v];
    h.time.forEach((t, i) => {
      const ms = Date.parse(t + 'Z'), o = ob[ms]; if (!o || o.wvht == null) return;
      for (const d of [1, 2, 3]) {
        const w = E.blendWaves(models.map(m => ({H: col(`wave_height_previous_day${d}`, m)[i], T: col(`wave_period_previous_day${d}`, m)[i], D: col(`wave_direction_previous_day${d}`, m)[i]})));
        if (w) res[coast][d].push((w.H - o.wvht) * FT);
      }
    });
  }
  const out = {};
  for (const c in res) { out[c] = {}; for (const d in res[c]) { const e = res[c][d]; if (e.length) out[c][d] = {n: e.length, mae: r2(mean(e.map(Math.abs))), bias: r2(mean(e)), within1ft: pct(mean(e.map(x => Math.abs(x) <= 1 ? 1 : 0)))}; } }
  return out;
}

async function wind() {
  const res = {0: [], 1: [], 2: []};
  for (const [id, [sid, [lat, lon]]] of Object.entries(WIND_STNS)) {
    const spot = E.SPOTS.find(s => s.id === sid); let ob; try { ob = await ndbc(id); } catch (e) { continue; }
    const vars = []; for (const v of ['wind_speed_10m', 'wind_direction_10m']) for (const d of ['', '_previous_day1', '_previous_day2']) vars.push(v + d);
    const h = (await J(`https://previous-runs-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${vars}&past_days=${DAYS}&forecast_days=1&wind_speed_unit=mph&timezone=GMT&models=${E.WIND_MODELS}`)).hourly;
    const cls = (mph, dir) => mph < 5 ? 'glassy' : E.windType ? E.windType(dir, spot) : null;
    h.time.forEach((t, i) => {
      const ms = Date.parse(t + 'Z'), o = ob[ms]; if (!o || o.wspd == null || o.wdir == null) return;
      [['', 0], ['_previous_day1', 1], ['_previous_day2', 2]].forEach(([sfx, d]) => {
        const w = E.blendWind(E.WIND_MODELS.map(m => ({m, s: (h[`wind_speed_10m${sfx}_${m}`] || [])[i], d: (h[`wind_direction_10m${sfx}_${m}`] || [])[i]})), d === 0 ? E.WIND_W.today : E.WIND_W.later);
        if (!w) return;
        res[d].push({agree: cls(w.mph, w.dir) === cls(o.wspd * 2.23694, o.wdir) ? 1 : 0, spd: Math.abs(w.mph - o.wspd * 2.23694), dir: o.wspd >= 2 ? angd(w.dir, o.wdir) : null});
      });
    });
  }
  const out = {};
  for (const d in res) { const r = res[d]; if (r.length) out[d] = {n: r.length, windTypeRight: pct(mean(r.map(x => x.agree))), speedMissMph: r2(mean(r.map(x => x.spd))), directionMissDeg: Math.round(mean(r.filter(x => x.dir != null).map(x => x.dir)))}; }
  return out;
}

// NWS surf zone forecast archive -> same-day "best estimate" (latest issued before 1 PM local)
const DOWS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
async function nwsTruth() {
  const truth = {}, sd = new Date(START).toISOString().slice(0, 10), ed = new Date(NOW + 864e5).toISOString().slice(0, 10);
  for (const office of ['JAX', 'MLB', 'MFL', 'TBW', 'TAE', 'MOB']) {
    let txt; try { txt = await T(`https://mesonet.agron.iastate.edu/cgi-bin/afos/retrieve.py?pil=SRF${office}&sdate=${sd}&edate=${ed}&fmt=text&limit=9999`); } catch (e) { continue; }
    for (const prod of txt.split(/\n(?=000\s*\n)|\x01/)) {
      const m = prod.match(/\n(\d{3,4}) (AM|PM) ([CE][DS]T) \w{3} (\w{3}) (\d{1,2}) (\d{4})/); if (!m) continue;
      let hr = +m[1].slice(0, -2) % 12 + (m[2] === 'PM' ? 12 : 0); if (hr >= 13) continue;
      const date = new Date(`${m[4]} ${m[5]} ${m[6]} 12:00 UTC`).toISOString().slice(0, 10), issued = hr * 100 + +m[1].slice(-2);
      for (const seg of E.parseSRF(prod, office)) {
        const p = seg.periods.find(x => /^(TODAY|REST OF TODAY|THIS AFTERNOON|THIS MORNING)$/.test(x.name)); const r = p && E.surfRangeFromText(p.surf); if (!r) continue;
        for (const s of E.SPOTS) if (s.srf.some(k => seg.header.toLowerCase().includes(k.toLowerCase()))) {
          const key = s.id + '|' + date; if (!truth[key] || truth[key].issued <= issued) truth[key] = {lo: r[0], hi: r[1], issued};
        }
      }
    }
  }
  return truth;
}

async function surf(truth) {
  const res = {0: [], 1: [], 2: []};
  for (const coast of ['Atlantic', 'Gulf']) {
    const ss = E.SPOTS.filter(s => s.coast === coast), models = E.WAVE_MODELS[coast], vars = [];
    for (const v of ['wave_height', 'wave_period', 'wave_direction']) for (const d of ['', '_previous_day1', '_previous_day2']) vars.push(v + d);
    const arr = await J(`https://marine-api.open-meteo.com/v1/marine?latitude=${ss.map(s => s.seaLat)}&longitude=${ss.map(s => s.seaLon)}&hourly=${vars}&past_days=${DAYS}&forecast_days=1&timezone=GMT&models=${models}`);
    ss.forEach((s, k) => {
      const h = (Array.isArray(arr) ? arr : [arr])[k].hourly, col = (v, m) => h[`${v}_${m}`] !== undefined ? h[`${v}_${m}`] : h[v];
      const off = s.tz === 'America/New_York' ? 4 : 5, byDay = {0: {}, 1: {}, 2: {}};
      h.time.forEach((t, i) => {
        const loc = new Date(Date.parse(t + 'Z') - off * 36e5), hr = loc.getUTCHours(); if (hr < 8 || hr > 18) return;
        const day = loc.toISOString().slice(0, 10);
        [['', 0], ['_previous_day1', 1], ['_previous_day2', 2]].forEach(([sfx, d]) => {
          const w = E.blendWaves(models.map(m => ({H: col('wave_height' + sfx, m)[i], T: col('wave_period' + sfx, m)[i], D: col('wave_direction' + sfx, m)[i]}))); if (!w) return;
          (byDay[d][day] = byDay[d][day] || []).push(E.surfHeightFt(w.H, w.T, w.D, s));
        });
      });
      for (const d of [0, 1, 2]) for (const day in byDay[d]) { const tr = truth[s.id + '|' + day]; if (tr) res[d].push({ours: mean(byDay[d][day]), lo: tr.lo, hi: tr.hi}); }
    });
  }
  const out = {};
  for (const d in res) {
    const r = res[d]; if (!r.length) continue;
    const err = x => x.ours - (x.lo + x.hi) / 2, band = {};
    for (const [name, f] of [['0-4 ft', m => m < 4], ['4-6 ft', m => m >= 4 && m < 6], ['6+ ft', m => m >= 6]]) {
      const b = r.filter(x => f((x.lo + x.hi) / 2)); if (b.length) band[name] = {n: b.length, mae: r2(mean(b.map(x => Math.abs(err(x))))), within15: pct(mean(b.map(x => Math.abs(err(x)) <= 1.5 ? 1 : 0)))};
    }
    out[d] = {n: r.length, mae: r2(mean(r.map(x => Math.abs(err(x))))), bias: r2(mean(r.map(err))), within15: pct(mean(r.map(x => Math.abs(err(x)) <= 1.5 ? 1 : 0))), bands: band};
  }
  return out;
}

(async () => {
  const prev = fs.existsSync('validation.json') ? JSON.parse(fs.readFileSync('validation.json')) : {};
  const v = {version: 2, generated: new Date().toISOString(), days: DAYS, research: prev.research || null};
  try { v.waves = await waves(); } catch (e) { console.error('waves failed', e.message); }
  try { v.wind = await wind(); } catch (e) { console.error('wind failed', e.message); }
  try { v.surf = await surf(await nwsTruth()); } catch (e) { console.error('surf failed', e.message); }
  if (!v.waves || !v.wind || !v.surf) { console.error('Incomplete scorecard; keeping the previous validation.json'); process.exit(1); }
  fs.writeFileSync('validation.json', JSON.stringify(v, null, 1));
  console.log(JSON.stringify({waves: v.waves, wind: v.wind, surf: Object.fromEntries(Object.entries(v.surf).map(([d, x]) => [d, {n: x.n, mae: x.mae, bias: x.bias, within15: x.within15}]))}));
})();
