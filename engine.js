/* Florida Surf Watch — forecast engine (shared by snapshot builder and web page) */
(function (root) {
  const SPOTS = [
    {id:"fernandina",office:"JAX",nowcast:"41112",name:"Fernandina Beach",area:"Nassau County",coast:"Atlantic",lat:30.667,lon:-81.428,face:85,win:[0,160],tz:"America/New_York",buoy:"41112",tide:"8720030",srf:["Fernandina Beach"],alert:/Nassau/i},
    {id:"jaxbeach",office:"JAX",nowcast:null,name:"Jacksonville Beach Pier",area:"Duval County",coast:"Atlantic",lat:30.283,lon:-81.387,face:88,win:[0,165],tz:"America/New_York",buoy:"41112",tide:"8720291",srf:["Jacksonville Beach"],alert:/Duval/i},
    {id:"staug",office:"JAX",nowcast:"41117",name:"St. Augustine Beach",area:"St. Johns County",coast:"Atlantic",lat:29.857,lon:-81.264,face:80,win:[0,165],tz:"America/New_York",buoy:"41117",tide:"8720587",srf:["St. Augustine"],alert:/St\.? Johns/i},
    {id:"flagler",office:"JAX",nowcast:null,name:"Flagler Beach Pier",area:"Flagler County",coast:"Atlantic",lat:29.480,lon:-81.121,face:72,win:[0,160],tz:"America/New_York",buoy:"41117",tide:"8720587",srf:["Palm Coast"],alert:/Flagler/i},
    {id:"nsb",office:"MLB",nowcast:null,name:"New Smyrna Beach Inlet",area:"Volusia County",coast:"Atlantic",lat:29.070,lon:-80.914,face:65,win:[350,150],tz:"America/New_York",buoy:"41113",tide:"8721147",srf:["New Smyrna","Daytona Beach"],alert:/Volusia/i},
    {id:"cocoa",office:"MLB",nowcast:"41113",name:"Cocoa Beach Pier",area:"Brevard County",coast:"Atlantic",lat:28.368,lon:-80.601,face:72,win:[15,150],tz:"America/New_York",buoy:"41113",tide:"8721649",srf:["Cocoa Beach"],alert:/Brevard/i},
    {id:"sebastian",office:"MLB",nowcast:null,name:"Sebastian Inlet",area:"Brevard / Indian River",coast:"Atlantic",lat:27.861,lon:-80.446,face:70,win:[0,140],tz:"America/New_York",buoy:"41113",tide:"8722004",srf:["Coastal Indian River","Vero Beach"],alert:/Indian River|Southern Brevard/i},
    {id:"ftpierce",office:"MLB",nowcast:"41114",name:"Fort Pierce Jetty",area:"St. Lucie County",coast:"Atlantic",lat:27.469,lon:-80.289,face:72,win:[0,115],tz:"America/New_York",buoy:"41114",tide:"8722212",srf:["Fort Pierce"],alert:/St\.? Lucie|Saint Lucie/i},
    {id:"jupiter",office:"MFL",nowcast:null,name:"Jupiter Inlet",area:"Palm Beach County",coast:"Atlantic",lat:26.943,lon:-80.070,face:80,win:[0,105],tz:"America/New_York",buoy:"41114",tide:"8722495",srf:["Coastal Palm Beach"],alert:/Palm Beach/i},
    {id:"lakeworth",office:"MFL",nowcast:null,name:"Lake Worth Beach Pier",area:"Palm Beach County",coast:"Atlantic",lat:26.612,lon:-80.034,face:85,win:[0,95],tz:"America/New_York",buoy:"41114",tide:"8722670",srf:["Coastal Palm Beach"],alert:/Palm Beach/i},
    {id:"miami",office:"MFL",nowcast:null,name:"South Beach, Miami",area:"Miami-Dade County",coast:"Atlantic",lat:25.770,lon:-80.130,face:90,win:[350,50],tz:"America/New_York",buoy:null,tide:"8723170",srf:["Coastal Miami-Dade"],alert:/Miami-Dade/i},
    {id:"pensacola",office:"MOB",nowcast:null,name:"Pensacola Beach",area:"Escambia County",coast:"Gulf",lat:30.327,lon:-87.142,face:180,win:[110,250],tz:"America/Chicago",buoy:null,tide:"8729807",srf:["Pensacola Beach"],alert:/Escambia/i},
    {id:"navarre",office:"MOB",nowcast:null,name:"Navarre Beach Pier",area:"Santa Rosa County",coast:"Gulf",lat:30.376,lon:-86.864,face:180,win:[110,250],tz:"America/Chicago",buoy:null,tide:"8729678",srf:["Navarre Beach"],alert:/Santa Rosa/i},
    {id:"destin",office:"MOB",nowcast:null,name:"Destin",area:"Okaloosa County",coast:"Gulf",lat:30.381,lon:-86.470,face:185,win:[115,255],tz:"America/Chicago",buoy:null,tide:"8729511",srf:["Destin","Okaloosa Coastal"],alert:/Okaloosa/i},
    {id:"pcb",office:"TAE",nowcast:null,name:"Panama City Beach Pier",area:"Bay County",coast:"Gulf",lat:30.214,lon:-85.869,face:210,win:[130,275],tz:"America/Chicago",buoy:null,tide:"8729210",srf:["Panama City Beach"],alert:/Coastal Bay|Bay Coastal/i},
    {id:"stpete",office:"TBW",nowcast:"42098",name:"St. Pete Beach",area:"Pinellas County",coast:"Gulf",lat:27.725,lon:-82.741,face:255,win:[180,320],tz:"America/New_York",buoy:"42098",tide:"8726724",srf:["Saint Pete Beach","Pinellas"],alert:/Pinellas/i},
    {id:"naples",office:"MFL",nowcast:null,name:"Naples Pier",area:"Collier County",coast:"Gulf",lat:26.132,lon:-81.807,face:255,win:[180,310],tz:"America/New_York",buoy:null,tide:"8725110",srf:["Coastal Collier","Naples"],alert:/Collier/i}
  ];
  // Model grid point ~15 km out to sea, along the direction the beach faces
  SPOTS.forEach(s => { const f = s.face*Math.PI/180, off = 0.14;
    s.seaLat = +(s.lat + off*Math.cos(f)).toFixed(3);
    s.seaLon = +(s.lon + off*Math.sin(f)/Math.cos(s.lat*Math.PI/180)).toFixed(3); });

  const BUOYS = {"41112":"Fernandina Beach offshore","41117":"St. Augustine offshore","41113":"Cape Canaveral nearshore","41114":"Fort Pierce offshore","42098":"Egmont Channel (Tampa Bay)"};
  const BUOY_POS = {"41112":[30.709,-81.292],"41117":[29.999,-81.079],"41113":[28.4,-80.533],"41114":[27.564,-80.215],"42098":[27.59,-82.931]};
  const SRF_OFFICES = ["JAX","MLB","MFL","TBW","TAE","MOB"];
  // v2 model choices — each picked on Jul 27–Aug 31 data and confirmed on an untouched Sep 1–24 test period:
  //  waves: Atlantic = average of NOAA WaveWatch III, ECMWF WAM and Météo-France MFWAM (beat NOAA alone at 1–3 day leads);
  //         Gulf = ECMWF WAM alone (best on the Gulf in both periods)
  //  wind:  today = average of GFS/HRRR (x2), HRRR, NBM, ECMWF; later days = average of HRRR, NBM, ECMWF
  const WAVE_MODELS = {Atlantic:["ncep_gfswave025","ecmwf_wam025","meteofrance_wave"], Gulf:["ecmwf_wam025"]};
  const MODEL_NAME = {Atlantic:"Average of NOAA WaveWatch III, ECMWF WAM and Météo-France MFWAM", Gulf:"ECMWF WAM"};
  const WIND_MODELS = ["gfs_seamless","ncep_hrrr_conus","ncep_nbm_conus","ecmwf_ifs025"];
  const WIND_W = {today:{gfs_seamless:2, ncep_hrrr_conus:1, ncep_nbm_conus:1, ecmwf_ifs025:1}, later:{ncep_hrrr_conus:1, ncep_nbm_conus:1, ecmwf_ifs025:1}};
  // Surf calibration per NWS office region: fitted to NWS same-day surf heights Jul 27–Aug 31, 2026 (Sep kept out for testing).
  // Held-out test (Sep 1–24): typical miss 0.42 ft vs 0.61 ft for v1.
  const CAL_K = {JAX:1.21, MLB:1.05, MFL:0.98, TBW:0.75, TAE:1.18, MOB:1.37};
  const NOWCAST_TAU_H = 6;   // buoy correction fades with a 6-hour time constant (chosen on training data)
  const ALERT_EVENTS = /Rip Current|High Surf|Beach Hazards|Coastal Flood|Hurricane|Tropical Storm|Storm Surge|Tsunami/i;

  /* ---------- helpers ---------- */
  const M2FT = 3.28084;
  const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
  const angDiff = (a,b) => { const d = Math.abs(((a-b)%360+360)%360); return d>180 ? 360-d : d; };
  const inWindow = (dir,[a,b]) => a<=b ? (dir>=a && dir<=b) : (dir>=a || dir<=b);
  function interp(x, pts){ if (x<=pts[0][0]) return pts[0][1];
    for (let i=1;i<pts.length;i++) if (x<=pts[i][0]) { const [x0,y0]=pts[i-1],[x1,y1]=pts[i]; return y0+(y1-y0)*(x-x0)/(x1-x0); }
    return pts[pts.length-1][1]; }
  const compass = d => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(((d%360)+360)%360/22.5)%16];
  const ymd = (d, tz) => new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
  const localHour = (d, tz) => +new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",hourCycle:"h23"}).format(d);

  /* ---------- surf physics ---------- */
  // Surf (breaking-wave face) height from the offshore model wave:
  //   surf = offshore height x period boost x angle factor x regional calibration (CAL_K)
  // Period boost: long-period swell "feels the bottom" and stands up taller (common forecaster rule).
  // Angle factor: energy reaching the beach falls with the cosine of the angle between swell and beach;
  // swell from outside a spot's open-ocean window (land / Bahamas in the way) only wraps in weakly.
  const PERIOD_BOOST = [[5,0.9],[7,1.0],[9,1.15],[11,1.3],[13,1.45],[15,1.6]];
  function surfHeightFt(H0m, Tp, waveDir, spot){
    if (H0m==null || Tp==null || waveDir==null) return null;
    const ang = angDiff(waveDir, spot.face);
    const expo = inWindow(waveDir, spot.win) ? Math.max(Math.cos(ang*Math.PI/180), 0.1) : 0.15;
    return H0m*M2FT*interp(Tp,PERIOD_BOOST)*expo*(CAL_K[spot.office]||1);
  }
  // Average several wave models: mean height and period, energy-weighted mean direction
  function blendWaves(list){
    const ok=list.filter(x=>x.H!=null&&x.T!=null&&x.D!=null); if(!ok.length) return null;
    let u=0,v=0; ok.forEach(x=>{const w=x.H*x.H; u+=w*Math.sin(x.D*Math.PI/180); v+=w*Math.cos(x.D*Math.PI/180);});
    return {H:ok.reduce((a,x)=>a+x.H,0)/ok.length, T:ok.reduce((a,x)=>a+x.T,0)/ok.length, D:(Math.atan2(u,v)*180/Math.PI+360)%360};
  }
  // Average several wind models: weighted mean speed, speed-weighted vector mean direction; missing models are skipped
  function blendWind(list, weights){
    let ws=0,sp=0,gu=0,gw=0,u=0,v=0;
    list.forEach(x=>{ const w=weights[x.m]||0; if(!w||x.s==null||x.d==null) return; ws+=w; sp+=w*x.s; u+=w*x.s*Math.sin(x.d*Math.PI/180); v+=w*x.s*Math.cos(x.d*Math.PI/180); if(x.g!=null){gu+=w*x.g; gw+=w;} });
    if(!ws) return null;
    return {mph:sp/ws, dir:(Math.atan2(u,v)*180/Math.PI+360)%360, gust:gw?gu/gw:null};
  }
  function windType(windFrom, spot){
    const rel = angDiff(windFrom, spot.face); // 0 = straight onshore, 180 = straight offshore
    if (rel>=135) return "offshore"; if (rel>=100) return "cross-offshore"; if (rel>=60) return "cross"; return "onshore";
  }
  const SIZE_PTS   = [[0,0],[1,0.3],[2,1.2],[3,2.1],[4,2.8],[5,3.3],[6,3.5],[8,3.2],[10,2.4],[12,1.5],[16,0.8]];
  const PERIOD_PTS = [[4,0],[6,0.3],[8,0.8],[10,1.2],[12,1.4],[14,1.5]];
  function windPts(mph, type){
    if (mph<5) return 4; // wind is the biggest factor in wave quality: worth up to 4 of 10 points
    const t = {offshore:[[15,4],[22,3],[30,2],[999,1]], "cross-offshore":[[12,3.6],[18,2.6],[25,1.3],[999,0.6]],
               cross:[[8,2.8],[12,1.9],[18,0.9],[999,0.3]], onshore:[[8,2.2],[12,1.2],[16,0.4],[999,0]]}[type];
    for (const [lim,p] of t) if (mph<=lim) return p;
  }
  function tidePts(t){ // t = {level 0..1 within current swing, rising, range ft}
    if (!t) return 0.7;
    let q; const n=t.level;
    if (n>=0.3 && n<=0.7) q = t.rising ? 1 : 0.85; else if (n>0.85) q=0.4; else if (n<0.15) q=0.45; else q=0.7;
    return 0.7 + (q-0.7)*Math.min(1, t.range/3); // small-range tides (Panhandle) barely matter
  }
  const LABELS = [[2,"Flat"],[3.5,"Poor"],[5,"Fair"],[6.5,"Good"],[8,"Great"],[11,"Epic"]];
  const labelFor = s => LABELS.find(([m])=>s<m)[1];
  function score(h, T, mph, wtype, tide){
    // Wind shapes the whole wave: messy wind cuts the value of size and period (keeps 60–100% of those points)
    const w = windPts(mph,wtype), wf = 0.6 + 0.4*(w/4);
    const p = {size: interp(h,SIZE_PTS)*wf, period: interp(T,PERIOD_PTS)*wf, wind: w, tide: tidePts(tide), windFactor: wf};
    let total = p.size+p.period+p.wind+p.tide;
    if (h<1) total=Math.min(total,1.9); else if (h<2) total=Math.min(total,4.9); // under 2 ft tops out at "Fair"
    return {total:+clamp(total,0,10).toFixed(1), parts:p};
  }
  // Safety: who should be in the water
  function safety(h, mph, wtype, alerts, rip){
    const ev = alerts.map(a=>a.event).join(" ");
    if (/Hurricane|Tropical Storm Warning|Storm Surge|High Surf Warning|Tsunami/i.test(ev) || h>=10)
      return {level:"danger", text:"Dangerous — stay out of the water"};
    if (h>=6 || /High Surf Advisory/i.test(ev) || /High/i.test(rip||"") || (wtype==="offshore" && mph>=25))
      return {level:"expert", text:"Experienced surfers only"};
    if (h>=3.5 || /Moderate/i.test(rip||"") || /Rip Current|Beach Hazards/i.test(ev))
      return {level:"intermediate", text:"Intermediate and up"};
    return {level:"all", text:"OK for beginners"};
  }
  function sizeWords(h){
    if (h<1) return "flat"; if (h<2) return "ankle to knee high"; if (h<3) return "knee to waist high";
    if (h<4) return "waist to chest high"; if (h<6) return "chest high to head high"; if (h<8) return "overhead";
    return "well overhead";
  }
  function heightRange(h){
    if (h==null) return "–"; if (h<1) return "Flat–1 ft";
    const lo=Math.max(1,Math.floor(h*0.85)), hi=Math.max(lo+1,Math.ceil(h*1.1));
    return `${lo}–${hi} ft`;
  }
  function windWords(mph, type){
    if (mph<5) return "Glassy — almost no wind";
    if (type==="offshore") return mph>25 ? "Strong offshore wind — clean but hard to paddle in" : "Clean — offshore wind grooms the waves";
    if (type==="cross-offshore") return "Mostly clean — side-offshore wind";
    if (type==="cross") return mph>15 ? "Bumpy — strong side wind" : mph>10 ? "Bumpy — side wind" : "Fair — light side wind";
    return mph>15 ? "Blown out — strong onshore wind" : mph>8 ? "Choppy — onshore wind" : "A little bumpy — light onshore wind";
  }

  /* ---------- tides ---------- */
  function tideAt(preds, tMs){ // preds: [{t:ms, v:ft, type}]
    if (!preds || preds.length<2) return null;
    for (let i=1;i<preds.length;i++){ const a=preds[i-1], b=preds[i];
      if (tMs>=a.t && tMs<=b.t){ const f=(tMs-a.t)/(b.t-a.t); const c=(1-Math.cos(Math.PI*f))/2;
        const v=a.v+(b.v-a.v)*c; const rising=b.v>a.v; const range=Math.abs(b.v-a.v);
        const level = rising ? c : 1-c; return {v, rising, range, level}; } }
    return null;
  }

  /* ---------- NWS Surf Zone Forecast parser ---------- */
  function parseSRF(text, office){
    const segs = text.split(/\n\$\$/); const out=[];
    for (const seg of segs){
      const m = seg.match(/\n([A-Z]{2}Z\d{3}[\s\S]*?)\n\.(?=[A-Z])/); if (!m) continue;
      const header = m[1].replace(/\s+/g," ");
      const periods=[]; const re=/\n\.([A-Z][A-Z ]+?)\.\.\.([\s\S]*?)(?=\n\.[A-Z]|\n&&|$)/g; let p;
      while ((p=re.exec(seg))){ const body=p[2];
        const rip=(body.match(/Rip Current Risk\*?\.+\s*([A-Za-z]+)/)||[])[1];
        const surf=(body.match(/Surf Height\.+\s*([^\n]+?)\.?\s*\n/)||[])[1];
        if (rip||surf) periods.push({name:p[1].trim(), rip, surf}); }
      if (periods.length) out.push({office, header, periods});
    }
    return out;
  }
  function surfRangeFromText(s){ if (!s) return null;
    let m=s.match(/(\d+)\s*to\s*(\d+)\s*feet/i); if (m) return [+m[1],+m[2]];
    m=s.match(/Around\s*(\d+)\s*f/i); if (m) return [+m[1]-0.5,+m[1]+0.5];
    m=s.match(/(\d+)\s*foot or less/i); if (m) return [0,+m[1]];
    m=s.match(/(\d+)\s*feet or less/i); if (m) return [0,+m[1]];
    return null; }

  /* ---------- fetching ---------- */
  function om(url){ return url; }
  async function fetchSources(fetchFn, opts={}){
    const raw = {fetchedAt: new Date().toISOString(), status:{}, marine:{}, wind:null, tides:{}, alerts:[], srf:[], srfIssued:{}, buoys:{}, storms:null};
    const J = async (u, h) => { const r = await fetchFn(u, h?{headers:h}:undefined); if (!r.ok) throw new Error(r.status+" "+u); return r.json(); };
    const T = async (u) => { const r = await fetchFn(u); if (!r.ok) throw new Error(r.status+" "+u); return r.text(); };
    const tasks = [];
    raw.marineBuoy = {};
    for (const coast of ["Atlantic","Gulf"]) {
      const ss = SPOTS.filter(s=>s.coast===coast), models=WAVE_MODELS[coast];
      const bs = [...new Set(ss.filter(s=>s.nowcast).map(s=>s.nowcast))];
      const lat = ss.map(s=>s.seaLat).concat(bs.map(b=>BUOY_POS[b][0])), lon = ss.map(s=>s.seaLon).concat(bs.map(b=>BUOY_POS[b][1]));
      const u = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_period,wave_direction&past_days=1&forecast_days=4&timezone=GMT&models=${models}`;
      tasks.push(J(u).then(d=>{ const arr=Array.isArray(d)?d:[d];
        ss.forEach((s,i)=>raw.marine[s.id]={coast, models, hourly:arr[i].hourly});
        bs.forEach((b,j)=>raw.marineBuoy[b]={coast, models, hourly:arr[ss.length+j].hourly});
        raw.status["Wave models ("+coast+")"]="ok"; })
        .catch(e=>raw.status["Wave models ("+coast+")"]="failed"));
    }
    { const u = `https://api.open-meteo.com/v1/forecast?latitude=${SPOTS.map(s=>s.lat)}&longitude=${SPOTS.map(s=>s.lon)}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=sunrise,sunset&wind_speed_unit=mph&past_days=1&forecast_days=4&timezone=GMT&models=${WIND_MODELS}`;
      tasks.push(J(u).then(d=>{ const arr=Array.isArray(d)?d:[d]; raw.wind={}; SPOTS.forEach((s,i)=>raw.wind[s.id]={hourly:arr[i].hourly, daily:arr[i].daily}); raw.status["Wind models (NOAA HRRR/NBM/GFS + ECMWF)"]="ok"; })
        .catch(e=>raw.status["Wind models (NOAA HRRR/NBM/GFS + ECMWF)"]="failed")); }
    const begin = new Date(Date.now()-86400000).toISOString().slice(0,10).replace(/-/g,"");
    const stations=[...new Set(SPOTS.map(s=>s.tide))]; let tideOk=0;
    for (const st of stations) tasks.push(J(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&datum=MLLW&interval=hilo&station=${st}&begin_date=${begin}&range=144&time_zone=gmt&units=english&format=json&application=FLSurfWatch`)
      .then(d=>{ raw.tides[st]=(d.predictions||[]).map(p=>({t:Date.parse(p.t.replace(" ","T")+"Z"), v:+p.v, type:p.type})); tideOk++; }).catch(()=>{}));
    tasks.push(J("https://api.weather.gov/alerts/active?area=FL").then(d=>{
      raw.alerts=d.features.map(f=>f.properties).filter(p=>ALERT_EVENTS.test(p.event))
        .map(p=>({event:p.event, areaDesc:p.areaDesc, headline:p.headline, ends:p.ends||p.expires, severity:p.severity}));
      raw.status["NWS alerts"]="ok"; }).catch(()=>raw.status["NWS alerts"]="failed"));
    for (const o of SRF_OFFICES) tasks.push(J(`https://api.weather.gov/products/types/SRF/locations/${o}`)
      .then(l=>J(`https://api.weather.gov/products/${l["@graph"][0].id}`))
      .then(p=>{ raw.srf.push(...parseSRF(p.productText,o)); raw.srfIssued[o]=p.issuanceTime; }).catch(()=>{}));
    // Sources below do not allow browser access (no CORS) — collected by the snapshot builder only.
    if (opts.noCors){
      for (const b of Object.keys(BUOYS)) tasks.push(T(`https://www.ndbc.noaa.gov/data/realtime2/${b}.txt`).then(t=>{
        const recent=[];
        for (const line of t.split("\n").slice(2)){ const p=line.trim().split(/\s+/); if (p.length<15||p[8]==="MM") continue;
          const time=Date.UTC(+p[0],+p[1]-1,+p[2],+p[3],+p[4]);
          if (!raw.buoys[b]) raw.buoys[b]={time, wvhtFt:+(+p[8]*M2FT).toFixed(1), period:p[9]==="MM"?null:+p[9], dir:p[11]==="MM"?null:+p[11], waterF:p[14]==="MM"?null:Math.round(+p[14]*9/5+32)};
          if (raw.buoys[b].time-time>3*3600000) break;
          recent.push({t:time, h:+p[8]}); }
        if (raw.buoys[b]) raw.buoys[b].recent=recent;
      }).catch(()=>{}));
      tasks.push(J("https://www.nhc.noaa.gov/CurrentStorms.json").then(d=>{
        raw.storms={time:Date.now(), list:(d.activeStorms||[]).filter(s=>/^al/.test(s.id)).map(s=>({name:s.name, cls:s.classification, kt:+s.intensity, lat:s.latitude, lon:s.longitude, move:s.movementDir, speed:s.movementSpeed}))};
      }).catch(()=>{}));
    }
    await Promise.all(tasks);
    raw.status["Tides (NOAA CO-OPS)"] = tideOk===stations.length ? "ok" : tideOk ? "partial" : "failed";
    raw.status["NWS surf zone forecasts"] = raw.srf.length ? "ok" : "failed";
    return raw;
  }

  /* ---------- build the forecast ---------- */
  function build(raw, nowMs){
    nowMs = nowMs || Date.now();
    const today = ymd(new Date(nowMs),"America/New_York");
    const dayKeys = [0,1,2].map(i=>ymd(new Date(nowMs+i*86400000),"America/New_York"));
    const spots = SPOTS.map(spot=>{
      const mar = raw.marine[spot.id], wnd = raw.wind && raw.wind[spot.id];
      const tides = raw.tides[spot.tide];
      const hours=[];
      const pick = (h, v, m, models) => { const x = h[`${v}_${m}`]; return x!==undefined ? x : (models.length===1 ? h[v] : undefined); };
      const wavesAt = (src, i) => blendWaves(src.models.map(m=>({H:(pick(src.hourly,"wave_height",m,src.models)||[])[i], T:(pick(src.hourly,"wave_period",m,src.models)||[])[i], D:(pick(src.hourly,"wave_direction",m,src.models)||[])[i]})));
      // Buoy nowcast (only spots within 15 km of a buoy): ratio of measured to modelled height over the last 3 h, fading out (6 h time constant)
      let nowcast=null;
      const nb = spot.nowcast && raw.buoys[spot.nowcast], mb = spot.nowcast && raw.marineBuoy && raw.marineBuoy[spot.nowcast];
      if (nb && nb.recent && nb.recent.length && mb){
        const idx={}; mb.hourly.time.forEach((t,i)=>idx[Date.parse(t+"Z")]=i);
        let so=0, sm=0, n=0;
        nb.recent.forEach(o=>{ const hr=Math.round(o.t/3600000)*3600000, i=idx[hr]; if(i==null) return; const w=wavesAt(mb,i); if(!w) return; so+=o.h; sm+=w.H; n++; });
        if (n>=2 && sm/n>0.05) nowcast={buoy:spot.nowcast, r:clamp(so/sm,0.6,1.6), tObs:nb.time, n};
      }
      if (mar && wnd){
        const wIdx = {}; wnd.hourly.time.forEach((t,i)=>wIdx[t]=i);
        const sr = Object.keys(wnd.daily).find(k=>k.startsWith("sunrise")), ss = Object.keys(wnd.daily).find(k=>k.startsWith("sunset"));
        const sun = (wnd.daily[sr]||[]).map((r,i)=>[Date.parse(r+"Z"), Date.parse(wnd.daily[ss][i]+"Z")]);
        const todayLocal = ymd(new Date(nowMs), spot.tz);
        mar.hourly.time.forEach((t,i)=>{
          const ms = Date.parse(t+"Z"); if (ms < nowMs-3600000*2) return;
          const wi = wIdx[t]; if (wi==null) return;
          const wv = wavesAt(mar, i); if (!wv) return;
          const d = new Date(ms), dayKey = ymd(d, spot.tz);
          const wm = blendWind(WIND_MODELS.map(m=>({m, s:(wnd.hourly[`wind_speed_10m_${m}`]||[])[wi], d:(wnd.hourly[`wind_direction_10m_${m}`]||[])[wi], g:(wnd.hourly[`wind_gusts_10m_${m}`]||[])[wi]})), dayKey===todayLocal ? WIND_W.today : WIND_W.later)
                  || blendWind([{m:"gfs_seamless", s:(wnd.hourly.wind_speed_10m_gfs_seamless||[])[wi], d:(wnd.hourly.wind_direction_10m_gfs_seamless||[])[wi]}], {gfs_seamless:1});
          if (!wm) return;
          let corr=1;
          if (nowcast){ const dt=(ms-nowcast.tObs)/3600000; corr = dt<=0 ? (dt>=-3 ? nowcast.r : 1) : Math.pow(nowcast.r, Math.exp(-dt/NOWCAST_TAU_H)); }
          const H = wv.H*corr, Tp = wv.T, D = wv.D, mph = wm.mph, wdir = wm.dir;
          const h = surfHeightFt(H,Tp,D,spot), wt = windType(wdir,spot), td = tideAt(tides, ms);
          const sc = score(h, Tp, mph, wt, td);
          const daylight = sun.some(([a,b])=>ms>=a-1800000 && ms<=b-1800000); // first light to 30 min before sunset
          hours.push({t:ms, day:dayKey, hour:localHour(d,spot.tz), daylight, h:+h.toFixed(1), H0ft:+(H*M2FT).toFixed(1), T:+Tp.toFixed(0), dir:Math.round(D),
            mph:Math.round(mph), gust:Math.round(wm.gust||0), wdir:Math.round(wdir), wtype:wt, corr:+corr.toFixed(2), tide:td?{v:+td.v.toFixed(1),rising:td.rising}:null, score:sc.total, parts:sc.parts});
        });
      }
      // best 3-hour daylight window per day
      const days = dayKeys.map(k=>{
        const hs = hours.filter(x=>x.day===k && x.daylight && x.t>=nowMs-3600000);
        let best=null;
        for (let i=0;i<hs.length;i++){ const w=hs.slice(i,i+3).filter(x=>x.t-hs[i].t<3*3600000+1); if (!w.length) continue;
          const avg=w.reduce((a,x)=>a+x.score,0)/w.length; if (!best||avg>best.avg+0.05) best={avg, start:w[0], end:w[w.length-1], hours:w}; }
        const dh = hs.length ? hs : hours.filter(x=>x.day===k);
        return {key:k, best, avgH: dh.length? dh.reduce((a,x)=>a+x.h,0)/dh.length : null};
      });
      // alerts + NWS surf zone forecast for this spot
      const alerts = raw.alerts.filter(a=>spot.alert.test(a.areaDesc));
      const srfSeg = raw.srf.find(s=>spot.srf.some(k=>s.header.toLowerCase().includes(k.toLowerCase())));
      const buoy = spot.buoy && raw.buoys[spot.buoy] ? {id:spot.buoy, name:BUOYS[spot.buoy], ...raw.buoys[spot.buoy]} : null;
      const rip0 = srfSeg && srfSeg.periods[0] ? srfSeg.periods[0].rip : null;
      days.forEach((d,i)=>{ if (!d.best) return; const x=d.best.start; const rip = srfSeg && srfSeg.periods.filter(p=>!/NIGHT/.test(p.name))[i];
        d.safety = safety(Math.max(...d.best.hours.map(y=>y.h)), x.mph, x.wtype, i===0?alerts:alerts.filter(a=>!a.ends||Date.parse(a.ends)>Date.parse(d.key+"T12:00:00Z")), rip?rip.rip:null); });
      return {...spot, alert:undefined, model:mar?MODEL_NAME[spot.coast]:null, calK:CAL_K[spot.office], nowcast, hours, days, alerts, srf:srfSeg||null, rip:rip0, buoy, tidePreds:tides||[]};
    });
    // Cross-check vs NWS forecasters: their daytime surf height vs our daylight average, today and tomorrow
    const compare=[]; const DOW=/^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)$/;
    spots.forEach(s=>{ if (!s.srf) return;
      [[s.srf.periods.find(p=>/TODAY/.test(p.name)), dayKeys[0]], [s.srf.periods.find(p=>DOW.test(p.name)), dayKeys[1]]].forEach(([p,day],di)=>{
        const r = p && surfRangeFromText(p.surf); const dh = s.hours.filter(x=>x.day===day && x.daylight);
        if (!r || !dh.length) return; const ours = dh.reduce((a,x)=>a+x.h,0)/dh.length;
        compare.push({id:s.id, name:s.name, coast:s.coast, day:di, nws:p.surf.replace(/\.$/,""), nwsR:r, ours:+ours.toFixed(1), within: ours>=r[0]-1 && ours<=r[1]+1}); }); });
    return {builtAt:nowMs, dayKeys, spots, compare, status:raw.status, storms:raw.storms, fetchedAt:raw.fetchedAt};
  }

  const api = {windType, safety, CAL_K, WAVE_MODELS, WIND_MODELS, WIND_W, NOWCAST_TAU_H, PERIOD_BOOST, blendWaves, blendWind, SPOTS, BUOYS, MODEL_NAME, fetchSources, build, parseSRF, surfRangeFromText, heightRange, sizeWords, windWords, labelFor, compass, surfHeightFt, score};
  if (typeof module!=="undefined") module.exports=api; else root.SurfEngine=api;
})(this);
