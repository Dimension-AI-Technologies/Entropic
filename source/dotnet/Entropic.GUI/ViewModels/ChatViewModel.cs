using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Entropic.GUI.Models;

namespace Entropic.GUI.ViewModels;

public partial class ChatViewModel : ViewModelBase, IDisposable
{
    private const int DebounceMs = 500;

    private FileSystemWatcher? _jsonWatcher;
    private FileSystemWatcher? _jsonlWatcher;
    private Timer? _jsonDebounce;
    private Timer? _jsonlDebounce;

    [ObservableProperty]
    private string _statusText = "No chat loaded";

    [ObservableProperty]
    private string _htmlContent = "";

    [ObservableProperty]
    private string _htmlFilePath = "";

    [ObservableProperty]
    private string _jsonPath = "";

    [ObservableProperty]
    private bool _isFollowMode;

    // --- Toolbar properties ---

    [ObservableProperty]
    private string _repoTitle = "";

    [ObservableProperty]
    private string _repoPath = "";

    [ObservableProperty]
    private string _generatedTime = "";

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private bool _showCli;

    [ObservableProperty]
    private bool _showPlans = true;

    [ObservableProperty]
    private bool _showTasks = true;

    [ObservableProperty]
    private bool _showSubagents = true;

    [ObservableProperty]
    private bool _isCollapsed;

    [ObservableProperty]
    private string _navPositionText = "0 / 0";

    [ObservableProperty]
    private int _messageLimit = 200;

    [ObservableProperty]
    private int _totalMessageCount;

    public string MessageLimitLabel => TotalMessageCount > 0
        ? $"of {TotalMessageCount}"
        : "";

    // --- Loading overlay ---

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private string _loadingText = "Loading...";

    // --- Sidebar properties ---

    [ObservableProperty]
    private bool _isSidebarVisible = true;

    [ObservableProperty]
    private bool _sortByDate = true;

    [ObservableProperty]
    private bool _sortDescending = true;

    [ObservableProperty]
    private bool _groupByFolder = true;

    [ObservableProperty]
    private ProjectEntry? _selectedProject;

    [ObservableProperty]
    private string _sidebarSearch = "";

    partial void OnSelectedProjectChanged(ProjectEntry? oldValue, ProjectEntry? newValue)
    {
        if (oldValue is not null) oldValue.IsSelected = false;
        if (newValue is not null) newValue.IsSelected = true;
    }

    partial void OnSortByDateChanged(bool value) => RebuildSidebarView();
    partial void OnSortDescendingChanged(bool value) => RebuildSidebarView();
    partial void OnGroupByFolderChanged(bool value) => RebuildSidebarView();
    partial void OnSidebarSearchChanged(string value) => RebuildSidebarView();

    public string SortModeLabel => SortByDate ? "Date" : "A-Z";
    public string SortDirLabel => SortDescending ? "\u25BC" : "\u25B2";

    private List<ProjectEntry> _allProjects = [];

    private static readonly (TimeSpan Offset, string Label)[] TimeBuckets =
    [
        (TimeSpan.FromDays(1), "1 day ago"),
        (TimeSpan.FromDays(2), "2 days ago"),
        (TimeSpan.FromDays(3), "3 days ago"),
        (TimeSpan.FromDays(7), "1 week ago"),
        (TimeSpan.FromDays(14), "2 weeks ago"),
        (TimeSpan.FromDays(30), "1 month ago"),
        (TimeSpan.FromDays(90), "3 months ago"),
        (TimeSpan.FromDays(365), "1 year ago"),
    ];

    public ObservableCollection<object> ChatProjects { get; } = [];
    public ObservableCollection<ProjectFolderGroup> ProjectGroups { get; } = [];

    [RelayCommand]
    private void ScanProjects()
    {
        var (projects, error) = ChatLoader.ScanProjects();
        _allProjects = projects ?? [];

        if (error is not null && projects is null)
            StatusText = error;

        RebuildSidebarView();
    }

    [RelayCommand]
    private void ToggleSortMode()
    {
        SortByDate = !SortByDate;
        OnPropertyChanged(nameof(SortModeLabel));
    }

    [RelayCommand]
    private void ToggleSortDir()
    {
        SortDescending = !SortDescending;
        OnPropertyChanged(nameof(SortDirLabel));
    }

    [RelayCommand]
    private async System.Threading.Tasks.Task OpenProject(ProjectEntry project)
    {
        if (project.Sessions.Count == 0) return;
        SelectedProject = project;

        LoadingText = $"Loading {project.DisplayName}...";
        IsLoading = true;
        await Dispatcher.UIThread.InvokeAsync(() => { }, DispatcherPriority.Background);

        var projectDir = project.DirectoryPath;
        var (allMessages, parseError) = await System.Threading.Tasks.Task.Run(() =>
            ChatLoader.ParseProject(projectDir, depth: 2, includeImages: true));

        if (allMessages.Count > 0)
        {
            LoadFromMessages(allMessages, project.DisplayName, project.ProjectPath);

            var cacheDir = Path.Combine(Path.GetTempPath(), "Entropic-Chat");
            Directory.CreateDirectory(cacheDir);
            var session = project.Sessions[0];
            var htmlCachePath = Path.Combine(cacheDir, session.SessionId + ".html");

            _ = System.Threading.Tasks.Task.Run(() =>
            {
                var html = HtmlFormatter.FormatHtml(allMessages, project.DisplayName,
                    repoPath: project.ProjectPath);
                File.WriteAllText(htmlCachePath, html, Encoding.UTF8);
                Dispatcher.UIThread.Post(() =>
                {
                    HtmlFilePath = htmlCachePath;
                    var (loadedHtml, _) = ChatLoader.LoadHtml(htmlCachePath);
                    HtmlContent = loadedHtml ?? "";
                });
            });

            StartWatching(null, session.JsonlPath);
            IsFollowMode = true;
        }
        else
        {
            StatusText = parseError ?? "No messages found";
        }

        IsLoading = false;
    }

    private void RebuildSidebarView()
    {
        var filtered = _allProjects.ToList();
        if (!string.IsNullOrWhiteSpace(SidebarSearch))
            filtered.RemoveAll(p =>
                !p.DisplayName.Contains(SidebarSearch, StringComparison.OrdinalIgnoreCase) &&
                !p.ParentFolder.Contains(SidebarSearch, StringComparison.OrdinalIgnoreCase));

        if (SortByDate)
            filtered.Sort((a, b) => SortDescending
                ? b.MostRecentActivity.CompareTo(a.MostRecentActivity)
                : a.MostRecentActivity.CompareTo(b.MostRecentActivity));
        else
            filtered.Sort((a, b) => SortDescending
                ? string.Compare(b.DisplayName, a.DisplayName, StringComparison.OrdinalIgnoreCase)
                : string.Compare(a.DisplayName, b.DisplayName, StringComparison.OrdinalIgnoreCase));

        ChatProjects.Clear();
        foreach (var item in InsertTimeDividers(filtered))
            ChatProjects.Add(item);

        ProjectGroups.Clear();
        if (GroupByFolder)
        {
            var groups = filtered
                .GroupBy(p => string.IsNullOrEmpty(p.ParentFolder) ? "(other)" : p.ParentFolder)
                .OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase)
                .ToList();

            foreach (var g in groups)
            {
                ProjectGroups.Add(new ProjectFolderGroup
                {
                    FolderName = g.Key,
                    Items = InsertTimeDividers(g.ToList()),
                });
            }
        }

        OnPropertyChanged(nameof(SortModeLabel));
        OnPropertyChanged(nameof(SortDirLabel));
    }

    private List<object> InsertTimeDividers(List<ProjectEntry> projects)
    {
        var result = new List<object>();
        if (!SortByDate || projects.Count == 0)
        {
            result.AddRange(projects);
            return result;
        }

        var now = DateTime.Now;
        var thresholds = TimeBuckets
            .Select(b => (Cutoff: now - b.Offset, b.Label))
            .ToList();

        if (!SortDescending)
            thresholds.Reverse();

        var nextThresholdIdx = 0;
        foreach (var p in projects)
        {
            string? lastCrossedLabel = null;
            while (nextThresholdIdx < thresholds.Count)
            {
                var (cutoff, label) = thresholds[nextThresholdIdx];
                var crossed = SortDescending
                    ? p.MostRecentActivity < cutoff
                    : p.MostRecentActivity >= cutoff;

                if (!crossed) break;
                lastCrossedLabel = label;
                nextThresholdIdx++;
            }

            if (lastCrossedLabel is not null)
                result.Add(new TimeDivider { Label = lastCrossedLabel });
            result.Add(p);
        }

        return result;
    }

    private Timer? _searchDebounce;
    private const int SearchDebounceMs = 300;

    partial void OnSearchTextChanged(string value)
    {
        _searchDebounce?.Dispose();
        _searchDebounce = new Timer(_ =>
            Dispatcher.UIThread.Post(ApplyFilters),
            null, SearchDebounceMs, Timeout.Infinite);
    }
    partial void OnShowCliChanged(bool value) => ApplyFilters();
    partial void OnShowPlansChanged(bool value) => ApplyFilters();
    partial void OnShowTasksChanged(bool value) => ApplyFilters();
    partial void OnShowSubagentsChanged(bool value) => ApplyFilters();

    /// <summary>
    /// Callback wired by ChatView to push ToggleButton changes to the active tab.
    /// </summary>
    public Action<bool>? IsFollowModeChangedExternally { get; set; }

    partial void OnIsFollowModeChanged(bool value)
    {
        IsFollowModeChangedExternally?.Invoke(value);
    }

    public ObservableCollection<ChatMessage> Messages { get; } = [];
    public ObservableCollection<ChatMessage> FilteredMessages { get; } = [];
    public ObservableCollection<ChatMessageGroup> FilteredGroups { get; } = [];

    public void ApplyFilters()
    {
        var filtered = new List<ChatMessage>();
        foreach (var m in Messages)
        {
            if (ShouldShow(m))
                filtered.Add(m);
        }

        var groups = new List<ChatMessageGroup>();
        ChatMessageGroup? currentGroup = null;
        foreach (var m in filtered)
        {
            if (currentGroup is null || currentGroup.First.Role != m.Role)
            {
                currentGroup = new ChatMessageGroup { Items = [m] };
                groups.Add(currentGroup);
            }
            else
            {
                currentGroup.Items.Add(m);
            }
        }

        FilteredMessages.Clear();
        foreach (var m in filtered)
            FilteredMessages.Add(m);

        FilteredGroups.Clear();
        foreach (var g in groups)
            FilteredGroups.Add(g);

        var total = 0;
        foreach (var g in groups)
            if (g.IsUser) total++;
        NavPositionText = $"0 / {total}";
    }

    private bool ShouldShow(ChatMessage m)
    {
        if ((m.Cli || m.Role == "cli_session_start") && !ShowCli) return false;
        if (m.Role is "plan" or "plan_summary" && !ShowPlans) return false;
        if (m.Role is "task" or "task_summary" && !ShowTasks) return false;
        if (m.Role is "subagent_user" or "subagent_assistant" or "subagent_start" && !ShowSubagents) return false;

        if (!string.IsNullOrWhiteSpace(SearchText) &&
            m.Text?.Contains(SearchText, StringComparison.OrdinalIgnoreCase) != true)
            return false;

        return true;
    }

    /// <summary>Load chat for a session JSONL path (called from ProjectView integration).</summary>
    public async System.Threading.Tasks.Task LoadFromSessionPath(string jsonlPath, string projectName)
    {
        var projectDir = Path.GetDirectoryName(Path.GetFullPath(jsonlPath)) ?? ".";
        LoadingText = $"Loading {projectName}...";
        IsLoading = true;
        await Dispatcher.UIThread.InvokeAsync(() => { }, DispatcherPriority.Background);

        var (allMessages, parseError) = await System.Threading.Tasks.Task.Run(() =>
            ChatLoader.ParseProject(projectDir, depth: 2, includeImages: true));

        if (allMessages.Count > 0)
        {
            LoadFromMessages(allMessages, projectName, projectDir);

            var cacheDir = Path.Combine(Path.GetTempPath(), "Entropic-Chat");
            Directory.CreateDirectory(cacheDir);
            var htmlCachePath = Path.Combine(cacheDir,
                Path.GetFileNameWithoutExtension(jsonlPath) + ".html");

            _ = System.Threading.Tasks.Task.Run(() =>
            {
                var html = HtmlFormatter.FormatHtml(allMessages, projectName, repoPath: projectDir);
                File.WriteAllText(htmlCachePath, html, Encoding.UTF8);
                Dispatcher.UIThread.Post(() =>
                {
                    HtmlFilePath = htmlCachePath;
                    var (loadedHtml, _) = ChatLoader.LoadHtml(htmlCachePath);
                    HtmlContent = loadedHtml ?? "";
                });
            });

            StartWatching(null, jsonlPath);
            IsFollowMode = true;
        }
        else
        {
            StatusText = parseError ?? "No messages found";
        }

        IsLoading = false;
    }

    private void LoadFromMessages(List<ChatMessage> allMessages, string title, string path)
    {
        Messages.Clear();
        RepoTitle = title;
        RepoPath = path;
        GeneratedTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss") + " UTC";

        var total = allMessages.Count;
        TotalMessageCount = total;
        OnPropertyChanged(nameof(MessageLimitLabel));

        var skip = MessageLimit > 0 && MessageLimit < total ? total - MessageLimit : 0;
        var loadCount = total - skip;

        LoadingText = $"Loading {loadCount} of {total} messages...";
        for (var i = skip; i < total; i++)
            Messages.Add(allMessages[i]);

        LoadingText = "Applying filters...";
        ApplyFilters();
        StatusText = $"Loaded {loadCount} of {total} messages";
    }

    [RelayCommand]
    private void LoadFile(string path)
    {
        JsonPath = path;

        var (chatFile, jsonError) = ChatLoader.LoadJson(path);
        Messages.Clear();

        if (chatFile is not null)
        {
            RepoTitle = chatFile.Title ?? Path.GetFileNameWithoutExtension(path);
            RepoPath = Path.GetFullPath(path);
            try { GeneratedTime = File.GetLastWriteTimeUtc(path).ToString("yyyy-MM-dd HH:mm:ss") + " UTC"; }
            catch { GeneratedTime = ""; }

            var total = chatFile.Messages.Count;
            TotalMessageCount = total;
            OnPropertyChanged(nameof(MessageLimitLabel));

            var skip = MessageLimit > 0 && MessageLimit < total ? total - MessageLimit : 0;
            var loadCount = total - skip;

            LoadingText = $"Loading {loadCount} of {total} messages...";
            for (var i = skip; i < total; i++)
                Messages.Add(chatFile.Messages[i]);

            LoadingText = "Applying filters...";
            ApplyFilters();
            StatusText = $"Loaded {loadCount} of {total} messages from {Path.GetFileName(path)}";
        }
        else
        {
            StatusText = jsonError ?? "Unknown error loading JSON";
        }

        var htmlPath = ChatLoader.FindHtmlSibling(path);
        if (htmlPath is not null && !HtmlFormatter.IsCurrent(htmlPath) && chatFile is not null)
        {
            var freshHtml = HtmlFormatter.FormatHtml(chatFile.Messages, chatFile.Title ?? "");
            try { File.WriteAllText(htmlPath, freshHtml, Encoding.UTF8); }
            catch { /* read-only, use stale */ }
        }
        HtmlFilePath = htmlPath ?? "";
        if (htmlPath is not null)
        {
            var (html, _) = ChatLoader.LoadHtml(htmlPath);
            HtmlContent = html ?? "";
        }
        else
        {
            HtmlContent = "";
        }
    }

    public void StartWatching(string? jsonPath, string? jsonlPath)
    {
        StopWatching();

        if (jsonPath is not null)
        {
            var jsonDir = Path.GetDirectoryName(Path.GetFullPath(jsonPath));
            var jsonFile = Path.GetFileName(jsonPath);
            if (jsonDir is not null)
            {
                _jsonWatcher = new FileSystemWatcher(jsonDir, jsonFile)
                {
                    NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
                    EnableRaisingEvents = true
                };
                _jsonDebounce = new Timer(_ =>
                    Dispatcher.UIThread.Post(() => LoadFile(jsonPath)),
                    null, Timeout.Infinite, Timeout.Infinite);
                _jsonWatcher.Changed += (_, _) =>
                    _jsonDebounce.Change(DebounceMs, Timeout.Infinite);
            }
        }

        if (jsonlPath is null || !File.Exists(jsonlPath)) return;

        var jsonlDir = Path.GetDirectoryName(Path.GetFullPath(jsonlPath));
        var jsonlFile = Path.GetFileName(jsonlPath);
        if (jsonlDir is null) return;

        _jsonlWatcher = new FileSystemWatcher(jsonlDir, jsonlFile)
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
            EnableRaisingEvents = true
        };
        _jsonlDebounce = new Timer(_ =>
            Dispatcher.UIThread.Post(() => RegenerateAndReload(jsonlPath)),
            null, Timeout.Infinite, Timeout.Infinite);
        _jsonlWatcher.Changed += (_, _) =>
            _jsonlDebounce.Change(DebounceMs, Timeout.Infinite);

        StatusText += " | Watching JSONL for changes";
    }

    private void RegenerateAndReload(string jsonlPath)
    {
        StatusText = "Regenerating from JSONL...";
        var projectDir = Path.GetDirectoryName(Path.GetFullPath(jsonlPath)) ?? ".";

        var (allMessages, error) = ChatLoader.ParseProject(projectDir, depth: 2, includeImages: true);
        if (allMessages.Count > 0)
        {
            LoadFromMessages(allMessages, RepoTitle, RepoPath);
            StatusText = $"Loaded {Messages.Count} messages (auto-regenerated)";

            _ = System.Threading.Tasks.Task.Run(() =>
            {
                var html = HtmlFormatter.FormatHtml(allMessages, RepoTitle, repoPath: RepoPath);
                var cacheDir = Path.Combine(Path.GetTempPath(), "Entropic-Chat");
                Directory.CreateDirectory(cacheDir);
                var htmlPath = Path.Combine(cacheDir,
                    Path.GetFileNameWithoutExtension(jsonlPath) + ".html");
                File.WriteAllText(htmlPath, html, Encoding.UTF8);
                Dispatcher.UIThread.Post(() =>
                {
                    HtmlFilePath = htmlPath;
                    HtmlContent = html;
                });
            });
        }
        else
        {
            StatusText = $"Regen failed: {error}";
        }
    }

    private void StopWatching()
    {
        _jsonWatcher?.Dispose();
        _jsonWatcher = null;
        _jsonlWatcher?.Dispose();
        _jsonlWatcher = null;
        _jsonDebounce?.Dispose();
        _jsonDebounce = null;
        _jsonlDebounce?.Dispose();
        _jsonlDebounce = null;
    }

    public string FormatAsText()
    {
        var sb = new StringBuilder();
        if (!string.IsNullOrEmpty(RepoTitle))
            sb.AppendLine(RepoTitle).AppendLine();

        foreach (var m in FilteredMessages)
        {
            var ts = string.IsNullOrEmpty(m.ShortTimestamp) ? "" : $" ({m.ShortTimestamp})";
            sb.AppendLine($"[{m.DisplayRole}{ts}]");
            sb.AppendLine(m.Text);
            sb.AppendLine();
        }
        return sb.ToString();
    }

    public string FormatAsMarkdown()
    {
        var sb = new StringBuilder();
        if (!string.IsNullOrEmpty(RepoTitle))
            sb.AppendLine($"# {RepoTitle}").AppendLine();

        foreach (var m in FilteredMessages)
        {
            var ts = string.IsNullOrEmpty(m.ShortTimestamp) ? "" : $" ({m.ShortTimestamp})";
            sb.AppendLine($"## {m.DisplayRole}{ts}");
            sb.AppendLine();
            sb.AppendLine(m.Text);
            sb.AppendLine();
            sb.AppendLine("---");
            sb.AppendLine();
        }
        return sb.ToString();
    }

    public string FormatAsHtml()
    {
        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'>");
        sb.AppendLine("<style>body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px}");
        sb.AppendLine(".msg{margin:12px 0;padding:12px;border-radius:8px}");
        sb.AppendLine(".user{background:#e3f2fd}.assistant{background:#f5f5f5}.meta{background:#fff8e1}");
        sb.AppendLine(".role{font-weight:bold;margin-bottom:4px}.ts{color:#999;font-size:0.85em}</style></head><body>");

        if (!string.IsNullOrEmpty(RepoTitle))
            sb.AppendLine($"<h1>{HtmlEncode(RepoTitle)}</h1>");

        foreach (var m in FilteredMessages)
        {
            var cls = m.IsUser ? "user" : m.IsAssistant ? "assistant" : "meta";
            var ts = string.IsNullOrEmpty(m.ShortTimestamp) ? "" : $" <span class='ts'>{HtmlEncode(m.ShortTimestamp)}</span>";
            sb.AppendLine($"<div class='msg {cls}'>");
            sb.AppendLine($"<div class='role'>{HtmlEncode(m.DisplayRole)}{ts}</div>");
            sb.AppendLine($"<pre>{HtmlEncode(m.Text)}</pre>");
            sb.AppendLine("</div>");
        }

        sb.AppendLine("</body></html>");
        return sb.ToString();
    }

    private static string HtmlEncode(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");

    public void Dispose()
    {
        StopWatching();
        _searchDebounce?.Dispose();
        _searchDebounce = null;
        GC.SuppressFinalize(this);
    }
}
