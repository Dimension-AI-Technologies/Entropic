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
using FSharpOption = Microsoft.FSharp.Core.FSharpOption<string>;
using FSharpOptionLong = Microsoft.FSharp.Core.FSharpOption<long>;

namespace Entropic.GUI.ViewModels;

internal static class TodoStatuses
{
    public const string Pending = "pending";
    public const string InProgress = "in_progress";
    public const string Completed = "completed";
    public const int ShortIdLength = 7;
}

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

    // Todo status filter toggles (REQ-GUI-003)
    [ObservableProperty]
    private bool _showCompleted = true;

    [ObservableProperty]
    private bool _showInProgress = true;

    [ObservableProperty]
    private bool _showPending = true;

    // Delete confirmation state
    [ObservableProperty]
    private bool _showDeleteConfirm;

    // Merge dialog state
    [ObservableProperty]
    private bool _isMergeDialogOpen;

    [ObservableProperty]
    private string _mergePreviewText = "";

    [ObservableProperty]
    private ObservableCollection<TodoItemViewModel> _filteredTodos = new();

    [ObservableProperty]
    private TodoItemViewModel? _selectedTodoItem;

    partial void OnShowCompletedChanged(bool value) => RebuildFilteredTodos();
    partial void OnShowInProgressChanged(bool value) => RebuildFilteredTodos();
    partial void OnShowPendingChanged(bool value) => RebuildFilteredTodos();

    private void RebuildFilteredTodos()
    {
        FilteredTodos.Clear();
        if (SelectedSession == null) return;
        foreach (var t in SelectedSession.Todos)
        {
            if ((t.Status == TodoStatuses.Completed && ShowCompleted) ||
                (t.Status == TodoStatuses.InProgress && ShowInProgress) ||
                (t.Status == TodoStatuses.Pending && ShowPending))
                FilteredTodos.Add(t);
        }
    }

    /// Count of empty sessions in selected project.
    public int EmptySessionCount =>
        SelectedProject?.Sessions.Count(s => s.Todos.Count == 0) ?? 0;

    // @must_test(REQ-GUI-003)
    // @must_test(REQ-SES-002)
    // @must_test(REQ-GUI-020)
    [RelayCommand]
    private void SelectSession(SessionItemViewModel session)
    {
        // Clear previous selection
        if (SelectedSession != null) SelectedSession.IsSelected = false;
        SelectedSession = session;
        session.IsSelected = true;
        RebuildFilteredTodos();
        OnPropertyChanged(nameof(EmptySessionCount));
    }

    // @must_test(REQ-SES-007)
    [RelayCommand]
    private void DeleteSelectedSession()
    {
        if (SelectedSession?.FilePath == null) return;
        var result = SessionManager.deleteSession(new Session(
            SelectedSession.Provider, SelectedSession.SessionId,
            FSharpOption.Some(SelectedSession.FilePath),
            FSharpOption.None, FSharpList<Todo>.Empty,
            FSharpOptionLong.None, FSharpOptionLong.None));
        if (result.IsOk && SelectedProject != null)
        {
            SelectedProject.Sessions.Remove(SelectedSession);
            SelectedSession = SelectedProject.Sessions.FirstOrDefault();
            ShowDeleteConfirm = false;
            RebuildFilteredTodos();
            OnPropertyChanged(nameof(EmptySessionCount));
        }
    }

    // @must_test(REQ-SES-010)
    [RelayCommand]
    private void DeleteEmptySessions()
    {
        if (SelectedProject == null) return;
        var emptySessions = SelectedProject.Sessions.Where(s => s.Todos.Count == 0).ToList();
        foreach (var s in emptySessions)
        {
            if (s.FilePath == null) continue;
            var result = SessionManager.deleteSession(new Session(
                s.Provider, s.SessionId,
                FSharpOption.Some(s.FilePath), FSharpOption.None,
                FSharpList<Todo>.Empty, FSharpOptionLong.None, FSharpOptionLong.None));
            if (result.IsOk)
                SelectedProject.Sessions.Remove(s);
        }
        OnPropertyChanged(nameof(EmptySessionCount));
    }

    private (List<SessionItemViewModel> Sources, HashSet<string> ExistingContents)? GetMergeContext()
    {
        if (SelectedProject == null || SelectedSession == null) return null;
        var sources = SelectedProject.Sessions.Where(s => s != SelectedSession).ToList();
        var existing = new HashSet<string>(SelectedSession.Todos.Select(t => t.Content));
        return (sources, existing);
    }

    // @must_test(REQ-SES-006)
    [RelayCommand]
    private void StartMerge()
    {
        var ctx = GetMergeContext();
        if (ctx == null) return;
        var (sources, existing) = ctx.Value;
        var allSourceTodos = sources.SelectMany(s => s.Todos).ToList();
        var newCount = allSourceTodos.Count(t => !existing.Contains(t.Content));
        var dupCount = allSourceTodos.Count(t => existing.Contains(t.Content));
        MergePreviewText = $"Merge {sources.Count} sessions into selected.\n{newCount} new todos, {dupCount} duplicates will be skipped.";
        IsMergeDialogOpen = true;
    }

    [RelayCommand]
    private void ConfirmMerge()
    {
        var ctx = GetMergeContext();
        if (ctx == null) { IsMergeDialogOpen = false; return; }
        var (sources, existing) = ctx.Value;
        foreach (var todo in sources.SelectMany(s => s.Todos))
        {
            if (existing.Add(todo.Content))
                SelectedSession!.Todos.Add(todo);
        }
        foreach (var s in sources)
            SelectedProject!.Sessions.Remove(s);
        IsMergeDialogOpen = false;
        RebuildFilteredTodos();
        OnPropertyChanged(nameof(EmptySessionCount));
    }

    [RelayCommand]
    private void CancelMerge() => IsMergeDialogOpen = false;

    [RelayCommand]
    private void SetShowDeleteConfirm(string show) => ShowDeleteConfirm = show == "true";

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

        var items = filtered.Select(ConvertProject).ToList();
        Projects.Clear();
        foreach (var item in items) Projects.Add(item);
    }

    public void ApplySort(string mode)
    {
        var sorted = mode switch
        {
            "alpha" => Projects.OrderBy(p => p.Name).ToList(),
            "todos" => Projects.OrderByDescending(p => p.TodoCount).ToList(),
            _ => Projects.OrderByDescending(p => p.LastActivity).ToList()
        };
        Projects.Clear();
        foreach (var item in sorted) Projects.Add(item);
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
            Status = t.Status.IsCompleted ? TodoStatuses.Completed
                   : t.Status.IsInProgress ? TodoStatuses.InProgress
                   : TodoStatuses.Pending,
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
            var id = SessionId.Length > TodoStatuses.ShortIdLength ? SessionId[..TodoStatuses.ShortIdLength] : SessionId;
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
    private bool _isSelected;

    [ObservableProperty]
    private ObservableCollection<TodoItemViewModel> _todos = new();
}
