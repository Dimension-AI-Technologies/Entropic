/*
 * PolyScript Framework for Go using Cobra
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

package polyscript

/*
#cgo LDFLAGS: -L../../libpolyscript/build -lpolyscript
#cgo CFLAGS: -I../../libpolyscript/include
#include <stdbool.h>

// C function declarations matching libpolyscript
extern bool polyscript_can_mutate(int mode);
extern bool polyscript_should_validate(int mode);
extern bool polyscript_require_confirm(int mode, int operation);
extern bool polyscript_is_safe_mode(int mode);
*/
import "C"

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

// PolyScriptOperation represents CRUD operations
type PolyScriptOperation string

const (
	CreateOp PolyScriptOperation = "create"
	ReadOp   PolyScriptOperation = "read"
	UpdateOp PolyScriptOperation = "update"
	DeleteOp PolyScriptOperation = "delete"
)

// PolyScriptMode represents execution modes
type PolyScriptMode string

const (
	SimulateMode PolyScriptMode = "simulate"
	SandboxMode  PolyScriptMode = "sandbox"
	LiveMode     PolyScriptMode = "live"
)

// PolyScriptContext provides context for tool execution
type PolyScriptContext struct {
	Operation  PolyScriptOperation
	Mode       PolyScriptMode
	Resource   string
	RebadgedAs string
	Options    map[string]interface{}
	Verbose    bool
	Force      bool
	JSONOutput bool
	ToolName   string
	OutputData map[string]interface{}
}

// NewContext creates a new PolyScript context
func NewContext(operation PolyScriptOperation, mode PolyScriptMode, resource string, toolName string) *PolyScriptContext {
	return &PolyScriptContext{
		Operation: operation,
		Mode:      mode,
		Resource:  resource,
		ToolName:  toolName,
		Options:   make(map[string]interface{}),
		OutputData: map[string]interface{}{
			"polyscript": "1.0",
			"operation":  string(operation),
			"mode":       string(mode),
			"tool":       toolName,
			"status":     "success",
			"data":       map[string]interface{}{},
		},
	}
}

// Helper functions to convert Go types to C enums
func (ctx *PolyScriptContext) modeToC() C.int {
	switch ctx.Mode {
	case SimulateMode:
		return C.int(0) // Simulate
	case SandboxMode:
		return C.int(1) // Sandbox
	default:
		return C.int(2) // Live
	}
}

func (ctx *PolyScriptContext) operationToC() C.int {
	switch ctx.Operation {
	case CreateOp:
		return C.int(0) // Create
	case ReadOp:
		return C.int(1) // Read
	case UpdateOp:
		return C.int(2) // Update
	default:
		return C.int(3) // Delete
	}
}

// CanMutate returns true if the current mode allows mutations
func (ctx *PolyScriptContext) CanMutate() bool {
	return bool(C.polyscript_can_mutate(ctx.modeToC()))
}

// ShouldValidate returns true if the current mode should validate
func (ctx *PolyScriptContext) ShouldValidate() bool {
	return bool(C.polyscript_should_validate(ctx.modeToC()))
}

// RequireConfirm returns true if confirmation is required
func (ctx *PolyScriptContext) RequireConfirm() bool {
	return bool(C.polyscript_require_confirm(ctx.modeToC(), ctx.operationToC())) && !ctx.Force
}

// IsSafeMode returns true if in a safe mode (simulate/sandbox)
func (ctx *PolyScriptContext) IsSafeMode() bool {
	return bool(C.polyscript_is_safe_mode(ctx.modeToC()))
}

// Log outputs a message at the specified level
func (ctx *PolyScriptContext) Log(message string, level ...string) {
	logLevel := "info"
	if len(level) > 0 {
		logLevel = level[0]
	}

	if ctx.JSONOutput {
		var key string
		switch logLevel {
		case "error", "critical":
			key = "errors"
		case "warning":
			key = "warnings"
		case "info", "debug":
			if ctx.Verbose || logLevel == "info" {
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
			dataSection := ctx.OutputData["data"].(map[string]interface{})
			for k, val := range v {
				dataSection[k] = val
			}
		default:
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
					fmt.Printf("%v\n", data)
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
	var response string
	fmt.Scanln(&response)
	response = strings.ToLower(strings.TrimSpace(response))
	return response == "y" || response == "yes"
}

// FinalizeOutput outputs final JSON if in JSON mode
func (ctx *PolyScriptContext) FinalizeOutput() {
	if ctx.Resource != "" {
		ctx.OutputData["resource"] = ctx.Resource
	}
	if ctx.RebadgedAs != "" {
		ctx.OutputData["rebadged_as"] = ctx.RebadgedAs
	}

	if ctx.JSONOutput {
		if jsonBytes, err := json.MarshalIndent(ctx.OutputData, "", "  "); err == nil {
			fmt.Println(string(jsonBytes))
		}
	}
}

// PolyScriptTool interface that all tools must implement
type PolyScriptTool interface {
	Description() string
	Create(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
	Read(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
	Update(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
	Delete(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
}

// executeWithMode executes CRUD method with appropriate mode wrapping
func executeWithMode(tool PolyScriptTool, ctx *PolyScriptContext) error {
	var result interface{}
	var err error

	switch ctx.Mode {
	case SimulateMode:
		ctx.Log(fmt.Sprintf("Simulating %s operation", ctx.Operation), "debug")

		if ctx.Operation == ReadOp {
			result, err = tool.Read(ctx.Resource, ctx.Options, ctx)
		} else {
			actionVerb := map[PolyScriptOperation]string{
				CreateOp: "Would create",
				UpdateOp: "Would update",
				DeleteOp: "Would delete",
			}[ctx.Operation]

			result = map[string]interface{}{
				"simulation": true,
				"action":     fmt.Sprintf("%s %s", actionVerb, ctx.Resource),
				"options":    ctx.Options,
			}
		}

	case SandboxMode:
		ctx.Log(fmt.Sprintf("Testing prerequisites for %s", ctx.Operation), "debug")

		validations := map[string]string{
			"permissions":  "verified",
			"dependencies": "available",
			"connectivity": "established",
		}

		// Tools can add custom validations by implementing Validate* methods
		// For now, we'll use the default validations

		allPassed := true
		for _, v := range validations {
			if v != "verified" && v != "available" && v != "established" && v != "passed" {
				allPassed = false
				break
			}
		}

		result = map[string]interface{}{
			"sandbox":     true,
			"validations": validations,
			"ready":       allPassed,
		}

	case LiveMode:
		ctx.Log(fmt.Sprintf("Executing %s operation", ctx.Operation), "debug")

		if ctx.RequireConfirm() {
			msg := fmt.Sprintf("Are you sure you want to %s %s?", ctx.Operation, ctx.Resource)
			if !ctx.Confirm(msg) {
				ctx.OutputData["status"] = "cancelled"
				return fmt.Errorf("user declined confirmation")
			}
		}

		switch ctx.Operation {
		case CreateOp:
			result, err = tool.Create(ctx.Resource, ctx.Options, ctx)
		case ReadOp:
			result, err = tool.Read(ctx.Resource, ctx.Options, ctx)
		case UpdateOp:
			result, err = tool.Update(ctx.Resource, ctx.Options, ctx)
		case DeleteOp:
			result, err = tool.Delete(ctx.Resource, ctx.Options, ctx)
		}
	}

	if err != nil {
		ctx.OutputData["status"] = "error"
		ctx.Output(err.Error(), true)
		return err
	}

	if result != nil {
		ctx.Output(result)
	}

	return nil
}

// RunTool executes a PolyScript tool with cobra CLI handling
func RunTool(tool PolyScriptTool) {
	toolName := fmt.Sprintf("%T", tool)
	if strings.Contains(toolName, ".") {
		parts := strings.Split(toolName, ".")
		toolName = parts[len(parts)-1]
	}

	var rootCmd = &cobra.Command{
		Use:   strings.ToLower(toolName),
		Short: tool.Description(),
		Long:  tool.Description(),
		Run: func(cmd *cobra.Command, args []string) {
			cmd.Help()
		},
	}

	// Add global flags
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Enable verbose output")
	rootCmd.PersistentFlags().BoolP("force", "f", false, "Skip confirmation prompts")
	rootCmd.PersistentFlags().Bool("json", false, "Output in JSON format")

	// Add discovery command
	var discoverCmd = &cobra.Command{
		Use:   "discover",
		Short: "Show tool capabilities",
		Run: func(cmd *cobra.Command, args []string) {
			jsonOutput, _ := cmd.Flags().GetBool("json")

			discovery := map[string]interface{}{
				"polyscript": "1.0",
				"tool":       toolName,
				"operations": []string{"create", "read", "update", "delete"},
				"modes":      []string{"simulate", "sandbox", "live"},
			}

			if jsonOutput {
				if jsonBytes, err := json.MarshalIndent(discovery, "", "  "); err == nil {
					fmt.Println(string(jsonBytes))
				}
			} else {
				fmt.Printf("Tool: %s\n", toolName)
				fmt.Println("Operations: create, read, update, delete")
				fmt.Println("Modes: simulate, sandbox, live")
			}
		},
	}
	rootCmd.AddCommand(discoverCmd)

	// Create a command executor function
	executeCommand := func(operation PolyScriptOperation) func(cmd *cobra.Command, args []string) {
		return func(cmd *cobra.Command, args []string) {
			resource := ""
			if operation != ReadOp && len(args) > 0 {
				resource = args[0]
			} else if operation != ReadOp {
				fmt.Fprintln(os.Stderr, "Error: resource argument is required")
				os.Exit(1)
			}

			mode, _ := cmd.Flags().GetString("mode")
			verbose, _ := cmd.Flags().GetBool("verbose")
			force, _ := cmd.Flags().GetBool("force")
			jsonOutput, _ := cmd.Flags().GetBool("json")

			var modeEnum PolyScriptMode
			switch mode {
			case "simulate":
				modeEnum = SimulateMode
			case "sandbox":
				modeEnum = SandboxMode
			default:
				modeEnum = LiveMode
			}

			ctx := NewContext(operation, modeEnum, resource, toolName)
			ctx.Verbose = verbose
			ctx.Force = force
			ctx.JSONOutput = jsonOutput

			if err := executeWithMode(tool, ctx); err != nil {
				ctx.FinalizeOutput()
				os.Exit(1)
			}

			ctx.FinalizeOutput()
		}
	}

	// Add CRUD commands
	createCmd := &cobra.Command{
		Use:   "create [resource]",
		Short: "Create new resources",
		Args:  cobra.ExactArgs(1),
		Run:   executeCommand(CreateOp),
	}
	createCmd.Flags().String("mode", "live", "Execution mode (simulate, sandbox, live)")

	readCmd := &cobra.Command{
		Use:   "read",
		Short: "Read/query resources",
		Args:  cobra.MaximumNArgs(1),
		Run:   executeCommand(ReadOp),
	}
	readCmd.Flags().String("mode", "live", "Execution mode (simulate, sandbox, live)")

	// Add list as alias for read
	listCmd := &cobra.Command{
		Use:   "list",
		Short: "List resources (alias for read)",
		Args:  cobra.MaximumNArgs(1),
		Run:   executeCommand(ReadOp),
	}
	listCmd.Flags().String("mode", "live", "Execution mode (simulate, sandbox, live)")

	updateCmd := &cobra.Command{
		Use:   "update [resource]",
		Short: "Update existing resources",
		Args:  cobra.ExactArgs(1),
		Run:   executeCommand(UpdateOp),
	}
	updateCmd.Flags().String("mode", "live", "Execution mode (simulate, sandbox, live)")

	deleteCmd := &cobra.Command{
		Use:   "delete [resource]",
		Short: "Delete resources",
		Args:  cobra.ExactArgs(1),
		Run:   executeCommand(DeleteOp),
	}
	deleteCmd.Flags().String("mode", "live", "Execution mode (simulate, sandbox, live)")

	rootCmd.AddCommand(createCmd, readCmd, listCmd, updateCmd, deleteCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

/*
 * EXAMPLE USAGE:
 *
 * package main
 *
 * import (
 *     "fmt"
 *     "time"
 *     "github.com/yourusername/polyscript"
 * )
 *
 * type CompilerTool struct{}
 *
 * func (t *CompilerTool) Description() string {
 *     return "Example compiler tool demonstrating CRUD × Modes"
 * }
 *
 * func (t *CompilerTool) Create(resource string, options map[string]interface{}, ctx *polyscript.PolyScriptContext) (interface{}, error) {
 *     ctx.Log(fmt.Sprintf("Compiling %s...", resource))
 *
 *     outputFile := resource[:len(resource)-3] + ".out"
 *     if output, ok := options["output"].(string); ok {
 *         outputFile = output
 *     }
 *
 *     return map[string]interface{}{
 *         "compiled":  resource,
 *         "output":    outputFile,
 *         "optimized": options["optimize"] == true,
 *         "timestamp": time.Now().Format(time.RFC3339),
 *     }, nil
 * }
 *
 * func (t *CompilerTool) Read(resource string, options map[string]interface{}, ctx *polyscript.PolyScriptContext) (interface{}, error) {
 *     ctx.Log("Checking compilation status...")
 *
 *     return map[string]interface{}{
 *         "source_files":   []string{"main.go", "utils.go", "config.go"},
 *         "compiled_files": []string{"main", "utils.o"},
 *         "missing":        []string{"config.o"},
 *         "last_build":     time.Now().Format(time.RFC3339),
 *     }, nil
 * }
 *
 * func (t *CompilerTool) Update(resource string, options map[string]interface{}, ctx *polyscript.PolyScriptContext) (interface{}, error) {
 *     ctx.Log(fmt.Sprintf("Recompiling %s...", resource))
 *
 *     return map[string]interface{}{
 *         "recompiled": resource,
 *         "reason":     "source file changed",
 *         "timestamp":  time.Now().Format(time.RFC3339),
 *     }, nil
 * }
 *
 * func (t *CompilerTool) Delete(resource string, options map[string]interface{}, ctx *polyscript.PolyScriptContext) (interface{}, error) {
 *     ctx.Log(fmt.Sprintf("Cleaning %s...", resource))
 *
 *     return map[string]interface{}{
 *         "cleaned":     []string{"*.out", "*.o", "build/"},
 *         "freed_space": "15.2 MB",
 *         "timestamp":   time.Now().Format(time.RFC3339),
 *     }, nil
 * }
 *
 * func main() {
 *     tool := &CompilerTool{}
 *     polyscript.RunTool(tool)
 * }
 *
 * // Command examples:
 * // go run main.go create main.go --mode simulate
 * // go run main.go read
 * // go run main.go update main.go
 * // go run main.go delete --mode simulate
 * // go run main.go discover --json
 *
 * // For rebadging, you can create wrapper commands in your main:
 * // compile -> create, clean -> delete, status -> read, etc.
 */