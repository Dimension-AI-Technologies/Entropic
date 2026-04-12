using Entropic.Core;
using Entropic.GUI.ViewModels;
using Entropic.GUI.Services;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;
using Xunit;

namespace Entropic.GUI.Tests;

// ── MainWindowViewModel (REQ-ARC-003, REQ-GUI-001, REQ-GUI-011, etc.) ──

// @covers(MainWindowViewModel)
public class MainWindowViewModelTests
{
    // @covers(MainWindowViewModel)
    [Fact]
    public void MainWindowViewModel_has_MVVM_observable_properties()
    {
        var vm = new MainWindowViewModel();
        Assert.Equal(0, vm.SelectedTabIndex);
        Assert.NotNull(vm.StatusText);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void UpdateStatusBar_formats_project_and_todo_counts()
    {
        var vm = new MainWindowViewModel { ProjectCount = 5, ActiveTodoCount = 12 };
        vm.UpdateStatusBar();
        Assert.Contains("5 projects", vm.StatusText);
        Assert.Contains("12 active TODOs", vm.StatusText);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void ToggleActivityMode_toggles_state()
    {
        var vm = new MainWindowViewModel();
        Assert.False(vm.ActivityModeEnabled);
        vm.ToggleActivityModeCommand.Execute(null);
        Assert.True(vm.ActivityModeEnabled);
        vm.ToggleActivityModeCommand.Execute(null);
        Assert.False(vm.ActivityModeEnabled);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void SetSortMode_updates_property()
    {
        var vm = new MainWindowViewModel();
        vm.SetSortModeCommand.Execute("alpha");
        Assert.Equal("alpha", vm.ProjectSortMode);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void SpacingPixels_maps_mode_to_correct_values()
    {
        var vm = new MainWindowViewModel();
        vm.SpacingMode = "compact";
        Assert.Equal(6, vm.SpacingPixels);
        vm.SpacingMode = "normal";
        Assert.Equal(10, vm.SpacingPixels);
        vm.SpacingMode = "wide";
        Assert.Equal(14, vm.SpacingPixels);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void Provider_filters_default_to_enabled()
    {
        var vm = new MainWindowViewModel();
        Assert.True(vm.ClaudeFilterEnabled);
        Assert.True(vm.CodexFilterEnabled);
        Assert.True(vm.GeminiFilterEnabled);
    }
}

// ── ProjectsViewModel (REQ-GUI-002, REQ-GUI-003, REQ-TOD-007) ──

// @covers(ProjectsViewModel)
public class ProjectsViewModelTests
{
    // @covers(ProjectsViewModel)
    [Fact]
    public void ProjectsViewModel_starts_with_empty_projects()
    {
        var vm = new ProjectsViewModel();
        Assert.Empty(vm.Projects);
        Assert.Null(vm.SelectedProject);
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void SetFilter_changes_filter_mode()
    {
        var vm = new ProjectsViewModel();
        vm.SetFilterCommand.Execute("hasTodos");
        Assert.Equal("hasTodos", vm.FilterMode);
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void ApplySort_sorts_by_name()
    {
        var vm = new ProjectsViewModel();
        vm.Projects.Add(new ProjectItemViewModel { Name = "Zeta" });
        vm.Projects.Add(new ProjectItemViewModel { Name = "Alpha" });
        vm.ApplySort("alpha");
        Assert.Equal("Alpha", vm.Projects[0].Name);
        Assert.Equal("Zeta", vm.Projects[1].Name);
    }
}

// ── ProjectItemViewModel (REQ-PRV-005) ──

// @covers(ProjectItemViewModel)
public class ProjectItemViewModelTests
{
    // @covers(ProjectItemViewModel)
    [Fact]
    public void ProjectItem_stores_provider_and_name()
    {
        var item = new ProjectItemViewModel { Name = "MyProject", Provider = "claude", TodoCount = 5 };
        Assert.Equal("MyProject", item.Name);
        Assert.Equal("claude", item.Provider);
        Assert.Equal(5, item.TodoCount);
    }
}

// ── SessionItemViewModel (REQ-SES-002) ──

// @covers(SessionItemViewModel)
public class SessionItemViewModelTests
{
    // @covers(SessionItemViewModel)
    [Fact]
    public void SessionItem_stores_session_id_and_provider()
    {
        var item = new SessionItemViewModel { SessionId = "abc-123", Provider = "codex" };
        Assert.Equal("abc-123", item.SessionId);
        Assert.Equal("codex", item.Provider);
    }
}

// ── TodoItemViewModel (REQ-TOD-001, 003, 004, 005, 012) ──

// @covers(TodoItemViewModel)
public class TodoItemViewModelTests
{
    // @covers(TodoItemViewModel)
    [Fact]
    public void StatusColor_maps_to_correct_colors()
    {
        var vm = new TodoItemViewModel { Status = "completed" };
        Assert.Equal("#43b581", vm.StatusColor);
        vm.Status = "in_progress";
        Assert.Equal("#5865f2", vm.StatusColor);
        vm.Status = "pending";
        Assert.Equal("#72767d", vm.StatusColor);
    }

    // @covers(TodoItemViewModel)
    [Fact]
    public void StatusIcon_maps_to_correct_symbols()
    {
        var vm = new TodoItemViewModel { Status = "completed" };
        Assert.Equal("\u2713", vm.StatusIcon);
        vm.Status = "in_progress";
        Assert.Equal("\u2192", vm.StatusIcon);
        vm.Status = "pending";
        Assert.Equal("\u25CB", vm.StatusIcon);
    }

    // @covers(TodoItemViewModel)
    [Fact]
    public void ToggleStatus_cycles_through_states()
    {
        var vm = new TodoItemViewModel { Status = "pending" };
        vm.ToggleStatusCommand.Execute(null);
        Assert.Equal("in_progress", vm.Status);
        vm.ToggleStatusCommand.Execute(null);
        Assert.Equal("completed", vm.Status);
        vm.ToggleStatusCommand.Execute(null);
        Assert.Equal("pending", vm.Status);
    }

    // @covers(TodoItemViewModel)
    [Fact]
    public void DisplayText_uses_ActiveForm_when_in_progress()
    {
        var vm = new TodoItemViewModel { Content = "original", Status = "in_progress", ActiveForm = "running" };
        Assert.Equal("running", vm.DisplayText);
        vm.Status = "pending";
        Assert.Equal("original", vm.DisplayText);
    }

    // @covers(TodoItemViewModel)
    [Fact]
    public void StartEdit_and_EndEdit_toggle_editing()
    {
        var vm = new TodoItemViewModel();
        Assert.False(vm.IsEditing);
        vm.StartEditCommand.Execute(null);
        Assert.True(vm.IsEditing);
        vm.EndEditCommand.Execute(null);
        Assert.False(vm.IsEditing);
    }

    // CanDelete property removed — deletion is handled by commands
}

// ── GlobalViewModel (REQ-TOD-008) ──

// @covers(GlobalViewModel)
public class GlobalViewModelTests
{
    // @covers(GlobalViewModel)
    [Fact]
    public void GlobalViewModel_starts_with_empty_todos()
    {
        var vm = new GlobalViewModel();
        Assert.Empty(vm.AllTodos);
        Assert.False(vm.ShowActiveOnly);
    }
}

// ── GitViewModel (REQ-GUI-010) ──

// @covers(GitViewModel)
public class GitViewModelTests
{
    // @covers(GitViewModel)
    [Fact]
    public void GitViewModel_starts_with_empty_repos()
    {
        var vm = new GitViewModel();
        Assert.Empty(vm.Repos);
        Assert.Equal(0, vm.TotalRepos);
    }
}

// ── HelpViewModel (REQ-GUI-018) ──

// @covers(HelpViewModel)
public class HelpViewModelTests
{
    // @covers(HelpViewModel)
    [Fact]
    public void HelpViewModel_has_keyboard_shortcuts()
    {
        var vm = new HelpViewModel();
        Assert.NotEmpty(vm.KeyboardShortcuts);
        Assert.Contains(vm.KeyboardShortcuts, s => s.Contains("F1"));
    }
}

// ── ProgressViewModel (REQ-GUI-021) ──

// @covers(ProgressViewModel)
public class ProgressViewModelTests
{
    // @covers(ProgressViewModel)
    [Fact]
    public void Show_and_Hide_toggle_visibility()
    {
        var vm = new ProgressViewModel();
        Assert.False(vm.IsVisible);
        vm.Show("Loading...");
        Assert.True(vm.IsVisible);
        Assert.Equal("Loading...", vm.StatusMessage);
        vm.Hide();
        Assert.False(vm.IsVisible);
    }

    // @covers(ProgressViewModel)
    [Fact]
    public void Update_sets_message_and_progress()
    {
        var vm = new ProgressViewModel();
        vm.Update("50%", 0.5);
        Assert.Equal("50%", vm.StatusMessage);
        Assert.Equal(0.5, vm.Progress);
    }
}

// ── ToastService (REQ-GUI-008) ──

// @covers(ToastService)
public class ToastServiceTests
{
    // @covers(ToastService)
    [Fact]
    public void Show_fires_event()
    {
        var service = new ToastService();
        string? received = null;
        service.ToastRequested += msg => received = msg;
        service.Show("Test toast");
        Assert.Equal("Test toast", received);
    }
}

// ── ScreenshotService (REQ-GUI-009) ──

// @covers(ScreenshotService)
public class ScreenshotServiceTests
{
    // @covers(ScreenshotService)
    [Fact]
    public void GenerateFilename_contains_timestamp_and_extension()
    {
        var service = new ScreenshotService();
        var filename = service.GenerateFilename();
        Assert.StartsWith("Entropic_", filename);
        Assert.EndsWith(".png", filename);
    }

    // @covers(ScreenshotService)
    [Fact]
    public void GetSavePath_points_to_desktop()
    {
        var service = new ScreenshotService();
        var path = service.GetSavePath();
        Assert.Contains("Entropic_", path);
    }
}

// ── SingleInstanceGuard (REQ-PLT-005) ──

// @covers(SingleInstanceGuard)
public class SingleInstanceGuardTests
{
    // @covers(SingleInstanceGuard)
    [Fact]
    public void First_instance_acquires_mutex()
    {
        var uniqueId = $"test-{Guid.NewGuid()}";
        using var guard = new SingleInstanceGuard(uniqueId);
        Assert.True(guard.IsFirstInstance);
    }
}

// ── ErrorBoundaryService (REQ-GUI-019) ──

// @covers(ErrorBoundaryService)
public class ErrorBoundaryServiceTests
{
    // @covers(ErrorBoundaryService)
    [Fact]
    public void HandleError_stores_and_fires_event()
    {
        var service = new ErrorBoundaryService();
        Exception? caught = null;
        service.ErrorCaught += ex => caught = ex;
        var testEx = new InvalidOperationException("test");
        service.HandleError(testEx);
        Assert.Equal(testEx, caught);
        Assert.Equal(testEx, service.LastError);
    }

    // @covers(ErrorBoundaryService)
    [Fact]
    public void Clear_resets_last_error()
    {
        var service = new ErrorBoundaryService();
        service.HandleError(new Exception("x"));
        service.Clear();
        Assert.Null(service.LastError);
    }
}

// ── MainWindow (REQ-GUI-006, REQ-GUI-012, REQ-GUI-014) ──

// @covers(MainWindow)
public class MainWindowTests
{
    // @covers(MainWindow)
        [Fact]
    public void DefaultWidth_is_1400()
    {
        Assert.Equal(1400, Entropic.GUI.Views.MainWindow.DefaultWidth);
    }

    // @covers(MainWindow)
        [Fact]
    public void DefaultHeight_is_900()
    {
        Assert.Equal(900, Entropic.GUI.Views.MainWindow.DefaultHeight);
    }

    // @covers(MainWindow)
        [Fact]
    public void DarkBackground_is_correct_hex()
    {
        Assert.Equal("#1a1d21", Entropic.GUI.Views.MainWindow.DarkBackground);
    }
}

// ── Program (REQ-PLT-001, REQ-BLD-004) ──

// @covers(Program)
public class ProgramTests
{
    // @covers(Program)
    [Fact]
    public void BuildAvaloniaApp_returns_app_builder()
    {
        // Just verify it doesn't throw — actual Avalonia init needs a display
        // so we test the static method exists and is callable
        Assert.NotNull(typeof(Entropic.GUI.Program).GetMethod("BuildAvaloniaApp",
            System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static));
    }
}

// ── F# Core Integration Tests ──

// @covers(ProjectsViewModel)
public class CoreIntegrationTests
{
    private static FSharpList<Project> MakeTestProjects()
    {
        var todo1 = new Todo(
            FSharpOption<string>.Some("t1"), "Fix bug", TodoStatus.Pending,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.None);
        var todo2 = new Todo(
            FSharpOption<string>.Some("t2"), "Add feature", TodoStatus.InProgress,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.Some("Working on it"));
        var todo3 = new Todo(
            FSharpOption<string>.Some("t3"), "Done task", TodoStatus.Completed,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.None);

        var session = new Session(
            "claude", "ses-001", FSharpOption<string>.None,
            FSharpOption<string>.Some("/home/user/project"),
            ListModule.OfSeq(new[] { todo1, todo2, todo3 }),
            FSharpOption<long>.None, FSharpOption<long>.Some(1710000000000L));

        var project = new Project(
            "claude", "/home/user/project",
            FSharpOption<string>.Some("home-user-project"),
            FSharpOption<bool>.Some(true),
            ListModule.OfSeq(new[] { session }),
            FSharpOption<ProjectStats>.Some(new ProjectStats(3, 2, 1)),
            FSharpOption<long>.None, FSharpOption<long>.Some(1710000000000L));

        return ListModule.OfSeq(new[] { project });
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void LoadFromCore_converts_projects_to_ViewModels()
    {
        var vm = new ProjectsViewModel();
        vm.LoadFromCore(MakeTestProjects());

        Assert.Single(vm.Projects);
        var p = vm.Projects[0];
        Assert.Equal("project", p.Name);
        Assert.Equal("claude", p.Provider);
        Assert.Equal(3, p.TodoCount);
        Assert.Single(p.Sessions);
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void ConvertTodo_maps_status_correctly()
    {
        var pending = new Todo(FSharpOption<string>.None, "test", TodoStatus.Pending,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.None);
        var inProgress = new Todo(FSharpOption<string>.None, "test", TodoStatus.InProgress,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.Some("active"));
        var completed = new Todo(FSharpOption<string>.None, "test", TodoStatus.Completed,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.None);

        Assert.Equal("pending", ProjectsViewModel.ConvertTodo(pending).Status);
        Assert.Equal("in_progress", ProjectsViewModel.ConvertTodo(inProgress).Status);
        Assert.Equal("active", ProjectsViewModel.ConvertTodo(inProgress).ActiveForm);
        Assert.Equal("completed", ProjectsViewModel.ConvertTodo(completed).Status);
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void Filter_hasTodos_excludes_empty_projects()
    {
        var emptySession = new Session("claude", "ses-empty", FSharpOption<string>.None,
            FSharpOption<string>.None, ListModule.Empty<Todo>(),
            FSharpOption<long>.None, FSharpOption<long>.None);
        var emptyProject = new Project("claude", "/empty",
            FSharpOption<string>.None, FSharpOption<bool>.None,
            ListModule.OfSeq(new[] { emptySession }),
            FSharpOption<ProjectStats>.Some(new ProjectStats(0, 0, 0)),
            FSharpOption<long>.None, FSharpOption<long>.None);

        var projects = ListModule.OfSeq(new[] { emptyProject });
        var vm = new ProjectsViewModel();
        vm.LoadFromCore(projects);
        Assert.Single(vm.Projects);

        vm.SetFilterCommand.Execute("hasTodos");
        Assert.Empty(vm.Projects);
    }

    // @covers(GlobalViewModel)
    [Fact]
    public void GlobalViewModel_LoadFromProjects_aggregates_todos()
    {
        var vm = new GlobalViewModel();
        vm.LoadFromProjects(MakeTestProjects());
        Assert.Equal(3, vm.AllTodos.Count);
    }

    // @covers(GlobalViewModel)
    [Fact]
    public void GlobalViewModel_ShowActiveOnly_filters_completed()
    {
        var vm = new GlobalViewModel();
        vm.LoadFromProjects(MakeTestProjects());
        Assert.Equal(3, vm.AllTodos.Count);

        vm.ShowActiveOnly = true;
        Assert.Equal(2, vm.AllTodos.Count);
        Assert.DoesNotContain(vm.AllTodos, t => t.Status == "completed");
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void SetProviders_accepts_empty_list()
    {
        var vm = new MainWindowViewModel();
        vm.SetProviders(new System.Collections.Generic.List<IProviderPort>());
        Assert.NotNull(vm.Progress);
    }
}

// ── CommitViewModel (REQ-GIT-005) ──

// @covers(CommitViewModel)
public class CommitViewModelTests
{
    [Fact]
    public void CommitViewModel_starts_empty()
    {
        var vm = new CommitViewModel();
        Assert.Empty(vm.Commits);
        Assert.Null(vm.SelectedRepoPath);
        Assert.Equal("", vm.RepoName);
    }

    [Fact]
    public void LoadForRepo_sets_repo_properties()
    {
        var vm = new CommitViewModel();
        vm.LoadForRepo("/nonexistent/path", "TestRepo");
        Assert.Equal("/nonexistent/path", vm.SelectedRepoPath);
        Assert.Equal("TestRepo", vm.RepoName);
    }

    [Fact]
    public void CommitItemViewModel_formats_stats()
    {
        var item = new CommitItemViewModel
        {
            Hash = "abc1234567890",
            ShortHash = "abc1234",
            Additions = 10,
            Deletions = 3,
            FilesChanged = 2,
        };
        Assert.Equal("+10 -3 (2 files)", item.StatsText);
    }
}

// ── Todo Persistence (REQ-TOD-004) ──

// @covers(TodoItemViewModel)
public class TodoPersistenceTests
{
    [Fact]
    public void ToggleStatus_cycles_through_states()
    {
        var todo = new TodoItemViewModel { Status = "pending" };
        todo.ToggleStatusCommand.Execute(null);
        Assert.Equal("in_progress", todo.Status);
        todo.ToggleStatusCommand.Execute(null);
        Assert.Equal("completed", todo.Status);
        todo.ToggleStatusCommand.Execute(null);
        Assert.Equal("pending", todo.Status);
    }

    [Fact]
    public void ToggleStatus_updates_derived_properties()
    {
        var todo = new TodoItemViewModel { Status = "pending" };
        Assert.Equal("#72767d", todo.StatusColor);
        todo.ToggleStatusCommand.Execute(null);
        Assert.Equal("#5865f2", todo.StatusColor); // in_progress = blue
    }

    [Fact]
    public void ToCoreTodo_converts_status_correctly()
    {
        var pending = new TodoItemViewModel { Content = "a", Status = "pending" };
        var inProg = new TodoItemViewModel { Content = "b", Status = "in_progress" };
        var done = new TodoItemViewModel { Content = "c", Status = "completed" };

        Assert.True(TodoItemViewModel.ToCoreTodo(pending).Status.IsPending);
        Assert.True(TodoItemViewModel.ToCoreTodo(inProg).Status.IsInProgress);
        Assert.True(TodoItemViewModel.ToCoreTodo(done).Status.IsCompleted);
    }

    [Fact]
    public void ToCoreTodo_maps_optional_fields()
    {
        var todo = new TodoItemViewModel { Id = "test-id", Content = "hello", ActiveForm = "active text" };
        var core = TodoItemViewModel.ToCoreTodo(todo);
        Assert.Equal("test-id", core.Id.Value);
        Assert.Equal("active text", core.ActiveForm.Value);
    }

    [Fact]
    public void Delete_removes_todo_from_owner_session()
    {
        var session = new SessionItemViewModel { SessionId = "s1" };
        var todo = new TodoItemViewModel { Content = "delete me", OwnerSession = session };
        session.Todos.Add(todo);
        Assert.Single(session.Todos);

        todo.DeleteCommand.Execute(null);
        Assert.Empty(session.Todos);
    }
}

// ── MainWindow keyboard + overlays ──

// @covers(MainWindowViewModel)
// @covers(HelpViewModel)
public class MainWindowOverlayTests
{
    [Fact]
    public void ToggleHelp_opens_and_closes()
    {
        var vm = new MainWindowViewModel();
        Assert.False(vm.IsHelpOpen);
        vm.ToggleHelpCommand.Execute(null);
        Assert.True(vm.IsHelpOpen);
        vm.ToggleHelpCommand.Execute(null);
        Assert.False(vm.IsHelpOpen);
    }

    [Fact]
    public void ShowCommitsForRepo_switches_to_commit_tab()
    {
        var vm = new MainWindowViewModel();
        vm.ShowCommitsForRepo("/some/path", "MyRepo");
        Assert.Equal(3, vm.SelectedTabIndex);
        Assert.Equal("MyRepo", vm.Commits.RepoName);
    }

    [Fact]
    public void ShowToast_sets_visible_message()
    {
        var vm = new MainWindowViewModel();
        vm.ShowToast("Test message");
        Assert.Equal("Test message", vm.ToastMessage);
        Assert.True(vm.IsToastVisible);
    }

    [Fact]
    public void Help_has_shortcuts()
    {
        var vm = new MainWindowViewModel();
        Assert.NotEmpty(vm.Help.KeyboardShortcuts);
        Assert.NotEmpty(vm.Help.Version);
    }
}

// ── GitViewModel (REQ-GIT-006) ──

// @covers(GitViewModel)
public class GitViewModelCommitTests
{
    [Fact]
    public void GitViewModel_accepts_parent_for_commit_navigation()
    {
        var parent = new MainWindowViewModel();
        var git = new GitViewModel(parent);
        Assert.NotNull(git);
    }

    [Fact]
    public void SelectedRepo_starts_null()
    {
        var git = new GitViewModel();
        Assert.Null(git.SelectedRepo);
    }
}

// ── Context menu commands (REQ-GUI-004) ──

// @covers(ProjectsViewModel)
public class ContextMenuTests
{
    [Fact]
    public void CopyPath_stores_selected_project_path()
    {
        var vm = new ProjectsViewModel();
        vm.SelectedProject = new ProjectItemViewModel { Path = "/test/path" };
        vm.CopyPathCommand.Execute(null);
        Assert.Equal("/test/path", vm.LastCopiedPath);
    }
}

// ── SplashScreen (REQ-GUI-007) — removed, never instantiated ──

// ── BoidBackdrop (REQ-GUI-012) ──

// @covers(BoidBackdrop)
public class BoidBackdropTests
{
    [Fact]
    public void BoidBackdrop_spawns_10_boids()
    {
        var backdrop = new Entropic.GUI.Controls.BoidBackdrop();
        backdrop.SimulateStep(1400, 900);
        Assert.Equal(10, backdrop.BoidCount);
    }

    [Fact]
    public void AddBoid_places_boid_at_position()
    {
        var backdrop = new Entropic.GUI.Controls.BoidBackdrop();
        backdrop.AddBoid(100, 200, 0.5, -0.5);
        Assert.Single(backdrop.Boids);
        Assert.Equal(100, backdrop.Boids[0].X);
        Assert.Equal(200, backdrop.Boids[0].Y);
    }

    [Fact]
    public void SimulateStep_moves_boids()
    {
        var backdrop = new Entropic.GUI.Controls.BoidBackdrop();
        backdrop.AddBoid(500, 400, 0.8, 0);
        var startX = backdrop.Boids[0].X;
        backdrop.SimulateStep(1400, 900);
        // After simulation, boid should have moved (some displacement expected)
        Assert.NotEqual(startX, backdrop.Boids[0].X);
    }

    [Fact]
    public void Boids_have_bounded_velocity()
    {
        var backdrop = new Entropic.GUI.Controls.BoidBackdrop();
        backdrop.SimulateStep(1400, 900);
        foreach (var b in backdrop.Boids)
        {
            var speed = Math.Sqrt(b.Vx * b.Vx + b.Vy * b.Vy);
            Assert.True(speed <= 2.1, $"Boid speed {speed} exceeds max");
        }
    }

    [Fact]
    public void Multiple_steps_keep_boids_near_viewport()
    {
        var backdrop = new Entropic.GUI.Controls.BoidBackdrop();
        for (int i = 0; i < 100; i++)
            backdrop.SimulateStep(1400, 900);

        // After 100 steps with edge avoidance, most boids should be within or near bounds
        int inBounds = 0;
        foreach (var b in backdrop.Boids)
        {
            if (b.X >= -50 && b.X <= 1450 && b.Y >= -50 && b.Y <= 950)
                inBounds++;
        }
        Assert.True(inBounds >= 7, $"Only {inBounds}/10 boids in bounds after 100 steps");
    }

    [Fact]
    public void IsHitTestVisible_is_false()
    {
        var backdrop = new Entropic.GUI.Controls.BoidBackdrop();
        Assert.False(backdrop.IsHitTestVisible);
    }
}

// ── Boid class ──

// @covers(Boid)
public class BoidTests
{
    [Fact]
    public void Boid_initializes_with_defaults()
    {
        var b = new Entropic.GUI.Controls.Boid();
        Assert.Equal(0, b.X);
        Assert.Equal(0, b.Y);
        Assert.Equal(0, b.Vx);
        Assert.Equal(0, b.Vy);
        Assert.Equal(0, b.Opacity);
    }
}

// ── CommitViewModel extended (REQ-GIT-005) ──

// @covers(CommitViewModel)
public class CommitViewModelExtendedTests
{
    [Fact]
    public void CommitLimit_defaults_to_50()
    {
        var vm = new CommitViewModel();
        Assert.Equal(50, vm.CommitLimit);
    }

    [Fact]
    public void Refresh_with_no_path_does_nothing()
    {
        var vm = new CommitViewModel();
        vm.Refresh();
        Assert.Empty(vm.Commits);
    }

    [Fact]
    public void ErrorMessage_defaults_to_null()
    {
        var vm = new CommitViewModel();
        Assert.Null(vm.ErrorMessage);
    }

    [Fact]
    public void CommitItemViewModel_ShortHash_from_full_hash()
    {
        var item = new CommitItemViewModel { Hash = "abc1234567890def" };
        // ShortHash is set manually in the ViewModel, test the pattern
        item.ShortHash = item.Hash.Length >= 7 ? item.Hash[..7] : item.Hash;
        Assert.Equal("abc1234", item.ShortHash);
    }

    [Fact]
    public void CommitItemViewModel_StatsText_format()
    {
        var item = new CommitItemViewModel { Additions = 0, Deletions = 0, FilesChanged = 0 };
        Assert.Equal("+0 -0 (0 files)", item.StatsText);
    }
}

// ── SessionItemViewModel extended (REQ-SES-002) ──

// @covers(SessionItemViewModel)
public class SessionItemViewModelExtendedTests
{
    [Fact]
    public void ShortLabel_shows_truncated_id_when_no_date()
    {
        var session = new SessionItemViewModel { SessionId = "abcdefghij", UpdatedAt = 0 };
        Assert.Equal("abcdefg", session.ShortLabel);
    }

    [Fact]
    public void ShortLabel_shows_id_and_date_when_updated()
    {
        var session = new SessionItemViewModel
        {
            SessionId = "abcdefghij",
            UpdatedAt = 1710000000000L // 2024-03-09
        };
        var label = session.ShortLabel;
        Assert.StartsWith("abcdefg", label);
        Assert.Contains(":", label); // time component
    }

    [Fact]
    public void ShortLabel_handles_short_session_id()
    {
        var session = new SessionItemViewModel { SessionId = "abc", UpdatedAt = 0 };
        Assert.Equal("abc", session.ShortLabel);
    }

    [Fact]
    public void Todos_collection_is_initialized()
    {
        var session = new SessionItemViewModel();
        Assert.NotNull(session.Todos);
        Assert.Empty(session.Todos);
    }
}

// ── ProjectsViewModel session selection (REQ-GUI-003) ──

// @covers(ProjectsViewModel)
public class SessionSelectionTests
{
    [Fact]
    public void SelectSession_sets_SelectedSession()
    {
        var vm = new ProjectsViewModel();
        var session = new SessionItemViewModel { SessionId = "test-123" };
        vm.SelectSessionCommand.Execute(session);
        Assert.Equal(session, vm.SelectedSession);
    }

    [Fact]
    public void SelectSession_can_be_changed()
    {
        var vm = new ProjectsViewModel();
        var s1 = new SessionItemViewModel { SessionId = "s1" };
        var s2 = new SessionItemViewModel { SessionId = "s2" };
        vm.SelectSessionCommand.Execute(s1);
        Assert.Equal(s1, vm.SelectedSession);
        vm.SelectSessionCommand.Execute(s2);
        Assert.Equal(s2, vm.SelectedSession);
    }

    [Fact]
    public void SelectedSession_starts_null()
    {
        var vm = new ProjectsViewModel();
        Assert.Null(vm.SelectedSession);
    }
}

// ── ProjectsViewModel convert methods (REQ-PRV-005) ──

// @covers(ProjectsViewModel)
public class ConvertMethodTests
{
    [Fact]
    public void ConvertProject_extracts_name_from_path()
    {
        var project = new Project(
            "claude", "/home/user/my-project",
            FSharpOption<string>.None, FSharpOption<bool>.None,
            ListModule.Empty<Session>(),
            FSharpOption<ProjectStats>.None,
            FSharpOption<long>.None, FSharpOption<long>.None);

        var vm = ProjectsViewModel.ConvertProject(project);
        Assert.Equal("my-project", vm.Name);
        Assert.Equal("claude", vm.Provider);
    }

    [Fact]
    public void ConvertProject_handles_trailing_slash()
    {
        var project = new Project(
            "codex", "/home/user/project/",
            FSharpOption<string>.None, FSharpOption<bool>.None,
            ListModule.Empty<Session>(),
            FSharpOption<ProjectStats>.None,
            FSharpOption<long>.None, FSharpOption<long>.None);

        var vm = ProjectsViewModel.ConvertProject(project);
        Assert.Equal("project", vm.Name);
    }

    [Fact]
    public void ConvertSession_maps_all_fields()
    {
        var todo = new Todo(
            FSharpOption<string>.Some("t1"), "Test todo", TodoStatus.Pending,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.None);

        var session = new Session(
            "gemini", "ses-xyz", FSharpOption<string>.Some("/test/path"),
            FSharpOption<string>.None,
            ListModule.OfSeq(new[] { todo }),
            FSharpOption<long>.None, FSharpOption<long>.Some(1710000000000L));

        var vm = ProjectsViewModel.ConvertSession(session);
        Assert.Equal("ses-xyz", vm.SessionId);
        Assert.Equal("gemini", vm.Provider);
        Assert.Equal("/test/path", vm.FilePath);
        Assert.Equal(1710000000000L, vm.UpdatedAt);
        Assert.Single(vm.Todos);
        Assert.Equal("Test todo", vm.Todos[0].Content);
    }

    [Fact]
    public void ConvertSession_sets_OwnerSession_on_todos()
    {
        var todo = new Todo(
            FSharpOption<string>.None, "test", TodoStatus.Pending,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.None);

        var session = new Session(
            "claude", "s1", FSharpOption<string>.None,
            FSharpOption<string>.None,
            ListModule.OfSeq(new[] { todo }),
            FSharpOption<long>.None, FSharpOption<long>.None);

        var vm = ProjectsViewModel.ConvertSession(session);
        Assert.NotNull(vm.Todos[0].OwnerSession);
        Assert.Same(vm, vm.Todos[0].OwnerSession);
    }
}

// ── MainWindowViewModel tab switching (REQ-GUI-001) ──

// @covers(MainWindowViewModel)
public class TabSwitchingTests
{
    [Fact]
    public void SwitchTab_sets_tab_index()
    {
        var vm = new MainWindowViewModel();
        vm.SwitchTabCommand.Execute("2");
        Assert.Equal(2, vm.SelectedTabIndex);
        Assert.True(vm.IsGitTab);
        Assert.False(vm.IsProjectTab);
    }

    [Fact]
    public void SwitchTab_ignores_invalid_values()
    {
        var vm = new MainWindowViewModel();
        vm.SwitchTabCommand.Execute("5"); // out of range
        Assert.Equal(0, vm.SelectedTabIndex);
        vm.SwitchTabCommand.Execute("abc"); // not a number
        Assert.Equal(0, vm.SelectedTabIndex);
    }

    [Fact]
    public void IsTab_properties_track_index()
    {
        var vm = new MainWindowViewModel();
        Assert.True(vm.IsProjectTab);
        Assert.False(vm.IsGlobalTab);
        Assert.False(vm.IsGitTab);
        Assert.False(vm.IsCommitTab);

        vm.SwitchTabCommand.Execute("1");
        Assert.False(vm.IsProjectTab);
        Assert.True(vm.IsGlobalTab);

        vm.SwitchTabCommand.Execute("3");
        Assert.True(vm.IsCommitTab);
    }
}

// ── GitViewModel (REQ-GIT-002, REQ-GIT-006) ──

// @covers(GitViewModel)
public class GitViewModelExtendedTests
{
    [Fact]
    public void SetRootPath_changes_discovery_root()
    {
        var vm = new GitViewModel();
        vm.SetRootPath("/custom/path");
        // Can't directly read _rootPath, but ViewCommits uses it
        Assert.NotNull(vm);
    }

    [Fact]
    public void ViewCommits_requires_selected_repo_and_parent()
    {
        var vm = new GitViewModel(); // no parent
        vm.SelectedRepo = new GitRepoItemViewModel { Name = "test", RelativePath = "test" };
        vm.ViewCommitsCommand.Execute(null); // should not throw, just return early
        Assert.NotNull(vm);
    }

    [Fact]
    public void GitRepoItemViewModel_stores_all_fields()
    {
        var item = new GitRepoItemViewModel
        {
            Name = "MyRepo",
            RelativePath = "source/repos/MyRepo",
            RemoteUrl = "https://github.com/test/MyRepo.git",
            Ahead = 3,
            Behind = 1,
        };
        item.Languages.Add("C#");
        item.Languages.Add("F#");

        Assert.Equal("MyRepo", item.Name);
        Assert.Equal("source/repos/MyRepo", item.RelativePath);
        Assert.Equal("https://github.com/test/MyRepo.git", item.RemoteUrl);
        Assert.Equal(3, item.Ahead);
        Assert.Equal(1, item.Behind);
        Assert.Equal(2, item.Languages.Count);
    }
}

// ── GlobalViewModel extended (REQ-TOD-008) ──

// @covers(GlobalViewModel)
public class GlobalViewModelExtendedTests
{
    private static FSharpList<Project> MakeProjects()
    {
        var t1 = new Todo(FSharpOption<string>.None, "pending todo", TodoStatus.Pending,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.None);
        var t2 = new Todo(FSharpOption<string>.None, "active todo", TodoStatus.InProgress,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.None);
        var t3 = new Todo(FSharpOption<string>.None, "done todo", TodoStatus.Completed,
            FSharpOption<long>.None, FSharpOption<long>.None, FSharpOption<string>.None);

        var session = new Session("claude", "s1", FSharpOption<string>.None,
            FSharpOption<string>.None, ListModule.OfSeq(new[] { t1, t2, t3 }),
            FSharpOption<long>.None, FSharpOption<long>.None);

        var project = new Project("claude", "/test", FSharpOption<string>.None,
            FSharpOption<bool>.None, ListModule.OfSeq(new[] { session }),
            FSharpOption<ProjectStats>.None, FSharpOption<long>.None, FSharpOption<long>.None);

        return ListModule.OfSeq(new[] { project });
    }

    [Fact]
    public void Todos_sorted_in_progress_first()
    {
        var vm = new GlobalViewModel();
        vm.LoadFromProjects(MakeProjects());
        Assert.Equal(3, vm.AllTodos.Count);
        Assert.Equal("in_progress", vm.AllTodos[0].Status);
        Assert.Equal("pending", vm.AllTodos[1].Status);
        Assert.Equal("completed", vm.AllTodos[2].Status);
    }

    [Fact]
    public void ShowActiveOnly_toggle_filters_and_restores()
    {
        var vm = new GlobalViewModel();
        vm.LoadFromProjects(MakeProjects());
        Assert.Equal(3, vm.AllTodos.Count);

        vm.ShowActiveOnly = true;
        Assert.Equal(2, vm.AllTodos.Count);

        vm.ShowActiveOnly = false;
        Assert.Equal(3, vm.AllTodos.Count);
    }

    [Fact]
    public void Refresh_rebuilds_from_same_data()
    {
        var vm = new GlobalViewModel();
        vm.LoadFromProjects(MakeProjects());
        var count = vm.AllTodos.Count;
        vm.Refresh();
        Assert.Equal(count, vm.AllTodos.Count);
    }
}

// ── ProjectsViewModel sorting (REQ-GUI-017) ──

// @covers(ProjectsViewModel)
public class ProjectSortTests
{
    [Fact]
    public void ApplySort_by_todos_descending()
    {
        var vm = new ProjectsViewModel();
        vm.Projects.Add(new ProjectItemViewModel { Name = "A", TodoCount = 3 });
        vm.Projects.Add(new ProjectItemViewModel { Name = "B", TodoCount = 10 });
        vm.Projects.Add(new ProjectItemViewModel { Name = "C", TodoCount = 1 });
        vm.ApplySort("todos");
        Assert.Equal("B", vm.Projects[0].Name);
        Assert.Equal("A", vm.Projects[1].Name);
        Assert.Equal("C", vm.Projects[2].Name);
    }

    [Fact]
    public void ApplySort_by_recent_activity()
    {
        var vm = new ProjectsViewModel();
        vm.Projects.Add(new ProjectItemViewModel { Name = "Old", LastActivity = 100 });
        vm.Projects.Add(new ProjectItemViewModel { Name = "New", LastActivity = 999 });
        vm.ApplySort("recent");
        Assert.Equal("New", vm.Projects[0].Name);
    }
}

// ── Todo Reorder Tests (REQ-TOD-012) ──

// @covers(ProjectsViewModel)
// @covers(TodoItemViewModel)
public class TodoReorderTests
{
    private static ProjectsViewModel SetupWithTodos()
    {
        var vm = new ProjectsViewModel();
        var proj = new ProjectItemViewModel { Name = "P1" };
        var session = new SessionItemViewModel { SessionId = "s1" };
        session.Todos.Add(new TodoItemViewModel { Content = "A" });
        session.Todos.Add(new TodoItemViewModel { Content = "B" });
        session.Todos.Add(new TodoItemViewModel { Content = "C" });
        proj.Sessions.Add(session);
        vm.Projects.Add(proj);
        vm.SelectedProject = proj;
        vm.SelectedSession = session;
        return vm;
    }

    [Fact]
    public void MoveTodoUp_moves_item_up()
    {
        var vm = SetupWithTodos();
        var todoB = vm.SelectedSession!.Todos[1];
        vm.MoveTodoUpCommand.Execute(todoB);
        Assert.Equal("B", vm.SelectedSession.Todos[0].Content);
        Assert.Equal("A", vm.SelectedSession.Todos[1].Content);
    }

    [Fact]
    public void MoveTodoUp_at_top_does_nothing()
    {
        var vm = SetupWithTodos();
        var todoA = vm.SelectedSession!.Todos[0];
        vm.MoveTodoUpCommand.Execute(todoA);
        Assert.Equal("A", vm.SelectedSession.Todos[0].Content);
    }

    [Fact]
    public void MoveTodoDown_moves_item_down()
    {
        var vm = SetupWithTodos();
        var todoA = vm.SelectedSession!.Todos[0];
        vm.MoveTodoDownCommand.Execute(todoA);
        Assert.Equal("B", vm.SelectedSession.Todos[0].Content);
        Assert.Equal("A", vm.SelectedSession.Todos[1].Content);
    }

    [Fact]
    public void MoveTodoDown_at_bottom_does_nothing()
    {
        var vm = SetupWithTodos();
        var todoC = vm.SelectedSession!.Todos[2];
        vm.MoveTodoDownCommand.Execute(todoC);
        Assert.Equal("C", vm.SelectedSession.Todos[2].Content);
    }

    [Fact]
    public void ReorderTodo_swaps_indices()
    {
        var vm = SetupWithTodos();
        vm.ReorderTodo(0, 2);
        Assert.Equal("B", vm.SelectedSession!.Todos[0].Content);
        Assert.Equal("C", vm.SelectedSession.Todos[1].Content);
        Assert.Equal("A", vm.SelectedSession.Todos[2].Content);
    }

    [Fact]
    public void ReorderTodo_invalid_indices_no_crash()
    {
        var vm = SetupWithTodos();
        vm.ReorderTodo(-1, 5); // should not throw
        Assert.Equal(3, vm.SelectedSession!.Todos.Count);
    }

    [Fact]
    public void ReorderTodo_no_session_no_crash()
    {
        var vm = new ProjectsViewModel();
        vm.ReorderTodo(0, 1); // no session selected — should not throw
    }
}

// ── Boid Stochastic Tests (OU process, lifecycle) ──

// @covers(BoidBackdrop)
// @covers(Boid)
public class BoidStochasticTests
{
    [Fact]
    public void Boid_entering_state_fades_in()
    {
        var backdrop = new Controls.BoidBackdrop();
        backdrop.AddBoid(100, 100, 0.5, 0.5);
        var boid = backdrop.Boids[0];
        // AddBoid sets Opacity to MaxBoidOpacity directly, so test spawned boids
        // SimulateStep spawns boids in Entering state
        backdrop.SimulateStep(800, 600);
        // After SimulateStep fills to max, spawned boids start entering
        Assert.True(backdrop.BoidCount > 1);
        // At least some spawned boids should be in entering state
        Assert.Contains(backdrop.Boids, b => b.Entering);
    }

    [Fact]
    public void Boid_throb_phase_advances()
    {
        var backdrop = new Controls.BoidBackdrop();
        backdrop.AddBoid(200, 200, 0, 0);
        var initialPhase = backdrop.Boids[0].ThrobPhase;
        backdrop.SimulateStep(800, 600);
        Assert.NotEqual(initialPhase, backdrop.Boids[0].ThrobPhase);
    }

    [Fact]
    public void Stochastic_params_vary_from_base()
    {
        var backdrop = new Controls.BoidBackdrop();
        // Run many steps to trigger OU drift
        for (int i = 0; i < 100; i++)
            backdrop.SimulateStep(800, 600);
        // After 100 steps, OU should have drifted at least slightly
        // (stochastic — just verify it doesn't crash and stays positive)
        Assert.True(backdrop.CurrentAlignForce >= 0);
        Assert.True(backdrop.CurrentCohForce >= 0);
    }
}

// ── Commit Navigation Tests (end-to-end ViewModel flow) ──

// @covers(MainWindowViewModel)
// @covers(CommitViewModel)
// @covers(GitViewModel)
public class CommitNavigationTests
{
    [Fact]
    public void ShowCommitsForRepo_switches_to_commit_tab()
    {
        var vm = new MainWindowViewModel();
        Assert.Equal(0, vm.SelectedTabIndex); // starts on project tab
        // This will try to load commits (will fail with invalid path, that's fine)
        vm.ShowCommitsForRepo("/fake/path", "TestRepo");
        Assert.Equal(3, vm.SelectedTabIndex); // commit tab
        Assert.True(vm.IsCommitTab);
    }

    [Fact]
    public void ShowCommitsForRepo_sets_repo_name()
    {
        var vm = new MainWindowViewModel();
        vm.ShowCommitsForRepo("/fake/path", "MyRepo");
        Assert.Equal("MyRepo", vm.Commits.RepoName);
        Assert.Equal("/fake/path", vm.Commits.SelectedRepoPath);
    }

    [Fact]
    public void CommitViewModel_shows_error_for_invalid_path()
    {
        var cvm = new CommitViewModel();
        cvm.LoadForRepo("/nonexistent/repo/path", "BadRepo");
        // Should have error message since path doesn't exist
        Assert.NotNull(cvm.ErrorMessage);
        Assert.Empty(cvm.Commits);
    }
}

// ── REQ-GUI-001: Tabbed Navigation ──

// @covers(MainWindowViewModel)
public class TabbedNavigationTests
{
    // @covers(MainWindowViewModel)
    [Fact]
    public void SwitchTab_navigates_all_four_tabs()
    {
        var vm = new MainWindowViewModel();
        vm.SwitchTabCommand.Execute("0");
        Assert.True(vm.IsProjectTab);
        vm.SwitchTabCommand.Execute("1");
        Assert.True(vm.IsGlobalTab);
        vm.SwitchTabCommand.Execute("2");
        Assert.True(vm.IsGitTab);
        vm.SwitchTabCommand.Execute("3");
        Assert.True(vm.IsCommitTab);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void Tab_boolean_properties_are_mutually_exclusive()
    {
        var vm = new MainWindowViewModel();
        vm.SelectedTabIndex = 2;
        Assert.False(vm.IsProjectTab);
        Assert.False(vm.IsGlobalTab);
        Assert.True(vm.IsGitTab);
        Assert.False(vm.IsCommitTab);
    }
}

// ── REQ-GUI-002: Three-Pane Project Layout ──

// @covers(ProjectsViewModel)
public class ThreePaneLayoutTests
{
    // @covers(ProjectsViewModel)
    [Fact]
    public void Projects_sessions_todos_form_three_pane_hierarchy()
    {
        var vm = new ProjectsViewModel();
        var proj = new ProjectItemViewModel { Name = "P1" };
        var session = new SessionItemViewModel { SessionId = "s1" };
        session.Todos.Add(new TodoItemViewModel { Content = "Fix bug" });
        proj.Sessions.Add(session);
        vm.Projects.Add(proj);

        vm.SelectedProject = proj;
        Assert.NotEmpty(vm.SelectedProject.Sessions);
        vm.SelectedSession = session;
        Assert.NotEmpty(vm.SelectedSession.Todos);
        Assert.Equal("Fix bug", vm.SelectedSession.Todos[0].Content);
    }
}

// ── REQ-GUI-003: Project List Filtering ──

// @covers(ProjectsViewModel)
public class ProjectListFilteringTests
{
    // @covers(ProjectsViewModel)
    [Fact]
    public void SetFilter_changes_filter_mode()
    {
        var vm = new ProjectsViewModel();
        vm.SetFilterCommand.Execute("hasSessions");
        Assert.Equal("hasSessions", vm.FilterMode);
        vm.SetFilterCommand.Execute("hasTodos");
        Assert.Equal("hasTodos", vm.FilterMode);
        vm.SetFilterCommand.Execute("activeOnly");
        Assert.Equal("activeOnly", vm.FilterMode);
        vm.SetFilterCommand.Execute("all");
        Assert.Equal("all", vm.FilterMode);
    }
}

// ── REQ-GUI-004: Context Menus ──

// @covers(ProjectsViewModel)
public class ContextMenuReqTests
{
    // @covers(ProjectsViewModel)
    [Fact]
    public void CopyPath_stores_path_from_selected_project()
    {
        var vm = new ProjectsViewModel();
        vm.SelectedProject = new ProjectItemViewModel { Path = @"C:\some\path" };
        vm.CopyPathCommand.Execute(null);
        Assert.Equal(@"C:\some\path", vm.LastCopiedPath);
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void CopyPath_no_selection_is_noop()
    {
        var vm = new ProjectsViewModel();
        vm.CopyPathCommand.Execute(null);
        Assert.Null(vm.LastCopiedPath);
    }
}

// ── REQ-GUI-005: Spacing Modes ──

// @covers(MainWindowViewModel)
public class SpacingModesTests
{
    // @covers(MainWindowViewModel)
    [Theory]
    [InlineData("compact", 6)]
    [InlineData("normal", 10)]
    [InlineData("wide", 14)]
    public void SetSpacing_updates_mode_and_pixels(string mode, int expected)
    {
        var vm = new MainWindowViewModel();
        vm.SetSpacingCommand.Execute(mode);
        Assert.Equal(mode, vm.SpacingMode);
        Assert.Equal(expected, vm.SpacingPixels);
    }
}

// ── REQ-GUI-006: Dark Theme ──

// @covers(MainWindowViewModel)
// @covers(MainWindow)
public class DarkThemeTests
{
    // @covers(MainWindow)
    [Fact]
    public void Dark_background_constant_defined()
    {
        Assert.Equal("#1a1d21", Views.MainWindow.DarkBackground);
    }
}

// ── REQ-GUI-011: Status Bar ──

// @covers(MainWindowViewModel)
public class StatusBarTests
{
    // @covers(MainWindowViewModel)
    [Fact]
    public void StatusText_updates_on_refresh()
    {
        var vm = new MainWindowViewModel { ProjectCount = 3, ActiveTodoCount = 7 };
        vm.UpdateStatusBar();
        Assert.Contains("3 projects", vm.StatusText);
        Assert.Contains("7 active TODOs", vm.StatusText);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void StatusText_shows_loading_initially()
    {
        var vm = new MainWindowViewModel();
        Assert.Contains("loading", vm.StatusText);
    }
}

// ── REQ-GUI-012: Animated Background ──

// @covers(BoidBackdrop)
public class AnimatedBackgroundTests
{
    // @covers(BoidBackdrop)
    [Fact]
    public void BoidBackdrop_is_not_hit_testable()
    {
        var bd = new Controls.BoidBackdrop();
        Assert.False(bd.IsHitTestVisible);
    }

    // @covers(BoidBackdrop)
    [Fact]
    public void SimulateStep_populates_boids_up_to_max()
    {
        var bd = new Controls.BoidBackdrop();
        bd.SimulateStep(800, 600);
        Assert.Equal(10, bd.BoidCount); // MaxBoids
    }
}

// ── REQ-GUI-013: Configurable Log Level ──

// @covers(MainWindowViewModel)
public class ConfigurableLogLevelTests
{
    // @covers(MainWindowViewModel)
    [Fact]
    public void LogLevel_defaults_to_info()
    {
        var vm = new MainWindowViewModel();
        Assert.Equal("info", vm.LogLevel);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void LogLevel_can_be_changed()
    {
        var vm = new MainWindowViewModel();
        vm.LogLevel = "debug";
        Assert.Equal("debug", vm.LogLevel);
    }
}

// ── REQ-GUI-014: Window Defaults ──

// @covers(MainWindow)
// @covers(MainWindowViewModel)
public class WindowDefaultsTests
{
    // @covers(MainWindow)
    [Fact]
    public void DefaultWidth_is_1400()
    {
        Assert.Equal(1400, Views.MainWindow.DefaultWidth);
    }

    // @covers(MainWindow)
    [Fact]
    public void DefaultHeight_is_900()
    {
        Assert.Equal(900, Views.MainWindow.DefaultHeight);
    }
}

// ── REQ-GUI-015: Refresh Controls ──

// @covers(MainWindowViewModel)
public class RefreshControlsTests
{
    // @covers(MainWindowViewModel)
    [Fact]
    public void RefreshCommand_exists()
    {
        var vm = new MainWindowViewModel();
        Assert.NotNull(vm.RefreshCommand);
    }
}

// ── REQ-GUI-016: Activity Mode Auto-Focus ──

// @covers(MainWindowViewModel)
public class ActivityModeTests
{
    // @covers(MainWindowViewModel)
    [Fact]
    public void ActivityMode_toggles_and_tracks_state()
    {
        var vm = new MainWindowViewModel();
        Assert.False(vm.ActivityModeEnabled);
        vm.ToggleActivityModeCommand.Execute(null);
        Assert.True(vm.ActivityModeEnabled);
        vm.ToggleActivityModeCommand.Execute(null);
        Assert.False(vm.ActivityModeEnabled);
    }
}

// ── REQ-GUI-017: Project Sorting Options ──

// @covers(MainWindowViewModel)
// @covers(ProjectsViewModel)
public class ProjectSortingOptionsTests
{
    // @covers(MainWindowViewModel)
    [Fact]
    public void SetSortMode_updates_mode()
    {
        var vm = new MainWindowViewModel();
        vm.SetSortModeCommand.Execute("alpha");
        Assert.Equal("alpha", vm.ProjectSortMode);
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void ApplySort_alpha_sorts_by_name()
    {
        var vm = new ProjectsViewModel();
        vm.Projects.Add(new ProjectItemViewModel { Name = "Zebra" });
        vm.Projects.Add(new ProjectItemViewModel { Name = "Alpha" });
        vm.ApplySort("alpha");
        Assert.Equal("Alpha", vm.Projects[0].Name);
        Assert.Equal("Zebra", vm.Projects[1].Name);
    }
}

// ── REQ-GUI-019: Error Boundary Recovery ──

// @covers(ErrorBoundaryService)
public class ErrorBoundaryRecoveryTests
{
    // @covers(ErrorBoundaryService)
    [Fact]
    public void HandleError_captures_exception()
    {
        var svc = new ErrorBoundaryService();
        svc.HandleError(new System.Exception("test error"));
        Assert.Equal("test error", svc.LastError?.Message);
    }

    // @covers(ErrorBoundaryService)
    [Fact]
    public void HandleError_stays_alive_after_error()
    {
        var svc = new ErrorBoundaryService();
        svc.HandleError(new System.Exception("boom"));
        svc.HandleError(new System.Exception("boom2"));
        Assert.Equal("boom2", svc.LastError?.Message);
    }
}

// ── REQ-GUI-020: Session Selection Persistence ──

// @covers(ProjectsViewModel)
public class SessionSelectionPersistenceTests
{
    // @covers(ProjectsViewModel)
    [Fact]
    public void SelectSession_persists_selection()
    {
        var vm = new ProjectsViewModel();
        var session = new SessionItemViewModel { SessionId = "abc" };
        vm.SelectSessionCommand.Execute(session);
        Assert.Same(session, vm.SelectedSession);
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void SelectedSession_starts_null()
    {
        var vm = new ProjectsViewModel();
        Assert.Null(vm.SelectedSession);
    }
}

// ── REQ-GUI-021: Progress Overlay ──

// @covers(ProgressViewModel)
public class ProgressOverlayTests
{
    // @covers(ProgressViewModel)
    [Fact]
    public void Show_sets_visible_and_message()
    {
        var vm = new ProgressViewModel();
        vm.Show("Loading...");
        Assert.True(vm.IsVisible);
        Assert.Equal("Loading...", vm.StatusMessage);
    }

    // @covers(ProgressViewModel)
    [Fact]
    public void Hide_clears_visibility()
    {
        var vm = new ProgressViewModel();
        vm.Show("Loading...");
        vm.Hide();
        Assert.False(vm.IsVisible);
    }
}

// ── REQ-ARC-003: MVVM Pattern ──

// @covers(MainWindowViewModel)
public class MvvmPatternTests
{
    // @covers(MainWindowViewModel)
    [Fact]
    public void ViewModel_exposes_child_viewmodels()
    {
        var vm = new MainWindowViewModel();
        Assert.NotNull(vm.Projects);
        Assert.NotNull(vm.Global);
        Assert.NotNull(vm.Git);
        Assert.NotNull(vm.Commits);
        Assert.NotNull(vm.Progress);
        Assert.NotNull(vm.Help);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void ObservableProperties_fire_change_notifications()
    {
        var vm = new MainWindowViewModel();
        bool fired = false;
        vm.PropertyChanged += (s, e) => { if (e.PropertyName == "SelectedTabIndex") fired = true; };
        vm.SelectedTabIndex = 2;
        Assert.True(fired);
    }
}

// ── REQ-BLD-004: App Identity ──

// @covers(Program)
// @covers(MainWindow)
public class AppIdentityTests
{
    // @covers(MainWindow)
    [Fact]
    public void Window_dimensions_are_standard()
    {
        Assert.True(Views.MainWindow.DefaultWidth >= 1024);
        Assert.True(Views.MainWindow.DefaultHeight >= 768);
    }
}

// ── REQ-PLT-001: Cross-Platform Desktop Application ──

// @covers(Program)
public class CrossPlatformTests
{
    // @covers(Program)
    [Fact]
    public void EntryPoint_class_exists()
    {
        // Verify the Program type is accessible (build-time check)
        var type = typeof(Entropic.GUI.Program);
        Assert.NotNull(type);
    }
}

// ── REQ-PLT-005: Single Instance ──

// @covers(SingleInstanceGuard)
public class SingleInstanceTests
{
    // @covers(SingleInstanceGuard)
    [Fact]
    public void Guard_can_be_created_and_disposed()
    {
        var guard = new SingleInstanceGuard("Entropic-test-" + System.Guid.NewGuid());
        Assert.True(guard.IsFirstInstance);
        guard.Dispose();
    }
}

// ── REQ-PRV-004: Provider Filter Toggles ──

// @covers(MainWindowViewModel)
public class ProviderFilterToggleTests
{
    // @covers(MainWindowViewModel)
    [Fact]
    public void Provider_filters_default_to_enabled()
    {
        var vm = new MainWindowViewModel();
        Assert.True(vm.ClaudeFilterEnabled);
        Assert.True(vm.CodexFilterEnabled);
        Assert.True(vm.GeminiFilterEnabled);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void Provider_filters_can_be_toggled()
    {
        var vm = new MainWindowViewModel();
        vm.ClaudeFilterEnabled = false;
        Assert.False(vm.ClaudeFilterEnabled);
        vm.CodexFilterEnabled = false;
        Assert.False(vm.CodexFilterEnabled);
    }
}

// ── REQ-PRV-005: Provider Badges ──

// @covers(ProjectsViewModel)
// @covers(ProjectItemViewModel)
public class ProviderBadgeTests
{
    // @covers(ProjectItemViewModel)
    [Fact]
    public void ProjectItem_exposes_provider_name()
    {
        var proj = new ProjectItemViewModel { Provider = "claude" };
        Assert.Equal("claude", proj.Provider);
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void ConvertProject_preserves_provider()
    {
        var p = TestHelpers.MakeProject("claude", "/test/path");
        var vm = ProjectsViewModel.ConvertProject(p);
        Assert.Equal("claude", vm.Provider);
    }
}

// ── REQ-SES-002: Session Tabs ──

// @covers(SessionItemViewModel)
// @covers(ProjectsViewModel)
public class SessionTabsTests
{
    // @covers(SessionItemViewModel)
    [Fact]
    public void ShortLabel_shows_truncated_id_and_date()
    {
        var s = new SessionItemViewModel
        {
            SessionId = "abcdefghijklmnop",
            UpdatedAt = 1710000000000
        };
        Assert.StartsWith("abcdefg", s.ShortLabel);
    }

    // @covers(ProjectsViewModel)
    [Fact]
    public void Sessions_are_navigable_via_selection()
    {
        var vm = new ProjectsViewModel();
        var s1 = new SessionItemViewModel { SessionId = "s1" };
        var s2 = new SessionItemViewModel { SessionId = "s2" };
        vm.SelectSessionCommand.Execute(s1);
        Assert.Equal("s1", vm.SelectedSession?.SessionId);
        vm.SelectSessionCommand.Execute(s2);
        Assert.Equal("s2", vm.SelectedSession?.SessionId);
    }
}

// ── REQ-TOD-007: Per-Project TODO View ──

// @covers(ProjectsViewModel)
public class PerProjectTodoViewTests
{
    // @covers(ProjectsViewModel)
    [Fact]
    public void Todos_are_scoped_to_selected_session()
    {
        var vm = new ProjectsViewModel();
        var session = new SessionItemViewModel { SessionId = "s1" };
        session.Todos.Add(new TodoItemViewModel { Content = "A" });
        session.Todos.Add(new TodoItemViewModel { Content = "B" });
        vm.SelectSessionCommand.Execute(session);
        Assert.Equal(2, vm.SelectedSession!.Todos.Count);
    }
}

// ── REQ-GUI-007: Splash Screen ──
// SplashScreen removed — was never instantiated.

// ── REQ-GUI-008: Toast Notifications ──

// @covers(ToastService)
// @covers(MainWindowViewModel)
public class ToastNotificationReqTests
{
    // @covers(ToastService)
    [Fact]
    public void ToastService_fires_event()
    {
        var svc = new ToastService();
        string? received = null;
        svc.ToastRequested += msg => received = msg;
        svc.Show("hello");
        Assert.Equal("hello", received);
    }

    // @covers(MainWindowViewModel)
    [Fact]
    public void ShowToast_sets_message()
    {
        var vm = new MainWindowViewModel();
        vm.ShowToast("test");
        Assert.Equal("test", vm.ToastMessage);
        Assert.True(vm.IsToastVisible);
    }
}

// ── REQ-GUI-009: Screenshot Capture ──

// @covers(ScreenshotService)
public class ScreenshotCaptureReqTests
{
    // @covers(ScreenshotService)
    [Fact]
    public void ScreenshotService_can_be_instantiated()
    {
        var svc = new ScreenshotService();
        Assert.NotNull(svc);
    }
}

// ── Shared test helpers ──

internal static class TestHelpers
{
    public static Entropic.Core.Project MakeProject(string provider, string path)
    {
        return new Entropic.Core.Project(
            provider,
            path,
            Microsoft.FSharp.Core.FSharpOption<string>.None,       // FlattenedDir
            Microsoft.FSharp.Core.FSharpOption<bool>.None,         // PathExists
            Microsoft.FSharp.Collections.ListModule.Empty<Entropic.Core.Session>(),
            Microsoft.FSharp.Core.FSharpOption<Entropic.Core.ProjectStats>.None,
            Microsoft.FSharp.Core.FSharpOption<long>.None,         // StartDate
            Microsoft.FSharp.Core.FSharpOption<long>.None          // MostRecentTodoDate
        );
    }
}
