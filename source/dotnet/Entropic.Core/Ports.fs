namespace Entropic.Core

/// Hexagonal architecture port interfaces.
/// Core domain depends on these abstractions; adapters implement them.

// @must_test(REQ-ARC-001)
type IProviderPort =
    abstract member Id: string
    abstract member FetchProjects: unit -> Async<Result<Project list, string>>
    abstract member WatchChanges: (unit -> unit) -> (unit -> unit) // returns unsubscribe
    abstract member CollectDiagnostics: unit -> Async<Result<{| UnknownCount: int; Details: string |}, string>>
    abstract member RepairMetadata: dryRun: bool -> Async<Result<{| Planned: int; Written: int; UnknownCount: int |}, string>>

type IEventPort =
    abstract member DataChanged: unit -> unit

// @must_test(REQ-PLT-006)
type IPersistencePort =
    abstract member Get<'T> : key: string -> 'T option
    abstract member Set<'T> : key: string -> value: 'T -> unit
