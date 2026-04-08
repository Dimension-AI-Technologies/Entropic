using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Entropic.GUI.Models;

/// <summary>
/// Loads chat data from GetCCChat JSON output files and parses JSONL directly.
/// Returns Result-style (no exceptions).
/// </summary>
public static class ChatLoader
{
    // -----------------------------------------------------------------------
    // JSONL Parsing — replaces the Python get_claude_code_chat.py script
    // -----------------------------------------------------------------------

    private static readonly Regex SystemReminderRe = new(
        @"<system-reminder>.*?</system-reminder>", RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex ImageRefRe = new(
        @"^\[Image: source: [^\]]+\]$", RegexOptions.Compiled);

    private static readonly Regex ImageNumRe = new(
        @"\[Image #(\d+)\]", RegexOptions.Compiled);

    private static readonly Regex ExcessNewlinesRe = new(
        @"\n{3,}", RegexOptions.Compiled);

    private static readonly Regex ImgPlaceholderRe = new(
        @"\x00IMG\d+\x00", RegexOptions.Compiled);

    private static readonly Regex[] NoisePatterns =
    [
        new(@"^That's the old task", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^Already (?:read|processed)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^Internal (?:agent )?test run", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^Another internal agent", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^\s*$", RegexOptions.Compiled),
    ];

    private static readonly Regex[] CliPromptPatterns =
    [
        new(@"^You are translating code from", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^You are annotating source code", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^You are creating the directory structure", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^You are fixing a failing or shallow test", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^You are writing.*tests? for", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^You are deepening.*tests? for", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"^generate a git commit message", RegexOptions.IgnoreCase | RegexOptions.Compiled),
    ];

    private static readonly HashSet<string> PlanTaskTools = ["ExitPlanMode", "TaskCreate", "TaskUpdate"];
    private static readonly HashSet<string> AgentTools = ["Agent"];

    /// <summary>Parse an ISO 8601 timestamp from a JSONL line.</summary>
    public static DateTimeOffset ParseTimestamp(string ts)
    {
        ts = ts.Replace("Z", "+00:00");
        if (DateTimeOffset.TryParse(ts, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dto))
            return dto;
        return DateTimeOffset.MinValue;
    }

    /// <summary>Extract only text blocks from assistant content (skip tool_use, thinking).</summary>
    private static string ExtractTextFromAssistant(JsonElement content)
    {
        if (content.ValueKind != JsonValueKind.Array) return "";
        var parts = new List<string>();
        foreach (var block in content.EnumerateArray())
        {
            if (block.ValueKind == JsonValueKind.String)
            {
                var s = block.GetString()?.Trim();
                if (!string.IsNullOrEmpty(s)) parts.Add(s);
            }
            else if (block.ValueKind == JsonValueKind.Object &&
                     block.TryGetProperty("type", out var typeProp) &&
                     typeProp.GetString() == "text")
            {
                var s = block.TryGetProperty("text", out var textProp) ? textProp.GetString()?.Trim() : null;
                if (!string.IsNullOrEmpty(s)) parts.Add(s);
            }
        }
        return string.Join("\n\n", parts);
    }

    /// <summary>Extract text and optionally images from user message content.</summary>
    private static (string Text, List<ChatImage> Images) ExtractTextFromUser(
        JsonElement content, bool includeImages = false)
    {
        var images = new List<ChatImage>();

        if (content.ValueKind == JsonValueKind.String)
            return (content.GetString()?.Trim() ?? "", images);

        if (content.ValueKind != JsonValueKind.Array)
            return ("", images);

        var parts = new List<string>();
        foreach (var block in content.EnumerateArray())
        {
            if (block.ValueKind == JsonValueKind.String)
            {
                var s = block.GetString()?.Trim();
                if (!string.IsNullOrEmpty(s)) parts.Add(s);
                continue;
            }
            if (block.ValueKind != JsonValueKind.Object) continue;

            var type = block.TryGetProperty("type", out var tp) ? tp.GetString() : null;
            if (type == "text")
            {
                var s = block.TryGetProperty("text", out var textProp) ? textProp.GetString()?.Trim() : null;
                if (!string.IsNullOrEmpty(s)) parts.Add(s);
            }
            else if (type == "image" && includeImages)
            {
                if (block.TryGetProperty("source", out var src) &&
                    src.TryGetProperty("type", out var srcType) && srcType.GetString() == "base64" &&
                    src.TryGetProperty("data", out var dataProp))
                {
                    var mediaType = src.TryGetProperty("media_type", out var mt) ? mt.GetString() ?? "image/png" : "image/png";
                    images.Add(new ChatImage { MediaType = mediaType, Data = dataProp.GetString() ?? "" });
                    parts.Add($"\x00IMG{images.Count - 1}\x00");
                }
            }
        }
        return (string.Join("\n\n", parts), images);
    }

    /// <summary>Extract tool_use blocks matching any of the given names.</summary>
    private static List<JsonElement> ExtractToolCalls(JsonElement content, HashSet<string> names)
    {
        var results = new List<JsonElement>();
        if (content.ValueKind != JsonValueKind.Array) return results;
        foreach (var block in content.EnumerateArray())
        {
            if (block.ValueKind == JsonValueKind.Object &&
                block.TryGetProperty("type", out var tp) && tp.GetString() == "tool_use" &&
                block.TryGetProperty("name", out var np) && names.Contains(np.GetString() ?? ""))
            {
                results.Add(block);
            }
        }
        return results;
    }

    private static bool IsNoise(string text)
    {
        foreach (var pat in NoisePatterns)
            if (pat.IsMatch(text)) return true;
        return false;
    }

    /// <summary>Build a map from subagent description -> agentId using meta.json files.</summary>
    private static Dictionary<string, string> BuildDescToAgentMap(string jsonlPath)
    {
        var result = new Dictionary<string, string>();
        var stem = Path.GetFileNameWithoutExtension(jsonlPath);
        var dir = Path.GetDirectoryName(jsonlPath);
        if (dir is null) return result;
        var subagentDir = Path.Combine(dir, stem, "subagents");
        if (!Directory.Exists(subagentDir)) return result;

        foreach (var metaFile in Directory.GetFiles(subagentDir, "*.meta.json"))
        {
            try
            {
                var data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
                    File.ReadAllText(metaFile));
                if (data is null) continue;
                var desc = data.TryGetValue("description", out var d) ? d.GetString() ?? "" : "";
                if (string.IsNullOrEmpty(desc)) continue;
                // agent-a04183ef50485a70c.meta.json -> a04183ef50485a70c
                var agentId = Path.GetFileNameWithoutExtension(metaFile)
                    .Replace(".meta", "").Replace("agent-", "");
                result[desc] = agentId;
            }
            catch { /* malformed metadata */ }
        }
        return result;
    }

    /// <summary>Detect whether a session is a programmatic CLI invocation.</summary>
    private static string GetSessionEntrypoint(string path)
    {
        var ep = "unknown";
        var firstUserText = "";
        try
        {
            using var reader = new StreamReader(path, System.Text.Encoding.UTF8);
            string? line;
            while ((line = reader.ReadLine()) is not null)
            {
                line = line.Trim();
                if (line.Length == 0) continue;
                using var doc = JsonDocument.Parse(line);
                var root = doc.RootElement;

                if (ep == "unknown" && root.TryGetProperty("entrypoint", out var epProp))
                {
                    var found = epProp.GetString();
                    if (!string.IsNullOrEmpty(found)) ep = found;
                }

                if (string.IsNullOrEmpty(firstUserText) &&
                    root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "user")
                {
                    if (root.TryGetProperty("message", out var msg) &&
                        msg.TryGetProperty("content", out var content))
                    {
                        if (content.ValueKind == JsonValueKind.String)
                            firstUserText = content.GetString()?.Trim() ?? "";
                        else if (content.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var block in content.EnumerateArray())
                            {
                                if (block.ValueKind == JsonValueKind.Object &&
                                    block.TryGetProperty("type", out var bt) && bt.GetString() == "text")
                                {
                                    firstUserText = block.TryGetProperty("text", out var tt)
                                        ? tt.GetString()?.Trim() ?? "" : "";
                                    break;
                                }
                            }
                        }
                    }
                }

                if (ep != "unknown" && firstUserText.Length > 0) break;
            }
        }
        catch { /* IO or JSON error */ }

        if (ep == "sdk-cli") return "sdk-cli";
        foreach (var pat in CliPromptPatterns)
            if (pat.IsMatch(firstUserText)) return "sdk-cli";
        return ep != "unknown" ? ep : "cli";
    }

    /// <summary>Read first and last timestamps from a JSONL file.</summary>
    private static (DateTimeOffset? First, DateTimeOffset? Last) GetSessionTimeRange(string path)
    {
        DateTimeOffset? first = null, last = null;
        try
        {
            // Read first timestamp
            using (var reader = new StreamReader(path, System.Text.Encoding.UTF8))
            {
                string? line;
                while ((line = reader.ReadLine()) is not null)
                {
                    line = line.Trim();
                    if (line.Length == 0) continue;
                    using var doc = JsonDocument.Parse(line);
                    if (doc.RootElement.TryGetProperty("timestamp", out var tsProp))
                    {
                        var ts = tsProp.GetString();
                        if (!string.IsNullOrEmpty(ts))
                        {
                            first = ParseTimestamp(ts);
                            break;
                        }
                    }
                }
            }

            // Read last timestamp from tail of file
            using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            var size = fs.Length;
            var tailSize = (int)Math.Min(4096, size);
            fs.Seek(-tailSize, SeekOrigin.End);
            var buf = new byte[tailSize];
            _ = fs.Read(buf, 0, tailSize);
            var tail = System.Text.Encoding.UTF8.GetString(buf);

            var lines = tail.Split('\n');
            for (var i = lines.Length - 1; i >= 0; i--)
            {
                var l = lines[i].Trim();
                if (l.Length == 0) continue;
                try
                {
                    using var doc = JsonDocument.Parse(l);
                    if (doc.RootElement.TryGetProperty("timestamp", out var tsProp))
                    {
                        var ts = tsProp.GetString();
                        if (!string.IsNullOrEmpty(ts))
                        {
                            last = ParseTimestamp(ts);
                            break;
                        }
                    }
                }
                catch { /* partial line at beginning of tail buffer */ }
            }
        }
        catch { /* IO error */ }
        return (first, last);
    }

    /// <summary>
    /// Parse a JSONL conversation file directly into ChatMessage list.
    /// This replaces the Python extract_chat() function.
    /// </summary>
    public static (List<ChatMessage> Messages, string? Error) ParseJsonl(
        string jsonlPath,
        DateTimeOffset start,
        DateTimeOffset end,
        int depth = 1,
        bool includeShort = false,
        bool showPlans = false,
        bool showTasks = false,
        string entrypoint = "cli",
        bool includeImages = true)
    {
        if (!File.Exists(jsonlPath))
            return ([], $"JSONL file not found: {jsonlPath}");

        var messages = new List<ChatMessage>();
        var isCli = entrypoint == "sdk-cli";
        var descToAgent = depth >= 2 ? BuildDescToAgentMap(jsonlPath) : new Dictionary<string, string>();

        // CLI session header
        if (isCli)
        {
            var (firstTs, _) = GetSessionTimeRange(jsonlPath);
            messages.Add(new ChatMessage
            {
                Role = "cli_session_start",
                Text = $"[CLI Session: {entrypoint}]",
                Timestamp = firstTs?.ToString("o"),
                Depth = 0,
                Cli = true,
            });
        }

        string? lastValidTs = null;

        try
        {
            using var reader = new StreamReader(jsonlPath, System.Text.Encoding.UTF8);
            string? line;
            while ((line = reader.ReadLine()) is not null)
            {
                line = line.Trim();
                if (line.Length == 0) continue;

                JsonDocument doc;
                try { doc = JsonDocument.Parse(line); }
                catch { continue; }

                using (doc)
                {
                    var root = doc.RootElement;

                    // Timestamp filtering
                    string? tsIso = null;
                    if (root.TryGetProperty("timestamp", out var tsProp))
                    {
                        var tsStr = tsProp.GetString();
                        if (!string.IsNullOrEmpty(tsStr))
                        {
                            var ts = ParseTimestamp(tsStr);
                            if (ts < start || ts > end) continue;
                            tsIso = ts.ToString("o");
                        }
                    }
                    if (tsIso is not null) lastValidTs = tsIso;

                    // User messages
                    if (root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "user")
                    {
                        if (!root.TryGetProperty("message", out var msg)) continue;
                        if (!msg.TryGetProperty("content", out var content)) continue;

                        var (text, images) = ExtractTextFromUser(content, includeImages);

                        // Map [Image #N] text refs to cache
                        if (images.Count > 0)
                        {
                            // Image cache mapping handled inline
                        }

                        text = SystemReminderRe.Replace(text, "").Trim();

                        // Drop messages that are purely image refs
                        if (ImageRefRe.IsMatch(text.Trim())) continue;

                        text = ExcessNewlinesRe.Replace(text, "\n\n");
                        if (!includeImages) text = ImgPlaceholderRe.Replace(text, "");

                        if (text.Length > 0)
                        {
                            var entry = new ChatMessage
                            {
                                Role = "user", Text = text, Timestamp = tsIso,
                                Depth = 0, Cli = isCli,
                            };
                            if (images.Count > 0) entry.Images = images;
                            messages.Add(entry);
                        }
                        continue;
                    }

                    // Assistant messages
                    if (root.TryGetProperty("message", out var msgEl) &&
                        msgEl.TryGetProperty("role", out var roleProp) &&
                        roleProp.GetString() == "assistant")
                    {
                        if (!msgEl.TryGetProperty("content", out var content)) continue;

                        var text = ExtractTextFromAssistant(content);
                        text = ExcessNewlinesRe.Replace(text, "\n\n");
                        if (text.Length > 0 && !IsNoise(text))
                        {
                            if (includeShort || text.Length > 20)
                            {
                                messages.Add(new ChatMessage
                                {
                                    Role = "assistant", Text = text,
                                    Timestamp = tsIso, Depth = 0, Cli = isCli,
                                });
                            }
                        }

                        // Plan/task tool calls
                        foreach (var toolCall in ExtractToolCalls(content, PlanTaskTools))
                        {
                            var name = toolCall.TryGetProperty("name", out var np) ? np.GetString() : "";
                            var inp = toolCall.TryGetProperty("input", out var inpEl) ? inpEl : default;

                            if (name == "ExitPlanMode")
                            {
                                var planPath = inp.ValueKind == JsonValueKind.Object &&
                                    inp.TryGetProperty("planFilePath", out var pp) ? pp.GetString() ?? "" : "";
                                var planName = planPath.Length > 0 ? Path.GetFileNameWithoutExtension(planPath) : "plan";
                                if (showPlans)
                                {
                                    var planText = inp.ValueKind == JsonValueKind.Object &&
                                        inp.TryGetProperty("plan", out var pt) ? pt.GetString() ?? "(plan content not available)" : "(plan content not available)";
                                    messages.Add(new ChatMessage { Role = "plan", Text = $"[Plan created: {planName}]\n\n{planText}", Timestamp = tsIso, Depth = 0 });
                                }
                                else
                                    messages.Add(new ChatMessage { Role = "plan_summary", Text = $"[Plan created: {planName}]", Timestamp = tsIso, Depth = 0 });
                            }
                            else if (name == "TaskCreate")
                            {
                                var subject = inp.ValueKind == JsonValueKind.Object && inp.TryGetProperty("subject", out var sp) ? sp.GetString() ?? "" : "";
                                var desc = inp.ValueKind == JsonValueKind.Object && inp.TryGetProperty("description", out var dp) ? dp.GetString() ?? "" : "";
                                if (showTasks)
                                    messages.Add(new ChatMessage { Role = "task", Text = $"[Task created] {subject}\n{desc}", Timestamp = tsIso, Depth = 0 });
                                else
                                    messages.Add(new ChatMessage { Role = "task_summary", Text = $"[Task created] {subject}", Timestamp = tsIso, Depth = 0 });
                            }
                            else if (name == "TaskUpdate")
                            {
                                var taskId = inp.ValueKind == JsonValueKind.Object && inp.TryGetProperty("taskId", out var ti) ? ti.GetString() ?? "?" : "?";
                                var status = inp.ValueKind == JsonValueKind.Object && inp.TryGetProperty("status", out var st) ? st.GetString() ?? "" : "";
                                if (showTasks && status.Length > 0)
                                    messages.Add(new ChatMessage { Role = "task", Text = $"[Task #{taskId} -> {status}]", Timestamp = tsIso, Depth = 0 });
                            }
                        }

                        // Subagent loading
                        if (depth >= 2)
                        {
                            foreach (var agentCall in ExtractToolCalls(content, AgentTools))
                            {
                                if (!agentCall.TryGetProperty("input", out var agentInput)) continue;
                                var desc = agentInput.TryGetProperty("description", out var dp) ? dp.GetString() ?? "" : "";
                                var agentType = agentInput.TryGetProperty("subagent_type", out var atp) ? atp.GetString() ?? "general-purpose" : "general-purpose";

                                if (!descToAgent.TryGetValue(desc, out var agentId)) continue;

                                messages.Add(new ChatMessage { Role = "subagent_start", Text = $"[Subagent: {agentType}] {desc}", Timestamp = tsIso, Depth = 1 });
                                var subMsgs = LoadSubagent(jsonlPath, agentId, start, end, 1, depth, includeShort);
                                messages.AddRange(subMsgs);
                                messages.Add(new ChatMessage { Role = "subagent_end", Text = $"[End subagent: {desc}]", Timestamp = tsIso, Depth = 1 });
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            return (messages, $"Error reading JSONL: {ex.Message}");
        }

        if (isCli)
        {
            messages.Add(new ChatMessage
            {
                Role = "cli_session_end",
                Text = "[End CLI Session]",
                Timestamp = lastValidTs,
                Depth = 0,
                Cli = true,
            });
        }

        return (messages, null);
    }

    /// <summary>Load a subagent's JSONL log and return its messages.</summary>
    private static List<ChatMessage> LoadSubagent(
        string parentJsonlPath, string agentId,
        DateTimeOffset start, DateTimeOffset end,
        int currentDepth, int maxDepth, bool includeShort)
    {
        var stem = Path.GetFileNameWithoutExtension(parentJsonlPath);
        var dir = Path.GetDirectoryName(parentJsonlPath);
        if (dir is null) return [];
        var agentFile = Path.Combine(dir, stem, "subagents", $"agent-{agentId}.jsonl");
        if (!File.Exists(agentFile)) return [];

        var messages = new List<ChatMessage>();
        try
        {
            using var reader = new StreamReader(agentFile, System.Text.Encoding.UTF8);
            string? line;
            while ((line = reader.ReadLine()) is not null)
            {
                line = line.Trim();
                if (line.Length == 0) continue;
                JsonDocument doc;
                try { doc = JsonDocument.Parse(line); }
                catch { continue; }

                using (doc)
                {
                    var root = doc.RootElement;
                    string? tsIso = null;
                    if (root.TryGetProperty("timestamp", out var tsProp))
                    {
                        var tsStr = tsProp.GetString();
                        if (!string.IsNullOrEmpty(tsStr))
                        {
                            var ts = ParseTimestamp(tsStr);
                            if (ts < start || ts > end) continue;
                            tsIso = ts.ToString("o");
                        }
                    }

                    if (root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "user")
                    {
                        if (root.TryGetProperty("message", out var msg) &&
                            msg.TryGetProperty("content", out var content))
                        {
                            var (text, _) = ExtractTextFromUser(content);
                            text = SystemReminderRe.Replace(text, "").Trim();
                            if (text.Length > 0 && (includeShort || text.Length > 20))
                                messages.Add(new ChatMessage { Role = "subagent_user", Text = text, Timestamp = tsIso, Depth = currentDepth });
                        }
                    }
                    else if (root.TryGetProperty("message", out var msgEl) &&
                             msgEl.TryGetProperty("role", out var roleProp) &&
                             roleProp.GetString() == "assistant")
                    {
                        if (msgEl.TryGetProperty("content", out var content))
                        {
                            var text = ExtractTextFromAssistant(content);
                            if (text.Length > 0 && !IsNoise(text) && (includeShort || text.Length > 20))
                                messages.Add(new ChatMessage { Role = "subagent_assistant", Text = text, Timestamp = tsIso, Depth = currentDepth });
                        }
                    }
                }
            }
        }
        catch { /* IO error */ }
        return messages;
    }

    /// <summary>
    /// Find all JSONL sessions within a project directory matching the time range.
    /// Returns list of (path, entrypoint) tuples.
    /// </summary>
    public static List<(string Path, string Entrypoint)> FindSessions(
        string projectDir, DateTimeOffset start, DateTimeOffset end, bool includeCli = false)
    {
        var candidates = new List<(DateTimeOffset First, string Path, string Ep)>();

        if (!Directory.Exists(projectDir)) return [];

        foreach (var f in Directory.GetFiles(projectDir, "*.jsonl"))
        {
            if (Path.GetFileName(f).StartsWith("agent-", StringComparison.OrdinalIgnoreCase))
                continue;
            var (firstTs, lastTs) = GetSessionTimeRange(f);
            if (firstTs is null || lastTs is null) continue;
            if (firstTs.Value > end || lastTs.Value < start) continue;

            var ep = GetSessionEntrypoint(f);
            if (ep == "sdk-cli" && !includeCli) continue;
            candidates.Add((firstTs.Value, f, ep));
        }

        candidates.Sort((a, b) => a.First.CompareTo(b.First));
        return candidates.Select(c => (c.Path, c.Ep)).ToList();
    }

    /// <summary>
    /// Parse all sessions in a project directory and return merged, sorted messages.
    /// This is the main entry point replacing the Python script entirely.
    /// </summary>
    public static (List<ChatMessage> Messages, string? Error) ParseProject(
        string projectDir,
        DateTimeOffset? start = null,
        DateTimeOffset? end = null,
        int depth = 2,
        bool includeCli = false,
        bool includeImages = true)
    {
        var endDt = end ?? DateTimeOffset.UtcNow;
        var startDt = start ?? endDt.AddDays(-1000);

        var sessions = FindSessions(projectDir, startDt, endDt, includeCli);
        if (sessions.Count == 0)
            return ([], "No sessions found in time range");

        var allMessages = new List<ChatMessage>();
        string? lastError = null;

        foreach (var (path, ep) in sessions)
        {
            var (msgs, error) = ParseJsonl(path, startDt, endDt,
                depth: depth, entrypoint: ep, includeImages: includeImages);
            if (error is not null) lastError = error;
            allMessages.AddRange(msgs);
        }

        // Sort chronologically
        allMessages.Sort((a, b) => string.Compare(a.Timestamp ?? "", b.Timestamp ?? "", StringComparison.Ordinal));

        return (allMessages, allMessages.Count == 0 ? (lastError ?? "No messages extracted") : null);
    }

    public static (ChatFile? File, string? Error) LoadJson(string path)
    {
        if (!File.Exists(path))
            return (null, $"File not found: {path}");

        try
        {
            var json = File.ReadAllText(path);
            var file = JsonSerializer.Deserialize<ChatFile>(json);
            return file?.Messages is not null
                ? (file, null)
                : (null, "JSON deserialized but contained no messages");
        }
        catch (JsonException ex)
        {
            return (null, $"JSON parse error: {ex.Message}");
        }
        catch (IOException ex)
        {
            return (null, $"IO error: {ex.Message}");
        }
    }

    public static (string? Html, string? Error) LoadHtml(string path)
    {
        if (!File.Exists(path))
            return (null, $"File not found: {path}");

        try
        {
            return (File.ReadAllText(path), null);
        }
        catch (IOException ex)
        {
            return (null, $"IO error: {ex.Message}");
        }
    }

    /// <summary>
    /// Attempt to find the HTML sibling of a JSON file (same name, .html extension).
    /// </summary>
    public static string? FindHtmlSibling(string jsonPath)
    {
        var htmlPath = Path.ChangeExtension(jsonPath, ".html");
        return File.Exists(htmlPath) ? htmlPath : null;
    }

    /// <summary>
    /// Scan ~/.claude/projects/ for all project directories and their JSONL sessions.
    /// </summary>
    public static (List<ProjectEntry>? Projects, string? Error) ScanProjects()
    {
        var claudeDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".claude", "projects");

        if (!Directory.Exists(claudeDir))
            return (null, $"Projects directory not found: {claudeDir}");

        var projects = new List<ProjectEntry>();

        foreach (var dir in Directory.GetDirectories(claudeDir))
        {
            // Read metadata.json for the real project path
            var projectPath = "";
            var metaPath = Path.Combine(dir, "metadata.json");
            if (File.Exists(metaPath))
            {
                try
                {
                    var meta = JsonSerializer.Deserialize<Dictionary<string, string>>(
                        System.IO.File.ReadAllText(metaPath));
                    projectPath = meta?.GetValueOrDefault("path", "") ?? "";
                }
                catch { /* malformed metadata, fall through */ }
            }

            if (string.IsNullOrEmpty(projectPath))
            {
                // Decode directory name: C--Users-foo-repo → C:\Users\foo\repo
                var name = Path.GetFileName(dir);
                projectPath = name.Replace("--", ":\\").Replace('-', '\\');
            }

            // Enumerate JSONL sessions
            var sessions = new List<SessionEntry>();
            try
            {
                foreach (var jsonl in Directory.GetFiles(dir, "*.jsonl"))
                {
                    var fname = Path.GetFileName(jsonl);
                    if (fname.StartsWith("agent-", StringComparison.OrdinalIgnoreCase))
                        continue;

                    sessions.Add(new SessionEntry
                    {
                        SessionId = Path.GetFileNameWithoutExtension(jsonl),
                        JsonlPath = jsonl,
                        LastModified = System.IO.File.GetLastWriteTime(jsonl),
                    });
                }
            }
            catch { /* permission issues */ }

            if (sessions.Count == 0) continue;

            // Skip projects that aren't git repos
            if (!string.IsNullOrEmpty(projectPath) &&
                Directory.Exists(projectPath) &&
                !Directory.Exists(Path.Combine(projectPath, ".git")))
                continue;

            // Most recent first
            sessions.Sort((a, b) => b.LastModified.CompareTo(a.LastModified));

            var trimmed = projectPath.TrimEnd('\\', '/');
            var displayName = Path.GetFileName(trimmed);
            if (string.IsNullOrEmpty(displayName))
                displayName = Path.GetFileName(dir);

            // Extract parent folder (e.g. "DT" from "C:\Users\...\DT\ReCode")
            var parentDir = Path.GetDirectoryName(trimmed);
            var parentFolder = parentDir is not null ? Path.GetFileName(parentDir) : "";

            projects.Add(new ProjectEntry
            {
                DisplayName = displayName,
                ParentFolder = parentFolder,
                DirectoryPath = dir,
                ProjectPath = projectPath,
                Sessions = sessions,
            });
        }

        // Remove projects that are just parent directories (e.g. home dir, "repos/DT")
        // rather than actual repos. A parent dir is one where other projects are nested inside it.
        var allPaths = projects
            .Select(p => p.ProjectPath.TrimEnd('\\', '/'))
            .Where(p => !string.IsNullOrEmpty(p))
            .ToList();

        projects.RemoveAll(p =>
        {
            var pp = p.ProjectPath.TrimEnd('\\', '/');
            if (string.IsNullOrEmpty(pp)) return false;
            var prefix = pp + Path.DirectorySeparatorChar;
            // Remove this project if it's a parent of any other project
            return allPaths.Any(other =>
                other.Length > prefix.Length &&
                other.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));
        });

        // Sort by most recent session activity
        projects.Sort((a, b) => b.Sessions[0].LastModified.CompareTo(a.Sessions[0].LastModified));
        return (projects, null);
    }
}
