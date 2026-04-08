using System;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Documents;
using Avalonia.Media;
using Avalonia.Styling;

namespace Entropic.GUI.Controls.Chat;

/// <summary>
/// TextBlock that highlights search term matches with a yellow background.
/// Drop-in replacement for TextBlock in PlainText renderer.
/// </summary>
public class HighlightTextBlock : TextBlock
{
    public static readonly StyledProperty<string?> SearchTextProperty =
        AvaloniaProperty.Register<HighlightTextBlock, string?>(nameof(SearchText));

    public string? SearchText
    {
        get => GetValue(SearchTextProperty);
        set => SetValue(SearchTextProperty, value);
    }

    private IBrush HighlightBg => new SolidColorBrush(GetResourceColor("ChatSearchHighlight", "#FFFF00"));
    private IBrush HighlightFgBrush => new SolidColorBrush(GetResourceColor("ChatSearchHighlightFg", "#000000"));

    private Color GetResourceColor(string key, string fallback)
    {
        if (this.TryFindResource(key, ActualThemeVariant, out var res))
        {
            if (res is Color c) return c;
            if (res is SolidColorBrush b) return b.Color;
        }
        return Color.Parse(fallback);
    }

    protected override void OnPropertyChanged(AvaloniaPropertyChangedEventArgs change)
    {
        base.OnPropertyChanged(change);
        if (change.Property == TextProperty || change.Property == SearchTextProperty
            || change.Property.Name == "ActualThemeVariant")
            RebuildInlines();
    }

    private void RebuildInlines()
    {
        var text = Text;
        var search = SearchText;

        // No search or too short â€” let base TextBlock render normally via Text property
        if (string.IsNullOrEmpty(text) || string.IsNullOrWhiteSpace(search) || search.Length < 2)
        {
            Inlines?.Clear();
            return;
        }

        // Build highlighted inlines, suppress base Text rendering
        Inlines ??= new InlineCollection();
        Inlines.Clear();

        var highlightBg = HighlightBg;
        var highlightFg = HighlightFgBrush;
        var idx = 0;

        while (idx < text.Length)
        {
            var match = text.IndexOf(search, idx, StringComparison.OrdinalIgnoreCase);
            if (match < 0)
            {
                Inlines.Add(new Run(text[idx..]));
                break;
            }

            if (match > idx)
                Inlines.Add(new Run(text[idx..match]));

            Inlines.Add(new Run(text[match..(match + search.Length)])
            {
                Background = highlightBg,
                Foreground = highlightFg,
            });

            idx = match + search.Length;
        }
    }
}
