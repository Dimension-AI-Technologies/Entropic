#!/usr/bin/env elixir

# Test Elixir Compiler Tool for PolyScript Framework
# CRUD × Modes Architecture: Zero-boilerplate CLI development
# 
# Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

Mix.install([
  {:jason, "~> 1.4"}
])

# Add parent directory to path for framework
Code.append_path("../elixir/lib")

defmodule TestCompilerTool do
  @behaviour PolyScript.Framework

  def description(), do: "Test Elixir compiler tool demonstrating CRUD × Modes"

  def create(resource, _options, ctx) do
    PolyScript.Framework.log(ctx, "Compiling #{resource || "source"}...", :info)
    
    {:ok, %{
      "compiled" => resource || "main.ex",
      "output" => String.replace(resource || "main.ex", ".ex", ""),
      "optimized" => true,
      "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601()
    }}
  end

  def read(_resource, _options, ctx) do
    PolyScript.Framework.log(ctx, "Checking compilation status...", :info)
    
    {:ok, %{
      "source_files" => ["lib/app.ex", "lib/utils.ex", "config/config.exs"],
      "compiled_files" => ["_build/app.beam", "_build/utils.beam"],
      "missing" => ["_build/config.beam"],
      "last_build" => DateTime.utc_now() |> DateTime.add(-2, :hour) |> DateTime.to_iso8601()
    }}
  end

  def update(resource, _options, ctx) do
    PolyScript.Framework.log(ctx, "Recompiling #{resource || "source"}...", :info)
    
    {:ok, %{
      "recompiled" => resource || "main.ex",
      "reason" => "source file changed",
      "incremental" => true,
      "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601()
    }}
  end

  def delete(resource, _options, ctx) do
    PolyScript.Framework.log(ctx, "Cleaning #{resource || "build artifacts"}...", :info)
    
    {:ok, %{
      "cleaned" => ["_build/", "deps/", "*.beam"],
      "freed_space" => "18.7 MB",
      "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601()
    }}
  end
end

# Run the tool
PolyScript.Framework.run(System.argv(), TestCompilerTool)