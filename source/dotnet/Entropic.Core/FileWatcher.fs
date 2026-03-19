namespace Entropic.Core

open System
open System.IO
open System.Threading

/// Debounced file system watcher.
/// Watches a directory for changes and invokes a callback with configurable debounce.

// @must_test(REQ-ARC-006)
type DebouncedFileWatcher(path: string, debounceMs: int) =
    let mutable watcher: FileSystemWatcher option = None
    let mutable timer: Timer option = None
    let mutable callback: (unit -> unit) option = None

    let onChanged _ =
        // Reset debounce timer on every change
        timer |> Option.iter (fun t -> t.Change(debounceMs, Timeout.Infinite) |> ignore)

    member _.Start(onChange: unit -> unit) =
        callback <- Some onChange
        timer <- Some (new Timer((fun _ -> callback |> Option.iter (fun cb -> cb())), null, Timeout.Infinite, Timeout.Infinite))
        if Directory.Exists(path) then
            let w = new FileSystemWatcher(path)
            w.IncludeSubdirectories <- true
            w.NotifyFilter <- NotifyFilters.LastWrite ||| NotifyFilters.FileName ||| NotifyFilters.DirectoryName
            w.Changed.Add(onChanged)
            w.Created.Add(onChanged)
            w.Deleted.Add(onChanged)
            w.Renamed.Add(fun _ -> onChanged())
            w.EnableRaisingEvents <- true
            watcher <- Some w

    member _.Stop() =
        watcher |> Option.iter (fun w -> w.EnableRaisingEvents <- false; w.Dispose())
        watcher <- None
        timer |> Option.iter (fun t -> t.Dispose())
        timer <- None

    interface IDisposable with
        member this.Dispose() = this.Stop()
