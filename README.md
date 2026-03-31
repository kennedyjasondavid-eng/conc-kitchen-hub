# CONC Kitchen — Production Hub Pipeline

Single source of truth → browser builder → live dashboard + spreadsheet downloads.

**Live hub:** https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/

---

## How It Works

```
00_Production_Source_Table.xlsx   ← you edit this
        │
        ├──→ CONC_Hub_Builder.html (browser)  → CONC_Production_Hub.html
        │                                              │
        └──→ generate_all.py (GitHub Actions)  → xlsx spreadsheets
                                                       │
                                          Push to repo → GitHub Pages
                                                       │
                                              Live at single URL
```

**You edit one file** (the source table). The builder makes the hub. Actions makes the spreadsheets. Pages serves everything.

---

## What You Need

**On your computer:**
- **Git** — [git-scm.com/downloads](https://git-scm.com/downloads)
- **A web browser** — for the Hub Builder (no Python needed for hub generation)

**For spreadsheet generation (optional — Actions handles this):**
- **Python 3.10+** — [python.org/downloads](https://python.org/downloads) (check "Add to PATH")
- **openpyxl** — `pip install openpyxl`

**Online:**
- A **GitHub account** — [github.com/signup](https://github.com/signup)

---

## Daily Workflow

### 1. Edit the source table

Open `00_Production_Source_Table.xlsx` in Excel. Make your changes. Save.

### 2. Build the hub

Open `CONC_Hub_Builder.html` in your browser. Drag in the source table. Click Build. Download the generated hub.

Optionally, drag in the previous hub to carry forward the FRIDGE block.

### 3. Push to GitHub

Copy the updated source table and hub HTML into your local repo folder, then:

```
cd Desktop/conc-kitchen-hub
git add -A
git commit -m "Updated Wk2 Thursday dinner"
git push
```

Or use **GitHub Desktop** — stage, commit, push from the UI.

Actions runs automatically: generates xlsx spreadsheets, deploys hub + spreadsheets to Pages. Live in ~60 seconds.

### 4. Access outputs

**Hub (interactive):**
https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/

**Spreadsheets (direct download links):**
- [Production Schedule](https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/01_Production_Schedule_generated.xlsx)
- [Driver Schedule](https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/03_Driver_Schedule_generated.xlsx)
- [Labour Report](https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/Labour_Report_generated.xlsx)

---

## Running Locally (Optional)

If you have Python + openpyxl installed, you can generate everything locally:

```
python3 generate_all.py              # generate everything
python3 generate_all.py --xlsx-only  # just the spreadsheets
python3 generate_all.py --hub-only   # just the hub HTML
python3 generate_all.py --verbose    # show all validation warnings
```

Outputs go to the `outputs/` folder.

---

## What Each File Does

| File | Role | Who edits it |
|------|------|-------------|
| `00_Production_Source_Table.xlsx` | Single source of truth — all production data | **You** |
| `CONC_Hub_Builder.html` | Browser-based hub generator (no Python needed) | Claude (when builder changes needed) |
| `generate_all.py` | Generates xlsx spreadsheets + labour rules | Claude (when pipeline changes needed) |
| `hub_shell.html` | Hub CSS + HTML skeleton | Claude (when UI changes needed) |
| `hub_rcp.js` | Recipe URL mappings (~146 entries) | Claude (when recipes added/renamed) |
| `hub_logic.js` | Hub interactivity (filters, search, print) | Claude (when features added) |
| `CONC_Production_Hub.html` | The live hub — carries FRIDGE capacity data | Built by Hub Builder |
| `deploy.yml` | GitHub Actions workflow | Rarely changes |

**You only ever edit the source table.** Everything else is generated or maintained separately.

---

## Repo Structure

```
conc-kitchen-hub/
├── 00_Production_Source_Table.xlsx    ← THE source of truth (you edit this)
├── CONC_Production_Hub.html          ← hub output (from builder)
├── CONC_Hub_Builder.html             ← browser build tool
├── generate_all.py                   ← pipeline script (runs in Actions)
├── hub_shell.html                    ← hub template: CSS + HTML
├── hub_rcp.js                        ← hub template: recipe URLs
├── hub_logic.js                      ← hub template: UI logic
├── Quick_Guide.md                    ← cheat sheet
├── README.md                         ← this file
└── .github/
    └── workflows/
        └── deploy.yml                ← auto-deploy on push
```

---

## Source Table Column Reference

| # | Column | Values | Notes |
|---|--------|--------|-------|
| 1 | week | 1–4 | |
| 2 | day | SUNDAY–SATURDAY | All caps |
| 3 | period | SEND AM / LUNCH / PRODUCTION / DINNER / SEND PM | Controls section placement |
| 4 | type | COOK / HEAT / PREP / SEND AM / SEND PM | Controls row color |
| 5 | item | Free text | Item or task name |
| 6 | qty | Free text | "80 lbs", "3 bins", "185 pcs" |
| 7 | portion | Free text | Per-resident portion |
| 8 | packaging | hotel / vac / bus bin / bag | |
| 9 | yield | Free text | Output: "2u", "3 hotels" |
| 10 | notes | Free text | ⚠ triggers warning badge in hub |
| 11 | cook_min | Integer | Minutes. 480 = overnight |
| 12 | site | Bloor / LAN / GC / Rex / Vendor | |
| 13 | serves_week | 1–4 | When the item is served |
| 14 | serves_day | SUNDAY–SATURDAY | When the item is served |
| 15 | serves_meal | LUNCH / DINNER / PRODUCTION | |
| 16 | hotel_equiv | Number | Hotel pan equivalents for van load |
| 17 | van_run | AM / PM | SEND rows only |
| 18 | prod_date_raw | "Serves: ..." or "Produced: ..." | Human-readable reference |
| 19 | hold_days | Integer | Days between production and service |
| 20 | dest_override | Bloor / Rex / LAN / (blank) | Override auto-derived fridge destination |

---

## Labour Rules (in generate_all.py)

| Type | Active time | Oven time |
|------|------------|-----------|
| HEAT | 15 min (setup only) | 0 |
| Overnight (Philly Steak) | 30 min (setup only) | Full cook_min |
| Long cooks (stews/simmers) | 50% of cook_min | Full cook_min |
| Standard COOK | Full cook_min | Full cook_min |
| PREP | Full cook_min | 0 |

**Long cook items:** massaman, arroz con pollo, fried rice, white chili, sous vide, sausage pasta sauce, west african peanut stew, caribbean stew, beef & vegetable stew, vegan chili, chickpea shakshuka, beef stroganoff

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `python3 not found` | Try `python` instead, or reinstall with "Add to PATH" |
| `No module named openpyxl` | `pip install openpyxl` |
| Hub Builder says "SheetJS not loaded" | CDN blocked — download `xlsx.full.min.js` and drop it on the builder page |
| GitHub Action fails | Actions tab → click failed run → read the error |
| Hub looks wrong after push | Build locally with Hub Builder first to check |
| `git push` asks for password | Paste your GitHub token (not your password) |
| Token expired | Generate new one at github.com/settings/tokens |
| Validation warnings | Run `python3 generate_all.py --verbose` for details |
