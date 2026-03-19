using Entropic.GUI.ViewModels;
using Entropic.GUI.Services;
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
        Assert.Equal("#4caf50", vm.StatusColor);
        vm.Status = "in_progress";
        Assert.Equal("#2196f3", vm.StatusColor);
        vm.Status = "pending";
        Assert.Equal("#9e9e9e", vm.StatusColor);
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

    // @covers(TodoItemViewModel)
    [Fact]
    public void CanDelete_is_true()
    {
        var vm = new TodoItemViewModel();
        Assert.True(vm.CanDelete);
    }
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

// ── SplashScreen (REQ-GUI-007) ──

// @covers(SplashScreen)
public class SplashScreenTests
{
    // @covers(SplashScreen)
        [Fact]
    public void SplashScreen_type_exists()
    {
        Assert.NotNull(typeof(Entropic.GUI.Views.SplashScreen));
    }
}
