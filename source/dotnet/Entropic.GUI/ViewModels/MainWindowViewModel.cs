using System;
using System.Collections.ObjectModel;
using System.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-ARC-003)
// @must_test(REQ-GUI-001)
// @must_test(REQ-GUI-006)
// @must_test(REQ-GUI-011)
// @must_test(REQ-GUI-012)
// @must_test(REQ-GUI-014)
// @must_test(REQ-GUI-015)
// @must_test(REQ-GUI-016)
// @must_test(REQ-GUI-017)
// @must_test(REQ-GUI-020)
public partial class MainWindowViewModel : ViewModelBase
{
    [ObservableProperty]
    private int _selectedTabIndex;

    [ObservableProperty]
    private string _statusText = "Entropic — loading...";

    [ObservableProperty]
    private int _projectCount;

    [ObservableProperty]
    private int _activeTodoCount;

    [ObservableProperty]
    private bool _activityModeEnabled;

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
    public GitViewModel Git { get; } = new();

    // @must_test(REQ-GUI-015)
    [RelayCommand]
    private void Refresh()
    {
        // Trigger data reload from all providers
        StatusText = "Refreshing...";
        Projects.Refresh();
        Git.Refresh();
        UpdateStatusBar();
    }

    // @must_test(REQ-GUI-016)
    [RelayCommand]
    private void ToggleActivityMode()
    {
        ActivityModeEnabled = !ActivityModeEnabled;
    }

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
}
