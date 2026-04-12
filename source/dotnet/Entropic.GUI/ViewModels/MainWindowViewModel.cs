using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Entropic.Core;
using Entropic.GUI.Services;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Control;
using Microsoft.FSharp.Core;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-ARC-003)
// @must_test(REQ-GUI-006)
public partial class MainWindowViewModel : ViewModelBase, IDisposable
{
    private const int TabCount = 5;

    private readonly List<IProviderPort> _providers = new();
    private readonly ErrorBoundaryService _errorService = new();

    // @must_test(REQ-GUI-001)
    [ObservableProperty]
    private int _selectedTabIndex;

    // @must_test(REQ-GUI-001)
    public bool IsProjectTab => SelectedTabIndex == 0;
    public bool IsGlobalTab => SelectedTabIndex == 1;
    public bool IsGitTab => SelectedTabIndex == 2;
    public bool IsCommitTab => SelectedTabIndex == 3;
    public bool IsChatTab => SelectedTabIndex == 4;

    partial void OnSelectedTabIndexChanged(int value)
    {
        OnPropertyChanged(nameof(IsProjectTab));
        OnPropertyChanged(nameof(IsGlobalTab));
        OnPropertyChanged(nameof(IsGitTab));
        OnPropertyChanged(nameof(IsCommitTab));
        OnPropertyChanged(nameof(IsChatTab));
    }

    // @must_test(REQ-GUI-011)
    [ObservableProperty]
    private string _statusText = "Entropic — loading...";

    [ObservableProperty]
    private int _projectCount;

    [ObservableProperty]
    private int _activeTodoCount;

    // @must_test(REQ-GUI-016)
    [ObservableProperty]
    private bool _activityModeEnabled;

    // @must_test(REQ-GUI-017)
    [ObservableProperty]
    private string _projectSortMode = "recent";

    // @must_test(REQ-PRV-004)
    [ObservableProperty]
    private bool _claudeFilterEnabled = true;

    [ObservableProperty]
    private bool _codexFilterEnabled = true;

    [ObservableProperty]
    private bool _geminiFilterEnabled = true;

    // @must_test(REQ-GUI-005)
    [ObservableProperty]
    private string _spacingMode = "normal";

    // @must_test(REQ-GUI-005)
    public int SpacingPixels => SpacingMode switch
    {
        "compact" => 6,
        "wide" => 14,
        _ => 10
    };

    // @must_test(REQ-GUI-013)
    [ObservableProperty]
    private string _logLevel = "info";

    public ProjectsViewModel Projects { get; } = new();
    public GlobalViewModel Global { get; } = new();
    public GitViewModel Git { get; }
    public CommitViewModel Commits { get; } = new();
    public ChatViewModel Chat { get; } = new();
    public ProgressViewModel Progress { get; } = new();
    public HelpViewModel Help { get; } = new();

    [ObservableProperty]
    private bool _isHelpOpen;

    [ObservableProperty]
    private string? _toastMessage;

    [ObservableProperty]
    private bool _isToastVisible;

    private readonly ToastService _toastService = new();

    public MainWindowViewModel()
    {
        Git = new GitViewModel(this);
        _toastService.ToastRequested += OnToastRequested;
        _errorService.ErrorCaught += ex => ShowToast($"Error: {ex.Message}");
    }

    private async void OnToastRequested(string message)
    {
        ToastMessage = message;
        IsToastVisible = true;
        await Task.Delay(ToastService.AutoDismissMs);
        IsToastVisible = false;
    }

    public void ShowToast(string message) => _toastService.Show(message);

    [RelayCommand]
    private void ToggleHelp() => IsHelpOpen = !IsHelpOpen;

    [RelayCommand]
    private static void Close() => Environment.Exit(0);

    // @must_test(REQ-GUI-020)
    public void ShowCommitsForRepo(string repoPath, string repoName)
    {
        Commits.LoadForRepo(repoPath, repoName);
        SelectedTabIndex = 3; // Switch to Commit tab
    }

    [RelayCommand]
    private async System.Threading.Tasks.Task ViewChatForSession(SessionItemViewModel? session)
    {
        if (session?.FilePath == null) return;
        var projectName = Projects.SelectedProject?.Name ?? "Chat";
        await Chat.LoadFromSessionPath(session.FilePath, projectName);
        SelectedTabIndex = 4; // Switch to Chat tab
    }

    public void SetProviders(List<IProviderPort> providers)
    {
        _providers.Clear();
        _providers.AddRange(providers);
    }

    private List<IProviderPort> GetFilteredProviders()
    {
        return _providers.Where(p =>
            (p.Id == "claude" && ClaudeFilterEnabled) ||
            (p.Id == "codex" && CodexFilterEnabled) ||
            (p.Id == "gemini" && GeminiFilterEnabled)
        ).ToList();
    }

    // @must_test(REQ-GUI-015)
    // @must_test(REQ-GUI-012)
    [RelayCommand]
    private async Task Refresh()
    {
        StatusText = "Refreshing...";
        Progress.Show("Loading projects...");

        var filtered = GetFilteredProviders();
        var fsharpList = ListModule.OfSeq(filtered.Cast<IProviderPort>());

        var result = await FSharpAsync.StartAsTask(
            Aggregator.getProjects(fsharpList, FSharpOption<IEventPort>.None),
            null, null);

        if (result.IsOk)
        {
            var projects = result.ResultValue;
            Projects.LoadFromCore(projects);
            Global.LoadFromProjects(projects);

            ProjectCount = projects.Length;
            ActiveTodoCount = projects
                .SelectMany(p => p.Sessions)
                .SelectMany(s => s.Todos)
                .Count(t => !t.Status.IsCompleted);
        }
        else
        {
            _errorService.HandleError(new InvalidOperationException(result.ErrorValue));
            StatusText = $"Error: {result.ErrorValue}";
            Progress.Hide();
            return;
        }

        Git.Refresh();
        Progress.Hide();
        UpdateStatusBar();
    }

    // @must_test(REQ-GUI-016)
    [RelayCommand]
    private void ToggleActivityMode()
    {
        ActivityModeEnabled = !ActivityModeEnabled;
    }

    [RelayCommand]
    private void SwitchTab(string index)
    {
        if (int.TryParse(index, out var i) && i >= 0 && i < TabCount)
            SelectedTabIndex = i;
    }

    [RelayCommand]
    private void SetSpacing(string mode)
    {
        SpacingMode = mode;
        OnPropertyChanged(nameof(SpacingPixels));
    }

    // @must_test(REQ-GUI-014)
    // @must_test(REQ-GUI-017)
    [RelayCommand]
    private void SetSortMode(string mode)
    {
        ProjectSortMode = mode;
        Projects.ApplySort(mode);
    }

    public void UpdateStatusBar()
    {
        StatusText = $"{ProjectCount} projects — {ActiveTodoCount} active TODOs";
    }

    public void Dispose()
    {
        _toastService.ToastRequested -= OnToastRequested;
        Chat.Dispose();
    }
}
