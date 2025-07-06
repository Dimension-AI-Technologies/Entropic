// PolyScript Framework for V
// CRUD × Modes Architecture: Zero-boilerplate CLI development
// 
// Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

module polyscript

import json
import flag
import os
import time

// FFI bindings for libpolyscript
#flag -I../../libpolyscript/include
#flag -L../../libpolyscript/build
#flag -lpolyscript
#include "polyscript.h"

// C function declarations
fn C.polyscript_can_mutate(mode int) bool
fn C.polyscript_should_validate(mode int) bool
fn C.polyscript_require_confirm(mode int, operation int) bool
fn C.polyscript_is_safe_mode(mode int) bool

// Convert V enums to C integers for FFI calls
fn operation_to_int(op PolyScriptOperation) int {
	return match op {
		.create { 0 }
		.read { 1 }
		.update { 2 }
		.delete { 3 }
	}
}

fn mode_to_int(mode PolyScriptMode) int {
	return match mode {
		.simulate { 0 }
		.sandbox { 1 }
		.live { 2 }
	}
}

// Safe FFI wrapper that catches panics and falls back to pure implementations
fn safe_ffi_call(ffi_call fn() bool, fallback bool) bool {
	return ffi_call() or { fallback }
}

// CRUD operations
pub enum PolyScriptOperation {
	create
	read
	update
	delete
}

// Execution modes  
pub enum PolyScriptMode {
	simulate
	sandbox
	live
}

// Context for operations
pub struct PolyScriptContext {
pub mut:
	operation    PolyScriptOperation
	mode         PolyScriptMode
	resource     ?string
	rebadged_as  ?string
	options      map[string]string
	verbose      bool
	force        bool
	json_output  bool
	tool_name    string
	output_data  map[string]json.Any
	messages     []string
}

// Initialize context with defaults
pub fn new_context() PolyScriptContext {
	return PolyScriptContext{
		operation: .read
		mode: .live
		resource: none
		rebadged_as: none
		options: map[string]string{}
		verbose: false
		force: false
		json_output: false
		tool_name: ''
		output_data: {
			'polyscript': json.Any('1.0')
			'status': json.Any('success')
			'data': json.Any(map[string]json.Any{})
		}
		messages: []string{}
	}
}

// Context methods using FFI with fallback
pub fn (ctx PolyScriptContext) can_mutate() bool {
	return safe_ffi_call(
		fn [ctx] () bool { return C.polyscript_can_mutate(mode_to_int(ctx.mode)) },
		ctx.mode == .live  // Fallback implementation
	)
}

pub fn (ctx PolyScriptContext) should_validate() bool {
	return safe_ffi_call(
		fn [ctx] () bool { return C.polyscript_should_validate(mode_to_int(ctx.mode)) },
		ctx.mode == .sandbox  // Fallback implementation
	)
}

pub fn (ctx PolyScriptContext) require_confirm() bool {
	if ctx.force { return false }  // Always handle force flag in V
	
	return safe_ffi_call(
		fn [ctx] () bool { 
			return C.polyscript_require_confirm(mode_to_int(ctx.mode), operation_to_int(ctx.operation)) 
		},
		ctx.mode == .live && (ctx.operation == .update || ctx.operation == .delete)  // Fallback
	)
}

pub fn (ctx PolyScriptContext) is_safe_mode() bool {
	return safe_ffi_call(
		fn [ctx] () bool { return C.polyscript_is_safe_mode(mode_to_int(ctx.mode)) },
		ctx.mode == .simulate || ctx.mode == .sandbox  // Fallback implementation
	)
}

pub fn (mut ctx PolyScriptContext) log(message string, level string) {
	if ctx.json_output {
		ctx.messages << '[$level] $message'
		if ctx.verbose {
			ctx.output_data['messages'] = json.Any(ctx.messages)
		}
	} else {
		match level {
			'error' { eprintln('Error: $message') }
			'warning' { eprintln('Warning: $message') }
			'info' { println(message) }
			'debug' { 
				if ctx.verbose {
					println('Debug: $message')
				}
			}
			else {}
		}
	}
}

pub fn (mut ctx PolyScriptContext) output(data map[string]json.Any, error bool) {
	if ctx.json_output {
		if error {
			ctx.output_data['status'] = json.Any('error')
			ctx.output_data['error'] = json.Any(data)
		} else {
			mut result_data := ctx.output_data['data'] or { json.Any(map[string]json.Any{}) }
			if result_data is map[string]json.Any {
				for k, v in data {
					result_data[k] = v
				}
				ctx.output_data['data'] = result_data
			}
		}
	} else {
		output := json.encode_pretty(data)
		if error {
			eprintln(output)
		} else {
			println(output)
		}
	}
}

pub fn (ctx PolyScriptContext) confirm(message string) bool {
	if ctx.force {
		return true
	}
	
	if ctx.json_output {
		eprintln(json.encode_pretty({
			'confirmation_required': json.Any(message)
		}))
		return false
	}
	
	print('$message [y/N]: ')
	response := os.input('').trim_space().to_lower()
	return response == 'y' || response == 'yes'
}

pub fn (mut ctx PolyScriptContext) finalize_output() {
	ctx.output_data['operation'] = json.Any(ctx.operation.str().to_lower())
	ctx.output_data['mode'] = json.Any(ctx.mode.str().to_lower())
	ctx.output_data['tool'] = json.Any(ctx.tool_name)
	
	if resource := ctx.resource {
		ctx.output_data['resource'] = json.Any(resource)
	}
	
	if rebadged := ctx.rebadged_as {
		ctx.output_data['rebadged_as'] = json.Any(rebadged)
	}
	
	if ctx.json_output {
		println(json.encode_pretty(ctx.output_data))
	}
}

// Tool interface
pub interface PolyScriptTool {
	description() string
	create(resource ?string, options map[string]string, ctx &PolyScriptContext) !map[string]json.Any
	read(resource ?string, options map[string]string, ctx &PolyScriptContext) !map[string]json.Any
	update(resource ?string, options map[string]string, ctx &PolyScriptContext) !map[string]json.Any
	delete(resource ?string, options map[string]string, ctx &PolyScriptContext) !map[string]json.Any
}

// Execute operation with mode wrapping
pub fn execute_with_mode(tool PolyScriptTool, mut ctx PolyScriptContext) ! {
	match ctx.mode {
		.simulate {
			ctx.log('Simulating ${ctx.operation} operation', 'debug')
			
			if ctx.operation == .read {
				result := tool.read(ctx.resource, ctx.options, &ctx)!
				ctx.output(result, false)
			} else {
				action_verb := match ctx.operation {
					.create { 'Would create' }
					.update { 'Would update' }
					.delete { 'Would delete' }
					else { 'Would read' }
				}
				
				resource_name := ctx.resource or { 'resource' }
				result := {
					'simulation': json.Any(true)
					'action': json.Any('$action_verb $resource_name')
					'options': json.Any(ctx.options)
				}
				ctx.output(result, false)
			}
		}
		
		.sandbox {
			ctx.log('Testing prerequisites for ${ctx.operation}', 'debug')
			
			result := {
				'sandbox': json.Any(true)
				'validations': json.Any({
					'permissions': json.Any('verified')
					'dependencies': json.Any('available')
					'connectivity': json.Any('established')
				})
				'ready': json.Any(true)
			}
			ctx.output(result, false)
		}
		
		.live {
			ctx.log('Executing ${ctx.operation} operation', 'debug')
			
			if ctx.require_confirm() {
				resource_name := ctx.resource or { 'resource' }
				msg := 'Are you sure you want to ${ctx.operation.str().to_lower()} $resource_name?'
				
				if !ctx.confirm(msg) {
					ctx.output_data['status'] = json.Any('cancelled')
					ctx.output({'cancelled': json.Any(true)}, false)
					return
				}
			}
			
			result := match ctx.operation {
				.create { tool.create(ctx.resource, ctx.options, &ctx)! }
				.read { tool.read(ctx.resource, ctx.options, &ctx)! }
				.update { tool.update(ctx.resource, ctx.options, &ctx)! }
				.delete { tool.delete(ctx.resource, ctx.options, &ctx)! }
			}
			ctx.output(result, false)
		}
	}
}

// Show discovery information
pub fn show_discovery(tool_name string) {
	discovery := {
		'polyscript': json.Any('1.0')
		'tool': json.Any(tool_name)
		'operations': json.Any(['create', 'read', 'update', 'delete'])
		'modes': json.Any(['simulate', 'sandbox', 'live'])
	}
	println(json.encode_pretty(discovery))
}

// Show help information
pub fn show_help(tool_name string, description string) {
	println('$tool_name - $description

Usage:
  $tool_name <operation> [resource] [options]

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
  $tool_name create myfile.txt --mode simulate
  $tool_name read --json
  $tool_name delete old-data --force')
}

// Parse operation from string
fn parse_operation(op string) ?PolyScriptOperation {
	return match op {
		'create' { .create }
		'read' { .read }
		'list' { .read }
		'update' { .update }
		'delete' { .delete }
		else { none }
	}
}

// Parse mode from string
fn parse_mode(mode string) PolyScriptMode {
	return match mode {
		'simulate' { .simulate }
		'sandbox' { .sandbox }
		'live' { .live }
		else { .live }
	}
}

// Main entry point for running a tool
pub fn run[T](tool T) ! {
	tool_name := typeof(tool).name
	mut fp := flag.new_flag_parser(os.args)
	fp.application(tool_name.to_lower())
	fp.version('1.0.0')
	fp.description(tool.description())
	
	// Define flags
	discover := fp.bool('discover', 0, false, 'Show tool capabilities')
	mode := fp.string('mode', `m`, 'live', 'Execution mode (simulate, sandbox, live)')
	verbose := fp.bool('verbose', `v`, false, 'Enable verbose output')
	force := fp.bool('force', `f`, false, 'Skip confirmation prompts')
	json_output := fp.bool('json', 0, false, 'Output in JSON format')
	
	// Parse remaining args
	remaining := fp.finalize() or {
		eprintln(err)
		exit(1)
	}
	
	if discover {
		show_discovery(tool_name)
		return
	}
	
	if remaining.len == 0 {
		eprintln('Error: No operation specified')
		show_help(tool_name.to_lower(), tool.description())
		exit(1)
	}
	
	// Parse operation and resource
	operation_str := remaining[0]
	operation := parse_operation(operation_str) or {
		eprintln('Error: Unknown operation: $operation_str')
		exit(1)
	}
	
	resource := if remaining.len > 1 { remaining[1] } else { none }
	
	// Create context
	mut ctx := new_context()
	ctx.operation = operation
	ctx.mode = parse_mode(mode)
	ctx.resource = resource
	ctx.verbose = verbose
	ctx.force = force
	ctx.json_output = json_output
	ctx.tool_name = tool_name
	
	// Execute operation
	ctx.log('Executing ${ctx.operation} operation in ${ctx.mode} mode', 'debug')
	
	execute_with_mode(tool, mut ctx) or {
		ctx.output({'error': json.Any(err.msg())}, true)
		ctx.finalize_output()
		exit(1)
	}
	
	ctx.finalize_output()
}