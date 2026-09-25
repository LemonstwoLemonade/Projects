# Florida Surf Watch

Surf forecast for 17 Florida spots, rebuilt automatically by GitHub Actions and hosted free on GitHub Pages.

## What updates, and when
- **Every time the page opens:** wave and wind forecasts, tides, NWS alerts and surf zone forecasts (fetched live by the browser; the page also refreshes every 30 minutes while open).
- **Every 3 hours (GitHub Actions):** NOAA buoy readings and National Hurricane Center storms, which browsers can't read directly.
- **Every Monday:** the wave model is re-checked against 30 days of NOAA buoy data, and the result is committed to `validation.json`. The commit also counts as repository activity, which keeps the schedule from being paused.

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
- `validate30.py`: buoy accuracy check.
- `fl_path.txt`: Florida map outline.
- `validation.json`: latest accuracy check.
- `spots.json`: reference list of spots.

**Run locally:** `node build.js && python3 assemble.py`, then open `site/index.html`.
