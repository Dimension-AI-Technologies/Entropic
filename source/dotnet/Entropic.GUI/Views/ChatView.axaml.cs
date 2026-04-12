using System;
using System.ComponentModel;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media;
using Avalonia.Threading;
using Entropic.GUI.Controls.Chat;
using Entropic.GUI.ViewModels;

namespace Entropic.GUI.Views;

public partial class ChatView : UserControl
{
    private DispatcherTimer? _spinnerTimer;
    private double _spinnerAngle;

    public ChatView()
    {
        InitializeComponent();

        var tabs = this.FindControl<TabControl>("ChatTabs");
        if (tabs is not null)
            tabs.SelectionChanged += OnTabChanged;

        DataContextChanged += (_, _) =>
        {
            if (DataContext is ChatViewModel vm)
            {
                // Auto-scan projects on first load
                vm.ScanProjectsCommand.Execute(null);

                vm.IsFollowModeChangedExternally = followState =>
                {
                    var nav = GetActiveTabNavigation();
                    if (nav is null) return;
                    nav.IsFollowMode = followState;
                    if (followState) nav.ScrollToEnd();
                };

                vm.PropertyChanged += OnViewModelPropertyChanged;
            }
        };
    }

    private void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName != nameof(ChatViewModel.IsLoading)) return;
        if (sender is not ChatViewModel vm) return;

        if (vm.IsLoading)
            StartSpinner();
        else
            StopSpinner();
    }

    private void StartSpinner()
    {
        if (_spinnerTimer is not null) return;
        _spinnerAngle = 0;
        _spinnerTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(16) };
        _spinnerTimer.Tick += (_, _) =>
        {
            _spinnerAngle = (_spinnerAngle + 6) % 360;
            var spinner = this.FindControl<Border>("SpinnerBorder");
            if (spinner?.RenderTransform is RotateTransform rt)
                rt.Angle = _spinnerAngle;
        };
        _spinnerTimer.Start();
    }

    private void StopSpinner()
    {
        _spinnerTimer?.Stop();
        _spinnerTimer = null;
    }

    private void OnTabChanged(object? sender, SelectionChangedEventArgs e)
    {
        var nav = GetActiveTabNavigation();
        if (nav is null) return;

        nav.SyncFollowIfNeeded();

        if (DataContext is ChatViewModel vm)
            vm.IsFollowMode = nav.IsFollowMode;
    }

    private IChatTabNavigation? GetActiveTabNavigation()
    {
        var tabs = this.FindControl<TabControl>("ChatTabs");
        return tabs?.SelectedContent as IChatTabNavigation;
    }

    /// <summary>Handle chat-specific navigation keys when this view is active.</summary>
    public void HandleChatKeyDown(KeyEventArgs e)
    {
        var nav = GetActiveTabNavigation();
        if (nav is null) return;

        var shift = e.KeyModifiers.HasFlag(KeyModifiers.Shift);

        switch (e.Key)
        {
            case Key.Home:
                nav.ScrollToTop();
                SyncFollow(nav);
                e.Handled = true;
                break;
            case Key.End:
                nav.ScrollToEnd();
                SyncFollow(nav);
                e.Handled = true;
                break;
            case Key.PageUp:
                nav.PageUp();
                SyncFollow(nav);
                e.Handled = true;
                break;
            case Key.PageDown:
                nav.PageDown();
                SyncFollow(nav);
                e.Handled = true;
                break;
            case Key.Up when shift:
                nav.NavUserPrompt(-1);
                SyncFollow(nav);
                e.Handled = true;
                break;
            case Key.Down when shift:
                nav.NavUserPrompt(1);
                SyncFollow(nav);
                e.Handled = true;
                break;
            case Key.Up:
                nav.NavBubble(-1);
                SyncFollow(nav);
                e.Handled = true;
                break;
            case Key.Down:
                nav.NavBubble(1);
                SyncFollow(nav);
                e.Handled = true;
                break;
        }
    }

    private void SyncFollow(IChatTabNavigation nav)
    {
        if (DataContext is ChatViewModel vm)
            vm.IsFollowMode = nav.IsFollowMode;
    }
}
