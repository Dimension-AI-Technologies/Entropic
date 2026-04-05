using System;

namespace Entropic.GUI.Services;

public class ToastService
{
    internal const int AutoDismissMs = 2500;
    public event Action<string>? ToastRequested;

    // @must_test(REQ-GUI-008)
    public void Show(string message)
    {
        ToastRequested?.Invoke(message);
    }
}
