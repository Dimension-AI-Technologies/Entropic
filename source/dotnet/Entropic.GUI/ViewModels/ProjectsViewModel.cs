using System.Collections.ObjectModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-GUI-002)
// @must_test(REQ-GUI-003)
// @must_test(REQ-GUI-004)
// @must_test(REQ-TOD-007)
// @must_test(REQ-PRV-005)
// @must_test(REQ-SES-002)
public partial class ProjectsViewModel : ViewModelBase
{
    [ObservableProperty]
    private ObservableCollection<ProjectItemViewModel> _projects = new();

    [ObservableProperty]
    private ProjectItemViewModel? _selectedProject;

    [ObservableProperty]
    private string _filterMode = "all"; // all, hasSessions, hasTodos, activeOnly

    [ObservableProperty]
    private int? _selectedSessionIndex;

    // @must_test(REQ-GUI-003)
    [RelayCommand]
    private void SetFilter(string mode)
    {
        FilterMode = mode;
    }

    public void Refresh()
    {
        // Will be wired to F# Aggregator.getProjects
    }

    public void ApplySort(string mode)
    {
        // Sort the projects collection based on mode
        var sorted = mode switch
        {
            "alpha" => Projects.OrderBy(p => p.Name).ToList(),
            "todos" => Projects.OrderByDescending(p => p.TodoCount).ToList(),
            _ => Projects.OrderByDescending(p => p.LastActivity).ToList()
        };
        Projects = new ObservableCollection<ProjectItemViewModel>(sorted);
    }
}

// @must_test(REQ-PRV-005)
public partial class ProjectItemViewModel : ViewModelBase
{
    [ObservableProperty]
    private string _name = "";

    [ObservableProperty]
    private string _provider = "";

    [ObservableProperty]
    private string _path = "";

    [ObservableProperty]
    private int _todoCount;

    [ObservableProperty]
    private int _sessionCount;

    [ObservableProperty]
    private long _lastActivity;

    [ObservableProperty]
    private ObservableCollection<SessionItemViewModel> _sessions = new();
}

// @must_test(REQ-SES-002)
public partial class SessionItemViewModel : ViewModelBase
{
    [ObservableProperty]
    private string _sessionId = "";

    [ObservableProperty]
    private string _provider = "";

    [ObservableProperty]
    private long _updatedAt;

    [ObservableProperty]
    private ObservableCollection<TodoItemViewModel> _todos = new();
}
