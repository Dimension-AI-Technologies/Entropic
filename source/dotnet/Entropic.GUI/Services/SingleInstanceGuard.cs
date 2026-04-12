using System;
using System.Threading;

namespace Entropic.GUI.Services;

public sealed class SingleInstanceGuard : IDisposable
{
    private readonly Mutex _mutex;
    private readonly bool _acquired;

    public const string DefaultAppId = "com.claudecode.todomonitor";

    // @must_test(REQ-PLT-005)
    public SingleInstanceGuard(string? appId = null)
    {
        _mutex = new Mutex(true, appId ?? DefaultAppId, out _acquired);
    }

    public bool IsFirstInstance => _acquired;

    public void Dispose()
    {
        if (_acquired) _mutex.ReleaseMutex();
        _mutex.Dispose();
    }
}
