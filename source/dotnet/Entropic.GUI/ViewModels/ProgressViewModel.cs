using CommunityToolkit.Mvvm.ComponentModel;

namespace Entropic.GUI.ViewModels;

public partial class ProgressViewModel : ViewModelBase
{
    [ObservableProperty]
    private bool _isVisible;

    [ObservableProperty]
    private string _statusMessage = "";

    [ObservableProperty]
    private double _progress;

    // @must_test(REQ-GUI-021)
    public void Show(string message)
    {
        StatusMessage = message;
        IsVisible = true;
    }

    public void Update(string message, double progress)
    {
        StatusMessage = message;
        Progress = progress;
    }

    public void Hide()
    {
        IsVisible = false;
    }
}
