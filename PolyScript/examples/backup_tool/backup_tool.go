/*
 * Example: Backup Tool using PolyScript Go Framework
 *
 * This demonstrates how the Go PolyScript framework eliminates boilerplate.
 * Shows clean Go patterns with zero CLI boilerplate.
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"syscall"

	"github.com/spf13/cobra"
	// Import the polyscript framework
	// "path/to/polyscript"
)

// BackupTool implements the PolyScript interface
type BackupTool struct {
	// Embed DefaultTool to get default AddArguments implementation
	polyscript.DefaultTool
	sourcePath string
	destPath   string
	overwrite  bool
}

// NewBackupTool creates a new backup tool
func NewBackupTool() *BackupTool {
	return &BackupTool{
		sourcePath: "/source",
		destPath:   "/dest",
		overwrite:  false,
	}
}

func (t *BackupTool) Description() string {
	return `PolyScript-compliant backup tool with zero boilerplate

Backs up directories with full PolyScript mode support.
Provides status checking, dry-run testing, dependency validation,
and live backup operations.`
}

func (t *BackupTool) AddArguments(cmd *cobra.Command) *cobra.Command {
	cmd.Flags().String("source", "/source", "Source directory to backup")
	cmd.Flags().String("dest", "/dest", "Destination directory")
	cmd.Flags().Bool("overwrite", false, "Overwrite existing destination")
	return cmd
}

func (t *BackupTool) Status(ctx *polyscript.PolyScriptContext) (interface{}, error) {
	ctx.Log("Checking backup status...")

	sourceInfo := t.getDirectoryInfo(t.sourcePath)
	destInfo := t.getDirectoryInfo(t.destPath)

	return map[string]interface{}{
		"source": map[string]interface{}{
			"path":       t.sourcePath,
			"exists":     sourceInfo.exists,
			"size_bytes": sourceInfo.size,
			"file_count": sourceInfo.files,
		},
		"destination": map[string]interface{}{
			"path":             t.destPath,
			"exists":           destInfo.exists,
			"size_bytes":       destInfo.size,
			"would_overwrite":  destInfo.exists && !t.overwrite,
		},
		"backup_needed": sourceInfo.exists && (!destInfo.exists || t.overwrite),
	}, nil
}

func (t *BackupTool) Test(ctx *polyscript.PolyScriptContext) (interface{}, error) {
	ctx.Log("Planning backup operations...")

	sourceInfo := t.getDirectoryInfo(t.sourcePath)
	destInfo := t.getDirectoryInfo(t.destPath)

	if !sourceInfo.exists {
		ctx.Output("Source directory does not exist", true)
		return nil, polyscript.NewError("Source directory does not exist")
	}

	var operations []map[string]interface{}

	if destInfo.exists && !t.overwrite {
		operations = append(operations, map[string]interface{}{
			"operation":   "skip",
			"reason":      "destination exists and overwrite not specified",
			"source":      t.sourcePath,
			"destination": t.destPath,
		})
	} else {
		operations = append(operations, map[string]interface{}{
			"operation":      "backup",
			"source":         t.sourcePath,
			"destination":    t.destPath,
			"file_count":     sourceInfo.files,
			"size_bytes":     sourceInfo.size,
			"would_overwrite": destInfo.exists,
		})
	}

	return map[string]interface{}{
		"planned_operations": operations,
		"total_files":        sourceInfo.files,
		"total_size":         sourceInfo.size,
		"note":               "No changes made in test mode",
	}, nil
}

func (t *BackupTool) Sandbox(ctx *polyscript.PolyScriptContext) (interface{}, error) {
	ctx.Log("Testing backup environment...")

	tests := map[string]string{
		"source_readable":      t.testSourceReadable(),
		"destination_writable": t.testDestinationWritable(),
		"sufficient_space":     t.testSufficientSpace(),
		"filesystem_access":    t.testFilesystemAccess(),
	}

	allPassed := true
	for _, status := range tests {
		if status != "passed" {
			allPassed = false
			break
		}
	}

	return map[string]interface{}{
		"dependency_tests": tests,
		"all_passed":       allPassed,
	}, nil
}

func (t *BackupTool) Live(ctx *polyscript.PolyScriptContext) (interface{}, error) {
	ctx.Log("Preparing backup execution...")

	sourceInfo := t.getDirectoryInfo(t.sourcePath)
	if !sourceInfo.exists {
		ctx.Output("Source directory does not exist", true)
		return nil, polyscript.NewError("Source directory does not exist")
	}

	destInfo := t.getDirectoryInfo(t.destPath)
	if destInfo.exists && !t.overwrite {
		if !ctx.Confirm(fmt.Sprintf("Destination %s exists. Overwrite?", t.destPath)) {
			return map[string]interface{}{"status": "cancelled"}, nil
		}
	}

	ctx.Log(fmt.Sprintf("Starting backup from %s to %s", t.sourcePath, t.destPath))

	// Simulate backup operation
	// In real implementation: os.RemoveAll(t.destPath); os.Rename(t.sourcePath, t.destPath)
	// For demo, we'll just simulate
	ctx.Log("Backup operation completed (simulated)")

	resultInfo := t.getDirectoryInfo(t.destPath)

	return map[string]interface{}{
		"operation":     "backup_completed",
		"source":        t.sourcePath,
		"destination":   t.destPath,
		"files_copied":  resultInfo.files,
		"bytes_copied":  resultInfo.size,
	}, nil
}

// Helper types and methods for directory operations
type directoryInfo struct {
	exists bool
	size   int64
	files  int
}

func (t *BackupTool) getDirectoryInfo(path string) directoryInfo {
	info := directoryInfo{exists: false, size: 0, files: 0}

	stat, err := os.Stat(path)
	if err != nil || !stat.IsDir() {
		return info
	}

	info.exists = true

	// Walk directory to calculate size and count files
	filepath.WalkDir(path, func(filePath string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil // Skip errors
		}

		if !d.IsDir() {
			info.files++
			if fileInfo, err := d.Info(); err == nil {
				info.size += fileInfo.Size()
			}
		}
		return nil
	})

	return info
}

func (t *BackupTool) testSourceReadable() string {
	if stat, err := os.Stat(t.sourcePath); err == nil && stat.IsDir() {
		// Try to read directory
		if _, err := os.ReadDir(t.sourcePath); err == nil {
			return "passed"
		}
	}
	return "failed"
}

func (t *BackupTool) testDestinationWritable() string {
	destDir := filepath.Dir(t.destPath)
	if stat, err := os.Stat(destDir); err == nil && stat.IsDir() {
		// Try to create a temporary file
		tempFile := filepath.Join(destDir, ".polyscript_test")
		if file, err := os.Create(tempFile); err == nil {
			file.Close()
			os.Remove(tempFile)
			return "passed"
		}
	}
	return "failed"
}

func (t *BackupTool) testSufficientSpace() string {
	sourceInfo := t.getDirectoryInfo(t.sourcePath)
	if !sourceInfo.exists {
		return "unknown"
	}

	destDir := filepath.Dir(t.destPath)
	if stat, err := os.Stat(destDir); err == nil && stat.IsDir() {
		// Get disk space (Unix-specific)
		var statfs syscall.Statfs_t
		if syscall.Statfs(destDir, &statfs) == nil {
			available := int64(statfs.Bavail) * int64(statfs.Bsize)
			required := int64(float64(sourceInfo.size) * 1.1) // 10% buffer
			if available > required {
				return "passed"
			}
			return "failed"
		}
	}
	return "error"
}

func (t *BackupTool) testFilesystemAccess() string {
	tempFile := filepath.Join(os.TempDir(), ".polyscript_test")
	if file, err := os.Create(tempFile); err == nil {
		file.Close()
		os.Remove(tempFile)
		return "passed"
	}
	return "failed"
}

// Simple tool using minimal implementation
type SimpleTool struct {
	polyscript.DefaultTool
}

func (t *SimpleTool) Description() string {
	return "Simple backup tool demonstrating minimal Go implementation"
}

func (t *SimpleTool) Status(ctx *polyscript.PolyScriptContext) (interface{}, error) {
	ctx.Log("Simple status check...")
	return map[string]interface{}{
		"operational": true,
		"ready":       true,
	}, nil
}

func (t *SimpleTool) Test(ctx *polyscript.PolyScriptContext) (interface{}, error) {
	ctx.Log("Simple test mode...")
	return map[string]interface{}{
		"would_backup": []string{"file1", "file2"},
		"note":         "No changes made in test mode",
	}, nil
}

func (t *SimpleTool) Sandbox(ctx *polyscript.PolyScriptContext) (interface{}, error) {
	ctx.Log("Simple sandbox test...")
	return map[string]interface{}{
		"environment": "ok",
		"all_passed":  true,
	}, nil
}

func (t *SimpleTool) Live(ctx *polyscript.PolyScriptContext) (interface{}, error) {
	ctx.Log("Simple live execution...")
	if ctx.Confirm("Execute backup?") {
		return map[string]interface{}{
			"backup_completed": true,
			"files_backed_up":  42,
		}, nil
	}
	return map[string]interface{}{"status": "cancelled"}, nil
}

// Main function - choose which tool to run
func main() {
	// Uncomment the tool you want to test:
	
	// Full-featured backup tool
	tool := NewBackupTool()
	polyscript.RunTool(tool)
	
	// Simple minimal tool
	// tool := &SimpleTool{}
	// polyscript.RunTool(tool)
}

/*
 * PROJECT STRUCTURE:
 *
 * backup-tool/
 * ├── go.mod
 * ├── go.sum
 * ├── main.go (this file)
 * └── polyscript/
 *     └── framework.go
 *
 * GO.MOD:
 * module backup-tool
 * go 1.19
 * require github.com/spf13/cobra v1.7.0
 *
 * BUILD AND RUN:
 * go mod init backup-tool
 * go get github.com/spf13/cobra@latest
 * go build -o backup-tool main.go
 * ./backup-tool status
 * ./backup-tool test --verbose
 * ./backup-tool sandbox --json
 * ./backup-tool live --force
 * ./backup-tool status --source /home/user/docs --dest /backup/docs --overwrite
 *
 * The framework automatically provides:
 * - All CLI argument parsing and validation with cobra
 * - Command routing for the four PolyScript modes
 * - --json, --verbose, --force standard flags
 * - PolyScript v1.0 JSON output formatting
 * - Error handling and exit codes
 * - Help text generation
 * - Confirmation prompts
 * - Single binary distribution
 *
 * BENEFITS OF GO APPROACH:
 * - ZERO boilerplate code
 * - Single binary distribution (huge team advantage)
 * - Fast execution and startup
 * - Excellent cross-platform support
 * - Strong typing with interface contracts
 * - Simple dependency management with go mod
 * - Native performance
 * - Goroutine support for concurrent operations
 *
 * GO-SPECIFIC ADVANTAGES:
 * - Compile-time type checking
 * - No runtime dependencies
 * - Easy cross-compilation (GOOS=linux go build)
 * - Built-in testing framework
 * - Excellent tooling (go fmt, go vet, go test)
 * - Fast compilation
 * - Memory efficient
 * - Great for DevOps and system tools
 */