using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Entropic.Core;
using Microsoft.FSharp.Collections;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-GUI-002)
public partial class ProjectsViewModel : ViewModelBase
{
    private FSharpList<Project>? _coreProjects;

    [ObservableProperty]
    private ObservableCollection<ProjectItemViewModel> _projects = new();

    [ObservableProperty]
    private ProjectItemViewModel? _selectedProject;

    [ObservableProperty]
    private string _filterMode = "all"; // all, hasSessions, hasTodos, activeOnly

    [ObservableProperty]
    private SessionItemViewModel? _selectedSession;

    // @must_test(REQ-GUI-003)
    // @must_test(REQ-SES-002)
    // @must_test(REQ-GUI-020)
    [RelayCommand]
    private void SelectSession(SessionItemViewModel session)
    {
        SelectedSession = session;
    }

    // @must_test(REQ-TOD-012) — drag-and-drop / keyboard reorder
    [RelayCommand]
    private void MoveTodoUp(TodoItemViewModel todo)
    {
        if (SelectedSession == null) return;
        var todos = SelectedSession.Todos;
        var idx = todos.IndexOf(todo);
        if (idx > 0) todos.Move(idx, idx - 1);
        todo.PersistOwnerSession();
    }

    [RelayCommand]
    private void MoveTodoDown(TodoItemViewModel todo)
    {
        if (SelectedSession == null) return;
        var todos = SelectedSession.Todos;
        var idx = todos.IndexOf(todo);
        if (idx >= 0 && idx < todos.Count - 1) todos.Move(idx, idx + 1);
        todo.PersistOwnerSession();
    }

    public void ReorderTodo(int fromIndex, int toIndex)
    {
        if (SelectedSession == null) return;
        var todos = SelectedSession.Todos;
        if (fromIndex < 0 || fromIndex >= todos.Count || toIndex < 0 || toIndex >= todos.Count) return;
        todos.Move(fromIndex, toIndex);
        if (todos.Count > 0) todos[0].PersistOwnerSession();
    }

    // @must_test(REQ-GUI-003)
    // @must_test(REQ-GUI-004)
    [RelayCommand]
    private void SetFilter(string mode)
    {
        FilterMode = mode;
        ApplyFilter();
    }

    // REQ-GUI-004: Context menu actions
    [RelayCommand]
    private void CopyPath()
    {
        // Avalonia clipboard requires TopLevel access; store for UI layer to pick up
        if (SelectedProject != null)
            _lastCopiedPath = SelectedProject.Path;
    }

    [RelayCommand]
    private void OpenInExplorer()
    {
        if (SelectedProject == null || !Directory.Exists(SelectedProject.Path)) return;
        Process.Start(new ProcessStartInfo
        {
            FileName = SelectedProject.Path,
            UseShellExecute = true
        });
    }

    private string? _lastCopiedPath;
    public string? LastCopiedPath => _lastCopiedPath;

    public void LoadFromCore(FSharpList<Project> projects)
    {
        _coreProjects = projects;
        ApplyFilter();
    }

    public void Refresh()
    {
        // Called from MainWindowViewModel.Refresh() via LoadFromCore
    }

    private void ApplyFilter()
    {
        if (_coreProjects == null) return;

        IEnumerable<Project> filtered = _coreProjects;
        filtered = FilterMode switch
        {
            "hasSessions" => filtered.Where(p => p.Sessions.Length > 0),
            "hasTodos" => filtered.Where(p => p.Stats != null && p.Stats.Value.Todos > 0),
            "activeOnly" => filtered.Where(p => p.Stats != null && p.Stats.Value.Active > 0),
            _ => filtered
        };

        Projects = new ObservableCollection<ProjectItemViewModel>(
            filtered.Select(ConvertProject));
    }

    public void ApplySort(string mode)
    {
        var sorted = mode switch
        {
            "alpha" => Projects.OrderBy(p => p.Name).ToList(),
            "todos" => Projects.OrderByDescending(p => p.TodoCount).ToList(),
            _ => Projects.OrderByDescending(p => p.LastActivity).ToList()
        };
        Projects = new ObservableCollection<ProjectItemViewModel>(sorted);
    }

    // @must_test(REQ-PRV-005)
    // @must_test(REQ-TOD-007)
    public static ProjectItemViewModel ConvertProject(Project p)
    {
        var vm = new ProjectItemViewModel
        {
            Name = Path.GetFileName(p.ProjectPath.TrimEnd('/', '\\')),
            Provider = p.Provider,
            Path = p.ProjectPath,
            TodoCount = p.Stats != null ? p.Stats.Value.Todos : 0,
            SessionCount = p.Sessions.Length,
            LastActivity = p.MostRecentTodoDate?.Value ?? 0L,
        };

        foreach (var s in p.Sessions)
        {
            vm.Sessions.Add(ConvertSession(s));
        }
        return vm;
    }

    public static SessionItemViewModel ConvertSession(Session s)
    {
        var vm = new SessionItemViewModel
        {
            SessionId = s.SessionId,
            Provider = s.Provider,
            UpdatedAt = s.UpdatedAt?.Value ?? 0L,
            FilePath = s.FilePath?.Value,
        };

        foreach (var t in s.Todos)
        {
            var todoVm = ConvertTodo(t);
            todoVm.OwnerSession = vm;
            vm.Todos.Add(todoVm);
        }
        return vm;
    }

    public static TodoItemViewModel ConvertTodo(Todo t)
    {
        return new TodoItemViewModel
        {
            Id = t.Id?.Value,
            Content = t.Content,
            Status = t.Status.IsCompleted ? "completed"
                   : t.Status.IsInProgress ? "in_progress"
                   : "pending",
            ActiveForm = t.ActiveForm?.Value,
        };
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

    /// Short label for session tab strip: first 7 chars of session ID + date.
    public string ShortLabel
    {
        get
        {
            var id = SessionId.Length > 7 ? SessionId[..7] : SessionId;
            if (UpdatedAt > 0)
            {
                var dt = DateTimeOffset.FromUnixTimeMilliseconds(UpdatedAt);
                return $"{id} {dt:dd-MMM HH:mm}";
            }
            return id;
        }
    }

    [ObservableProperty]
    private string? _filePath;

    [ObservableProperty]
    private ObservableCollection<TodoItemViewModel> _todos = new();
}
