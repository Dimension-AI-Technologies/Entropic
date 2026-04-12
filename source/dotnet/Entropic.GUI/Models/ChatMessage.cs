using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace Entropic.GUI.Models;

public sealed class ChatMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "";

    [JsonPropertyName("text")]
    public string Text { get; set; } = "";

    [JsonPropertyName("timestamp")]
    public string? Timestamp { get; set; }

    [JsonPropertyName("depth")]
    public int Depth { get; set; }

    [JsonPropertyName("cli")]
    public bool Cli { get; set; }

    [JsonPropertyName("images")]
    public List<ChatImage>? Images { get; set; }

    // Cached derived properties — computed once after deserialization
    private string? _displayRole;
    private string? _shortTimestamp;
    private bool? _isUser;
    private bool? _isAssistant;

    [JsonIgnore]
    public bool IsUser => _isUser ??= Role is "user" or "subagent_user";

    [JsonIgnore]
    public bool IsAssistant => _isAssistant ??= Role is "assistant" or "subagent_assistant";

    [JsonIgnore]
    public bool IsMeta => !IsUser && !IsAssistant;

    [JsonIgnore]
    public string DisplayRole => _displayRole ??= Role switch
    {
        "user" => "User",
        "assistant" => "Claude",
        "subagent_user" => "Agent Prompt",
        "subagent_assistant" => "Agent Response",
        "subagent_start" => "Agent",
        "plan" or "plan_summary" => "Plan",
        "task" or "task_summary" => "Task",
        "cli_session_start" => "CLI Session",
        _ => Role,
    };

    [JsonIgnore]
    public string ShortTimestamp => _shortTimestamp ??= Timestamp?.Length >= 19 ? Timestamp[..19] : Timestamp ?? "";
}

public sealed class ChatImage
{
    [JsonPropertyName("media_type")]
    public string MediaType { get; set; } = "image/png";

    [JsonPropertyName("data")]
    public string Data { get; set; } = "";
}

/// <summary>
/// Groups consecutive same-role messages into a single visual bubble.
/// </summary>
public sealed class ChatMessageGroup
{
    public List<ChatMessage> Items { get; init; } = [];
    public ChatMessage First => Items[0];
    public bool IsUser => First.IsUser;
    public bool IsAssistant => First.IsAssistant;
    public bool IsMeta => First.IsMeta;
    public string DisplayRole => First.DisplayRole;
}

/// <summary>
/// A Claude Code project discovered in ~/.claude/projects/.
/// </summary>
public partial class ProjectEntry : ObservableObject
{
    public string DisplayName { get; init; } = "";
    public string ParentFolder { get; init; } = "";
    public string SidebarLabel => string.IsNullOrEmpty(ParentFolder) ? DisplayName : $"{ParentFolder}/{DisplayName}";
    public string DirectoryPath { get; init; } = "";
    public string ProjectPath { get; init; } = "";
    public List<SessionEntry> Sessions { get; init; } = [];
    public DateTime MostRecentActivity => Sessions.Count > 0 ? Sessions[0].LastModified : DateTime.MinValue;

    [ObservableProperty]
    private bool _isSelected;
}

/// <summary>
/// Time-based divider inserted between projects in the sidebar.
/// </summary>
public sealed class TimeDivider
{
    public string Label { get; init; } = "";
}

/// <summary>
/// Groups projects by parent folder for grouped sidebar view.
/// </summary>
public partial class ProjectFolderGroup : ObservableObject
{
    public string FolderName { get; init; } = "";
    /// <summary>Mixed list of ProjectEntry and TimeDivider.</summary>
    public List<object> Items { get; init; } = [];

    [ObservableProperty]
    private bool _isExpanded = true;

    public string Arrow => IsExpanded ? "\u25BC" : "\u25B6";
    partial void OnIsExpandedChanged(bool value) => OnPropertyChanged(nameof(Arrow));

    [RelayCommand]
    private void ToggleExpanded() => IsExpanded = !IsExpanded;
}

/// <summary>
/// A single JSONL conversation session within a project.
/// </summary>
public sealed class SessionEntry
{
    public string SessionId { get; init; } = "";
    public string JsonlPath { get; init; } = "";
    public DateTime LastModified { get; init; }
    public string DisplayTime => LastModified.ToString("yyyy-MM-dd HH:mm");
}

public sealed class ChatFile
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("messages")]
    public List<ChatMessage> Messages { get; set; } = [];
}
