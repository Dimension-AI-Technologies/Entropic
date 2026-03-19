using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-GUI-010)
public partial class GitViewModel : ViewModelBase
{
    [ObservableProperty]
    private ObservableCollection<GitRepoItemViewModel> _repos = new();

    [ObservableProperty]
    private int _totalRepos;

    [ObservableProperty]
    private int _outOfSync;

    public void Refresh()
    {
        // Will call GitIntegration.discoverRepos on demand
    }
}

public partial class GitRepoItemViewModel : ViewModelBase
{
    [ObservableProperty]
    private string _name = "";

    [ObservableProperty]
    private string _relativePath = "";

    [ObservableProperty]
    private string _remoteUrl = "";

    [ObservableProperty]
    private int _ahead;

    [ObservableProperty]
    private int _behind;

    [ObservableProperty]
    private ObservableCollection<string> _languages = new();
}
