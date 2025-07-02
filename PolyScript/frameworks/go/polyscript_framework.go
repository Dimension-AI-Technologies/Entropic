/*
 * PolyScript Framework for Go using cobra
 *
 * A true zero-boilerplate framework for creating PolyScript-compliant CLI tools.
 * Developers write ONLY business logic - the framework handles everything else.
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

package polyscript

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"bufio"
	"strings"

	"github.com/spf13/cobra"
)

// PolyScriptMode represents the execution modes
type PolyScriptMode string

const (
	StatusMode  PolyScriptMode = "status"
	TestMode    PolyScriptMode = "test"
	SandboxMode PolyScriptMode = "sandbox"
	LiveMode    PolyScriptMode = "live"
)

// PolyScriptContext provides context and utility methods for tool execution
type PolyScriptContext struct {
	Mode       PolyScriptMode
	Verbose    bool
	Force      bool
	JSONOutput bool
	OutputData map[string]interface{}
	ToolName   string
}

// NewContext creates a new PolyScript context
func NewContext(mode PolyScriptMode, verbose, force, jsonOutput bool, toolName string) *PolyScriptContext {
	return &PolyScriptContext{
		Mode:       mode,
		Verbose:    verbose,
		Force:      force,
		JSONOutput: jsonOutput,
		ToolName:   toolName,
		OutputData: map[string]interface{}{
			"polyscript": "1.0",
			"mode":       string(mode),
			"tool":       toolName,
			"status":     "success",
			"data":       map[string]interface{}{},
		},
	}
}

// Log outputs a message at the specified level
func (ctx *PolyScriptContext) Log(message string, level ...string) {
	logLevel := "info"
	if len(level) > 0 {
		logLevel = level[0]
	}

	if ctx.JSONOutput {
		// Route to JSON data structure
		var key string
		switch logLevel {
		case "error", "critical":
			key = "errors"
		case "warning":
			key = "warnings"
		case "info", "debug":
			if ctx.Verbose {
				key = "messages"
			}
		}

		if key != "" {
			if ctx.OutputData[key] == nil {
				ctx.OutputData[key] = []string{}
			}
			messages := ctx.OutputData[key].([]string)
			ctx.OutputData[key] = append(messages, fmt.Sprintf("%s: %s", strings.ToUpper(logLevel), message))
		}
	} else {
		// Direct console output
		switch logLevel {
		case "error", "critical":
			fmt.Fprintf(os.Stderr, "Error: %s\n", message)
		case "warning":
			fmt.Fprintf(os.Stderr, "Warning: %s\n", message)
		case "info":
			fmt.Println(message)
		case "debug":
			if ctx.Verbose {
				fmt.Println(message)
			}
		}
	}
}

// Output handles data output in appropriate format
func (ctx *PolyScriptContext) Output(data interface{}, isError ...bool) {
	error := false
	if len(isError) > 0 {
		error = isError[0]
	}

	if ctx.JSONOutput {
		switch v := data.(type) {
		case string:
			key := "messages"
			if error {
				key = "errors"
			}
			if ctx.OutputData[key] == nil {
				ctx.OutputData[key] = []string{}
			}
			messages := ctx.OutputData[key].([]string)
			ctx.OutputData[key] = append(messages, v)
		case map[string]interface{}:
			// Merge into data section
			dataSection := ctx.OutputData["data"].(map[string]interface{})
			for k, val := range v {
				dataSection[k] = val
			}
		default:
			// Try to convert to map via JSON
			if jsonBytes, err := json.Marshal(data); err == nil {
				var dataMap map[string]interface{}
				if json.Unmarshal(jsonBytes, &dataMap) == nil {
					dataSection := ctx.OutputData["data"].(map[string]interface{})
					for k, val := range dataMap {
						dataSection[k] = val
					}
				}
			}
		}
	} else {
		if error {
			fmt.Fprintf(os.Stderr, "Error: %v\n", data)
		} else {
			switch v := data.(type) {
			case string:
				fmt.Println(v)
			default:
				if jsonBytes, err := json.MarshalIndent(data, "", "  "); err == nil {
					fmt.Println(string(jsonBytes))
				} else {
					fmt.Printf("%+v\n", data)
				}
			}
		}
	}
}

// Confirm asks for user confirmation
func (ctx *PolyScriptContext) Confirm(message string) bool {
	if ctx.Force {
		return true
	}

	if ctx.JSONOutput {
		ctx.Output(map[string]interface{}{"confirmation_required": message}, true)
		return false
	}

	fmt.Printf("%s [y/N]: ", message)
	reader := bufio.NewReader(os.Stdin)
	response, err := reader.ReadString('\n')
	if err != nil {
		return false
	}

	response = strings.TrimSpace(strings.ToLower(response))
	return response == "y"
}

// FinalizeOutput outputs final JSON if in JSON mode
func (ctx *PolyScriptContext) FinalizeOutput() {
	if ctx.JSONOutput {
		if jsonBytes, err := json.MarshalIndent(ctx.OutputData, "", "  "); err == nil {
			fmt.Println(string(jsonBytes))
		}
	}
}

// PolyScriptTool interface that tools must implement
type PolyScriptTool interface {
	Description() string
	Status(ctx *PolyScriptContext) (interface{}, error)
	Test(ctx *PolyScriptContext) (interface{}, error)
	Sandbox(ctx *PolyScriptContext) (interface{}, error)
	Live(ctx *PolyScriptContext) (interface{}, error)
	AddArguments(cmd *cobra.Command) *cobra.Command
}

// PolyScriptError represents a PolyScript execution error
type PolyScriptError struct {
	Message string
}

func (e *PolyScriptError) Error() string {
	return e.Message
}

// NewError creates a new PolyScript error
func NewError(message string) *PolyScriptError {
	return &PolyScriptError{Message: message}
}

// RunTool executes a PolyScript tool with cobra CLI handling
func RunTool(tool PolyScriptTool) {
	toolName := fmt.Sprintf("%T", tool)
	if strings.Contains(toolName, ".") {
		parts := strings.Split(toolName, ".")
		toolName = parts[len(parts)-1]
	}

	// Create root command
	rootCmd := &cobra.Command{
		Use:   strings.ToLower(toolName),
		Short: tool.Description(),
		Long:  tool.Description(),
		Run: func(cmd *cobra.Command, args []string) {
			// Default to status mode when no subcommand
			executeMode(tool, StatusMode, cmd, args)
		},
	}

	// Add global flags
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Enable verbose output")
	rootCmd.PersistentFlags().BoolP("force", "f", false, "Skip confirmation prompts")
	rootCmd.PersistentFlags().Bool("json", false, "Output in JSON format")

	// Let tool add custom arguments
	rootCmd = tool.AddArguments(rootCmd)

	// Create mode subcommands
	statusCmd := &cobra.Command{
		Use:   "status",
		Short: "Show current state",
		Run: func(cmd *cobra.Command, args []string) {
			executeMode(tool, StatusMode, cmd, args)
		},
	}

	testCmd := &cobra.Command{
		Use:   "test",
		Short: "Simulate operations (dry-run)",
		Run: func(cmd *cobra.Command, args []string) {
			executeMode(tool, TestMode, cmd, args)
		},
	}

	sandboxCmd := &cobra.Command{
		Use:   "sandbox",
		Short: "Test dependencies and environment",
		Run: func(cmd *cobra.Command, args []string) {
			executeMode(tool, SandboxMode, cmd, args)
		},
	}

	liveCmd := &cobra.Command{
		Use:   "live",
		Short: "Execute actual operations",
		Run: func(cmd *cobra.Command, args []string) {
			executeMode(tool, LiveMode, cmd, args)
		},
	}

	// Add tool-specific arguments to each subcommand
	statusCmd = tool.AddArguments(statusCmd)
	testCmd = tool.AddArguments(testCmd)
	sandboxCmd = tool.AddArguments(sandboxCmd)
	liveCmd = tool.AddArguments(liveCmd)

	// Add subcommands to root
	rootCmd.AddCommand(statusCmd, testCmd, sandboxCmd, liveCmd)

	// Execute
	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}

// executeMode executes a specific PolyScript mode
func executeMode(tool PolyScriptTool, mode PolyScriptMode, cmd *cobra.Command, args []string) {
	// Get flags
	verbose, _ := cmd.Flags().GetBool("verbose")
	force, _ := cmd.Flags().GetBool("force")
	jsonOutput, _ := cmd.Flags().GetBool("json")

	// Handle persistent flags
	if cmd.PersistentFlags().Changed("verbose") {
		verbose, _ = cmd.PersistentFlags().GetBool("verbose")
	}
	if cmd.PersistentFlags().Changed("force") {
		force, _ = cmd.PersistentFlags().GetBool("force")
	}
	if cmd.PersistentFlags().Changed("json") {
		jsonOutput, _ = cmd.PersistentFlags().GetBool("json")
	}

	// Create context
	toolName := fmt.Sprintf("%T", tool)
	if strings.Contains(toolName, ".") {
		parts := strings.Split(toolName, ".")
		toolName = parts[len(parts)-1]
	}

	ctx := NewContext(mode, verbose, force, jsonOutput, toolName)
	ctx.Log(fmt.Sprintf("Executing %s mode", mode), "debug")

	// Execute appropriate method
	var result interface{}
	var err error

	switch mode {
	case StatusMode:
		result, err = tool.Status(ctx)
	case TestMode:
		result, err = tool.Test(ctx)
	case SandboxMode:
		result, err = tool.Sandbox(ctx)
	case LiveMode:
		result, err = tool.Live(ctx)
	default:
		err = NewError(fmt.Sprintf("Unknown mode: %s", mode))
	}

	// Handle result
	exitCode := 0
	if err != nil {
		ctx.OutputData["status"] = "error"
		ctx.Output(err.Error(), true)
		if ctx.Verbose {
			ctx.Log(fmt.Sprintf("Error details: %v", err), "error")
		}
		exitCode = 1
	} else if result != nil {
		ctx.Output(result)
	}

	ctx.FinalizeOutput()

	if exitCode != 0 {
		os.Exit(exitCode)
	}
}

// DefaultTool provides a default implementation with empty AddArguments
type DefaultTool struct{}

func (t *DefaultTool) AddArguments(cmd *cobra.Command) *cobra.Command {
	return cmd
}

// Example tool implementation
type ExampleTool struct {
	DefaultTool
}

func (t *ExampleTool) Description() string {
	return "Example PolyScript tool demonstrating the Go framework"
}

func (t *ExampleTool) AddArguments(cmd *cobra.Command) *cobra.Command {
	cmd.Flags().String("target", "default", "Target to operate on")
	cmd.Flags().Int("count", 1, "Number of operations")
	return cmd
}

func (t *ExampleTool) Status(ctx *PolyScriptContext) (interface{}, error) {
	ctx.Log("Checking status...")
	return map[string]interface{}{
		"operational": true,
		"last_check":  "2024-01-02T10:00:00Z",
		"files_ready": 1234,
	}, nil
}

func (t *ExampleTool) Test(ctx *PolyScriptContext) (interface{}, error) {
	ctx.Log("Running test mode...")
	return map[string]interface{}{
		"planned_operations": []map[string]interface{}{
			{"operation": "Operation 1", "status": "would execute"},
			{"operation": "Operation 2", "status": "would execute"},
		},
		"total_operations": 2,
		"note":             "No changes made in test mode",
	}, nil
}

func (t *ExampleTool) Sandbox(ctx *PolyScriptContext) (interface{}, error) {
	ctx.Log("Testing environment...")
	tests := map[string]string{
		"go":         "available",
		"filesystem": "writable",
		"network":    "accessible",
	}

	allPassed := true
	for _, status := range tests {
		if status != "available" && status != "writable" && status != "accessible" {
			allPassed = false
			break
		}
	}

	return map[string]interface{}{
		"dependency_tests": tests,
		"all_passed":       allPassed,
	}, nil
}

func (t *ExampleTool) Live(ctx *PolyScriptContext) (interface{}, error) {
	ctx.Log("Executing live mode...")

	if !ctx.Confirm("Execute operations?") {
		return map[string]interface{}{"status": "cancelled"}, nil
	}

	ctx.Log("Executing operation 1...")
	ctx.Log("Executing operation 2...")

	return map[string]interface{}{
		"executed_operations": []map[string]interface{}{
			{"operation": "Operation 1", "status": "completed"},
			{"operation": "Operation 2", "status": "completed"},
		},
		"total_completed": 2,
	}, nil
}

/*
 * USAGE EXAMPLE:
 *
 * // main.go
 * package main
 *
 * import "path/to/polyscript"
 *
 * func main() {
 *     tool := &ExampleTool{}
 *     polyscript.RunTool(tool)
 * }
 *
 * // go.mod
 * module backup-tool
 * go 1.19
 * require github.com/spf13/cobra v1.7.0
 *
 * // Build and run:
 * go build -o backup-tool main.go
 * ./backup-tool status
 * ./backup-tool test --verbose
 * ./backup-tool sandbox --json
 * ./backup-tool live --force
 */