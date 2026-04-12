using System;
using System.Collections.ObjectModel;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using Entropic.Core.Git;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-GIT-005)
public partial class CommitViewModel : ViewModelBase
{
    [ObservableProperty]
    private ObservableCollection<CommitItemViewModel> _commits = new();

    [ObservableProperty]
    private string? _selectedRepoPath;

    [ObservableProperty]
    private string _repoName = "";

    [ObservableProperty]
    private int _commitLimit = 50;

    public void LoadForRepo(string repoPath, string repoName)
    {
        SelectedRepoPath = repoPath;
        RepoName = repoName;
        Refresh();
    }

    public void Refresh()
    {
        if (string.IsNullOrEmpty(SelectedRepoPath)) return;

        var result = GitIntegration.getCommitHistory(SelectedRepoPath, CommitLimit);
        Commits.Clear();
        if (result.IsOk)
        {
            foreach (var c in result.ResultValue)
            {
                Commits.Add(new CommitItemViewModel
                {
                    Hash = c.Hash,
                    ShortHash = c.Hash.Length >= TodoStatuses.ShortIdLength ? c.Hash[..TodoStatuses.ShortIdLength] : c.Hash,
                    Date = c.Date,
                    Message = c.Message,
                    AuthorName = c.AuthorName,
                    Additions = c.Stats.Additions,
                    Deletions = c.Stats.Deletions,
                    FilesChanged = c.Stats.FilesChanged,
                });
            }
        }
        else
        {
            ErrorMessage = result.ErrorValue;
        }
    }

    [ObservableProperty]
    private string? _errorMessage;
}

public partial class CommitItemViewModel : ViewModelBase
{
    [ObservableProperty]
    private string _hash = "";

    [ObservableProperty]
    private string _shortHash = "";

    [ObservableProperty]
    private string _date = "";

    [ObservableProperty]
    private string _message = "";

    [ObservableProperty]
    private string _authorName = "";

    [ObservableProperty]
    private int _additions;

    [ObservableProperty]
    private int _deletions;

    [ObservableProperty]
    private int _filesChanged;

    public string StatsText => $"+{Additions} -{Deletions} ({FilesChanged} files)";
}
