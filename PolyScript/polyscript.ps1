#Requires -Version 5.1

<#
.SYNOPSIS
    PolyScript Base Framework for PowerShell
    Version: 1.0.0

.DESCRIPTION
    A base framework for creating PolyScript-compliant CLI tools in PowerShell.
    Import this module to inherit standard PolyScript behavior.

.NOTES
    Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
#>

# Enum for execution modes
enum ExecutionMode {
    Status
    Test
    Sandbox
    Live
}

# Base class for PolyScript tools
class PolyScriptBase {
    # Properties
    [ExecutionMode]$Mode = [ExecutionMode]::Status
    [bool]$Verbose = $false
    [bool]$Force = $false
    [bool]$Json = $false
    [hashtable]$OutputData = @{
        polyscript = "1.0"
        mode = "status"
        tool = $null
        status = "success"
        data = @{}
        messages = @()
        errors = @()
    }
    
    # Constructor
    PolyScriptBase() {
        $this.OutputData.tool = $this.GetType().Name
    }
    
    # Abstract methods (must be overridden)
    [string] GetDescription() {
        throw "GetDescription() must be implemented by subclass"
    }
    
    [void] AddArguments([System.Management.Automation.RuntimeDefinedParameterDictionary]$Parameters) {
        # Subclasses add their own parameters here
    }
    
    [int] ExecuteStatus() {
        throw "ExecuteStatus() must be implemented by subclass"
    }
    
    [int] ExecuteTest() {
        throw "ExecuteTest() must be implemented by subclass"
    }
    
    [int] ExecuteSandbox() {
        throw "ExecuteSandbox() must be implemented by subclass"
    }
    
    [int] ExecuteLive() {
        throw "ExecuteLive() must be implemented by subclass"
    }
    
    # Helper methods
    [void] Output([object]$Data, [bool]$Error = $false) {
        if ($this.Json) {
            # Store for JSON output
            if ($Data -is [string]) {
                if ($Error) {
                    $this.OutputData.errors += $Data
                } else {
                    $this.OutputData.messages += $Data
                }
            } elseif ($Data -is [hashtable]) {
                foreach ($key in $Data.Keys) {
                    $this.OutputData.data[$key] = $Data[$key]
                }
            }
        } else {
            # Direct output
            if ($Error) {
                Write-Error $Data
            } else {
                Write-Output $Data
            }
        }
    }
    
    [bool] Confirm([string]$Message) {
        if ($this.Force) {
            return $true
        }
        
        if ($this.Json) {
            $this.Output(@{confirmation_required = $Message}, $true)
            return $false
        }
        
        $response = Read-Host "$Message [y/N]"
        return $response -eq 'y'
    }
    
    # Main execution method
    [int] Run([hashtable]$Arguments) {
        # Parse standard arguments
        $this.Mode = if ($Arguments.Mode) { [ExecutionMode]$Arguments.Mode } else { [ExecutionMode]::Status }
        $this.Verbose = [bool]$Arguments.Verbose
        $this.Force = [bool]$Arguments.Force
        $this.Json = [bool]$Arguments.Json
        
        # Update output data
        $this.OutputData.mode = $this.Mode.ToString().ToLower()
        
        # Set verbose preference
        if ($this.Verbose) {
            $VerbosePreference = 'Continue'
        }
        
        try {
            # Execute based on mode
            Write-Verbose "Executing in $($this.Mode) mode"
            
            $exitCode = switch ($this.Mode) {
                Status  { $this.ExecuteStatus() }
                Test    { $this.ExecuteTest() }
                Sandbox { $this.ExecuteSandbox() }
                Live    { $this.ExecuteLive() }
            }
            
            # Set final status
            if ($exitCode -ne 0) {
                $this.OutputData.status = "failure"
            }
            
            # Output JSON if requested
            if ($this.Json -and $this.OutputData.data.Count -gt 0) {
                Write-Output ($this.OutputData | ConvertTo-Json -Depth 10)
            }
            
            return $exitCode
        }
        catch {
            $this.OutputData.status = "error"
            $this.OutputData.error = $_.Exception.Message
            
            if ($this.Json) {
                Write-Output ($this.OutputData | ConvertTo-Json -Depth 10)
            } else {
                Write-Error $_
            }
            
            return 1
        }
    }
}

# Function to create a PolyScript-compliant tool
function New-PolyScriptTool {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [type]$ToolClass,
        
        [Parameter()]
        [hashtable]$Arguments = @{}
    )
    
    # Create instance
    $tool = New-Object $ToolClass
    
    # Run and return exit code
    return $tool.Run($Arguments)
}

# Example implementation class
class PolyScriptExample : PolyScriptBase {
    # Tool-specific properties
    [string]$Target
    [int]$Count = 1
    
    [string] GetDescription() {
        return "Example PolyScript Tool - Demonstrates framework usage"
    }
    
    [void] AddArguments([System.Management.Automation.RuntimeDefinedParameterDictionary]$Parameters) {
        # Tool-specific parameters would be added here
    }
    
    [int] ExecuteStatus() {
        $this.Output("Checking system status...")
        
        $statusData = @{
            operational = $true
            targets = 3
            lastCheck = (Get-Date).ToString()
        }
        
        if ($this.Verbose) {
            $statusData.details = @(
                "Target 1: Active"
                "Target 2: Active"
                "Target 3: Idle"
            )
        }
        
        $this.Output($statusData)
        return 0
    }
    
    [int] ExecuteTest() {
        $this.Output("[TEST MODE] Simulating operations...")
        
        $operations = @()
        for ($i = 1; $i -le $this.Count; $i++) {
            $operations += @{
                operation = "Operation $i"
                target = if ($this.Target) { $this.Target } else { "default-$i" }
                status = "would execute"
            }
        }
        
        $this.Output(@{planned_operations = $operations})
        $this.Output("No changes made in test mode")
        return 0
    }
    
    [int] ExecuteSandbox() {
        $this.Output("[SANDBOX MODE] Testing dependencies...")
        
        $tests = @{
            network = "passed"
            authentication = "passed"
            permissions = "passed"
            resources = "available"
        }
        
        $allPassed = $tests.Values -notcontains "failed"
        
        $this.Output(@{dependency_tests = $tests})
        
        if (-not $allPassed) {
            $this.Output("Some tests failed", $true)
            return 1
        }
        
        $this.Output("All dependency tests passed")
        return 0
    }
    
    [int] ExecuteLive() {
        $this.Output("[LIVE MODE] Preparing to execute operations...")
        
        if (-not $this.Confirm("Execute operations?")) {
            $this.Output("Operation cancelled")
            return 1
        }
        
        $results = @()
        for ($i = 1; $i -le $this.Count; $i++) {
            Write-Verbose "Executing operation $i..."
            $results += @{
                operation = "Operation $i"
                target = if ($this.Target) { $this.Target } else { "default-$i" }
                status = "completed"
            }
        }
        
        $this.Output(@{executed_operations = $results})
        $this.Output("Successfully completed $($results.Count) operations")
        return 0
    }
}

# Export module members
Export-ModuleMember -Function New-PolyScriptTool
Export-ModuleMember -Variable PolyScriptBase, ExecutionMode