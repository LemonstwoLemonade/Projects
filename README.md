# Florida Surf Watch

Surf forecast for 17 Florida spots, rebuilt automatically by GitHub Actions and hosted free on GitHub Pages.

## What updates, and when
- **Every time the page opens:** wave and wind forecasts, tides, NWS alerts and surf zone forecasts (fetched live by the browser; the page also refreshes every 30 minutes while open).
- **Every 3 hours (GitHub Actions):** NOAA buoy readings and National Hurricane Center storms, which browsers can't read directly.
- **Every Monday:** `validate.js` grades the forecast over the last 30 days: waves against NOAA buoys (1–3 days ahead), wind type against coastal stations, and surf height against the NWS surf forecast archive. The scorecard is committed to `validation.json` and shown on the page. The commit also counts as repository activity, which keeps the schedule from being paused.

## One-time setup
1. Create a new **public** repository on GitHub (check "Add a README").
2. **Settings → Pages → Source: GitHub Actions.**
3. **Add file → Upload files:** upload every file in this folder except `.github`.
4. **Add file → Create new file:** name it `.github/workflows/refresh.yml`, paste in the contents of that file, and commit. (Folders starting with a dot are hidden on Mac and iPhone, so uploads often skip them. Creating the file this way avoids that.)
5. **Actions tab:** the first run starts on its own and takes about 2 minutes. The site will be at `https://USERNAME.github.io/REPOSITORY/`.
6. **iPhone:** open that link in Safari, then Share → Add to Home Screen.

## If something goes wrong
- **Run it by hand:** Actions → Refresh Florida Surf Watch → Run workflow.
- **Data outage:** if NOAA or Open-Meteo is down, the run stops on purpose and the last good page stays online.
- **Schedule paused:** GitHub pauses scheduled jobs in public repos after 60 days without activity. The weekly commit should prevent that. If it happens anyway, GitHub emails you; go to Actions → the workflow → Enable workflow.

## Files
- `engine.js`: all data fetching and the forecast model. This is the file to review.
- `template.html`: the page layout.
- `build.js`: pulls data (Node 22).
- `assemble.py`: builds `site/index.html` (Python 3.12).
- `validate.js`: weekly scorecard. It grades the same `engine.js` the page runs.
- `fl_path.txt`: Florida map outline.
- `validation.json`: latest accuracy check.
- `spots.json`: reference list of spots.

**Model (v2):**
- **Atlantic waves:** average of NOAA WaveWatch III, ECMWF WAM and Météo-France MFWAM.
- **Gulf waves:** ECMWF WAM.
- **Buoy correction:** same-day only, for spots within 15 km of a buoy, fading with a 6-hour time constant.
- **Wind:** average of HRRR, NBM and ECMWF, plus GFS for today.
- **Surf height:** offshore height × period boost × cos(swell angle) × NWS-region calibration (`CAL_K` in engine.js).

Every choice was tuned on Jul 27–Aug 31, 2026 and confirmed on Sep 1–24. Change `CAL_K` only after re-running the same kind of test.

**Run locally:** `node build.js && python3 assemble.py`, then open `site/index.html`.
