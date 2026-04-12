using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media.Imaging;
using Entropic.GUI.ViewModels;

namespace Entropic.GUI.Views;

public partial class MainWindow : Window
{
    public const int DefaultWidth = 1400;
    public const int DefaultHeight = 900;
    public const string DarkBackground = "#1a1d21";

    public MainWindow()
    {
        InitializeComponent();
        KeyDown += OnKeyDown;
    }

    private void OnKeyDown(object? sender, KeyEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;

        // Forward chat-specific keys when Chat tab is active
        if (vm.IsChatTab && !e.KeyModifiers.HasFlag(KeyModifiers.Control))
        {
            var chatView = this.FindControl<ChatView>("ChatViewControl");
            chatView?.HandleChatKeyDown(e);
            if (e.Handled) return;
        }

        // F1 = Help
        if (e.Key == Key.F1)
        {
            vm.IsHelpOpen = !vm.IsHelpOpen;
            e.Handled = true;
        }
        // F5 = Refresh
        else if (e.Key == Key.F5)
        {
            vm.RefreshCommand.Execute(null);
            e.Handled = true;
        }
        // Escape = close help overlay
        else if (e.Key == Key.Escape && vm.IsHelpOpen)
        {
            vm.IsHelpOpen = false;
            e.Handled = true;
        }
        // Ctrl+1..4 = switch tabs
        else if (e.KeyModifiers.HasFlag(KeyModifiers.Control))
        {
            var tabIndex = e.Key switch
            {
                Key.D1 => 0,
                Key.D2 => 1,
                Key.D3 => 2,
                Key.D4 => 3,
                Key.D5 => 4,
                _ => -1
            };
            if (tabIndex >= 0)
            {
                vm.SelectedTabIndex = tabIndex;
                e.Handled = true;
            }
            // Ctrl+A = toggle activity mode
            else if (e.Key == Key.A)
            {
                vm.ToggleActivityModeCommand.Execute(null);
                e.Handled = true;
            }
            // Ctrl+Up/Down = reorder TODOs (REQ-TOD-012)
            else if (e.Key == Key.Up && vm.Projects.SelectedSession != null)
            {
                var todos = vm.Projects.SelectedSession.Todos;
                var selected = todos.Count > 0 ? todos[0] : null; // ListBox selection would be better
                // Use the focused todo if available
                for (int i = 0; i < todos.Count; i++)
                {
                    if (todos[i].IsSelected) { selected = todos[i]; break; }
                }
                if (selected != null) vm.Projects.MoveTodoUpCommand.Execute(selected);
                e.Handled = true;
            }
            else if (e.Key == Key.Down && vm.Projects.SelectedSession != null)
            {
                var todos = vm.Projects.SelectedSession.Todos;
                TodoItemViewModel? selected = null;
                for (int i = 0; i < todos.Count; i++)
                {
                    if (todos[i].IsSelected) { selected = todos[i]; break; }
                }
                if (selected != null) vm.Projects.MoveTodoDownCommand.Execute(selected);
                e.Handled = true;
            }
        }
    }

    public void TakeScreenshotPublic()
    {
        var bounds = Bounds;
        if (bounds.Width < 1 || bounds.Height < 1) return;

        var pixelSize = new PixelSize((int)bounds.Width, (int)bounds.Height);
        using var bitmap = new RenderTargetBitmap(pixelSize, new Vector(96, 96));
        bitmap.Render(this);

        var timestamp = DateTime.Now.ToString("yyyyMMdd-HHmmss");
        var filename = $"Entropic-{timestamp}.png";
        var filepath = Path.Combine(Path.GetTempPath(), filename);
        bitmap.Save(filepath);

        if (DataContext is MainWindowViewModel vm)
            vm.ShowToast($"Screenshot saved: {filepath}");

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            Process.Start(new ProcessStartInfo(filepath) { UseShellExecute = true });
    }
}
