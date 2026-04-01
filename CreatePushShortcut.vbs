' CreatePushShortcut.vbs
' Creates a desktop shortcut for CONC Hub Push and tries to pin to taskbar.
' Drop your icon (.ico) in the same folder as this script. Double-click to run.

Dim fso, shell, scriptDir, repoDir, htaPath, icoPath, lnkPath

Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' ── Use the folder this script lives in as the repo folder ───────────────────
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Also check the standard repo paths as fallback
Dim paths(2)
paths(0) = scriptDir
paths(1) = "C:\Users\Jason\Desktop\conc-kitchen-hub"
paths(2) = "C:\Users\JasonKennedy\OneDrive - CHRISTIE OSSINGTON NEIGHBOURHOOD CENTRE\conc-kitchen-hub"

repoDir = ""
Dim i
For i = 0 To 2
    If fso.FileExists(paths(i) & "\CONC_Hub_Builder_Push.hta") Then
        repoDir = paths(i)
        Exit For
    End If
Next

If repoDir = "" Then
    MsgBox "ERROR: CONC_Hub_Builder_Push.hta not found." & vbCrLf & _
           "Place this script in the repo folder.", vbCritical, "CONC Push Setup"
    WScript.Quit
End If

htaPath = repoDir & "\CONC_Hub_Builder_Push.hta"

' ── Find .ico in same folder as this script ───────────────────────────────────
Dim iconLocation
iconLocation = "C:\Windows\System32\mshta.exe,0"  ' default fallback

Dim folder, file
Set folder = fso.GetFolder(repoDir)
For Each file In folder.Files
    If LCase(fso.GetExtensionName(file.Name)) = "ico" Then
        iconLocation = file.Path & ",0"
        Exit For
    End If
Next

' ── Create desktop shortcut ───────────────────────────────────────────────────
Dim desktop
desktop  = shell.SpecialFolders("Desktop")
lnkPath  = desktop & "\CONC Push.lnk"

Dim lnk
Set lnk = shell.CreateShortcut(lnkPath)
lnk.TargetPath       = "C:\Windows\System32\mshta.exe"
lnk.Arguments        = Chr(34) & htaPath & Chr(34)
lnk.WorkingDirectory = repoDir
lnk.Description      = "CONC Hub -- Push to GitHub"
lnk.IconLocation     = iconLocation
lnk.Save()

' ── Try to pin to taskbar ─────────────────────────────────────────────────────
Dim pinned
pinned = False

On Error Resume Next
Dim shellApp, desktopFolder, item
Set shellApp      = CreateObject("Shell.Application")
Set desktopFolder = shellApp.Namespace(desktop)
Set item          = desktopFolder.ParseName("CONC Push.lnk")

Dim v
For Each v In item.Verbs
    If InStr(v.Name, "taskbar") > 0 Or InStr(v.Name, "Taskbar") > 0 Then
        v.DoIt
        pinned = True
        Exit For
    End If
Next
On Error GoTo 0

' ── Result ────────────────────────────────────────────────────────────────────
Dim iconMsg
If iconLocation = "C:\Windows\System32\mshta.exe,0" Then
    iconMsg = vbCrLf & "(No .ico found -- using default icon)"
Else
    iconMsg = vbCrLf & "Icon: " & fso.GetFileName(Left(iconLocation, Len(iconLocation)-2))
End If

If pinned Then
    MsgBox "Done!" & iconMsg & vbCrLf & vbCrLf & _
           "Shortcut created on Desktop and pinned to taskbar.", _
           vbInformation, "CONC Push Setup"
Else
    MsgBox "Shortcut created on Desktop." & iconMsg & vbCrLf & vbCrLf & _
           "To pin to taskbar:" & vbCrLf & _
           "  1. Find 'CONC Push' on your Desktop" & vbCrLf & _
           "  2. Right-click -> Pin to taskbar", _
           vbInformation, "CONC Push Setup"
End If
