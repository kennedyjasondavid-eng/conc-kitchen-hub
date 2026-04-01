# CreatePushShortcut.ps1
# Creates a desktop shortcut for CONC Hub Push and pins it to the taskbar.
# Drop your icon (.ico) in the repo folder alongside this script.
# Run once: right-click -> Run with PowerShell

$paths = @(
    "C:\Users\Jason\Desktop\conc-kitchen-hub",
    "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub"
)

# Find repo folder
$repoDir = $null
foreach ($p in $paths) {
    if (Test-Path $p) { $repoDir = $p; break }
}
if (-not $repoDir) {
    Write-Host "ERROR: Repo folder not found. Edit the paths in this script." -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit
}

$htaPath = Join-Path $repoDir "CONC_Hub_Builder_Push.hta"
$mshta   = "C:\Windows\System32\mshta.exe"

if (-not (Test-Path $htaPath)) {
    Write-Host "ERROR: CONC_Hub_Builder_Push.hta not found in $repoDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit
}

# Find icon (.ico) in repo folder -- use first one found
$icoFile = Get-ChildItem -Path $repoDir -Filter "*.ico" -File | Select-Object -First 1
if ($icoFile) {
    $iconLocation = "$($icoFile.FullName),0"
    Write-Host "Icon: $($icoFile.Name)" -ForegroundColor Cyan
} else {
    $iconLocation = "$mshta,0"
    Write-Host "No .ico found in repo folder -- using default icon." -ForegroundColor Yellow
    Write-Host "Drop a .ico file there and re-run to apply it." -ForegroundColor Yellow
}

# Create desktop shortcut
$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "CONC Push.lnk"

$shell = New-Object -ComObject WScript.Shell
$lnk   = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath       = $mshta
$lnk.Arguments        = "`"$htaPath`""
$lnk.WorkingDirectory = $repoDir
$lnk.Description      = "CONC Hub -- Push to GitHub"
$lnk.IconLocation     = $iconLocation
$lnk.Save()

Write-Host "Desktop shortcut created: $lnkPath" -ForegroundColor Green

# Pin to taskbar via Shell verb
try {
    $shellApp = New-Object -ComObject Shell.Application
    $folder   = $shellApp.Namespace($desktop)
    $item     = $folder.ParseName("CONC Push.lnk")
    $verbs    = $item.Verbs()

    $pinVerb = $null
    foreach ($v in $verbs) {
        if ($v.Name -match "Pin to tas&kbar|Pin to taskbar|taskbar") {
            $pinVerb = $v; break
        }
    }

    if ($pinVerb) {
        $pinVerb.DoIt()
        Write-Host "Pinned to taskbar." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Auto-pin unavailable on this Windows version." -ForegroundColor Yellow
        Write-Host "To pin manually: right-click 'CONC Push' on Desktop -> Pin to taskbar" -ForegroundColor White
    }
} catch {
    Write-Host ""
    Write-Host "Auto-pin skipped. To pin manually:" -ForegroundColor Yellow
    Write-Host "  Right-click 'CONC Push' on Desktop -> Pin to taskbar" -ForegroundColor White
}

Write-Host ""
Read-Host "Done. Press Enter to close"
