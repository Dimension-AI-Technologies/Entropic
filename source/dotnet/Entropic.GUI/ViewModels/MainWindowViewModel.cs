using CommunityToolkit.Mvvm.ComponentModel;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-ARC-003)
public partial class MainWindowViewModel : ViewModelBase
{
    [ObservableProperty]
    private int _selectedTabIndex;

    [ObservableProperty]
    private string _statusText = "Entropic — loading...";
}
