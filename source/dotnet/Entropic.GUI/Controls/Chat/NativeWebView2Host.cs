using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Platform;
using Microsoft.Web.WebView2.Core;

namespace Entropic.GUI.Controls.Chat;

/// <summary>
/// Hosts a native Win32 WebView2 instance inside Avalonia via NativeControlHost.
/// Windows-only â€” on other platforms this renders as an empty panel.
/// </summary>
public class NativeWebView2Host : NativeControlHost
{
    private CoreWebView2Controller? _controller;
    private CoreWebView2? _coreWebView;
    private string? _pendingUri;
    private string? _pendingScript;
    private IntPtr _hwnd;

    /// <summary>Fired when CoreWebView2 is ready â€” consumers can navigate at this point.</summary>
    public event Action? Ready;

    public bool IsReady => _coreWebView is not null;

    public void Navigate(string uri)
    {
        Console.Error.WriteLine($"[WebView2Host] Navigate called: {uri}, IsReady={IsReady}");
        if (_coreWebView is not null)
            _coreWebView.Navigate(uri);
        else
            _pendingUri = uri;
    }

    public async Task<string?> ExecuteScriptAsync(string script)
    {
        if (_coreWebView is not null)
            return await _coreWebView.ExecuteScriptAsync(script);

        _pendingScript = script;
        return null;
    }

    protected override IPlatformHandle CreateNativeControlCore(IPlatformHandle parent)
    {
        Console.Error.WriteLine($"[WebView2Host] CreateNativeControlCore, Bounds={Bounds}");
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return base.CreateNativeControlCore(parent);

        _hwnd = CreateWindowEx(0, "Static", "", 0x40000000 | 0x10000000, // WS_CHILD | WS_VISIBLE
            0, 0, (int)Bounds.Width, (int)Bounds.Height,
            parent.Handle, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);

        Console.Error.WriteLine($"[WebView2Host] HWND created: {_hwnd}");
        InitWebView2Async(_hwnd);
        return new PlatformHandle(_hwnd, "HWND");
    }

    protected override void DestroyNativeControlCore(IPlatformHandle control)
    {
        Console.Error.WriteLine("[WebView2Host] DestroyNativeControlCore");
        _controller?.Close();
        _controller = null;
        _coreWebView = null;

        if (_hwnd != IntPtr.Zero)
        {
            DestroyWindow(_hwnd);
            _hwnd = IntPtr.Zero;
        }
    }

    private async void InitWebView2Async(IntPtr hwnd)
    {
        try
        {
            Console.Error.WriteLine("[WebView2Host] Creating WebView2 environment...");
            var env = await CoreWebView2Environment.CreateAsync();
            Console.Error.WriteLine("[WebView2Host] Creating controller...");
            _controller = await env.CreateCoreWebView2ControllerAsync(hwnd);
            _coreWebView = _controller.CoreWebView2;
            Console.Error.WriteLine("[WebView2Host] Controller ready!");

            // Size the WebView2 to fill the host
            UpdateControllerBounds();

            // Forward JS console.log to stderr for debugging
            _coreWebView.WebMessageReceived += (_, args) =>
                Console.Error.WriteLine($"[WebView2 JS] {args.WebMessageAsJson}");

            // Inject fixes after every navigation
            _coreWebView.NavigationCompleted += (_, _) =>
            {
                _coreWebView.ExecuteScriptAsync(
                    "document.documentElement.style.overflowX='hidden';" +
                    "document.body.style.overflowX='hidden';" +
                    // Redirect console.log to WebView2 host for debugging
                    "if(!window._logHooked){" +
                    "  var _origLog=console.log;" +
                    "  console.log=function(){" +
                    "    _origLog.apply(console,arguments);" +
                    "    try{window.chrome.webview.postMessage(Array.from(arguments).join(' '));}catch(e){}" +
                    "  };" +
                    "  window._logHooked=true;" +
                    "}");
            };

            // Navigate to pending URI if any
            if (_pendingUri is not null)
            {
                Console.Error.WriteLine($"[WebView2Host] Navigating to pending URI: {_pendingUri}");
                _coreWebView.Navigate(_pendingUri);
                _pendingUri = null;
            }
            else
            {
                Console.Error.WriteLine("[WebView2Host] No pending URI");
            }

            if (_pendingScript is not null)
            {
                await _coreWebView.ExecuteScriptAsync(_pendingScript);
                _pendingScript = null;
            }

            Ready?.Invoke();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[WebView2Host] Init failed: {ex}");
        }
    }

    protected override void OnSizeChanged(SizeChangedEventArgs e)
    {
        base.OnSizeChanged(e);
        UpdateControllerBounds();
    }

    private void UpdateControllerBounds()
    {
        if (_controller is null || _hwnd == IntPtr.Zero) return;

        var width = (int)Bounds.Width;
        var height = (int)Bounds.Height;
        if (width < 1 || height < 1) return;

        SetWindowPos(_hwnd, IntPtr.Zero, 0, 0, width, height, 0x0002 | 0x0004); // SWP_NOMOVE | SWP_NOZORDER
        _controller.Bounds = new System.Drawing.Rectangle(0, 0, width, height);
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr CreateWindowEx(int exStyle, string className, string windowName,
        int style, int x, int y, int width, int height,
        IntPtr parent, IntPtr menu, IntPtr instance, IntPtr param);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool DestroyWindow(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetWindowPos(IntPtr hwnd, IntPtr hWndInsertAfter,
        int x, int y, int cx, int cy, uint flags);
}

/// <summary>
/// Simple IPlatformHandle wrapper for a raw HWND.
/// </summary>
file class PlatformHandle : IPlatformHandle
{
    public PlatformHandle(IntPtr handle, string descriptor)
    {
        Handle = handle;
        HandleDescriptor = descriptor;
    }

    public IntPtr Handle { get; }
    public string HandleDescriptor { get; }
}
