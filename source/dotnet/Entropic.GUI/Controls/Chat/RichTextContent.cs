using System;
using System.Text.RegularExpressions;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.Documents;
using Avalonia.Layout;
using Avalonia.Media;
using Entropic.GUI.Models;

namespace Entropic.GUI.Controls.Chat;

/// <summary>
/// Custom control that renders a ChatMessage's text with inline syntax highlighting.
/// Splits text on ``` fenced code blocks. Prose becomes wrapped TextBlocks.
/// Code blocks become monospace TextBlocks with colored Runs from SyntaxTokenizer.
/// </summary>
public partial class RichTextContent : UserControl
{
    public static readonly StyledProperty<ChatMessage?> MessageProperty =
        AvaloniaProperty.Register<RichTextContent, ChatMessage?>(nameof(Message));

    public static readonly StyledProperty<string?> SearchTextProperty =
        AvaloniaProperty.Register<RichTextContent, string?>(nameof(SearchText));

    public ChatMessage? Message
    {
        get => GetValue(MessageProperty);
        set => SetValue(MessageProperty, value);
    }

    public string? SearchText
    {
        get => GetValue(SearchTextProperty);
        set => SetValue(SearchTextProperty, value);
    }

    // VS Code dark theme colors
    private static readonly IBrush KeywordBrush   = new SolidColorBrush(Color.Parse("#569cd6"));
    private static readonly IBrush StringBrush    = new SolidColorBrush(Color.Parse("#ce9178"));
    private static readonly IBrush NumberBrush    = new SolidColorBrush(Color.Parse("#b5cea8"));
    private static readonly IBrush CommentBrush   = new SolidColorBrush(Color.Parse("#6a9955"));

    private static readonly FontFamily MonoFont =
        new("Cascadia Mono, Consolas, Courier New, monospace");

    private IBrush TextFg => new SolidColorBrush(GetResourceColor("ChatTextFg", "#e0e0e0"));
    private IBrush CodeFg => new SolidColorBrush(GetResourceColor("ChatCodeFg", "#d4d4d4"));
    private IBrush CodeBg => new SolidColorBrush(GetResourceColor("ChatCodeBg", "#1e1e1e"));
    private IBrush InlineCodeBg => new SolidColorBrush(GetResourceColor("ChatInlineCodeBg", "#3c3c3c"));
    private IBrush HighlightBg => new SolidColorBrush(GetResourceColor("ChatSearchHighlight", "#FFFF00"));
    private IBrush HighlightFg => new SolidColorBrush(GetResourceColor("ChatSearchHighlightFg", "#000000"));

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
        if (change.Property == MessageProperty || change.Property == SearchTextProperty
            || change.Property.Name == "ActualThemeVariant")
            Rebuild();
    }

    private void Rebuild()
    {
        var msg = Message;
        if (msg is null || string.IsNullOrEmpty(msg.Text))
        {
            Content = null;
            return;
        }

        var panel = new StackPanel { Spacing = 4 };
        var segments = CodeBlockRegex().Split(msg.Text);

        var i = 0;
        while (i < segments.Length)
        {
            if (i % 3 == 0)
            {
                var prose = segments[i].Trim();
                if (!string.IsNullOrEmpty(prose))
                    panel.Children.Add(BuildProse(prose));
                i++;
            }
            else if (i + 1 < segments.Length)
            {
                var code = segments[i + 1].Trim();
                if (!string.IsNullOrEmpty(code))
                    panel.Children.Add(BuildCodeBlock(code));
                i += 2;
            }
            else
            {
                i++;
            }
        }

        Content = panel;
    }

    private TextBlock BuildProse(string text)
    {
        var textFg = TextFg;
        var inlineCodeBg = InlineCodeBg;
        var codeFg = CodeFg;

        var tb = new TextBlock
        {
            TextWrapping = TextWrapping.Wrap,
            FontSize = 13,
            Foreground = textFg,
        };

        var parts = InlineCodeRegex().Split(text);
        foreach (var part in parts)
        {
            if (part.StartsWith('`') && part.EndsWith('`') && part.Length > 1)
            {
                AddRunsWithHighlight(tb, part[1..^1], MonoFont, 12, codeFg, inlineCodeBg);
            }
            else
            {
                var boldParts = BoldRegex().Split(part);
                foreach (var bp in boldParts)
                {
                    if (bp.StartsWith("**") && bp.EndsWith("**") && bp.Length > 4)
                        AddRunsWithHighlight(tb, bp[2..^2], null, 0, null, null, FontWeight.Bold);
                    else if (!string.IsNullOrEmpty(bp))
                        AddRunsWithHighlight(tb, bp, null, 0, null, null);
                }
            }
        }

        return tb;
    }

    /// <summary>
    /// Adds text as Runs to a TextBlock, splitting on search matches and highlighting them.
    /// </summary>
    private void AddRunsWithHighlight(TextBlock tb, string text,
        FontFamily? font, double fontSize, IBrush? fg, IBrush? bg,
        FontWeight weight = FontWeight.Normal)
    {
        var search = SearchText;
        if (string.IsNullOrWhiteSpace(search) || search.Length < 2)
        {
            var run = new Run(text) { FontWeight = weight };
            if (font is not null) run.FontFamily = font;
            if (fontSize > 0) run.FontSize = fontSize;
            if (fg is not null) run.Foreground = fg;
            if (bg is not null) run.Background = bg;
            tb.Inlines!.Add(run);
            return;
        }

        var highlightBg = HighlightBg;
        var highlightFg = HighlightFg;
        var idx = 0;
        while (idx < text.Length)
        {
            var match = text.IndexOf(search, idx, StringComparison.OrdinalIgnoreCase);
            if (match < 0)
            {
                var tail = new Run(text[idx..]) { FontWeight = weight };
                if (font is not null) tail.FontFamily = font;
                if (fontSize > 0) tail.FontSize = fontSize;
                if (fg is not null) tail.Foreground = fg;
                if (bg is not null) tail.Background = bg;
                tb.Inlines!.Add(tail);
                break;
            }

            if (match > idx)
            {
                var before = new Run(text[idx..match]) { FontWeight = weight };
                if (font is not null) before.FontFamily = font;
                if (fontSize > 0) before.FontSize = fontSize;
                if (fg is not null) before.Foreground = fg;
                if (bg is not null) before.Background = bg;
                tb.Inlines!.Add(before);
            }

            var hit = new Run(text[match..(match + search.Length)])
            {
                Background = highlightBg,
                Foreground = highlightFg,
                FontWeight = weight,
            };
            if (font is not null) hit.FontFamily = font;
            if (fontSize > 0) hit.FontSize = fontSize;
            tb.Inlines!.Add(hit);

            idx = match + search.Length;
        }
    }

    private Border BuildCodeBlock(string code)
    {
        var codeFg = CodeFg;
        var codeBg = CodeBg;

        var tb = new TextBlock
        {
            FontFamily = MonoFont,
            FontSize = 12,
            TextWrapping = TextWrapping.NoWrap,
        };

        var tokens = SyntaxTokenizer.Tokenize(code);
        foreach (var token in tokens)
        {
            var brush = token.Kind switch
            {
                TokenKind.Keyword => KeywordBrush,
                TokenKind.String => StringBrush,
                TokenKind.Number => NumberBrush,
                TokenKind.Comment => CommentBrush,
                _ => codeFg,
            };

            tb.Inlines!.Add(new Run(token.Text) { Foreground = brush });
        }

        return new Border
        {
            Background = codeBg,
            CornerRadius = new CornerRadius(6),
            Padding = new Thickness(12, 8),
            Child = new ScrollViewer
            {
                HorizontalScrollBarVisibility = Avalonia.Controls.Primitives.ScrollBarVisibility.Auto,
                VerticalScrollBarVisibility = Avalonia.Controls.Primitives.ScrollBarVisibility.Disabled,
                Content = tb,
            },
        };
    }

    [GeneratedRegex(@"```(\w*)\n(.*?)```", RegexOptions.Singleline)]
    private static partial Regex CodeBlockRegex();

    [GeneratedRegex(@"(`[^`]+`)")]
    private static partial Regex InlineCodeRegex();

    [GeneratedRegex(@"(\*\*.+?\*\*)")]
    private static partial Regex BoldRegex();
}
