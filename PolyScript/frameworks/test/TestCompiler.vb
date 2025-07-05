'
' Test VB.NET Compiler Tool for PolyScript Framework
' CRUD × Modes Architecture: Zero-boilerplate CLI development
' 
' Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
'

Imports System
Imports System.Collections.Generic
Imports PolyScript.Framework

<PolyScriptTool>
<Rebadge("compile", "create+live")>
<Rebadge("dry-compile", "create+simulate")>
<Rebadge("status", "read+live")>
<Rebadge("clean", "delete+live")>
Public Class TestCompilerTool
    Implements IPolyScriptTool

    Public ReadOnly Property Description As String Implements IPolyScriptTool.Description
        Get
            Return "Test VB.NET compiler tool demonstrating CRUD × Modes"
        End Get
    End Property

    Public Function Create(resource As String, options As Dictionary(Of String, Object), context As PolyScriptContext) As Object Implements IPolyScriptTool.Create
        context.Log($"Compiling {resource}...")
        
        Dim outputFile = If(options.ContainsKey("output"), options("output").ToString(), resource?.Replace(".vb", ".exe"))
        Dim optimize = If(options.ContainsKey("optimize"), CBool(options("optimize")), False)
        
        Return New Dictionary(Of String, Object) From {
            {"compiled", resource},
            {"output", outputFile},
            {"optimized", optimize},
            {"timestamp", DateTime.Now.ToString("O")}
        }
    End Function

    Public Function Read(resource As String, options As Dictionary(Of String, Object), context As PolyScriptContext) As Object Implements IPolyScriptTool.Read
        context.Log("Checking compilation status...")
        
        Return New Dictionary(Of String, Object) From {
            {"source_files", New List(Of String) From {"Program.vb", "Utils.vb", "Config.vb"}},
            {"compiled_files", New List(Of String) From {"Program.dll", "Utils.dll"}},
            {"missing", New List(Of String) From {"Config.dll"}},
            {"last_build", DateTime.Now.AddHours(-2).ToString("O")}
        }
    End Function

    Public Function Update(resource As String, options As Dictionary(Of String, Object), context As PolyScriptContext) As Object Implements IPolyScriptTool.Update
        context.Log($"Recompiling {resource}...")
        
        Return New Dictionary(Of String, Object) From {
            {"recompiled", resource},
            {"reason", "source file changed"},
            {"incremental", If(options.ContainsKey("incremental"), CBool(options("incremental")), False)},
            {"timestamp", DateTime.Now.ToString("O")}
        }
    End Function

    Public Function Delete(resource As String, options As Dictionary(Of String, Object), context As PolyScriptContext) As Object Implements IPolyScriptTool.Delete
        context.Log($"Cleaning {If(resource, "build artifacts")}...")
        
        Return New Dictionary(Of String, Object) From {
            {"cleaned", New List(Of String) From {"*.exe", "*.dll", "*.pdb", "bin/", "obj/"}},
            {"freed_space", "22.3 MB"},
            {"timestamp", DateTime.Now.ToString("O")}
        }
    End Function
End Class

Module Program
    Sub Main(args As String())
        PolyScriptFramework.Run(Of TestCompilerTool)(args)
    End Sub
End Module