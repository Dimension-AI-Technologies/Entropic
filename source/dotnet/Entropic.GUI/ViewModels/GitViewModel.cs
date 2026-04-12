using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Entropic.Core.Git;
using Microsoft.FSharp.Control;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-GUI-010)
// @must_test(REQ-GIT-006)
public partial class GitViewModel : ViewModelBase
{
    private string _rootPath = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    private readonly MainWindowViewModel? _parent;

    [ObservableProperty]
    private ObservableCollection<GitRepoItemViewModel> _repos = new();

    [ObservableProperty]
    private GitRepoItemViewModel? _selectedRepo;

    [ObservableProperty]
    private int _totalRepos;

    [ObservableProperty]
    private int _outOfSync;

    public GitViewModel() { }

    public GitViewModel(MainWindowViewModel parent)
    {
        _parent = parent;
    }

    public void SetRootPath(string rootPath)
    {
        _rootPath = rootPath;
    }

    [RelayCommand]
    private void ViewCommits()
    {
        if (SelectedRepo == null || _parent == null) return;
        var fullPath = Path.Combine(_rootPath, SelectedRepo.RelativePath);
        _parent.ShowCommitsForRepo(fullPath, SelectedRepo.Name);
    }

    public async Task RefreshAsync()
    {
        var result = await FSharpAsync.StartAsTask(
            GitIntegration.discoverRepos(_rootPath), null, null);

        if (!result.IsOk) return;
        var repos = result.ResultValue;
        var summary = GitIntegration.summarize(repos);

        TotalRepos = summary.TotalRepos;
        OutOfSync = summary.OutOfSync;

        Repos.Clear();
        foreach (var r in repos)
        {
            Repos.Add(new GitRepoItemViewModel
            {
                Name = r.Name,
                RelativePath = r.RelativePath,
                RemoteUrl = r.RemoteUrl?.Value ?? "",
                Ahead = r.Ahead,
                Behind = r.Behind,
                Languages = new ObservableCollection<string>(r.Languages),
            });
        }
    }

    public void Refresh() => _ = RefreshAsync();
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
