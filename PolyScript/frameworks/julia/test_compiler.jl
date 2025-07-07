#!/usr/bin/env julia

#=
Test compiler for Julia PolyScript framework
Tests CRUD operations across all modes

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
=#

push!(LOAD_PATH, @__DIR__)

using PolyScriptFramework

# Test compiler tool
struct TestCompiler <: PolyScriptTool end

# Implementation overrides
PolyScriptFramework.description(::TestCompiler) = "Test compiler for PolyScript framework"

function PolyScriptFramework.do_create(::TestCompiler, resource, options, ctx)
    filename = something(resource, "test.txt")
    Dict(
        "action" => "compile",
        "file" => filename,
        "status" => "created"
    )
end

function PolyScriptFramework.do_read(::TestCompiler, resource, options, ctx)
    if resource === nothing
        # List files
        Dict(
            "files" => ["main.cpp", "utils.cpp", "test.cpp"],
            "count" => 3
        )
    else
        # Read specific file
        Dict(
            "file" => resource,
            "content" => "// Sample C++ code",
            "lines" => 42
        )
    end
end

function PolyScriptFramework.do_update(::TestCompiler, resource, options, ctx)
    filename = something(resource, "test.txt")
    Dict(
        "action" => "recompile",
        "file" => filename,
        "status" => "updated"
    )
end

function PolyScriptFramework.do_delete(::TestCompiler, resource, options, ctx)
    filename = something(resource, "test.txt")
    Dict(
        "action" => "clean",
        "file" => filename,
        "status" => "deleted"
    )
end

# Run the tool
if abspath(PROGRAM_FILE) == @__FILE__
    exit(PolyScriptFramework.run_tool(TestCompiler()))
end