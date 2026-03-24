using Avalonia;
using System;
using Entropic.GUI.Services;

namespace Entropic.GUI;

public sealed class Program
{
    // @must_test(REQ-PLT-001)
    // @must_test(REQ-PLT-005)
    // @must_test(REQ-BLD-004)
    // @must_test(REQ-GUI-007)
    [STAThread]
    public static void Main(string[] args)
    {
        using var guard = new SingleInstanceGuard("com.claudecode.todomonitor");
        if (!guard.IsFirstInstance)
        {
            Console.Error.WriteLine("Another instance is already running.");
            return;
        }
        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);
    }

    // @must_test(REQ-PLT-001)
    // @must_test(REQ-BLD-004)
    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .WithInterFont()
            .LogToTrace();
}
