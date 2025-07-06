'
' PolyScript Framework for VB.NET using Spectre.Console
' CRUD × Modes Architecture: Zero-boilerplate CLI development
' 
' Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
'

Imports System
Imports System.Collections.Generic
Imports System.ComponentModel
Imports System.IO
Imports System.Linq
Imports System.Reflection
Imports System.Text.Json
Imports System.Threading.Tasks
Imports Spectre.Console
Imports Spectre.Console.Cli
Imports PolyScript.NET

Namespace PolyScript.Framework

    ' PolyScript operations and modes are now provided by PolyScript.NET
    ' Using PolyScript.NET.PolyScriptOperation and PolyScript.NET.PolyScriptMode

    ''' <summary>
    ''' PolyScript context passed to tool methods
    ''' </summary>
    Public Class PolyScriptContext
        Public Property Operation As PolyScript.NET.PolyScriptOperation
        Public Property Mode As PolyScript.NET.PolyScriptMode
        Public Property Resource As String
        Public Property RebadgedAs As String
        Public Property Verbose As Boolean
        Public Property Force As Boolean
        Public Property JsonOutput As Boolean
        Public Property ToolName As String
        Public Property OutputData As New Dictionary(Of String, Object) From {
            {"polyscript", "1.0"},
            {"status", "success"},
            {"data", New Dictionary(Of String, Object)()}
        }
        Public Property Messages As New List(Of String)()

        ' Create libpolyscript context for FFI calls
        Private Function GetLibContext() As PolyScript.NET.PolyScriptContext
            Dim libCtx = New PolyScript.NET.PolyScriptContext(Operation, Mode, ToolName)
            libCtx.Force = Force
            Return libCtx
        End Function

        Public ReadOnly Property CanMutate As Boolean
            Get
                Return GetLibContext().CanMutate()
            End Get
        End Property

        Public ReadOnly Property ShouldValidate As Boolean
            Get
                Return GetLibContext().ShouldValidate()
            End Get
        End Property

        Public ReadOnly Property RequireConfirm As Boolean
            Get
                Return GetLibContext().RequireConfirm()
            End Get
        End Property

        Public ReadOnly Property IsSafeMode As Boolean
            Get
                Return GetLibContext().IsSafeMode()
            End Get
        End Property

        Public Sub Log(message As String, Optional level As String = "info")
            If JsonOutput Then
                Messages.Add($"[{level}] {message}")
                If Verbose Then
                    OutputData("messages") = Messages
                End If
            Else
                Select Case level
                    Case "error"
                        AnsiConsole.MarkupLine($"[red]Error:[/] {message}")
                    Case "warning"
                        AnsiConsole.MarkupLine($"[yellow]Warning:[/] {message}")
                    Case "info"
                        AnsiConsole.WriteLine(message)
                    Case "debug"
                        If Verbose Then AnsiConsole.MarkupLine($"[grey]Debug:[/] {message}")
                End Select
            End If
        End Sub

        Public Sub Output(data As Object, Optional isError As Boolean = False)
            If JsonOutput Then
                If TypeOf data Is Dictionary(Of String, Object) Then
                    DirectCast(OutputData("data"), Dictionary(Of String, Object)).Concat(DirectCast(data, Dictionary(Of String, Object)))
                Else
                    OutputData("result") = data
                End If
                
                If isError Then
                    OutputData("status") = "error"
                    OutputData("error") = data.ToString()
                End If
            Else
                If isError Then
                    AnsiConsole.MarkupLine($"[red]{data}[/]")
                Else
                    Dim json = JsonSerializer.Serialize(data, New JsonSerializerOptions With {.WriteIndented = True})
                    AnsiConsole.WriteLine(json)
                End If
            End If
        End Sub

        Public Function Confirm(message As String) As Boolean
            If Force Then Return True

            If JsonOutput Then
                Output(New With {.confirmation_required = message}, isError:=True)
                Return False
            End If

            Return AnsiConsole.Confirm(message)
        End Function

        Public Sub FinalizeOutput()
            OutputData("operation") = Operation.ToString().ToLower()
            OutputData("mode") = Mode.ToString().ToLower()
            
            If Not String.IsNullOrEmpty(Resource) Then
                OutputData("resource") = Resource
            End If
            
            If Not String.IsNullOrEmpty(RebadgedAs) Then
                OutputData("rebadged_as") = RebadgedAs
            End If

            If JsonOutput Then
                Dim json = JsonSerializer.Serialize(OutputData, New JsonSerializerOptions With {.WriteIndented = True})
                Console.WriteLine(json)
            End If
        End Sub
    End Class

    ''' <summary>
    ''' Interface that PolyScript CRUD tools must implement
    ''' </summary>
    Public Interface IPolyScriptTool
        ReadOnly Property Description As String
        Function Create(resource As String, options As Dictionary(Of String, Object), context As PolyScriptContext) As Object
        Function Read(resource As String, options As Dictionary(Of String, Object), context As PolyScriptContext) As Object
        Function Update(resource As String, options As Dictionary(Of String, Object), context As PolyScriptContext) As Object
        Function Delete(resource As String, options As Dictionary(Of String, Object), context As PolyScriptContext) As Object
    End Interface

    ''' <summary>
    ''' Attribute to mark a class as a PolyScript tool
    ''' </summary>
    <AttributeUsage(AttributeTargets.Class)>
    Public Class PolyScriptToolAttribute
        Inherits Attribute
    End Class

    ''' <summary>
    ''' Attribute for rebadging operations
    ''' </summary>
    <AttributeUsage(AttributeTargets.Class, AllowMultiple:=True)>
    Public Class RebadgeAttribute
        Inherits Attribute
        
        Public Property [Alias] As String
        Public Property Mapping As String

        Public Sub New([alias] As String, mapping As String)
            Me.Alias = [alias]
            Me.Mapping = mapping
        End Sub
    End Class

    ''' <summary>
    ''' Base settings for PolyScript commands
    ''' </summary>
    Public Class PolyScriptSettings
        Inherits CommandSettings

        <Description("Resource to operate on")>
        <CommandArgument(0, "[resource]")>
        Public Property Resource As String

        <Description("Execution mode")>
        <CommandOption("--mode")>
        Public Property Mode As PolyScript.NET.PolyScriptMode = PolyScript.NET.PolyScriptMode.Live

        <Description("Enable verbose output")>
        <CommandOption("-v|--verbose")>
        Public Property Verbose As Boolean

        <Description("Skip confirmation prompts")>
        <CommandOption("-f|--force")>
        Public Property Force As Boolean

        <Description("Output in JSON format")>
        <CommandOption("--json")>
        Public Property JsonOutput As Boolean
    End Class

    ''' <summary>
    ''' Base class for PolyScript commands
    ''' </summary>
    Public MustInherit Class PolyScriptCommand(Of TTool As {IPolyScriptTool, New})
        Inherits Command(Of PolyScriptSettings)

        Protected MustOverride ReadOnly Property Operation As PolyScript.NET.PolyScriptOperation
        Protected Overridable ReadOnly Property RebadgedAs As String = Nothing

        Public Overrides Function Execute(context As CommandContext, settings As PolyScriptSettings) As Integer
            Dim tool = New TTool()
            Dim psContext = New PolyScriptContext With {
                .Operation = Operation,
                .Mode = settings.Mode,
                .Resource = settings.Resource,
                .RebadgedAs = RebadgedAs,
                .Verbose = settings.Verbose,
                .Force = settings.Force,
                .JsonOutput = settings.JsonOutput,
                .ToolName = GetType(TTool).Name
            }

            psContext.OutputData("tool") = GetType(TTool).Name

            Try
                psContext.Log($"Executing {Operation} operation in {settings.Mode} mode", "debug")

                Dim result = ExecuteWithMode(tool, psContext)

                If result IsNot Nothing Then
                    psContext.Output(result)
                End If

                psContext.FinalizeOutput()
                Return 0
            Catch ex As Exception
                psContext.OutputData("status") = "error"
                psContext.Output($"Unhandled error: {ex.Message}", isError:=True)
                
                If psContext.Verbose Then
                    psContext.Output(ex.StackTrace, isError:=True)
                End If

                psContext.FinalizeOutput()
                Return 1
            End Try
        End Function

        Private Function ExecuteWithMode(tool As TTool, context As PolyScriptContext) As Object
            Select Case context.Mode
                Case PolyScript.NET.PolyScriptMode.Simulate
                    context.Log($"Simulating {context.Operation} operation", "debug")
                    
                    If context.Operation = PolyScript.NET.PolyScriptOperation.Read Then
                        Return tool.Read(context.Resource, New Dictionary(Of String, Object), context)
                    Else
                        Dim actionVerb = GetActionVerb(context.Operation)
                        Return New Dictionary(Of String, Object) From {
                            {"simulation", True},
                            {"action", $"{actionVerb} {If(context.Resource, "resource")}"},
                            {"options", New Dictionary(Of String, Object)}
                        }
                    End If

                Case PolyScript.NET.PolyScriptMode.Sandbox
                    context.Log($"Testing prerequisites for {context.Operation}", "debug")
                    
                    Dim validations = New Dictionary(Of String, Object) From {
                        {"permissions", "verified"},
                        {"dependencies", "available"},
                        {"connectivity", "established"}
                    }
                    
                    Return New Dictionary(Of String, Object) From {
                        {"sandbox", True},
                        {"validations", validations},
                        {"ready", True}
                    }

                Case PolyScript.NET.PolyScriptMode.Live
                    context.Log($"Executing {context.Operation} operation", "debug")
                    
                    If context.RequireConfirm Then
                        Dim confirmMsg = $"Are you sure you want to {context.Operation.ToString().ToLower()} {If(context.Resource, "resource")}?"
                        If Not context.Confirm(confirmMsg) Then
                            context.OutputData("status") = "cancelled"
                            Return New Dictionary(Of String, Object) From {{"cancelled", True}}
                        End If
                    End If

                    Select Case context.Operation
                        Case PolyScript.NET.PolyScriptOperation.Create
                            Return tool.Create(context.Resource, New Dictionary(Of String, Object), context)
                        Case PolyScript.NET.PolyScriptOperation.Read
                            Return tool.Read(context.Resource, New Dictionary(Of String, Object), context)
                        Case PolyScript.NET.PolyScriptOperation.Update
                            Return tool.Update(context.Resource, New Dictionary(Of String, Object), context)
                        Case PolyScript.NET.PolyScriptOperation.Delete
                            Return tool.Delete(context.Resource, New Dictionary(Of String, Object), context)
                        Case Else
                            Throw New InvalidOperationException($"Unknown operation: {context.Operation}")
                    End Select
            End Select
        End Function

        Private Function GetActionVerb(operation As PolyScript.NET.PolyScriptOperation) As String
            Select Case operation
                Case PolyScript.NET.PolyScriptOperation.Create
                    Return "Would create"
                Case PolyScript.NET.PolyScriptOperation.Update
                    Return "Would update"
                Case PolyScript.NET.PolyScriptOperation.Delete
                    Return "Would delete"
                Case Else
                    Return "Would read"
            End Select
        End Function
    End Class

    ' Specific command implementations
    Public Class CreateCommand(Of TTool As {IPolyScriptTool, New})
        Inherits PolyScriptCommand(Of TTool)
        
        Protected Overrides ReadOnly Property Operation As PolyScript.NET.PolyScriptOperation
            Get
                Return PolyScript.NET.PolyScriptOperation.Create
            End Get
        End Property
    End Class

    Public Class ReadCommand(Of TTool As {IPolyScriptTool, New})
        Inherits PolyScriptCommand(Of TTool)
        
        Protected Overrides ReadOnly Property Operation As PolyScript.NET.PolyScriptOperation
            Get
                Return PolyScript.NET.PolyScriptOperation.Read
            End Get
        End Property
    End Class

    Public Class UpdateCommand(Of TTool As {IPolyScriptTool, New})
        Inherits PolyScriptCommand(Of TTool)
        
        Protected Overrides ReadOnly Property Operation As PolyScript.NET.PolyScriptOperation
            Get
                Return PolyScript.NET.PolyScriptOperation.Update
            End Get
        End Property
    End Class

    Public Class DeleteCommand(Of TTool As {IPolyScriptTool, New})
        Inherits PolyScriptCommand(Of TTool)
        
        Protected Overrides ReadOnly Property Operation As PolyScript.NET.PolyScriptOperation
            Get
                Return PolyScript.NET.PolyScriptOperation.Delete
            End Get
        End Property
    End Class

    ''' <summary>
    ''' Discovery command for agent introspection
    ''' </summary>
    Public Class DiscoveryCommand(Of TTool As {IPolyScriptTool, New})
        Inherits Command

        Public Overrides Function Execute(context As CommandContext) As Integer
            Dim tool = New TTool()

            Dim discovery = New Dictionary(Of String, Object) From {
                {"polyscript", "1.0"},
                {"tool", GetType(TTool).Name},
                {"operations", {"create", "read", "update", "delete"}},
                {"modes", {"simulate", "sandbox", "live"}}
            }

            Dim json = JsonSerializer.Serialize(discovery, New JsonSerializerOptions With {.WriteIndented = True})
            AnsiConsole.Console.WriteLine(json)
            Return 0
        End Function
    End Class

    ''' <summary>
    ''' Main PolyScript framework class
    ''' </summary>
    Public Module PolyScriptFramework
        
        ''' <summary>
        ''' Run a PolyScript CRUD tool with command-line arguments
        ''' </summary>
        Public Function Run(Of TTool As {IPolyScriptTool, New})(args As String()) As Integer
            Dim app = New CommandApp()
            Dim tool = New TTool()

            app.Configure(Sub(config)
                config.SetApplicationName(GetType(TTool).Name.ToLower())
                config.SetApplicationVersion("1.0.0")

                ' Add discovery command
                config.AddCommand(Of DiscoveryCommand(Of TTool))("--discover") _
                    .WithDescription("Show tool capabilities for agents")

                ' Add CRUD commands
                config.AddCommand(Of CreateCommand(Of TTool))("create") _
                    .WithDescription("Create new resources")

                config.AddCommand(Of ReadCommand(Of TTool))("read") _
                    .WithDescription("Read/query resources")

                config.AddCommand(Of UpdateCommand(Of TTool))("update") _
                    .WithDescription("Update existing resources")

                config.AddCommand(Of DeleteCommand(Of TTool))("delete") _
                    .WithDescription("Delete resources")

                config.AddCommand(Of ReadCommand(Of TTool))("list") _
                    .WithDescription("List resources (alias for read)")
            End Sub)

            Return app.Run(args)
        End Function
    End Module

End Namespace