using CommunityToolkit.Mvvm.ComponentModel;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-GUI-021)
public partial class ProgressViewModel : ViewModelBase
{
    [ObservableProperty]
    private bool _isVisible;

    [ObservableProperty]
    private string _statusMessage = "";

    [ObservableProperty]
    private double _progress;

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
