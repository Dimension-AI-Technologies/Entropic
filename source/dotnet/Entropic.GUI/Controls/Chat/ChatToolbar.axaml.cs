using System;
using System.Collections.Generic;
using System.IO;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Input.Platform;
using Avalonia.Interactivity;
using Avalonia.Layout;
using Avalonia.Platform.Storage;
using Avalonia.Styling;
using Entropic.GUI.ViewModels;

namespace Entropic.GUI.Controls.Chat;

public partial class ChatToolbar : UserControl
{
    public event Action? NavUpClicked;
    public event Action? NavDownClicked;
    public event Action? CollapseClicked;
    public event Action? ScreenshotClicked;

    private int _previousLimit = 200;

    public ChatToolbar()
    {
        InitializeComponent();
    }

    // --- Message limit handlers ---

    private void OnMessageLimitKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            // Move focus away to trigger LostFocus
            this.Focus();
            e.Handled = true;
        }
        else if (e.Key == Key.Escape)
        {
            // Revert
            if (DataContext is ChatViewModel vm)
                vm.MessageLimit = _previousLimit;
            this.Focus();
            e.Handled = true;
        }
    }

    private async void OnMessageLimitLostFocus(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not ChatViewModel vm) return;
        if (vm.MessageLimit == _previousLimit) return;

        // Validate
        if (vm.MessageLimit < 1)
        {
            vm.MessageLimit = _previousLimit;
            return;
        }

        // Show OK/Cancel confirmation
        var confirmed = await ShowReloadConfirmation(vm.MessageLimit);
        if (confirmed)
        {
            _previousLimit = vm.MessageLimit;
            // Reload current file
            if (!string.IsNullOrEmpty(vm.JsonPath))
                vm.LoadFileCommand.Execute(vm.JsonPath);
        }
        else
        {
            vm.MessageLimit = _previousLimit;
        }
    }

    private async System.Threading.Tasks.Task<bool> ShowReloadConfirmation(int newLimit)
    {
        var top = TopLevel.GetTopLevel(this);
        if (top is not Window parentWindow) return false;

        var result = false;
        var dialog = new Window
        {
            Title = "Reload?",
            Width = 320, Height = 130,
            CanResize = false,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            Content = new StackPanel
            {
                Margin = new Thickness(16),
                Spacing = 12,
                Children =
                {
                    new TextBlock
                    {
                        Text = $"Reload showing last {newLimit} messages?",
                        TextWrapping = Avalonia.Media.TextWrapping.Wrap
                    },
                    new StackPanel
                    {
                        Orientation = Orientation.Horizontal,
                        HorizontalAlignment = HorizontalAlignment.Right,
                        Spacing = 8,
                        Children =
                        {
                            new Button { Content = "OK", Width = 80, Tag = true },
                            new Button { Content = "Cancel", Width = 80 }
                        }
                    }
                }
            }
        };

        // Wire button clicks
        dialog.AddHandler(Button.ClickEvent, (_, args) =>
        {
            if (args.Source is Button btn)
                result = btn.Tag is true;
            dialog.Close();
        });

        await dialog.ShowDialog(parentWindow);
        return result;
    }

    private void OnNavUpClick(object? sender, RoutedEventArgs e) => NavUpClicked?.Invoke();
    private void OnNavDownClick(object? sender, RoutedEventArgs e) => NavDownClicked?.Invoke();
    private void OnCollapseClick(object? sender, RoutedEventArgs e) => CollapseClicked?.Invoke();
    private void OnScreenshotClick(object? sender, RoutedEventArgs e) => ScreenshotClicked?.Invoke();

    private void OnThemeClick(object? sender, RoutedEventArgs e)
    {
        if (Application.Current is null) return;
        Application.Current.RequestedThemeVariant =
            Application.Current.RequestedThemeVariant == ThemeVariant.Light
                ? ThemeVariant.Dark
                : ThemeVariant.Light;
    }

    // --- Copy handlers ---

    private async void OnCopyMarkdown(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not ChatViewModel vm) return;
        var text = vm.FormatAsMarkdown();
        await CopyToClipboard(text);
        vm.StatusText = "Copied as Markdown";
    }

    private async void OnCopyText(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not ChatViewModel vm) return;
        var text = vm.FormatAsText();
        await CopyToClipboard(text);
        vm.StatusText = "Copied as plain text";
    }

    private async void OnCopyHtml(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not ChatViewModel vm) return;
        var text = vm.FormatAsHtml();
        await CopyToClipboard(text);
        vm.StatusText = "Copied as HTML";
    }

    private async System.Threading.Tasks.Task CopyToClipboard(string text)
    {
        var clipboard = TopLevel.GetTopLevel(this)?.Clipboard;
        if (clipboard is not null)
            await clipboard.SetTextAsync(text);
    }

    // --- Save handlers ---

    private async void OnSaveMarkdown(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not ChatViewModel vm) return;
        var path = await PickSaveFile("Markdown", "md");
        if (path is null) return;
        await File.WriteAllTextAsync(path, vm.FormatAsMarkdown());
        vm.StatusText = $"Saved: {path}";
    }

    private async void OnSaveText(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not ChatViewModel vm) return;
        var path = await PickSaveFile("Text", "txt");
        if (path is null) return;
        await File.WriteAllTextAsync(path, vm.FormatAsText());
        vm.StatusText = $"Saved: {path}";
    }

    private async void OnSaveHtml(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not ChatViewModel vm) return;
        var path = await PickSaveFile("HTML", "html");
        if (path is null) return;
        await File.WriteAllTextAsync(path, vm.FormatAsHtml());
        vm.StatusText = $"Saved: {path}";
    }

    private async System.Threading.Tasks.Task<string?> PickSaveFile(string typeName, string ext)
    {
        var top = TopLevel.GetTopLevel(this);
        if (top is null) return null;

        var defaultName = DataContext is ChatViewModel vm && !string.IsNullOrEmpty(vm.RepoTitle)
            ? $"{vm.RepoTitle}.{ext}"
            : $"conversation.{ext}";

        var file = await top.StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = $"Save as {typeName}",
            SuggestedFileName = defaultName,
            FileTypeChoices = new List<FilePickerFileType>
            {
                new(typeName) { Patterns = new[] { $"*.{ext}" } }
            }
        });

        return file?.TryGetLocalPath();
    }
}
