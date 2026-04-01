#!/usr/bin/env python3
"""
assemble_builder.py — Assembles the CONC Hub Builder (browser build tool)

Reads the hub template files (hub_shell.html, hub_rcp.js, hub_logic.js)
and embeds them into the builder HTML alongside the ported pipeline logic.

Run this whenever hub template files change to regenerate the builder.

Usage:
  python3 assemble_builder.py              # auto-detect SheetJS
  python3 assemble_builder.py --download   # download SheetJS from CDN & embed

If xlsx.full.min.js exists in the same directory, it's embedded directly
(fully offline build — no CDN needed at runtime). Otherwise, the builder
falls back to CDN loading with manual-load fallback UI.

Output:
  CONC_Hub_Builder.html — the single-file browser build tool
"""

from pathlib import Path
import base64, sys

BASE = Path(__file__).parent

SHEETJS_LOCAL = BASE / 'xlsx.full.min.js'
SHEETJS_URLS = [
    'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
]

def read(name):
    return (BASE / name).read_text(encoding='utf-8')

def to_b64(name):
    raw = (BASE / name).read_bytes()
    b64 = base64.b64encode(raw).decode()
    print(f"  {name}: {len(raw):,} bytes → {len(b64):,} base64 chars")
    return b64

def download_sheetjs():
    """Try to download SheetJS to local file."""
    import urllib.request, ssl
    ctx = ssl.create_default_context()
    for url in SHEETJS_URLS:
        print(f"  Trying: {url}")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                data = resp.read()
                if len(data) > 100_000 and b'XLSX' in data:
                    SHEETJS_LOCAL.write_bytes(data)
                    print(f"  ✓ Downloaded SheetJS: {len(data):,} bytes")
                    return True
        except Exception as e:
            print(f"  ✗ Failed: {e}")
    return False

# ── Handle --download flag ───────────────────────────────────────────────────
if '--download' in sys.argv and not SHEETJS_LOCAL.exists():
    print("Downloading SheetJS…")
    if not download_sheetjs():
        print("  Could not download. Will use CDN fallback.")

# ── Read template parts as base64 ────────────────────────────────────────────
print("Encoding templates…")
shell_b64 = to_b64('hub_shell.html')
rcp_b64   = to_b64('hub_rcp.js')
logic_b64 = to_b64('hub_logic.js')

# ── Embed build tool core as base64 ─────────────────────────────────────────
builder_core_b64 = base64.b64encode(read('builder_core.js').encode('utf-8')).decode('ascii')
builder_css  = read('builder_ui.css')
builder_html = read('builder_ui.html')
print(f"  builder_core.js: {len(read('builder_core.js')):,} bytes → {len(builder_core_b64):,} base64 chars")

# ── SheetJS: embed inline or use CDN fallback ───────────────────────────────
if SHEETJS_LOCAL.exists():
    sheetjs_content = SHEETJS_LOCAL.read_text(encoding='utf-8')
    sheetjs_block = f'<script>/* SheetJS (bundled) */\n{sheetjs_content}\n</script>'
    print(f"  SheetJS: BUNDLED ({len(sheetjs_content):,} chars) — fully offline")
else:
    # CDN with fallback chain — NO integrity attr (causes silent failures)
    sheetjs_block = """<script>window._sheetjsCDN=0;</script>
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
        crossorigin="anonymous"
        onerror="window._sheetjsCDN=1"></script>
<script>
if (window._sheetjsCDN) {
  var s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}
</script>"""
    print("  SheetJS: CDN mode (not bundled)")
    print("  Tip: Place xlsx.full.min.js in this directory, or run with --download, to bundle it")

# ── Assemble ─────────────────────────────────────────────────────────────────
output = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CONC Kitchen — Hub Builder</title>
<script>
// Apply saved theme before first paint — prevents flash
(function(){{
  var s=localStorage.getItem('conc-builder-theme');
  if(s==='dark') document.documentElement.setAttribute('data-theme','dark');
  else if(s==='light') document.documentElement.setAttribute('data-theme','light');
}})();
</script>
<style>
{builder_css}
</style>
</head>
<body>

{builder_html}

<!-- ═══ SheetJS (xlsx parser) ═══ -->
{sheetjs_block}

<!-- ═══ Embedded Hub Templates (base64) + Pipeline Logic + UI Controller ═══ -->
<script>
// UTF-8 safe base64 decoder (atob returns Latin-1, mangles multi-byte chars)
function _d(b){{var r=atob(b),a=new Uint8Array(r.length);for(var i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return new TextDecoder().decode(a)}}

const TPL_SHELL = _d('{shell_b64}');
const TPL_RCP   = _d('{rcp_b64}');
const TPL_LOGIC = _d('{logic_b64}');

// Decode and execute the pipeline core logic (also UTF-8 — needs _d)
eval(_d('{builder_core_b64}'));
</script>

</body>
</html>
"""

# Inject dark mode toggle JS — runs after DOM ready
dm_js = """
<script>
function downloadPushBat() {
  var bat = '@echo off\\r\\ngit add -A\\r\\ngit commit -m "Update %DATE%"\\r\\ngit pull --rebase\\r\\ngit push\\r\\npause\\r\\n';
  var a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(bat);
  a.download = 'push.bat';
  a.click();
}
function builderToggleDark() {
  var html = document.documentElement;
  var cur = html.getAttribute('data-theme');
  var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark = cur === 'dark' || (cur !== 'light' && sysDark);
  var next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('conc-builder-theme', next);
  var btn = document.getElementById('dmToggle');
  if (btn) btn.textContent = next === 'dark' ? '☀ Light' : '🌙 Dark';
}
// Sync button label on load
(function() {
  var html = document.documentElement;
  var saved = localStorage.getItem('conc-builder-theme');
  var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark = saved === 'dark' || (saved !== 'light' && sysDark);
  var btn = document.getElementById('dmToggle');
  if (btn) btn.textContent = isDark ? '☀ Light' : '🌙 Dark';
})();
</script>
"""
output = output.replace('</body>\n</html>', dm_js + '</body>\n</html>')

out_path = BASE / 'CONC_Hub_Builder.html'
out_path.write_text(output, encoding='utf-8')
print(f"\n✓ Written: {out_path} ({len(output):,} chars)")

bundled = "BUNDLED (offline)" if SHEETJS_LOCAL.exists() else "CDN (requires network on first load)"
print(f"  SheetJS mode: {bundled}")
