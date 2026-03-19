using System.Collections.ObjectModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using Entropic.Core;
using Microsoft.FSharp.Collections;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-TOD-008)
public partial class GlobalViewModel : ViewModelBase
{
    private FSharpList<Project>? _coreProjects;

    [ObservableProperty]
    private ObservableCollection<TodoItemViewModel> _allTodos = new();

    [ObservableProperty]
    private bool _showActiveOnly;

    partial void OnShowActiveOnlyChanged(bool value)
    {
        Rebuild();
    }

    public void LoadFromProjects(FSharpList<Project> projects)
    {
        _coreProjects = projects;
        Rebuild();
    }

    public void Refresh()
    {
        Rebuild();
    }

    private void Rebuild()
    {
        if (_coreProjects == null) return;

        var allTodos = _coreProjects
            .SelectMany(p => p.Sessions)
            .SelectMany(s => s.Todos);

        if (ShowActiveOnly)
        {
            allTodos = allTodos.Where(t => !t.Status.IsCompleted);
        }

        // Sort: in_progress first, then pending, then completed
        var sorted = allTodos
            .OrderBy(t => t.Status.IsInProgress ? 0 : t.Status.IsPending ? 1 : 2)
            .Select(ProjectsViewModel.ConvertTodo);

        AllTodos = new ObservableCollection<TodoItemViewModel>(sorted);
    }
}
