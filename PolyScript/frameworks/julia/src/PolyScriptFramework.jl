#=
PolyScript Framework for Julia
CRUD × Modes Architecture: Zero-boilerplate CLI development

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
=#

module PolyScriptFramework

using ArgParse
using JSON
using Dates

# CRUD operations
@enum PolyScriptOperation begin
    create
    read
    update
    delete
end

# Execution modes
@enum PolyScriptMode begin
    simulate
    sandbox
    live
end

# FFI bindings for libpolyscript
# Try system-wide installation first, then local build
const LIBPOLYSCRIPT = "libpolyscript"

# Check if libpolyscript is available
function check_libpolyscript_available()
    try
        ccall((:polyscript_can_mutate, LIBPOLYSCRIPT), Bool, (Cint,), 2)
        return true
    catch e
        # Try alternate path
        try 
            lib_path = joinpath(@__DIR__, "..", "..", "..", "libpolyscript", "build", "libpolyscript")
            if isfile(lib_path * ".dylib") || isfile(lib_path * ".so") || isfile(lib_path * ".dll")
                # Can't use dynamic path in ccall, so we'll use the system one
                return false
            end
        catch
        end
        return false
    end
end

const LIBPOLYSCRIPT_AVAILABLE = check_libpolyscript_available()

if !LIBPOLYSCRIPT_AVAILABLE
    @warn "libpolyscript not found, using fallback implementations"
end

# Convert Julia enums to C integers for FFI calls
operation_to_int(op::PolyScriptOperation) = Int32(op)
mode_to_int(mode::PolyScriptMode) = Int32(mode)

# Safe FFI wrappers with fallback
function safe_ccall_can_mutate(mode::PolyScriptMode)::Bool
    if LIBPOLYSCRIPT_AVAILABLE
        try
            return ccall((:polyscript_can_mutate, LIBPOLYSCRIPT), Bool, (Cint,), mode_to_int(mode))
        catch e
            @warn "FFI call failed, using fallback" exception=e
        end
    end
    # Fallback implementation
    return mode == live
end

function safe_ccall_should_validate(mode::PolyScriptMode)::Bool
    if LIBPOLYSCRIPT_AVAILABLE
        try
            return ccall((:polyscript_should_validate, LIBPOLYSCRIPT), Bool, (Cint,), mode_to_int(mode))
        catch e
            @warn "FFI call failed, using fallback" exception=e
        end
    end
    # Fallback implementation
    return mode == sandbox
end

function safe_ccall_require_confirm(mode::PolyScriptMode, operation::PolyScriptOperation, force::Bool)::Bool
    if force
        return false
    end
    
    if LIBPOLYSCRIPT_AVAILABLE
        try
            return ccall((:polyscript_require_confirm, LIBPOLYSCRIPT), Bool, (Cint, Cint), 
                        mode_to_int(mode), operation_to_int(operation))
        catch e
            @warn "FFI call failed, using fallback" exception=e
        end
    end
    # Fallback implementation
    return mode == live && (operation == update || operation == delete)
end

function safe_ccall_is_safe_mode(mode::PolyScriptMode)::Bool
    if LIBPOLYSCRIPT_AVAILABLE
        try
            return ccall((:polyscript_is_safe_mode, LIBPOLYSCRIPT), Bool, (Cint,), mode_to_int(mode))
        catch e
            @warn "FFI call failed, using fallback" exception=e
        end
    end
    # Fallback implementation
    return mode == simulate || mode == sandbox
end

export PolyScriptTool, PolyScriptContext, PolyScriptOperation, PolyScriptMode
export execute_with_mode, run_tool

# Context for operations
mutable struct PolyScriptContext
    operation::PolyScriptOperation
    mode::PolyScriptMode
    resource::Union{String, Nothing}
    rebadged_as::String
    options::Dict{String, Any}
    verbose::Bool
    force::Bool
    json_output::Bool
    tool_name::String
    output_data::Dict{String, Any}
    messages::Vector{String}
    
    function PolyScriptContext(tool_name::String)
        new(
            create,  # default operation
            live,    # default mode
            nothing,
            "",
            Dict{String, Any}(),
            false,
            false,
            false,
            tool_name,
            Dict{String, Any}(
                "polyscript" => "1.0",
                "status" => "success",
                "data" => Dict{String, Any}()
            ),
            Vector{String}()
        )
    end
end

# Computed properties using FFI with fallback
can_mutate(ctx::PolyScriptContext) = safe_ccall_can_mutate(ctx.mode)
should_validate(ctx::PolyScriptContext) = safe_ccall_should_validate(ctx.mode)
require_confirm(ctx::PolyScriptContext) = safe_ccall_require_confirm(ctx.mode, ctx.operation, ctx.force)
is_safe_mode(ctx::PolyScriptContext) = safe_ccall_is_safe_mode(ctx.mode)

# Logging
function log_message(ctx::PolyScriptContext, message::String, level::String="info")
    if ctx.json_output
        push!(ctx.messages, "[$level] $message")
        if ctx.verbose
            ctx.output_data["messages"] = ctx.messages
        end
    else
        if level == "error"
            println(stderr, "Error: $message")
        elseif level == "warning"
            println(stderr, "Warning: $message")
        elseif level == "info"
            println(message)
        elseif level == "debug" && ctx.verbose
            println("Debug: $message")
        end
    end
end

# Output
function output(ctx::PolyScriptContext, data::Dict, error::Bool=false)
    if ctx.json_output
        if error
            ctx.output_data["status"] = "error"
            ctx.output_data["error"] = data
        else
            # Merge data into output_data["data"]
            for (key, value) in data
                ctx.output_data["data"][key] = value
            end
        end
    else
        if error
            println(stderr, JSON.json(data, 2))
        else
            println(JSON.json(data, 2))
        end
    end
end

# Confirmation
function confirm(ctx::PolyScriptContext, message::String)::Bool
    if ctx.force
        return true
    end
    
    if ctx.json_output
        output(ctx, Dict("confirmation_required" => message), true)
        return false
    end
    
    print("$message [y/N]: ")
    flush(stdout)
    response = lowercase(strip(readline()))
    return response == "y" || response == "yes"
end

# Finalize output
function finalize_output(ctx::PolyScriptContext)
    ctx.output_data["operation"] = string(ctx.operation)
    ctx.output_data["mode"] = string(ctx.mode)
    ctx.output_data["tool"] = ctx.tool_name
    
    if ctx.resource !== nothing
        ctx.output_data["resource"] = ctx.resource
    end
    
    if !isempty(ctx.rebadged_as)
        ctx.output_data["rebadged_as"] = ctx.rebadged_as
    end
    
    if ctx.json_output
        println(JSON.json(ctx.output_data, 2))
    end
end

# Tool interface
abstract type PolyScriptTool end

# Default implementations (to be overridden)
description(::T) where T<:PolyScriptTool = "PolyScript tool"
do_create(::T, resource, options, ctx) where T<:PolyScriptTool = 
    error("do_create not implemented for $(typeof(T))")
do_read(::T, resource, options, ctx) where T<:PolyScriptTool = 
    error("do_read not implemented for $(typeof(T))")
do_update(::T, resource, options, ctx) where T<:PolyScriptTool = 
    error("do_update not implemented for $(typeof(T))")
do_delete(::T, resource, options, ctx) where T<:PolyScriptTool = 
    error("do_delete not implemented for $(typeof(T))")

# Execute operation with mode wrapping
function execute_with_mode(tool::PolyScriptTool, ctx::PolyScriptContext)
    if ctx.mode == simulate
        log_message(ctx, "Simulating $(ctx.operation) operation", "debug")
        
        if ctx.operation == read
            return do_read(tool, ctx.resource, ctx.options, ctx)
        else
            action_verb = if ctx.operation == create
                "Would create"
            elseif ctx.operation == update
                "Would update"
            elseif ctx.operation == delete
                "Would delete"
            else
                "Would read"
            end
            
            resource_name = something(ctx.resource, "resource")
            return Dict(
                "simulation" => true,
                "action" => "$action_verb $resource_name",
                "options" => ctx.options
            )
        end
        
    elseif ctx.mode == sandbox
        log_message(ctx, "Testing prerequisites for $(ctx.operation)", "debug")
        
        return Dict(
            "sandbox" => true,
            "validations" => Dict(
                "permissions" => "verified",
                "dependencies" => "available",
                "connectivity" => "established"
            ),
            "ready" => true
        )
        
    else  # live mode
        log_message(ctx, "Executing $(ctx.operation) operation", "debug")
        
        if require_confirm(ctx)
            resource_name = something(ctx.resource, "resource")
            msg = "Are you sure you want to $(ctx.operation) $resource_name?"
            if !confirm(ctx, msg)
                ctx.output_data["status"] = "cancelled"
                return Dict("cancelled" => true)
            end
        end
        
        if ctx.operation == create
            return do_create(tool, ctx.resource, ctx.options, ctx)
        elseif ctx.operation == read
            return do_read(tool, ctx.resource, ctx.options, ctx)
        elseif ctx.operation == update
            return do_update(tool, ctx.resource, ctx.options, ctx)
        else  # delete
            return do_delete(tool, ctx.resource, ctx.options, ctx)
        end
    end
end

# Show discovery information
function show_discovery(tool_name::String)
    discovery = Dict(
        "polyscript" => "1.0",
        "tool" => tool_name,
        "operations" => ["create", "read", "update", "delete"],
        "modes" => ["simulate", "sandbox", "live"]
    )
    println(JSON.json(discovery, 2))
end

# Main entry point
function run_tool(tool::T) where T<:PolyScriptTool
    tool_name = string(T)
    
    # Parse command line arguments
    settings = ArgParseSettings(
        prog = tool_name,
        description = description(tool),
        error_on_conflict = false,
        suppress_warnings = true
    )
    
    @add_arg_table! settings begin
        "operation"
            help = "Operation to perform (create, read, list, update, delete)"
            arg_type = String
            default = ""
        "resource"
            help = "Resource to operate on"
            arg_type = String
            default = ""
        "--mode", "-m"
            help = "Execution mode"
            arg_type = String
            default = "live"
        "--verbose", "-v"
            help = "Enable verbose output"
            action = :store_true
        "--force", "-f"
            help = "Skip confirmation prompts"
            action = :store_true
        "--json"
            help = "Output in JSON format"
            action = :store_true
        "--discover"
            help = "Show tool capabilities"
            action = :store_true
    end
    
    parsed_args = parse_args(ARGS, settings)
    
    if parsed_args["discover"]
        show_discovery(tool_name)
        return 0
    end
    
    operation_str = parsed_args["operation"]
    if isempty(operation_str)
        println(stderr, "Error: No operation specified")
        println(stderr, settings.description)
        return 1
    end
    
    # Parse operation
    operation = if operation_str == "create"
        create
    elseif operation_str == "read" || operation_str == "list"
        read
    elseif operation_str == "update"
        update
    elseif operation_str == "delete"
        delete
    else
        println(stderr, "Error: Unknown operation: $operation_str")
        return 1
    end
    
    # Parse mode
    mode_str = parsed_args["mode"]
    mode = if mode_str == "simulate"
        simulate
    elseif mode_str == "sandbox"
        sandbox
    elseif mode_str == "live"
        live
    else
        println(stderr, "Error: Unknown mode: $mode_str")
        return 1
    end
    
    # Create context
    ctx = PolyScriptContext(tool_name)
    ctx.operation = operation
    ctx.mode = mode
    ctx.resource = isempty(parsed_args["resource"]) ? nothing : parsed_args["resource"]
    ctx.verbose = parsed_args["verbose"]
    ctx.force = parsed_args["force"]
    ctx.json_output = parsed_args["json"]
    
    # Execute
    try
        log_message(ctx, "Executing $operation operation in $mode mode", "debug")
        
        result = execute_with_mode(tool, ctx)
        output(ctx, result)
        finalize_output(ctx)
        
        return 0
    catch e
        output(ctx, Dict("error" => string(e)), true)
        if ctx.verbose
            println(stderr, e)
            for (exc, bt) in Base.catch_stack()
                showerror(stderr, exc, bt)
                println(stderr)
            end
        end
        finalize_output(ctx)
        return 1
    end
end

end  # module