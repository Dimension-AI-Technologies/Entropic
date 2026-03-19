using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-TOD-008)
public partial class GlobalViewModel : ViewModelBase
{
    [ObservableProperty]
    private ObservableCollection<TodoItemViewModel> _allTodos = new();

    [ObservableProperty]
    private bool _showActiveOnly;

    public void Refresh()
    {
        // Will aggregate todos from all projects/sessions
    }
}
