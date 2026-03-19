namespace Entropic.Core

/// Provider-agnostic domain types.
/// Identity rules:
///   Project identity = (Provider, ProjectPath)
///   Session identity = (Provider, SessionId)
/// All fallible operations use Result<T,string> — no exceptions for control flow.

// @must_test(REQ-TOD-002)
// @must_test(REQ-ARC-002)
// @must_test(REQ-PLT-004)
type TodoStatus =
    | Pending
    | InProgress
    | Completed

// @must_test(REQ-PRV-006)
type Todo = {
    Id: string option
    Content: string
    Status: TodoStatus
    CreatedAt: int64 option  // epoch ms
    UpdatedAt: int64 option  // epoch ms
    ActiveForm: string option
}

// @must_test(REQ-SES-001)
// @must_test(REQ-SES-003)
type Session = {
    Provider: string       // e.g. "claude", "codex", "gemini"
    SessionId: string
    FilePath: string option
    ProjectPath: string option
    Todos: Todo list
    CreatedAt: int64 option
    UpdatedAt: int64 option
}

type ProjectStats = {
    Todos: int
    Active: int
    Completed: int
}

// @must_test(REQ-PRV-006)
type Project = {
    Provider: string       // e.g. "claude", "codex", "gemini"
    ProjectPath: string    // real path
    FlattenedDir: string option
    PathExists: bool option
    Sessions: Session list
    Stats: ProjectStats option
    StartDate: int64 option         // epoch ms
    MostRecentTodoDate: int64 option // epoch ms
}
