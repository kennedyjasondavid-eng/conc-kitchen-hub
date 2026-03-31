# Quick Guide — Update Schedule & Push Live

## 1. Edit the source table

Open `00_Production_Source_Table.xlsx` in Excel. Make your changes. Save.

## 2. Build the hub

Open `CONC_Hub_Builder.html` in your browser. Drop in the source table (and optionally the previous hub for FRIDGE data). Click **Build**. Download the result.

## 3. Push to live

Copy the updated xlsx + hub HTML into your repo folder, then:

```
cd Desktop/conc-kitchen-hub
git add -A
git commit -m "describe what you changed"
git push
```

Hub is live in ~60 seconds at:
**https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/**

Spreadsheets auto-generated and downloadable at:
- [Production Schedule](https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/01_Production_Schedule_generated.xlsx)
- [Driver Schedule](https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/03_Driver_Schedule_generated.xlsx)
- [Labour Report](https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/Labour_Report_generated.xlsx)

---

## If something goes wrong

| Problem | Fix |
|---------|-----|
| Builder says "SheetJS not loaded" | CDN blocked — download `xlsx.full.min.js` and drop it on the builder |
| Builder says "Build failed" | Check the log panel — usually a missing column in the source table |
| `git push` asks for password | Paste your GitHub token (not your password) |
| Token expired | Generate new one at github.com/settings/tokens |
| Action fails on GitHub | Check Actions tab → click failed run → read the error |
| Spreadsheet links 404 | Actions may still be running — wait 60 seconds and try again |
