// Pulls fresh data from NOAA / NWS / Open-Meteo (including buoys and the hurricane center,
// which browsers can't read) and saves it to snapshot.json for assemble.py.
const E = require('./engine.js'); const fs = require('fs');
const f = (u, o = {}) => fetch(u, {...o, headers: {...(o.headers || {}), 'User-Agent': 'FLSurfWatch (github.com)'}});
(async () => {
  const raw = await E.fetchSources(f, {noCors: true});
  console.log('Source status:', raw.status, '| buoys:', Object.keys(raw.buoys).join(', ') || 'none');
  // Without waves and wind there is no forecast. Fail so the last good page stays online.
  const s = raw.status;
  if (s['Wave model (Atlantic)'] !== 'ok' || s['Wave model (Gulf)'] !== 'ok' || s['Wind (NOAA GFS/HRRR)'] !== 'ok') {
    console.error('Core forecast data missing. Keeping the previous page.'); process.exit(1);
  }
  fs.writeFileSync('snapshot.json', JSON.stringify(raw));
  const out = E.build(raw);
  const ok = out.compare.filter(c => c.within).length;
  console.log(`Built ${out.spots.length} spots. Agrees with NWS surf forecasts in ${ok} of ${out.compare.length} cases.`);
})().catch(e => { console.error(e); process.exit(1); });
