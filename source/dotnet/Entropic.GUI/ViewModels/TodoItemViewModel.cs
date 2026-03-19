using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

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
    }

    // @must_test(REQ-TOD-005)
    public bool CanDelete => true;
}
