defmodule PolyScript.Framework.MixProject do
  use Mix.Project

  def project do
    [
      app: :polyscript_framework,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      compilers: [:elixir_make] ++ Mix.compilers(),
      make_targets: ["all"],
      make_clean: ["clean"]
    ]
  end

  def application do
    [
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:jason, "~> 1.4"},
      {:elixir_make, "~> 0.7", runtime: false}
    ]
  end
end