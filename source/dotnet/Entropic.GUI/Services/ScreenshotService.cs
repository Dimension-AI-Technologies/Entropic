using System;
using System.IO;

namespace Entropic.GUI.Services;

// @must_test(REQ-GUI-009)
// @must_test(REQ-GUI-010)
public class ScreenshotService
{
    public string DesktopPath { get; } = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);

    /// Generate a timestamped screenshot filename.
    public string GenerateFilename()
    {
        return $"Entropic_{DateTime.Now:yyyyMMdd_HHmmss}.png";
    }

    /// Get the full save path for a screenshot.
    public string GetSavePath()
    {
        return Path.Combine(DesktopPath, GenerateFilename());
    }
}
