using System;

namespace Entropic.GUI.Services;

// @must_test(REQ-GUI-019)
public class ErrorBoundaryService
{
    public event Action<Exception>? ErrorCaught;
    public Exception? LastError { get; private set; }

    public void HandleError(Exception ex)
    {
        LastError = ex;
        ErrorCaught?.Invoke(ex);
    }

    public void Clear()
    {
        LastError = null;
    }
}
