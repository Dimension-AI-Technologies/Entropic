#!/bin/bash

# MCP Server Installation and Testing Script
# This script installs, verifies, and tests three MCP servers with Claude Code CLI
# Usage: ./script.sh [--test-only] [--install] [--dry-run] [--help]

set -e  # Exit on any error

# Color codes for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Global variables
ISSUES_FOUND=()
DRY_RUN=false
TEST_ONLY=false
INSTALL_MODE=false

# Platform detection and timeout function setup
TIMEOUT_CMD=""
if command -v timeout &> /dev/null; then
    TIMEOUT_CMD="timeout"
elif command -v gtimeout &> /dev/null; then
    TIMEOUT_CMD="gtimeout"
else
    # Define a bash-based timeout function for macOS/systems without timeout
    run_with_timeout() {
        local timeout_duration="$1"
        shift
        local cmd="$*"
        
        # Run command in background and get its PID
        eval "$cmd" &
        local cmd_pid=$!
        
        # Start a background process to kill the command after timeout
        (
            sleep "$timeout_duration"
            if kill -0 "$cmd_pid" 2>/dev/null; then
                kill "$cmd_pid" 2>/dev/null
                sleep 1
                kill -9 "$cmd_pid" 2>/dev/null
            fi
        ) &
        local timeout_pid=$!
        
        # Wait for the command to complete
        if wait "$cmd_pid" 2>/dev/null; then
            # Command completed successfully, kill the timeout process
            kill "$timeout_pid" 2>/dev/null
            return 0
        else
            # Command failed or was killed
            kill "$timeout_pid" 2>/dev/null
            return 1
        fi
    }
    TIMEOUT_CMD="run_with_timeout"
fi

# MCP Server configurations using parallel arrays (bash 3.2 compatible)
MCP_SERVER_NAMES=("sequential-thinking" "linear" "context7")
MCP_SERVER_TRANSPORTS=("local" "sse" "sse")
MCP_SERVER_COMMANDS=("npx -y @modelcontextprotocol/server-sequential-thinking" "https://mcp.linear.app/sse" "https://mcp.context7.com/sse")
MCP_SERVER_TEST_PROMPTS=("Help me think through a simple decision: tea or coffee?" "List my Linear workspaces" "What is React? use context7")

log_dry_run() {
    echo -e "${PURPLE}[DRY-RUN]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${PURPLE} (DRY RUN MODE - NO CHANGES WILL BE MADE)${NC}"
    elif [[ "$TEST_ONLY" == true ]]; then
        echo -e "${YELLOW} (TEST ONLY MODE - NO INSTALLATION CHANGES)${NC}"
    elif [[ "$INSTALL_MODE" == true ]]; then
        echo -e "${GREEN} (INSTALL MODE - FULL INSTALLATION WITH CLEANUP)${NC}"
    fi
    echo -e "${BLUE}========================================${NC}"
}

# Function to show help
show_help() {
    cat << EOF
MCP Server Installation and Testing Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --test-only     Test existing MCP servers without installing/removing anything
    --install       Full installation mode: remove existing servers and install fresh
    --dry-run       Run in simulation mode (no actual changes made)
    --help          Show this help message

DESCRIPTION:
    This script manages MCP (Model Context Protocol) servers for Claude Code CLI:
    
    DEFAULT MODE (no flags):
        - Installs missing MCP servers without removing existing ones
        - Verifies installations and tests functionality
        - Safe mode that preserves existing configurations
    
    INSTALL MODE (--install):
        - Removes ALL existing MCP servers for clean installation
        - Installs three MCP servers:
          * sequential-thinking (local npm package)
          * linear (remote SSE server)  
          * context7 (remote SSE server)
        - Verifies installations and tests functionality
        - Use when you want a completely fresh setup
    
    TEST ONLY MODE (--test-only):
        - Tests existing MCP server installations
        - Verifies network connectivity and functionality
        - Does not install, remove, or modify anything
        - Perfect for checking current setup health
    
    DRY RUN MODE (--dry-run):
        - Shows what commands would be executed
        - Performs read-only operations (listing, checking)
        - Does not install, remove, or modify anything
        - Safe to run multiple times for planning
        - Can be combined with other modes

MODE COMBINATIONS:
    $0                          # Safe install (preserve existing)
    $0 --install                # Clean install (remove all first)
    $0 --test-only              # Test only (no changes)
    $0 --dry-run                # Simulate default mode
    $0 --install --dry-run      # Simulate clean install
    $0 --test-only --dry-run    # Simulate testing

EXAMPLES:
    $0                  # Safe installation preserving existing servers
    $0 --install        # Clean installation removing all existing servers
    $0 --test-only      # Test current setup without changes
    $0 --dry-run        # See what default mode would do
    $0 --help           # Show this help

EOF
}

# Function to parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --test-only)
                TEST_ONLY=true
                log_info "Running in TEST ONLY mode - no installation changes will be made"
                shift
                ;;
            --install)
                INSTALL_MODE=true
                log_info "Running in INSTALL mode - will remove existing servers for clean installation"
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                log_info "Running in DRY RUN mode - no changes will be made"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo ""
                show_help
                exit 1
                ;;
        esac
    done
    
    # Validate mode combinations
    if [[ "$TEST_ONLY" == true && "$INSTALL_MODE" == true ]]; then
        log_error "Cannot use --test-only and --install together"
        exit 1
    fi
}

# Function to execute command with dry-run support
execute_command() {
    local cmd="$1"
    local description="$2"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_dry_run "Would execute: $cmd"
        if [[ -n "$description" ]]; then
            log_dry_run "Purpose: $description"
        fi
        return 0
    else
        log_info "Executing: $description"
        eval "$cmd"
    fi
}

# Function to add issues to the report
add_issue() {
    ISSUES_FOUND+=("$1")
}

# Function to get server index by name
get_server_index() {
    local server_name="$1"
    local i
    for i in "${!MCP_SERVER_NAMES[@]}"; do
        if [[ "${MCP_SERVER_NAMES[$i]}" == "$server_name" ]]; then
            echo "$i"
            return 0
        fi
    done
    return 1
}

# Function to parse server configuration
parse_server_config() {
    local server_name="$1"
    local index
    index=$(get_server_index "$server_name")
    
    if [[ -z "$index" ]]; then
        log_error "Server $server_name not found in configuration"
        return 1
    fi
    
    local transport="${MCP_SERVER_TRANSPORTS[$index]}"
    local command="${MCP_SERVER_COMMANDS[$index]}"
    local test_prompt="${MCP_SERVER_TEST_PROMPTS[$index]}"
    
    echo "$transport|$command|$test_prompt"
}

# Function to check if claude CLI is available
check_prerequisites() {
    log_section "Checking Prerequisites"
    
    local commands=("claude:Claude CLI" "curl:Network testing" "node:Local MCP servers")
    
    for cmd_info in "${commands[@]}"; do
        IFS=':' read -r cmd desc <<< "$cmd_info"
        
        if command -v "$cmd" &> /dev/null; then
            if [[ "$cmd" == "claude" ]]; then
                log_success "$desc found: $(claude --version)"
            elif [[ "$cmd" == "node" ]]; then
                log_success "$desc found: $(node --version)"
            else
                log_success "$desc found"
            fi
        else
            if [[ "$cmd" == "claude" ]]; then
                log_error "$desc not found. Please install Claude Code first."
                exit 1
            else
                log_warning "$desc not found. $desc will be limited."
                add_issue "$cmd command not available"
            fi
        fi
    done
}

# Function to check if server is already installed
is_server_installed() {
    local server_name="$1"
    
    if claude mcp list 2>/dev/null | grep -q "^$server_name:"; then
        return 0  # Server is installed
    else
        return 1  # Server is not installed
    fi
}

# Generic function to remove a single MCP server
remove_mcp_server() {
    local server_name="$1"
    
    if [[ "$DRY_RUN" == true ]]; then
        if is_server_installed "$server_name" 2>/dev/null; then
            log_dry_run "Would remove existing $server_name server"
        else
            log_dry_run "Would check for $server_name server (not currently installed)"
        fi
        return 0
    fi
    
    log_info "Removing existing $server_name server (if present)..."
    
    if claude mcp remove "$server_name" 2>/dev/null; then
        log_success "$server_name server removed"
    else
        log_info "$server_name server was not previously installed"
    fi
}

# Generic function to install a single MCP server
install_mcp_server() {
    local server_name="$1"
    local config_data
    config_data=$(parse_server_config "$server_name")
    
    IFS='|' read -r transport command test_prompt <<< "$config_data"
    
    # Check if server is already installed (unless in install mode)
    if [[ "$INSTALL_MODE" != true && "$DRY_RUN" != true ]]; then
        if is_server_installed "$server_name"; then
            log_success "$server_name server already installed"
            return 0
        fi
    fi
    
    # Remove existing installation if in install mode
    if [[ "$INSTALL_MODE" == true ]]; then
        remove_mcp_server "$server_name"
    fi
    
    local install_cmd
    case "$transport" in
        "local")
            install_cmd="claude mcp add $server_name -- $command"
            ;;
        "sse")
            install_cmd="claude mcp add --transport sse $server_name $command"
            if [[ "$server_name" == "linear" ]]; then
                log_warning "Note: Linear requires authentication and may show 401 errors until authenticated"
            fi
            ;;
        *)
            log_error "Unknown transport type: $transport"
            add_issue "$server_name server installation failed - unknown transport"
            return 1
            ;;
    esac
    
    if [[ "$DRY_RUN" == true ]]; then
        log_dry_run "Would install $server_name server with command: $install_cmd"
        log_success "$server_name server would be installed (dry-run)"
        return 0
    fi
    
    log_info "Installing $server_name server..."
    
    if eval "$install_cmd"; then
        log_success "$server_name server installed"
        if [[ "$server_name" == "linear" ]]; then
            log_success "$server_name server installed (authentication required)"
        fi
    else
        log_error "Failed to install $server_name server"
        add_issue "$server_name server installation failed"
    fi
}

# Function to remove all existing MCP servers (install mode only)
remove_all_mcp_servers() {
    if [[ "$TEST_ONLY" == true ]]; then
        return 0
    fi
    
    if [[ "$INSTALL_MODE" != true && "$DRY_RUN" != true ]]; then
        log_info "Skipping removal of existing servers (use --install for clean installation)"
        return 0
    fi
    
    log_section "Removing Existing MCP Servers"
    
    log_info "Checking for existing MCP servers..."
    
    # Always check for existing servers (read-only operation)
    if claude mcp list > /tmp/existing_servers.txt 2>&1; then
        if [[ -s /tmp/existing_servers.txt ]]; then
            log_info "Found existing servers:"
            cat /tmp/existing_servers.txt
            echo ""
            
            if [[ "$DRY_RUN" == true ]]; then
                log_dry_run "Would remove all existing MCP servers:"
                while IFS= read -r line; do
                    if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*$ ]]; then
                        local server_name
                        server_name=$(echo "$line" | cut -d':' -f1 | xargs)
                        if [[ -n "$server_name" ]]; then
                            log_dry_run "  - Would remove: $server_name"
                        fi
                    fi
                done < /tmp/existing_servers.txt
            elif [[ "$INSTALL_MODE" == true ]]; then
                # Extract server names and remove them
                while IFS= read -r line; do
                    if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*$ ]]; then
                        # Extract server name (everything before the first colon)
                        local server_name
                        server_name=$(echo "$line" | cut -d':' -f1 | xargs)
                        if [[ -n "$server_name" ]]; then
                            log_info "Removing existing server: $server_name"
                            if claude mcp remove "$server_name" 2>/dev/null; then
                                log_success "Removed $server_name"
                            else
                                log_warning "Could not remove $server_name"
                            fi
                        fi
                    fi
                done < /tmp/existing_servers.txt
            fi
        else
            log_info "No existing MCP servers found"
        fi
    else
        log_info "Could not check for existing servers (this is normal for first-time setup)"
    fi
    
    rm -f /tmp/existing_servers.txt
}

# Function to install all MCP servers
install_mcp_servers() {
    if [[ "$TEST_ONLY" == true ]]; then
        log_section "Skipping Installation (Test Only Mode)"
        log_info "Test-only mode: Will verify and test existing installations only"
        return 0
    fi
    
    log_section "Installing MCP Servers"
    
    local i
    for i in "${!MCP_SERVER_NAMES[@]}"; do
        install_mcp_server "${MCP_SERVER_NAMES[$i]}"
    done
}

verify_server_installation() {
    local server_name="$1"
    local config_data
    config_data=$(parse_server_config "$server_name")
    
    IFS='|' read -r transport command test_prompt <<< "$config_data"
    
    case "$transport" in
        "local")
            if grep -q "$server_name" /tmp/mcp_list.txt; then
                log_success "$server_name server found in list"
            else
                log_error "$server_name server not found in list"
                add_issue "$server_name server not properly installed"
            fi
            ;;
        "sse")
            if grep -q "$server_name.*SSE" /tmp/mcp_list.txt; then
                log_success "$server_name server found in list with correct SSE transport"
            elif grep -q "$server_name" /tmp/mcp_list.txt; then
                log_warning "$server_name server found but may not have correct SSE transport"
                add_issue "$server_name server transport configuration may be incorrect"
            else
                log_error "$server_name server not found in list"
                add_issue "$server_name server not properly installed"
            fi
            ;;
    esac
}

# Function to verify installations
verify_installations() {
    log_section "Verifying Installations"
    
    log_info "Listing installed MCP servers..."
    if claude mcp list > /tmp/mcp_list.txt 2>&1; then
        cat /tmp/mcp_list.txt
        log_success "MCP server list retrieved successfully"
        
        # Verify each server
        # Verify each server
        local i
        for i in "${!MCP_SERVER_NAMES[@]}"; do
            verify_server_installation "${MCP_SERVER_NAMES[$i]}"
        done
    else
        log_error "Failed to list MCP servers"
        add_issue "Unable to retrieve MCP server list"
        cat /tmp/mcp_list.txt
    fi
    
    # Get detailed info for each server
    log_info "Getting detailed server information..."
    local i
    for i in "${!MCP_SERVER_NAMES[@]}"; do
        local server_name="${MCP_SERVER_NAMES[$i]}"
        echo ""
        log_info "Details for $server_name:"
        if claude mcp get "$server_name" 2>/dev/null; then
            log_success "$server_name details retrieved"
        else
            log_warning "Could not retrieve details for $server_name"
            add_issue "Unable to get details for $server_name server"
        fi
    done
}

# Function to find and display configuration files
show_config_files() {
    log_section "Configuration File Locations and Contents"
    
    # Common Claude configuration file locations
    local config_locations=(
        "$HOME/.config/claude/mcp.json"
        "$HOME/.claude/mcp.json"
        "$HOME/Library/Application Support/Claude/mcp.json"
        "$PWD/.claude/mcp.json"
        "$PWD/mcp.json"
    )
    
    log_info "Searching for Claude MCP configuration files..."
    
    local config_found=false
    for config_path in "${config_locations[@]}"; do
        if [[ -f "$config_path" ]]; then
            config_found=true
            log_success "Found config file: $config_path"
            echo ""
            log_info "Contents of $config_path:"
            echo "----------------------------------------"
            cat "$config_path" 2>/dev/null || {
                log_warning "Could not read $config_path"
                add_issue "Unable to read config file: $config_path"
            }
            echo ""
            echo "----------------------------------------"
        fi
    done
    
    if [[ "$config_found" == false ]]; then
        log_warning "No Claude MCP configuration files found in standard locations"
        add_issue "No MCP configuration files found"
        
        # Try to find any claude-related config files
        log_info "Searching for any claude-related configuration files..."
        find "$HOME" -name "*claude*" -name "*.json" 2>/dev/null | head -10 | while read -r file; do
            log_info "Found claude-related file: $file"
        done
    fi
}

# Generic function to test network connectivity for SSE servers
test_endpoint_connectivity() {
    local server_name="$1"
    local endpoint="$2"
    
    log_info "Testing $server_name endpoint connectivity..."
    if curl -I -s --connect-timeout 10 "$endpoint" > /dev/null 2>&1; then
        log_success "$server_name endpoint is reachable"
    else
        log_error "$server_name endpoint is not reachable"
        add_issue "$server_name endpoint connectivity failed"
    fi
    
    # More detailed connectivity test
    log_info "Detailed connectivity test for $server_name..."
    curl -I -v "$endpoint" 2>&1 | head -10
}

# Function to test network connectivity for remote servers
test_network_connectivity() {
    log_section "Testing Network Connectivity"
    
    if command -v curl &> /dev/null; then
        local i
        for i in "${!MCP_SERVER_NAMES[@]}"; do
            local server_name="${MCP_SERVER_NAMES[$i]}"
            local config_data
            config_data=$(parse_server_config "$server_name")
            
            IFS='|' read -r transport command test_prompt <<< "$config_data"
            
            if [[ "$transport" == "sse" ]]; then
                test_endpoint_connectivity "$server_name" "$command"
                echo ""
            fi
        done
    else
        log_warning "Skipping network tests - curl not available"
    fi
}

# Function to test local server availability
test_local_server() {
    log_section "Testing Local Server (sequential-thinking)"
    
    if command -v npx &> /dev/null; then
        if [[ "$DRY_RUN" == true ]]; then
            log_dry_run "Would test sequential-thinking package availability"
            log_dry_run "Command: $TIMEOUT_CMD 30 npx -y @modelcontextprotocol/server-sequential-thinking --help"
            return 0
        fi
        
        log_info "Testing sequential-thinking package availability..."
        if $TIMEOUT_CMD 30 npx -y @modelcontextprotocol/server-sequential-thinking --help > /tmp/sequential_test.txt 2>&1; then
            log_success "Sequential-thinking server package is accessible"
            log_info "Package help output:"
            head -20 /tmp/sequential_test.txt
        else
            log_error "Sequential-thinking server package test failed"
            add_issue "sequential-thinking npm package not working"
            log_info "Error output:"
            cat /tmp/sequential_test.txt
        fi
    else
        log_warning "npx not available - cannot test local server"
        add_issue "npx not available for testing local server"
    fi
}

# Generic function to test a single MCP server
test_single_mcp_server() {
    local server_name="$1"
    local config_data
    config_data=$(parse_server_config "$server_name")
    
    IFS='|' read -r transport command test_prompt <<< "$config_data"
    
    log_info "Testing $server_name server..."
    echo "Test prompt: $test_prompt"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_dry_run "Would test $server_name server with prompt: '$test_prompt'"
        log_dry_run "Command: $TIMEOUT_CMD 60 claude \"$test_prompt\""
        return 0
    fi
    
    local output_file="/tmp/${server_name}_output.txt"
    
    if $TIMEOUT_CMD 60 claude "$test_prompt" > "$output_file" 2>&1; then
        log_success "$server_name test completed"
        log_info "Response preview:"
        head -10 "$output_file"
        
        # Server-specific validation
        case "$server_name" in
            "sequential-thinking")
                if grep -i -E "(step|think|reasoning|decision)" "$output_file" > /dev/null; then
                    log_success "$server_name functionality confirmed"
                else
                    log_warning "$server_name may not have been used"
                    add_issue "$server_name server may not be functioning properly"
                fi
                ;;
            "context7")
                if grep -i -E "(context7|documentation|library)" "$output_file" > /dev/null; then
                    log_success "$server_name functionality confirmed"
                else
                    log_warning "$server_name may not have been used"
                    add_issue "$server_name server may not be functioning properly"
                fi
                ;;
            "linear")
                if grep -i "401\|unauthorized\|authentication" "$output_file" > /dev/null; then
                    log_warning "$server_name requires authentication (expected)"
                    log_info "To authenticate Linear:"
                    echo "  1. Go to https://linear.app"
                    echo "  2. Settings → API → Personal API keys"
                    echo "  3. Create a new key and set: export LINEAR_API_KEY=\"your_key\""
                    echo "  4. Or try using Linear functionality which may trigger OAuth flow"
                else
                    log_success "$server_name functionality confirmed"
                fi
                ;;
        esac
    else
        case "$server_name" in
            "linear")
                log_warning "$server_name test failed (may require authentication)"
                add_issue "$server_name server test failed - authentication setup needed"
                ;;
            *)
                log_error "$server_name test failed"
                add_issue "$server_name server functionality test failed"
                ;;
        esac
        head -5 "$output_file"
    fi
    
    echo ""
}

# Function to test MCP server functionality
test_mcp_functionality() {
    log_section "Testing MCP Server Functionality"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_dry_run "In normal mode, would test functionality of all MCP servers:"
        local i
        for i in "${!MCP_SERVER_NAMES[@]}"; do
            local server_name="${MCP_SERVER_NAMES[$i]}"
            local config_data
            config_data=$(parse_server_config "$server_name")
            IFS='|' read -r transport command test_prompt <<< "$config_data"
            log_dry_run "  - $server_name: '$test_prompt'"
        done
        log_dry_run "Would also run debug mode: claude --debug --mcp-debug \"Test all MCP servers\""
        return 0
    fi
    
    # Test each server
    # Test each server
    local i
    for i in "${!MCP_SERVER_NAMES[@]}"; do
        test_single_mcp_server "${MCP_SERVER_NAMES[$i]}"
    done
    
    log_info "Testing with debug mode to check MCP server connections..."
    if $TIMEOUT_CMD 30 claude --debug --mcp-debug "Test all MCP servers" > /tmp/debug_output.txt 2>&1; then
        # Parse debug output for specific issues
        if grep -i "401\|unauthorized" /tmp/debug_output.txt > /dev/null; then
            log_warning "Authentication issues found in debug output"
        fi
        
        if grep -i "connection failed\|error" /tmp/debug_output.txt > /dev/null; then
            log_error "Connection errors found in debug output"
            add_issue "MCP server connection errors detected"
        fi
        
        log_info "Debug output summary:"
        grep -E "\[DEBUG\]|\[ERROR\]" /tmp/debug_output.txt | head -10
    else
        log_warning "Debug test timed out or failed"
    fi
}

# Function to generate final report
generate_report() {
    log_section "Final Report"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "DRY RUN SUMMARY:"
        if [[ "$TEST_ONLY" == true ]]; then
            echo "✅ Script would test existing MCP servers without installation changes"
        elif [[ "$INSTALL_MODE" == true ]]; then
            echo "✅ Script would remove all existing MCP servers"
            echo "✅ Script would install 3 fresh MCP servers: sequential-thinking, linear, context7"
        else
            echo "✅ Script would install missing MCP servers: sequential-thinking, linear, context7"
            echo "✅ Script would preserve existing MCP servers"
        fi
        echo "✅ Script would test network connectivity and functionality"
        echo "✅ Script would generate configuration reports"
        echo ""
        log_info "To actually perform these operations, run without --dry-run flag"
        echo ""
        log_info "Current MCP servers (if any):"
        claude mcp list 2>/dev/null || echo "Unable to list servers"
        return 0
    fi
    
    if [[ ${#ISSUES_FOUND[@]} -eq 0 ]]; then
        log_success "All tests passed! No issues found."
        echo ""
        log_info "Summary:"
        if [[ "$TEST_ONLY" == true ]]; then
            echo "✅ All existing MCP servers tested successfully"
        else
            echo "✅ All three MCP servers installed/verified successfully"
        fi
        echo "✅ Network connectivity verified"
        echo "✅ Server functionality tested"
        echo "✅ Configuration files accessible"
    else
        log_warning "Issues found during testing:"
        echo ""
        for i in "${!ISSUES_FOUND[@]}"; do
            echo "  $((i+1)). ${ISSUES_FOUND[i]}"
        done
        echo ""
        log_info "Total issues: ${#ISSUES_FOUND[@]}"
        
        echo ""
        log_info "Troubleshooting suggestions:"
        echo "• Check internet connectivity for remote servers"
        echo "• Ensure Claude CLI is properly authenticated"
        echo "• Verify Node.js installation for local servers"
        echo "• Review configuration file permissions"
        echo "• Try running 'claude mcp list' manually"
        echo "• For Linear: Set up authentication at https://linear.app → Settings → API"
        echo "• For Linear: Try 'export LINEAR_API_KEY=\"your_key\"' or trigger OAuth flow"
        echo "• Use 'claude --debug --mcp-debug \"test\"' to see detailed connection info"
        echo "• Ensure SSE transport is properly configured for remote servers"
    fi
    
    echo ""
    log_info "Installed MCP servers:"
    claude mcp list 2>/dev/null || echo "Unable to list servers"
    
    echo ""
    log_info "For more help, run:"
    echo "  claude mcp --help"
    echo "  claude --help"
    echo ""
    log_info "Quick mode reference:"
    echo "  $0 --test-only    # Test existing servers only"
    echo "  $0 --install      # Clean install (remove existing first)"
    echo "  $0                # Safe install (preserve existing)"
}

# Function to cleanup temporary files
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f /tmp/mcp_list.txt /tmp/sequential_test.txt /tmp/debug_output.txt /tmp/existing_servers.txt
    
    # Clean up dynamic output files
    # Clean up dynamic output files
    local i
    for i in "${!MCP_SERVER_NAMES[@]}"; do
        rm -f "/tmp/${MCP_SERVER_NAMES[$i]}_output.txt"
    done
}

# Main execution
main() {
    # Parse command line arguments first
    parse_arguments "$@"
    
    log_section "MCP Server Installation and Testing Script"
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Running in DRY RUN mode - simulating operations without making changes"
    elif [[ "$TEST_ONLY" == true ]]; then
        log_info "Running in TEST ONLY mode - testing existing servers without installation changes"
    elif [[ "$INSTALL_MODE" == true ]]; then
        log_info "Running in INSTALL mode - performing clean installation with removal of existing servers"
    else
        log_info "Running in DEFAULT mode - safe installation preserving existing servers"
    fi
    
    check_prerequisites
    remove_all_mcp_servers
    install_mcp_servers
    verify_installations
    show_config_files
    test_network_connectivity
    test_local_server
    test_mcp_functionality
    generate_report
    cleanup
    
    log_info "Script completed!"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function with all arguments
main "$@"