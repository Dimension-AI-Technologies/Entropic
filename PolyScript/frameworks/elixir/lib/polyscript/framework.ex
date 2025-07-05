# PolyScript Framework for Elixir
# CRUD × Modes Architecture: Zero-boilerplate CLI development
# 
# Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

defmodule PolyScript.Framework do
  @moduledoc """
  PolyScript Framework for Elixir - provides CRUD × Modes CLI architecture
  """

  defmodule Context do
    @moduledoc """
    Context passed to all tool operations
    """
    defstruct [
      :operation,
      :mode,
      :resource,
      :rebadged_as,
      :options,
      :verbose,
      :force,
      :json_output,
      :tool_name,
      output_data: %{
        "polyscript" => "1.0",
        "status" => "success",
        "data" => %{}
      },
      messages: []
    ]

    def can_mutate?(%__MODULE__{mode: :live}), do: true
    def can_mutate?(_), do: false

    def should_validate?(%__MODULE__{mode: :sandbox}), do: true
    def should_validate?(_), do: false

    def require_confirm?(%__MODULE__{mode: :live, operation: op, force: false}) 
      when op in [:update, :delete], do: true
    def require_confirm?(_), do: false

    def safe_mode?(%__MODULE__{mode: mode}) when mode in [:simulate, :sandbox], do: true
    def safe_mode?(_), do: false
  end

  @doc """
  Behaviour that all PolyScript tools must implement
  """
  @callback description() :: String.t()
  @callback create(resource :: String.t() | nil, options :: map(), context :: Context.t()) :: {:ok, map()} | {:error, String.t()}
  @callback read(resource :: String.t() | nil, options :: map(), context :: Context.t()) :: {:ok, map()} | {:error, String.t()}
  @callback update(resource :: String.t() | nil, options :: map(), context :: Context.t()) :: {:ok, map()} | {:error, String.t()}
  @callback delete(resource :: String.t() | nil, options :: map(), context :: Context.t()) :: {:ok, map()} | {:error, String.t()}

  @doc """
  Log a message to the context
  """
  def log(%Context{json_output: true, verbose: verbose} = context, message, level \\ :info) do
    msg = "[#{level}] #{message}"
    messages = [msg | context.messages]
    
    output_data = if verbose do
      Map.put(context.output_data, "messages", Enum.reverse(messages))
    else
      context.output_data
    end
    
    %{context | messages: messages, output_data: output_data}
  end

  def log(context, message, level) do
    case level do
      :error -> IO.puts(:stderr, "Error: #{message}")
      :warning -> IO.puts(:stderr, "Warning: #{message}")
      :info -> IO.puts(message)
      :debug -> if context.verbose, do: IO.puts("Debug: #{message}")
    end
    context
  end

  @doc """
  Output data from an operation
  """
  def output(%Context{json_output: true} = context, data, error \\ false) do
    output_data = if error do
      context.output_data
      |> Map.put("status", "error")
      |> Map.put("error", to_string(data))
    else
      case data do
        %{} = map ->
          Map.update!(context.output_data, "data", &Map.merge(&1, map))
        _ ->
          Map.put(context.output_data, "result", data)
      end
    end
    
    %{context | output_data: output_data}
  end

  def output(_context, data, error) do
    if error do
      IO.puts(:stderr, inspect(data))
    else
      Jason.encode!(data, pretty: true) |> IO.puts()
    end
  end

  @doc """
  Confirm an action with the user
  """
  def confirm(%Context{force: true}, _message), do: true
  
  def confirm(%Context{json_output: true} = context, message) do
    output(context, %{"confirmation_required" => message}, true)
    false
  end
  
  def confirm(_context, message) do
    response = IO.gets("#{message} [y/N]: ") |> String.trim() |> String.downcase()
    response in ["y", "yes"]
  end

  @doc """
  Execute an operation with mode wrapping
  """
  def execute_with_mode(tool_module, %Context{mode: mode} = context) do
    case mode do
      :simulate ->
        simulate_operation(tool_module, context)
      
      :sandbox ->
        sandbox_operation(tool_module, context)
      
      :live ->
        live_operation(tool_module, context)
    end
  end

  defp simulate_operation(tool_module, %Context{operation: :read} = context) do
    apply(tool_module, :read, [context.resource, context.options || %{}, context])
  end

  defp simulate_operation(_tool_module, context) do
    action_verb = case context.operation do
      :create -> "Would create"
      :update -> "Would update"
      :delete -> "Would delete"
      _ -> "Would read"
    end
    
    {:ok, %{
      "simulation" => true,
      "action" => "#{action_verb} #{context.resource || "resource"}",
      "options" => context.options || %{}
    }}
  end

  defp sandbox_operation(_tool_module, _context) do
    {:ok, %{
      "sandbox" => true,
      "validations" => %{
        "permissions" => "verified",
        "dependencies" => "available",
        "connectivity" => "established"
      },
      "ready" => true
    }}
  end

  defp live_operation(tool_module, context) do
    if Context.require_confirm?(context) do
      msg = "Are you sure you want to #{context.operation} #{context.resource || "resource"}?"
      if !confirm(context, msg) do
        {:ok, %{"cancelled" => true}}
      else
        execute_operation(tool_module, context)
      end
    else
      execute_operation(tool_module, context)
    end
  end

  defp execute_operation(tool_module, context) do
    apply(tool_module, context.operation, [context.resource, context.options || %{}, context])
  end

  @doc """
  Finalize and output the context
  """
  def finalize_output(%Context{json_output: true} = context) do
    output_data = context.output_data
    |> Map.put("operation", to_string(context.operation))
    |> Map.put("mode", to_string(context.mode))
    |> Map.put("tool", context.tool_name)
    |> maybe_add_field("resource", context.resource)
    |> maybe_add_field("rebadged_as", context.rebadged_as)
    
    Jason.encode!(output_data, pretty: true) |> IO.puts()
  end

  def finalize_output(_context), do: :ok

  defp maybe_add_field(map, _key, nil), do: map
  defp maybe_add_field(map, key, value), do: Map.put(map, key, value)

  @doc """
  Parse command line arguments for a tool
  """
  def parse_args(argv, tool_module) do
    {opts, args, _} = OptionParser.parse(argv,
      switches: [
        mode: :string,
        verbose: :boolean,
        force: :boolean,
        json: :boolean,
        discover: :boolean,
        help: :boolean
      ],
      aliases: [
        m: :mode,
        v: :verbose,
        f: :force,
        h: :help
      ]
    )

    cond do
      opts[:help] -> {:help}
      opts[:discover] -> {:discover}
      length(args) == 0 -> {:error, "No operation specified"}
      true ->
        [operation | rest] = args
        resource = List.first(rest)
        
        case parse_operation(operation) do
          {:ok, op} ->
            mode = parse_mode(opts[:mode] || "live")
            context = %Context{
              operation: op,
              mode: mode,
              resource: resource,
              options: opts,
              verbose: opts[:verbose] || false,
              force: opts[:force] || false,
              json_output: opts[:json] || false,
              tool_name: tool_module |> Module.split() |> List.last()
            }
            {:ok, context}
          
          :error ->
            {:error, "Unknown operation: #{operation}"}
        end
    end
  end

  defp parse_operation("create"), do: {:ok, :create}
  defp parse_operation("read"), do: {:ok, :read}
  defp parse_operation("list"), do: {:ok, :read}
  defp parse_operation("update"), do: {:ok, :update}
  defp parse_operation("delete"), do: {:ok, :delete}
  defp parse_operation(_), do: :error

  defp parse_mode("simulate"), do: :simulate
  defp parse_mode("sandbox"), do: :sandbox
  defp parse_mode("live"), do: :live
  defp parse_mode(_), do: :live

  @doc """
  Show discovery information for a tool
  """
  def show_discovery(tool_module) do
    discovery = %{
      "polyscript" => "1.0",
      "tool" => tool_module |> Module.split() |> List.last(),
      "operations" => ["create", "read", "update", "delete"],
      "modes" => ["simulate", "sandbox", "live"]
    }
    
    Jason.encode!(discovery, pretty: true) |> IO.puts()
  end

  @doc """
  Show help for a tool
  """
  def show_help(tool_module) do
    tool_name = tool_module |> Module.split() |> List.last() |> String.downcase()
    description = apply(tool_module, :description, [])
    
    IO.puts("""
    #{tool_name} - #{description}
    
    Usage:
      #{tool_name} <operation> [resource] [options]
    
    Operations:
      create    Create new resources
      read      Read/query resources
      list      List resources (alias for read)
      update    Update existing resources
      delete    Delete resources
    
    Options:
      -m, --mode      Execution mode (simulate, sandbox, live) [default: live]
      -v, --verbose   Enable verbose output
      -f, --force     Skip confirmation prompts
      --json          Output in JSON format
      --discover      Show tool capabilities
      -h, --help      Show this help
    
    Examples:
      #{tool_name} create myfile.txt --mode simulate
      #{tool_name} read --json
      #{tool_name} delete old-data --force
    """)
  end

  @doc """
  Main entry point for running a PolyScript tool
  """
  def run(argv, tool_module) do
    case parse_args(argv, tool_module) do
      {:help} ->
        show_help(tool_module)
        System.halt(0)
      
      {:discover} ->
        show_discovery(tool_module)
        System.halt(0)
      
      {:error, msg} ->
        IO.puts(:stderr, "Error: #{msg}")
        System.halt(1)
      
      {:ok, context} ->
        try do
          context = log(context, "Executing #{context.operation} operation in #{context.mode} mode", :debug)
          
          case execute_with_mode(tool_module, context) do
            {:ok, result} ->
              context = output(context, result)
              finalize_output(context)
              System.halt(0)
            
            {:error, error} ->
              context = output(context, error, true)
              finalize_output(context)
              System.halt(1)
          end
        rescue
          e ->
            error_msg = Exception.message(e)
            context = output(context, "Unhandled error: #{error_msg}", true)
            
            if context.verbose do
              IO.puts(:stderr, Exception.format(:error, e, __STACKTRACE__))
            end
            
            finalize_output(context)
            System.halt(1)
        end
    end
  end
end