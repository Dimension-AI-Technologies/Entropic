using System;
using System.IO;
using Avalonia.Controls;
using Entropic.GUI.ViewModels;

namespace Entropic.GUI.Controls.Chat;

public partial class WebViewChat : UserControl, IChatTabNavigation
{
    private bool _isFollowMode;
    private bool _hostReadyWired;

    public bool IsFollowMode
    {
        get => _isFollowMode;
        set => _isFollowMode = value;
    }

    private NativeWebView2Host? Host => this.FindControl<NativeWebView2Host>("WebViewHost");

    public WebViewChat()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, EventArgs e)
    {
        Console.Error.WriteLine("[WebViewChat] DataContextChanged");
        if (DataContext is ChatViewModel vm)
        {
            vm.PropertyChanged += OnViewModelPropertyChanged;
            WireHostReady();
            // Try loading now in case HtmlFilePath is already set
            LoadHtml();
        }
    }

    private void WireHostReady()
    {
        if (_hostReadyWired) return;
        var host = Host;
        if (host is null)
        {
            Console.Error.WriteLine("[WebViewChat] Host is null in WireHostReady");
            return;
        }
        host.Ready += () =>
        {
            Console.Error.WriteLine("[WebViewChat] Host Ready fired, attempting LoadHtml");
            LoadHtml();
        };
        _hostReadyWired = true;
    }

    private void OnViewModelPropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(ChatViewModel.HtmlFilePath))
        {
            Console.Error.WriteLine("[WebViewChat] HtmlFilePath changed, calling LoadHtml");
            LoadHtml();
        }
    }

    private void LoadHtml()
    {
        var host = Host;
        if (host is null)
        {
            Console.Error.WriteLine("[WebViewChat] LoadHtml: host is null");
            return;
        }

        if (DataContext is not ChatViewModel vm)
        {
            Console.Error.WriteLine("[WebViewChat] LoadHtml: no VM");
            return;
        }
        if (string.IsNullOrEmpty(vm.HtmlFilePath))
        {
            Console.Error.WriteLine("[WebViewChat] LoadHtml: HtmlFilePath is empty");
            return;
        }

        var fullPath = Path.GetFullPath(vm.HtmlFilePath);
        if (File.Exists(fullPath))
        {
            var uri = $"file:///{fullPath.Replace('\\', '/')}";
            Console.Error.WriteLine($"[WebViewChat] LoadHtml: navigating to {uri}");
            host.Navigate(uri);
        }
        else
        {
            Console.Error.WriteLine($"[WebViewChat] LoadHtml: file not found: {fullPath}");
        }
    }

    private async void RunJs(string script)
    {
        var host = Host;
        if (host is null) return;
        try { await host.ExecuteScriptAsync(script); }
        catch { /* WebView not ready */ }
    }

    public void ScrollToTop()
    {
        _isFollowMode = false;
        RunJs("if(typeof navToFirst==='function') navToFirst(); else (document.getElementById('messages')||document.documentElement).scrollTop=0;");
    }

    public void ScrollToEnd()
    {
        _isFollowMode = true;
        RunJs("if(typeof navToLast==='function') navToLast(); else {var m=document.getElementById('messages');if(m)m.scrollTop=m.scrollHeight;}");

    }

    public void PageUp()
    {
        _isFollowMode = false;
        RunJs("var m=document.getElementById('messages');if(m)m.scrollTop-=m.clientHeight;");
    }

    public void PageDown()
    {
        _isFollowMode = false;
        RunJs("var m=document.getElementById('messages');if(m)m.scrollTop+=m.clientHeight;");
    }

    public void NavBubble(int direction)
    {
        RunJs($"navBubble({direction})");
    }

    public void NavUserPrompt(int direction)
    {
        RunJs($"navPrompt({direction})");
    }

    public void SyncFollowIfNeeded()
    {
        if (_isFollowMode)
            RunJs("var m=document.getElementById('messages');if(m)m.scrollTop=m.scrollHeight;");
    }
}
