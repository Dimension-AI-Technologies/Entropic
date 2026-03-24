using System;

namespace Entropic.GUI.Services;

public class ErrorBoundaryService
{
    public event Action<Exception>? ErrorCaught;
    public Exception? LastError { get; private set; }

    // @must_test(REQ-GUI-019)
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
