using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Entropic.GUI.Models;

public enum TokenKind { Plain, Keyword, String, Number, Comment, Punctuation }

public readonly record struct Token(string Text, TokenKind Kind);

/// <summary>
/// Regex-based syntax tokenizer matching GetCCChat's Python _highlight_code approach.
/// Produces a flat list of colored tokens from a code string.
/// </summary>
public static partial class SyntaxTokenizer
{
    // Order matters: comments first, then strings, numbers, keywords, punctuation
    private static readonly (Regex Pattern, TokenKind Kind)[] Rules =
    [
        (CommentRegex(), TokenKind.Comment),
        (DoubleStringRegex(), TokenKind.String),
        (SingleStringRegex(), TokenKind.String),
        (NumberRegex(), TokenKind.Number),
        (KeywordRegex(), TokenKind.Keyword),
    ];

    public static List<Token> Tokenize(string code)
    {
        var tokens = new List<Token>();
        var pos = 0;

        while (pos < code.Length)
        {
            // Single pass: find the earliest match across all rules from current position
            Match? bestMatch = null;
            var bestKind = TokenKind.Plain;
            var bestIndex = code.Length;

            foreach (var (pattern, kind) in Rules)
            {
                var m = pattern.Match(code, pos);
                if (!m.Success) continue;

                // Exact match at current position — take it immediately (priority order)
                if (m.Index == pos)
                {
                    bestMatch = m;
                    bestKind = kind;
                    bestIndex = pos;
                    break;
                }

                // Otherwise track the nearest upcoming match
                if (m.Index < bestIndex)
                {
                    bestMatch = m;
                    bestKind = kind;
                    bestIndex = m.Index;
                }
            }

            // Emit plain text before the next match
            if (bestIndex > pos)
            {
                tokens.Add(new Token(code[pos..bestIndex], TokenKind.Plain));
                pos = bestIndex;
            }

            // Emit the matched token
            if (bestMatch is not null && bestIndex == pos)
            {
                tokens.Add(new Token(bestMatch.Value, bestKind));
                pos += bestMatch.Length;
            }
        }

        return tokens;
    }

    [GeneratedRegex(@"(?://.*?$|#.*?$)", RegexOptions.Multiline)]
    private static partial Regex CommentRegex();

    [GeneratedRegex("\"(?:[^\"\\\\]|\\\\.)*\"")]
    private static partial Regex DoubleStringRegex();

    [GeneratedRegex("'(?:[^'\\\\]|\\\\.)*'")]
    private static partial Regex SingleStringRegex();

    [GeneratedRegex(@"\b\d+\.?\d*\b")]
    private static partial Regex NumberRegex();

    [GeneratedRegex(
        @"\b(?:def|class|if|elif|else|for|while|return|import|from|in|not|and|or|is|None|True|False"
        + @"|function|const|let|var|async|await|try|catch|except|finally|raise|yield"
        + @"|public|private|static|void|int|string|bool|new|this|self|null|undefined"
        + @"|sub|my|use|require|our|local)\b")]
    private static partial Regex KeywordRegex();
}
