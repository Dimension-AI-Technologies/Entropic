using System;
using System.Collections.ObjectModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Entropic.Core;
using Microsoft.FSharp.Collections;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-TOD-001)
// @must_test(REQ-TOD-003)
// @must_test(REQ-TOD-004)
// @must_test(REQ-TOD-005)
// @must_test(REQ-TOD-012)
public partial class TodoItemViewModel : ViewModelBase
{
    [ObservableProperty]
    private string? _id;

    [ObservableProperty]
    private string _content = "";

    [ObservableProperty]
    private string _status = "pending"; // pending, in_progress, completed

    [ObservableProperty]
    private string? _activeForm;

    [ObservableProperty]
    private bool _isEditing;

    [ObservableProperty]
    private bool _isSelected;

    /// The session that owns this todo — set by the parent session view model.
    public SessionItemViewModel? OwnerSession { get; set; }

    // @must_test(REQ-TOD-003)
    public string StatusColor => Status switch
    {
        "completed" => "#4caf50",   // green
        "in_progress" => "#2196f3", // blue
        _ => "#9e9e9e"              // gray
    };

    // @must_test(REQ-TOD-003)
    public string StatusIcon => Status switch
    {
        "completed" => "\u2713",    // checkmark
        "in_progress" => "\u2192",  // arrow
        _ => "\u25CB"               // circle
    };

    public string DisplayText => Status == "in_progress" && !string.IsNullOrEmpty(ActiveForm)
        ? ActiveForm
        : Content;

    // @must_test(REQ-TOD-004)
    [RelayCommand]
    private void ToggleStatus()
    {
        Status = Status switch
        {
            "pending" => "in_progress",
            "in_progress" => "completed",
            _ => "pending"
        };
        OnPropertyChanged(nameof(StatusColor));
        OnPropertyChanged(nameof(StatusIcon));
        OnPropertyChanged(nameof(DisplayText));
        PersistSession();
    }

    // @must_test(REQ-TOD-004)
    [RelayCommand]
    private void StartEdit()
    {
        IsEditing = true;
    }

    [RelayCommand]
    private void EndEdit()
    {
        IsEditing = false;
        OnPropertyChanged(nameof(DisplayText));
        PersistSession();
    }

    // @must_test(REQ-TOD-005)
    [RelayCommand]
    private void Delete()
    {
        if (OwnerSession == null) return;
        OwnerSession.Todos.Remove(this);
        PersistSession();
    }

    public bool CanDelete => true;

    /// Persist the owning session's todo list to disk via F# Core.
    private void PersistSession()
    {
        if (OwnerSession?.FilePath == null) return;

        var fsharpTodos = OwnerSession.Todos.Select(ToCoreTodo);
        TodoManager.persistTodos(OwnerSession.FilePath, ListModule.OfSeq(fsharpTodos));
    }

    public static Todo ToCoreTodo(TodoItemViewModel t)
    {
        var status = t.Status switch
        {
            "in_progress" => TodoStatus.InProgress,
            "completed" => TodoStatus.Completed,
            _ => TodoStatus.Pending
        };
        return new Todo(
            t.Id != null ? Microsoft.FSharp.Core.FSharpOption<string>.Some(t.Id) : Microsoft.FSharp.Core.FSharpOption<string>.None,
            t.Content,
            status,
            Microsoft.FSharp.Core.FSharpOption<long>.None,
            Microsoft.FSharp.Core.FSharpOption<long>.None,
            t.ActiveForm != null ? Microsoft.FSharp.Core.FSharpOption<string>.Some(t.ActiveForm) : Microsoft.FSharp.Core.FSharpOption<string>.None
        );
    }
}
