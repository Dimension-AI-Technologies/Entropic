#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Launches both TypeScript/Electron and Avalonia GUIs, captures screenshots
    of each tab/view. Re-run anytime to refresh comparisons.

.PARAMETER SkipLaunch
    Assumes both apps are already running; just captures screenshots.

.PARAMETER StartupWaitMs
    Wait time after launching (default 12000).

.PARAMETER TabSwitchWaitMs
    Wait time after switching tabs before capture (default 3000).
#>

param(
    [string]$OutputDir = (Join-Path $PSScriptRoot "screenshots"),
    [switch]$SkipLaunch,
    [int]$StartupWaitMs = 12000,
    [int]$TabSwitchWaitMs = 3000
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

# --- Win32 helpers ---
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;

public class ScreenshotHelper {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll", EntryPoint = "GetWindowThreadProcessId")]
    public static extern uint GetWindowThread(IntPtr hWnd, IntPtr processId);

    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);

    [DllImport("user32.dll")]
    public static extern bool RedrawWindow(IntPtr hWnd, IntPtr lprcUpdate, IntPtr hrgnUpdate, uint flags);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    // SendInput structures
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public INPUTUNION u;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUTUNION {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx, dy;
        public uint mouseData, dwFlags, time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk, wScan;
        public uint dwFlags, time;
        public IntPtr dwExtraInfo;
    }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    public const uint INPUT_KEYBOARD = 1;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const ushort VK_CONTROL = 0x11;
    public const ushort VK_1 = 0x31;

    public static IntPtr FindWindowByTitleAndProcess(string contains, string processName) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((hWnd, _) => {
            if (!IsWindowVisible(hWnd)) return true;
            var sb = new StringBuilder(512);
            GetWindowText(hWnd, sb, 512);
            string title = sb.ToString();
            if (title.IndexOf(contains, StringComparison.OrdinalIgnoreCase) < 0) return true;
            if (processName != null) {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                try {
                    var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                    if (proc.ProcessName.IndexOf(processName, StringComparison.OrdinalIgnoreCase) < 0)
                        return true;
                } catch { return true; }
            }
            found = hWnd;
            return false;
        }, IntPtr.Zero);
        return found;
    }

    public static void ForceFocus(IntPtr hWnd) {
        uint targetThread = GetWindowThread(hWnd, IntPtr.Zero);
        uint currentThread = GetCurrentThreadId();
        if (targetThread != currentThread)
            AttachThreadInput(currentThread, targetThread, true);
        ShowWindow(hWnd, 9);
        SetForegroundWindow(hWnd);
        if (targetThread != currentThread)
            AttachThreadInput(currentThread, targetThread, false);
        System.Threading.Thread.Sleep(500);
    }

    /// Send Ctrl+key (e.g. Ctrl+1) via SendInput.
    public static void SendCtrlKey(ushort vk) {
        var inputs = new INPUT[4];
        int size = Marshal.SizeOf(typeof(INPUT));

        inputs[0].type = INPUT_KEYBOARD;
        inputs[0].u.ki.wVk = VK_CONTROL;

        inputs[1].type = INPUT_KEYBOARD;
        inputs[1].u.ki.wVk = vk;

        inputs[2].type = INPUT_KEYBOARD;
        inputs[2].u.ki.wVk = vk;
        inputs[2].u.ki.dwFlags = KEYEVENTF_KEYUP;

        inputs[3].type = INPUT_KEYBOARD;
        inputs[3].u.ki.wVk = VK_CONTROL;
        inputs[3].u.ki.dwFlags = KEYEVENTF_KEYUP;

        SendInput(4, inputs, size);
        System.Threading.Thread.Sleep(200);
    }

    /// Capture a window using PrintWindow with PW_RENDERFULLCONTENT.
    public static void CaptureWindow(IntPtr hWnd, string savePath) {
        // Force full repaint: RDW_INVALIDATE | RDW_UPDATENOW | RDW_ALLCHILDREN = 0x0085
        RedrawWindow(hWnd, IntPtr.Zero, IntPtr.Zero, 0x0085);
        System.Threading.Thread.Sleep(800);

        RECT rect;
        GetWindowRect(hWnd, out rect);
        int w = rect.Right - rect.Left;
        int h = rect.Bottom - rect.Top;
        if (w <= 0 || h <= 0) throw new Exception("Window zero size: " + w + "x" + h);

        using (var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
            using (var g = Graphics.FromImage(bmp)) {
                IntPtr hdc = g.GetHdc();
                PrintWindow(hWnd, hdc, 2); // PW_RENDERFULLCONTENT
                g.ReleaseHdc(hdc);
            }
            bmp.Save(savePath, ImageFormat.Png);
        }
    }
}
"@ -ReferencedAssemblies System.Drawing, System.Diagnostics.Process

# --- Paths ---
$repoRoot   = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
$tsDir      = Join-Path $repoRoot "source\typescript"
$dotnetDir  = Join-Path $repoRoot "source\dotnet"

# --- Launch apps ---
if (-not $SkipLaunch) {
    Write-Host "Killing existing instances..." -ForegroundColor Yellow
    Get-Process -Name "electron", "Entropic.GUI" -ErrorAction SilentlyContinue |
        Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Write-Host "Launching TypeScript/Electron GUI..." -ForegroundColor Cyan
    $npxPath = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
    if (-not $npxPath) { $npxPath = "C:\Program Files\nodejs\npx.cmd" }
    Start-Process -FilePath $npxPath -ArgumentList "electron", "." -WorkingDirectory $tsDir -WindowStyle Normal

    Write-Host "Launching Avalonia GUI..." -ForegroundColor Cyan
    $dotnetPath = (Get-Command dotnet.exe -ErrorAction SilentlyContinue).Source
    if (-not $dotnetPath) { $dotnetPath = "dotnet.exe" }
    Start-Process -FilePath $dotnetPath -ArgumentList "run", "--project", "$dotnetDir\Entropic.GUI\Entropic.GUI.csproj" -WindowStyle Normal

    Write-Host "Waiting ${StartupWaitMs}ms for both apps to start..." -ForegroundColor Yellow
    Start-Sleep -Milliseconds $StartupWaitMs
}

# --- Find windows ---
Write-Host "Finding windows..." -ForegroundColor Cyan
$electronHwnd = [ScreenshotHelper]::FindWindowByTitleAndProcess("Entropic", "electron")
$avaloniaHwnd = [ScreenshotHelper]::FindWindowByTitleAndProcess("Entropic", "Entropic.GUI")

if ($electronHwnd -eq [IntPtr]::Zero) { Write-Warning "Electron window not found!" }
else { Write-Host "  Electron window: $electronHwnd" -ForegroundColor Green }

if ($avaloniaHwnd -eq [IntPtr]::Zero) { Write-Warning "Avalonia window not found!" }
else { Write-Host "  Avalonia window: $avaloniaHwnd" -ForegroundColor Green }

# --- Tab definitions ---
# VK codes for 1-4
$tabKeys = @(0x31, 0x32, 0x33, 0x34)
$tabNames = @("project", "global", "git", "commit")

function Capture-WithKeyboard {
    param(
        [IntPtr]$Hwnd,
        [string]$AppName
    )

    if ($Hwnd -eq [IntPtr]::Zero) {
        Write-Host "  SKIP $AppName (no window)" -ForegroundColor DarkGray
        return
    }

    for ($i = 0; $i -lt 4; $i++) {
        # Focus the window and ensure it receives input
        [ScreenshotHelper]::ForceFocus($Hwnd)
        Start-Sleep -Milliseconds 500

        # Send Ctrl+1/2/3/4 to switch tab (send twice for reliability)
        [ScreenshotHelper]::SendCtrlKey($tabKeys[$i])
        Start-Sleep -Milliseconds 200
        [ScreenshotHelper]::SendCtrlKey($tabKeys[$i])

        # Wait for tab content to render
        Start-Sleep -Milliseconds $TabSwitchWaitMs

        $path = Join-Path $OutputDir "${AppName}_$($tabNames[$i]).png"
        try {
            [ScreenshotHelper]::CaptureWindow($Hwnd, $path)
            Write-Host "  Captured: $($tabNames[$i])" -ForegroundColor Green
        } catch {
            Write-Host "  FAILED: $($tabNames[$i]) - $_" -ForegroundColor Red
        }
    }
}

# --- Capture ---
# Electron: just capture whatever view it's currently on
Write-Host "`nCapturing Electron current view..." -ForegroundColor Cyan
if ($electronHwnd -ne [IntPtr]::Zero) {
    [ScreenshotHelper]::ForceFocus($electronHwnd)
    Start-Sleep -Milliseconds 1000
    $path = Join-Path $OutputDir "electron_current.png"
    try {
        [ScreenshotHelper]::CaptureWindow($electronHwnd, $path)
        Write-Host "  Captured: current view" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
    }
}

Write-Host "`nCapturing Avalonia tabs (Ctrl+1..4)..." -ForegroundColor Cyan
Capture-WithKeyboard -Hwnd $avaloniaHwnd -AppName "avalonia"

# --- Summary ---
Write-Host "`nScreenshots saved to: $OutputDir" -ForegroundColor Green
Get-ChildItem $OutputDir -Filter "*.png" | Sort-Object Name | ForEach-Object {
    Write-Host "  $($_.Name) ($([math]::Round($_.Length / 1KB, 1)) KB)" -ForegroundColor Gray
}
Write-Host "`nDone." -ForegroundColor Green
