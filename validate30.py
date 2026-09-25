import json, urllib.request, datetime as dt, statistics as st, math
UA={'User-Agent':'FLSurfWatch'}
def get(u): return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=40).read().decode()
buoys={'41112':(30.709,-81.292,'Fernandina Beach offshore','atl'),'41117':(29.999,-81.079,'St. Augustine offshore','atl'),
'41113':(28.400,-80.534,'Cape Canaveral nearshore','atl'),'41114':(27.551,-80.225,'Fort Pierce offshore','atl'),
'42036':(28.501,-84.508,'West Tampa (Gulf)','gulf'),'42098':(27.590,-82.931,'Egmont Channel, Tampa Bay (Gulf)','gulf')}
now=dt.datetime.now(dt.UTC).replace(tzinfo=None)
DAYS=30
res={}
for b,(la,lo,name,coast) in buoys.items():
  obs={}
  for line in get(f'https://www.ndbc.noaa.gov/data/realtime2/{b}.txt').splitlines()[2:]:
    p=line.split()
    if p[8]=='MM': continue
    t=dt.datetime(int(p[0]),int(p[1]),int(p[2]),int(p[3]))
    if now-t>dt.timedelta(days=DAYS): continue
    obs.setdefault(t,float(p[8]))
  mods={}
  for m in ['ncep_gfswave025','ecmwf_wam025']:
    d=json.loads(get(f'https://marine-api.open-meteo.com/v1/marine?latitude={la}&longitude={lo}&hourly=wave_height&past_days={DAYS}&forecast_days=1&models={m}'))
    mods[m]={dt.datetime.fromisoformat(t):v for t,v in zip(d['hourly']['time'],d['hourly']['wave_height']) if v is not None}
  keys=[t for t in obs if all(t in mods[m] for m in mods)]
  out={'name':name,'coast':coast,'hours':len(keys),'obs_mean_ft':round(st.mean(obs[t] for t in keys)*3.281,2)}
  def stats(f):
    e=[f(t)-obs[t] for t in keys]
    o=[obs[t] for t in keys]; p=[f(t) for t in keys]
    r=st.correlation(o,p)
    within1=sum(abs(x)*3.281<=1 for x in e)/len(e)
    return {'bias_ft':round(st.mean(e)*3.281,2),'mae_ft':round(st.mean(map(abs,e))*3.281,2),'r':round(r,2),'within_1ft':round(within1*100)}
  out['noaa']=stats(lambda t:mods['ncep_gfswave025'][t])
  out['ecmwf']=stats(lambda t:mods['ecmwf_wam025'][t])
  out['blend']=stats(lambda t:(mods['ncep_gfswave025'][t]+mods['ecmwf_wam025'][t])/2)
  res[b]=out; print(b,out)
json.dump({'generated':now.isoformat()+'Z','days':DAYS,'buoys':res},open('validation.json','w'),indent=1)
