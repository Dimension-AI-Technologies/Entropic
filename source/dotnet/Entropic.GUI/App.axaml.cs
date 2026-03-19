using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Data.Core;
using Avalonia.Data.Core.Plugins;
using System.Collections.Generic;
using System.Linq;
using Avalonia.Markup.Xaml;
using Entropic.Core;
using Entropic.Core.Adapters;
using Entropic.GUI.ViewModels;
using Entropic.GUI.Views;

namespace Entropic.GUI;

public partial class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            DisableAvaloniaDataAnnotationValidation();

            var providers = CreateProviders();
            var vm = new MainWindowViewModel();
            vm.SetProviders(providers);

            desktop.MainWindow = new MainWindow
            {
                DataContext = vm,
            };

            // Kick off initial data load
            vm.RefreshCommand.Execute(null);
        }

        base.OnFrameworkInitializationCompleted();
    }

    private static List<IProviderPort> CreateProviders()
    {
        var presence = ProviderDetection.detect();
        var providers = new List<IProviderPort>();

        if (presence.Claude)
        {
            var paths = ProviderDetection.claudePaths();
            providers.Add(new ClaudeAdapter(paths.ProjectsDir, paths.TodosDir));
        }
        if (presence.Codex)
        {
            var paths = ProviderDetection.codexPaths();
            providers.Add(new CodexAdapter(paths.SessionsDir));
        }
        if (presence.Gemini)
        {
            var paths = ProviderDetection.geminiPaths();
            providers.Add(new GeminiAdapter(paths.SessionsDir));
        }

        return providers;
    }

    private void DisableAvaloniaDataAnnotationValidation()
    {
        var dataValidationPluginsToRemove =
            BindingPlugins.DataValidators.OfType<DataAnnotationsValidationPlugin>().ToArray();

        foreach (var plugin in dataValidationPluginsToRemove)
        {
            BindingPlugins.DataValidators.Remove(plugin);
        }
    }
}