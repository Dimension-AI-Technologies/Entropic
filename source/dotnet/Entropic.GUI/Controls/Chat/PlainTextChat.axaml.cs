using System;
using System.Collections.Specialized;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Threading;
using Entropic.GUI.Models;
using Entropic.GUI.ViewModels;

namespace Entropic.GUI.Controls.Chat;

public partial class PlainTextChat : UserControl, IChatTabNavigation
{
    private bool _isFollowMode;
    private const double BottomThreshold = 2.0;

    public bool IsFollowMode
    {
        get => _isFollowMode;
        set => _isFollowMode = value;
    }

    private ScrollViewer? Scroller => this.FindControl<ScrollViewer>("ChatScrollViewer");

    public PlainTextChat()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object? sender, EventArgs e)
    {
        if (DataContext is ChatViewModel vm)
        {
            vm.FilteredGroups.CollectionChanged += OnMessagesChanged;

            var sv = Scroller;
            if (sv is not null)
            {
                var timeline = this.FindControl<ChatTimeline>("Timeline");
                timeline?.Bind(vm.FilteredGroups, sv, idx => ScrollToMessageIndex(sv, idx));
            }

            var toolbar = this.FindControl<ChatToolbar>("Toolbar");
            if (toolbar is not null)
            {
                toolbar.NavUpClicked += () => NavUserPrompt(-1);
                toolbar.NavDownClicked += () => NavUserPrompt(1);
                toolbar.CollapseClicked += () => vm.IsCollapsed = !vm.IsCollapsed;
                toolbar.ScreenshotClicked += () => (VisualRoot as Views.MainWindow)?.TakeScreenshotPublic();
            }
        }

        var sv2 = Scroller;
        if (sv2 is not null)
            sv2.PropertyChanged += OnScrollerPropertyChanged;
    }

    private void OnScrollerPropertyChanged(object? sender, AvaloniaPropertyChangedEventArgs e)
    {
        if (e.Property == ScrollViewer.OffsetProperty && sender is ScrollViewer sv)
        {
            _isFollowMode = IsAtBottom(sv);
            UpdateNavCounter();
        }
    }

    private void OnMessagesChanged(object? sender, NotifyCollectionChangedEventArgs e)
    {
        if (_isFollowMode && e.Action == NotifyCollectionChangedAction.Add)
        {
            Dispatcher.UIThread.Post(() => Scroller?.ScrollToEnd(),
                DispatcherPriority.Background);
        }
    }

    public void ScrollToTop()
    {
        _isFollowMode = false;
        Scroller?.ScrollToHome();
    }

    public void ScrollToEnd()
    {
        _isFollowMode = true;
        Scroller?.ScrollToEnd();
    }

    public void PageUp()
    {
        _isFollowMode = false;
        var sv = Scroller;
        if (sv is null) return;
        sv.Offset = new Vector(sv.Offset.X, Math.Max(0, sv.Offset.Y - sv.Viewport.Height));
    }

    public void PageDown()
    {
        var sv = Scroller;
        if (sv is null) return;
        sv.Offset = new Vector(sv.Offset.X, sv.Offset.Y + sv.Viewport.Height);
        _isFollowMode = IsAtBottom(sv);
    }

    public void NavBubble(int direction)
    {
        ScrollToGroupByPredicate(direction, _ => true);
    }

    public void NavUserPrompt(int direction)
    {
        ScrollToGroupByPredicate(direction, g => g.IsUser);
    }

    public void SyncFollowIfNeeded()
    {
        if (_isFollowMode)
            Scroller?.ScrollToEnd();
    }

    private void ScrollToGroupByPredicate(int direction, Func<ChatMessageGroup, bool> predicate)
    {
        var sv = Scroller;
        if (sv is null) return;
        if (DataContext is not ChatViewModel vm) return;

        var currentIdx = FindTopVisibleMessageIndex(sv);
        var startIdx = currentIdx + direction;

        if (direction > 0)
        {
            for (var i = startIdx; i < vm.FilteredGroups.Count; i++)
            {
                if (predicate(vm.FilteredGroups[i]))
                {
                    ScrollToMessageIndex(sv, i);
                    return;
                }
            }
        }
        else
        {
            for (var i = Math.Min(startIdx, vm.FilteredGroups.Count - 1); i >= 0; i--)
            {
                if (predicate(vm.FilteredGroups[i]))
                {
                    ScrollToMessageIndex(sv, i);
                    return;
                }
            }
        }
    }

    private int FindTopVisibleMessageIndex(ScrollViewer sv)
    {
        var itemsControl = sv.Content as ItemsControl;
        var panel = itemsControl?.ItemsPanelRoot;
        if (panel is null) return 0;

        var bestIdx = 0;
        var bestDist = double.MaxValue;

        for (var i = 0; i < panel.Children.Count; i++)
        {
            var child = panel.Children[i];
            var transform = child.TransformToVisual(sv);
            if (transform is null) continue;
            var pos = transform.Value.Transform(new Point(0, 0));
            var dist = Math.Abs(pos.Y);
            if (dist < bestDist)
            {
                bestDist = dist;
                bestIdx = i;
            }
        }

        return bestIdx;
    }

    private void ScrollToMessageIndex(ScrollViewer sv, int index)
    {
        var itemsControl = sv.Content as ItemsControl;
        var panel = itemsControl?.ItemsPanelRoot;
        if (panel is null || index < 0 || index >= panel.Children.Count) return;

        var child = panel.Children[index];
        var transform = child.TransformToVisual(sv);
        if (transform is null) return;

        var pos = transform.Value.Transform(new Point(0, 0));
        sv.Offset = new Vector(sv.Offset.X, Math.Max(0, sv.Offset.Y + pos.Y));
        _isFollowMode = IsAtBottom(sv);
    }

    private void UpdateNavCounter()
    {
        if (DataContext is not ChatViewModel vm) return;
        var sv = Scroller;
        if (sv is null) return;

        var topIdx = FindTopVisibleMessageIndex(sv);
        var promptsBefore = 0;
        var totalPrompts = 0;
        for (var i = 0; i < vm.FilteredGroups.Count; i++)
        {
            if (!vm.FilteredGroups[i].IsUser) continue;
            totalPrompts++;
            if (i <= topIdx) promptsBefore = totalPrompts;
        }
        vm.NavPositionText = $"{promptsBefore} / {totalPrompts}";
    }

    private static bool IsAtBottom(ScrollViewer sv)
        => sv.Offset.Y + sv.Viewport.Height >= sv.Extent.Height - BottomThreshold;
}
