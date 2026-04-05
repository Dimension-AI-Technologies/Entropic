using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Entropic.Core;
using Microsoft.FSharp.Collections;
using FSharpOption = Microsoft.FSharp.Core.FSharpOption<string>;
using FSharpOptionLong = Microsoft.FSharp.Core.FSharpOption<long>;

namespace Entropic.GUI.ViewModels;

public partial class TodoItemViewModel : ViewModelBase
{
    [ObservableProperty]
    private string? _id;

    [ObservableProperty]
    private string _content = "";

    [ObservableProperty]
    private string _status = TodoStatuses.Pending;

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
        TodoStatuses.Completed => "#43b581",
        TodoStatuses.InProgress => "#5865f2",
        _ => "#72767d"
    };

    // @must_test(REQ-TOD-003)
    public string StatusIcon => Status switch
    {
        TodoStatuses.Completed => "\u2713",
        TodoStatuses.InProgress => "\u2192",
        _ => "\u25CB"
    };

    // @must_test(REQ-TOD-001)
    public string DisplayText => Status == TodoStatuses.InProgress && !string.IsNullOrEmpty(ActiveForm)
        ? ActiveForm
        : Content;

    // @must_test(REQ-TOD-004)
    [RelayCommand]
    private void ToggleStatus()
    {
        Status = Status switch
        {
            TodoStatuses.Pending => TodoStatuses.InProgress,
            TodoStatuses.InProgress => TodoStatuses.Completed,
            _ => TodoStatuses.Pending
        };
        OnPropertyChanged(nameof(StatusColor));
        OnPropertyChanged(nameof(StatusIcon));
        OnPropertyChanged(nameof(DisplayText));
        PersistOwnerSession();
    }

    // @must_test(REQ-TOD-004)
    [RelayCommand]
    private void StartEdit() => IsEditing = true;

    [RelayCommand]
    private void EndEdit()
    {
        IsEditing = false;
        OnPropertyChanged(nameof(DisplayText));
        PersistOwnerSession();
    }

    // @must_test(REQ-TOD-005)
    [RelayCommand]
    private void Delete()
    {
        if (OwnerSession == null) return;
        OwnerSession.Todos.Remove(this);
        PersistOwnerSession();
    }

    // @must_test(REQ-TOD-012)
    /// Persist the owning session's todo list to disk via F# Core.
    public void PersistOwnerSession()
    {
        if (OwnerSession?.FilePath == null) return;
        var fsharpTodos = OwnerSession.Todos.Select(ToCoreTodo);
        TodoManager.persistTodos(OwnerSession.FilePath, ListModule.OfSeq(fsharpTodos));
    }

    public static Todo ToCoreTodo(TodoItemViewModel t)
    {
        var status = t.Status switch
        {
            TodoStatuses.InProgress => TodoStatus.InProgress,
            TodoStatuses.Completed => TodoStatus.Completed,
            _ => TodoStatus.Pending
        };
        return new Todo(
            t.Id != null ? FSharpOption.Some(t.Id) : FSharpOption.None,
            t.Content, status,
            FSharpOptionLong.None, FSharpOptionLong.None,
            t.ActiveForm != null ? FSharpOption.Some(t.ActiveForm) : FSharpOption.None);
    }
}
