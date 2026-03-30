# CONC Kitchen — Production Hub Pipeline

Single source of truth → one command → all outputs + live dashboard.

---

## What You Need

**On your computer:**
- **Git** — [git-scm.com/downloads](https://git-scm.com/downloads) (Windows installer, keep all defaults)
- **Python 3.10+** — [python.org/downloads](https://python.org/downloads) (check "Add to PATH" during install)
- **openpyxl** — after Python is installed, open a terminal and run: `pip install openpyxl`
- **VS Code** (optional but recommended) — [code.visualstudio.com](https://code.visualstudio.com) — makes file editing and git pushes easier

**Online:**
- A **GitHub account** — [github.com/signup](https://github.com/signup) (free)

---

## One-Time Setup (≈15 minutes)

### Step 1: Create the GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `conc-kitchen-hub` (or whatever you want)
3. Set to **Private** (only you can see it)
4. Check **"Add a README file"**
5. Click **Create repository**

### Step 2: Clone it to your computer

Open a terminal (Command Prompt on Windows, Terminal on Mac) and run:

```
cd Desktop
git clone https://github.com/YOUR_USERNAME/conc-kitchen-hub.git
cd conc-kitchen-hub
```

Replace `YOUR_USERNAME` with your actual GitHub username. It'll ask for your GitHub password — use a **Personal Access Token** instead (GitHub doesn't accept passwords anymore):

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens?type=beta)
2. Click **"Generate new token"** → Fine-grained token
3. Name: `conc-hub`, Expiration: 90 days, Repository access: your repo only
4. Permissions → Repository → Contents: Read and write
5. Generate → **copy the token** (you won't see it again)
6. Paste it when git asks for your password

### Step 3: Add your files

After cloning, you'll have a folder at `Desktop/conc-kitchen-hub/` on your computer. Copy your pipeline files directly into it — either drag-and-drop in File Explorer or Finder. When you're done it should look like this:

```
Desktop/
└── conc-kitchen-hub/          ← git created this folder in Step 2
    ├── 00_Production_Source_Table.xlsx    ← THE source of truth (you edit this)
    ├── generate_all.py                    ← the pipeline script
    ├── hub_shell.html                     ← hub template: CSS + HTML structure
    ├── hub_rcp.js                         ← hub template: recipe URL mappings
    ├── hub_logic.js                       ← hub template: UI logic
    ├── CONC_Production_Hub.html           ← last hub build (carries FRIDGE data)
    ├── .github/
    │   └── workflows/
    │       └── deploy.yml                 ← auto-deploy on push
    └── README.md                          ← this file
```

**Note:** The `.github` folder is hidden by default on Mac/Windows. If you're copying manually, make sure it gets into the repo. Easiest way: copy `deploy.yml` into the folder, then from terminal run:
```
mkdir -p .github/workflows
mv deploy.yml .github/workflows/
```

The `hub_shell.html`, `hub_rcp.js`, and `hub_logic.js` are the three template parts that the pipeline assembles into the hub. These need to be split out of the current `CONC_Production_Hub.html` — we'll do that in a separate session. Until then, `python3 generate_all.py --xlsx-only` generates the spreadsheets without needing them.

### Step 4: Push everything to GitHub

```
git add -A
git commit -m "Initial pipeline setup"
git push
```

### Step 5: Enable GitHub Pages

1. Go to your repo on GitHub → **Settings** tab
2. Left sidebar → **Pages**
3. Source: change to **GitHub Actions**
4. That's it — the deploy.yml workflow handles the rest

### Step 6: Verify it works

1. Go to your repo → **Actions** tab
2. You should see a workflow run triggered by your push
3. Wait ~60 seconds for it to complete (green checkmark)
4. Your hub is now live at: `https://YOUR_USERNAME.github.io/conc-kitchen-hub/`

---

## Daily Workflow

### When you change the menu or production schedule:

**1. Edit the source table**

Open `00_Production_Source_Table.xlsx` in Excel. Make your changes — add items, update quantities, change sites, etc. Save.

**2. Generate outputs locally (optional but recommended)**

```
cd Desktop/conc-kitchen-hub
python3 generate_all.py
```

This produces all outputs in the `outputs/` folder and shows you validation results. Fix any warnings before pushing.

**3. Push to GitHub**

```
git add -A
git commit -m "Updated Wk2 Thursday dinner"
git push
```

The GitHub Action runs automatically: builds the hub, deploys to Pages. Live in ~60 seconds.

**If you use VS Code:** Open the folder, make your edits, then use the Source Control panel (branch icon on the left) to stage, commit, and push — no terminal needed.

---

## Running Locally

You don't need GitHub to generate outputs. On any computer with Python + openpyxl:

```
python3 generate_all.py              # generate everything
python3 generate_all.py --xlsx-only  # just the spreadsheets (skip hub)
python3 generate_all.py --hub-only   # just the hub HTML
python3 generate_all.py --verbose    # show all validation warnings
```

Outputs go to the `outputs/` folder:
- `CONC_Production_Hub.html` — open in browser to preview
- `01_Production_Schedule_generated.xlsx`
- `03_Driver_Schedule_generated.xlsx`
- `Labour_Report_generated.xlsx`

---

## What Each File Does

| File | Role | Who edits it |
|------|------|-------------|
| `00_Production_Source_Table.xlsx` | Single source of truth — all production data | **You** |
| `generate_all.py` | Reads source, generates all outputs | Claude (when pipeline changes needed) |
| `hub_shell.html` | Hub CSS + HTML skeleton | Claude (when UI changes needed) |
| `hub_rcp.js` | Recipe URL mappings (~146 entries) | Claude (when recipes added/renamed) |
| `hub_logic.js` | Hub interactivity (filters, search, print) | Claude (when features added) |
| `CONC_Production_Hub.html` | Last build — carries FRIDGE capacity data | Auto-generated (but FRIDGE block carried forward) |
| `deploy.yml` | GitHub Actions workflow | Rarely changes |

**The key point:** You only ever edit the source table. Everything else is generated or maintained separately.

---

## Custom Domain (Optional)

To use a custom URL like `hub.conckitchen.ca` instead of `github.io`:

1. Buy/configure the domain through your registrar
2. Add a DNS CNAME record: `hub` → `YOUR_USERNAME.github.io`
3. In your repo, create a file called `CNAME` containing just: `hub.conckitchen.ca`
4. In GitHub repo Settings → Pages → Custom domain: enter `hub.conckitchen.ca`
5. Check "Enforce HTTPS" once the DNS propagates (~10 min)

---

## Troubleshooting

**"python3 not found"**
→ On Windows, try `python` instead of `python3`. Or reinstall Python and check "Add to PATH".

**"No module named openpyxl"**
→ Run `pip install openpyxl` (or `pip3 install openpyxl`).

**GitHub Action fails**
→ Go to Actions tab → click the failed run → read the red error. Most common: a file is missing from the repo.

**Hub looks wrong after push**
→ Open `outputs/CONC_Production_Hub.html` locally first to check. The `node --check` validation in the build catches JS syntax errors.

**"Authentication failed" on git push**
→ Your token may have expired. Generate a new one at github.com/settings/tokens.

**Validation warnings won't go away**
→ Run `python3 generate_all.py --verbose` to see which specific rows have issues.

---

## Source Table Column Reference

| # | Column | Values | Notes |
|---|--------|--------|-------|
| 1 | week | 1–4 | |
| 2 | day | SUNDAY–SATURDAY | All caps |
| 3 | period | SEND AM / LUNCH / PRODUCTION / DINNER / SEND PM | Controls section placement |
| 4 | type | COOK / HEAT / PREP / SEND AM / SEND PM | Controls row color |
| 5 | item | Free text | Item or task name |
| 6 | qty | Free text | "80 lbs", "3 bins", "185" |
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
| 19 | hold_days | Integer | Auto-calculated. Days between production and service |
| 20 | dest_override | Bloor / Rex / LAN / (blank) | Override auto-derived fridge destination |
