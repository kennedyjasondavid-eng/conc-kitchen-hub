# Quick Guide — Update Schedule & Push Live

## 1. Edit the source table

Open `00_Production_Source_Table.xlsx` in Excel. Make your changes. Save.

## 2. Open terminal

```
cd Desktop\conc-kitchen-hub
```

## 3. Generate outputs (optional but recommended)

```
python generate_all.py
```

Check for warnings. If it says `✓ All checks passed` — you're good.

## 4. Push to live

```
git add -A
git commit -m "describe what you changed"
git push
```

Hub is live in ~60 seconds at:
**https://kennedyjasondavid-eng.github.io/conc-kitchen-hub/**

---

## If something goes wrong

| Problem | Fix |
|---------|-----|
| `python not found` | Try `python3` instead of `python` |
| Validation warnings | Run `python generate_all.py --verbose` to see details |
| `git push` asks for password | Paste your GitHub token (not your password) |
| Token expired | Generate new one at github.com/settings/tokens |
| Action fails on GitHub | Check Actions tab → click failed run → read the error |
