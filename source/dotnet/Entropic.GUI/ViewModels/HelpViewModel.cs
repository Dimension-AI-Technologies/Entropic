using CommunityToolkit.Mvvm.ComponentModel;

namespace Entropic.GUI.ViewModels;

// @must_test(REQ-GUI-018)
public partial class HelpViewModel : ViewModelBase
{
    public string[] KeyboardShortcuts { get; } = new[]
    {
        "F1 — Open help dialog",
        "F5 — Refresh data",
        "Ctrl+1..4 — Switch tabs",
        "Ctrl+F — Filter projects",
        "Ctrl+A — Toggle activity mode",
        "Delete — Delete selected item",
        "Ctrl+Arrow — Reorder TODOs"
    };

    public string Version { get; } = "1.0.0";
}
