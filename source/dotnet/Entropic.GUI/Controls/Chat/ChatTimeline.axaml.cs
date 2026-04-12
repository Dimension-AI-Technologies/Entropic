using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media;
using Entropic.GUI.Models;

namespace Entropic.GUI.Controls.Chat;

public partial class ChatTimeline : UserControl
{
    private readonly List<(Border Marker, int GroupIndex)> _markers = [];
    private int _activeIdx = -1;
    private ObservableCollection<ChatMessageGroup>? _groups;
    private ScrollViewer? _scrollViewer;
    private Action<int>? _onMarkerClick;

    public ChatTimeline()
    {
        InitializeComponent();
        SizeChanged += (_, _) => Rebuild();
    }

    /// <summary>
    /// Bind the timeline to a messages collection and scroll viewer.
    /// onMarkerClick receives the message index to scroll to.
    /// </summary>
    public void Bind(ObservableCollection<ChatMessageGroup> groups, ScrollViewer scrollViewer,
                     Action<int> onMarkerClick)
    {
        _groups = groups;
        _scrollViewer = scrollViewer;
        _onMarkerClick = onMarkerClick;

        groups.CollectionChanged += (_, _) => Rebuild();
        scrollViewer.PropertyChanged += (_, e) =>
        {
            if (e.Property == ScrollViewer.OffsetProperty)
                UpdateActiveFromScroll();
        };

        Rebuild();
    }

    private void Rebuild()
    {
        var canvas = this.FindControl<Canvas>("MarkerCanvas");
        if (canvas is null || _groups is null) return;

        canvas.Children.Clear();
        _markers.Clear();

        // Collect user group indices
        var userIndices = new List<int>();
        for (var i = 0; i < _groups.Count; i++)
        {
            if (_groups[i].IsUser)
                userIndices.Add(i);
        }

        if (userIndices.Count == 0) return;

        var height = Bounds.Height;
        if (height < 10) return;

        for (var idx = 0; idx < userIndices.Count; idx++)
        {
            var groupIdx = userIndices[idx];
            var firstMsg = _groups[groupIdx].First;

            var marker = new Border
            {
                Width = 20,
                Height = 5,
                CornerRadius = new CornerRadius(3),
                Background = new SolidColorBrush(Color.Parse("#4a90d9")),
                Opacity = 0.35,
                Cursor = new Cursor(StandardCursorType.Hand),
            };

            var top = Math.Round((double)idx / userIndices.Count * (height - 8));
            Canvas.SetTop(marker, top);
            Canvas.SetLeft(marker, 3);

            var preview = (firstMsg.ShortTimestamp ?? "") + "\n" +
                         (firstMsg.Text?.Length > 200 ? firstMsg.Text[..200] + "..." : firstMsg.Text ?? "");
            var capturedPreview = preview;
            marker.PointerEntered += (_, e) => ShowTooltip(capturedPreview, top);
            marker.PointerExited += (_, _) => HideTooltip();

            var capturedGroupIdx = groupIdx;
            var capturedMarkerIdx = idx;
            marker.PointerPressed += (_, _) =>
            {
                SetActive(capturedMarkerIdx);
                _onMarkerClick?.Invoke(capturedGroupIdx);
            };

            canvas.Children.Add(marker);
            _markers.Add((marker, groupIdx));
        }

        UpdateActiveFromScroll();
    }

    private void SetActive(int markerIdx)
    {
        if (_activeIdx >= 0 && _activeIdx < _markers.Count)
        {
            _markers[_activeIdx].Marker.Opacity = 0.35;
            _markers[_activeIdx].Marker.Width = 20;
            _markers[_activeIdx].Marker.Height = 5;
            Canvas.SetLeft(_markers[_activeIdx].Marker, 3);
        }

        _activeIdx = markerIdx;

        if (_activeIdx >= 0 && _activeIdx < _markers.Count)
        {
            _markers[_activeIdx].Marker.Opacity = 1;
            _markers[_activeIdx].Marker.Width = 24;
            _markers[_activeIdx].Marker.Height = 9;
            Canvas.SetLeft(_markers[_activeIdx].Marker, 1);
        }
    }

    private void UpdateActiveFromScroll()
    {
        if (_scrollViewer is null || _groups is null || _markers.Count == 0) return;

        int bestMarkerIdx;

        // At very top â†’ first marker
        if (_scrollViewer.Offset.Y <= 5)
        {
            bestMarkerIdx = 0;
        }
        // At very bottom â†’ last marker
        else if (_scrollViewer.Offset.Y + _scrollViewer.Viewport.Height >=
                 _scrollViewer.Extent.Height - 5)
        {
            bestMarkerIdx = _markers.Count - 1;
        }
        else
        {
            var itemsControl = _scrollViewer.Content as ItemsControl;
            var panel = itemsControl?.ItemsPanelRoot;
            if (panel is null) return;

            var scrollY = _scrollViewer.Offset.Y + 50;
            bestMarkerIdx = 0;
            for (var mi = 0; mi < _markers.Count; mi++)
            {
                var groupIdx = _markers[mi].GroupIndex;
                if (groupIdx >= panel.Children.Count) continue;

                var child = panel.Children[groupIdx];
                var transform = child.TransformToVisual(_scrollViewer);
                if (transform is null) continue;

                var pos = transform.Value.Transform(new Point(0, 0));
                var absY = _scrollViewer.Offset.Y + pos.Y;
                if (absY <= scrollY) bestMarkerIdx = mi;
            }
        }

        if (bestMarkerIdx != _activeIdx)
            SetActive(bestMarkerIdx);
    }

    private void ShowTooltip(string text, double markerTop)
    {
        var tooltip = this.FindControl<Border>("Tooltip");
        var tooltipText = this.FindControl<TextBlock>("TooltipText");
        if (tooltip is null || tooltipText is null) return;

        tooltipText.Text = text;
        tooltip.IsVisible = true;
        Canvas.SetTop(tooltip, markerTop);
        Canvas.SetLeft(tooltip, 30);
    }

    private void HideTooltip()
    {
        var tooltip = this.FindControl<Border>("Tooltip");
        if (tooltip is not null)
            tooltip.IsVisible = false;
    }
}
