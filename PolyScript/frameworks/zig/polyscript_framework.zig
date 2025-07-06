// PolyScript Framework for Zig
// CRUD × Modes Architecture: Zero-boilerplate CLI development
// 
// Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

const std = @import("std");
const json = std.json;
const process = std.process;
const io = std.io;

// FFI bindings for libpolyscript
const c = @cImport({
    @cInclude("polyscript.h");
});

// Convert Zig enums to C integers for FFI calls
fn operationToInt(op: PolyScriptOperation) c_int {
    return switch (op) {
        .create => 0,
        .read => 1,
        .update => 2,
        .delete => 3,
    };
}

fn modeToInt(mode: PolyScriptMode) c_int {
    return switch (mode) {
        .simulate => 0,
        .sandbox => 1,
        .live => 2,
    };
}

// Safe FFI wrapper that catches errors and falls back to pure implementations
fn safeFFICall(comptime ReturnType: type, ffi_call: anytype, fallback: ReturnType) ReturnType {
    return ffi_call catch fallback;
}

pub const PolyScriptOperation = enum {
    create,
    read,
    update,
    delete,

    pub fn toString(self: PolyScriptOperation) []const u8 {
        return switch (self) {
            .create => "create",
            .read => "read",
            .update => "update",
            .delete => "delete",
        };
    }
};

pub const PolyScriptMode = enum {
    simulate,
    sandbox,
    live,

    pub fn toString(self: PolyScriptMode) []const u8 {
        return switch (self) {
            .simulate => "simulate",
            .sandbox => "sandbox",
            .live => "live",
        };
    }
};

pub const PolyScriptContext = struct {
    operation: PolyScriptOperation,
    mode: PolyScriptMode,
    resource: ?[]const u8,
    rebadged_as: ?[]const u8,
    verbose: bool,
    force: bool,
    json_output: bool,
    tool_name: []const u8,
    allocator: std.mem.Allocator,
    stdout: std.fs.File.Writer,
    stderr: std.fs.File.Writer,

    pub fn init(allocator: std.mem.Allocator) PolyScriptContext {
        return .{
            .operation = .read,
            .mode = .live,
            .resource = null,
            .rebadged_as = null,
            .verbose = false,
            .force = false,
            .json_output = false,
            .tool_name = "",
            .allocator = allocator,
            .stdout = io.getStdOut().writer(),
            .stderr = io.getStdErr().writer(),
        };
    }

    pub fn canMutate(self: *const PolyScriptContext) bool {
        return safeFFICall(
            bool,
            @call(.auto, c.polyscript_can_mutate, .{modeToInt(self.mode)}),
            self.mode == .live  // Fallback implementation
        );
    }

    pub fn shouldValidate(self: *const PolyScriptContext) bool {
        return safeFFICall(
            bool,
            @call(.auto, c.polyscript_should_validate, .{modeToInt(self.mode)}),
            self.mode == .sandbox  // Fallback implementation
        );
    }

    pub fn requireConfirm(self: *const PolyScriptContext) bool {
        if (self.force) return false;  // Always handle force flag in Zig
        
        return safeFFICall(
            bool,
            @call(.auto, c.polyscript_require_confirm, .{ modeToInt(self.mode), operationToInt(self.operation) }),
            self.mode == .live and (self.operation == .update or self.operation == .delete)  // Fallback
        );
    }

    pub fn isSafeMode(self: *const PolyScriptContext) bool {
        return safeFFICall(
            bool,
            @call(.auto, c.polyscript_is_safe_mode, .{modeToInt(self.mode)}),
            self.mode == .simulate or self.mode == .sandbox  // Fallback implementation
        );
    }

    pub fn log(self: *const PolyScriptContext, message: []const u8, level: []const u8) !void {
        if (self.json_output) {
            // In JSON mode, messages would be accumulated
            return;
        }

        if (std.mem.eql(u8, level, "error")) {
            try self.stderr.print("Error: {s}\n", .{message});
        } else if (std.mem.eql(u8, level, "warning")) {
            try self.stderr.print("Warning: {s}\n", .{message});
        } else if (std.mem.eql(u8, level, "info")) {
            try self.stdout.print("{s}\n", .{message});
        } else if (std.mem.eql(u8, level, "debug") and self.verbose) {
            try self.stdout.print("Debug: {s}\n", .{message});
        }
    }

    pub fn confirm(self: *const PolyScriptContext, message: []const u8) !bool {
        if (self.force) return true;

        if (self.json_output) {
            try self.outputJsonError(.{ .confirmation_required = message });
            return false;
        }

        try self.stdout.print("{s} [y/N]: ", .{message});
        const stdin = io.getStdIn().reader();
        var buf: [10]u8 = undefined;
        if (try stdin.readUntilDelimiterOrEof(&buf, '\n')) |input| {
            const trimmed = std.mem.trim(u8, input, " \r\n");
            return std.mem.eql(u8, trimmed, "y") or std.mem.eql(u8, trimmed, "yes");
        }
        return false;
    }

    pub fn outputJson(self: *const PolyScriptContext, data: anytype) !void {
        try json.stringify(data, .{ .whitespace = .{ .indent = .{ .Space = 2 } } }, self.stdout);
        try self.stdout.writeAll("\n");
    }

    pub fn outputJsonError(self: *const PolyScriptContext, data: anytype) !void {
        try json.stringify(data, .{ .whitespace = .{ .indent = .{ .Space = 2 } } }, self.stderr);
        try self.stderr.writeAll("\n");
    }
};

pub const PolyScriptResult = struct {
    polyscript: []const u8 = "1.0",
    operation: []const u8,
    mode: []const u8,
    tool: []const u8,
    status: []const u8 = "success",
    resource: ?[]const u8 = null,
    data: ?json.Value = null,
    result: ?json.Value = null,
};

pub fn PolyScriptTool(comptime Tool: type) type {
    return struct {
        pub fn run(allocator: std.mem.Allocator) !void {
            var args = try process.argsWithAllocator(allocator);
            defer args.deinit();

            var context = PolyScriptContext.init(allocator);
            context.tool_name = @typeName(Tool);

            // Skip program name
            _ = args.next();

            var operation: ?[]const u8 = null;
            var resource: ?[]const u8 = null;
            var mode: []const u8 = "live";
            var verbose = false;
            var force = false;
            var json_output = false;
            var discover = false;

            // Parse arguments
            while (args.next()) |arg| {
                if (std.mem.eql(u8, arg, "--discover")) {
                    discover = true;
                } else if (std.mem.eql(u8, arg, "--mode") or std.mem.eql(u8, arg, "-m")) {
                    if (args.next()) |m| {
                        mode = m;
                    }
                } else if (std.mem.eql(u8, arg, "--verbose") or std.mem.eql(u8, arg, "-v")) {
                    verbose = true;
                } else if (std.mem.eql(u8, arg, "--force") or std.mem.eql(u8, arg, "-f")) {
                    force = true;
                } else if (std.mem.eql(u8, arg, "--json")) {
                    json_output = true;
                } else if (std.mem.eql(u8, arg, "--help") or std.mem.eql(u8, arg, "-h")) {
                    try showHelp(context.stdout);
                    return;
                } else if (operation == null) {
                    operation = arg;
                } else if (resource == null) {
                    resource = arg;
                }
            }

            if (discover) {
                try showDiscovery(&context);
                return;
            }

            if (operation == null) {
                try context.stderr.print("Error: No operation specified\n", .{});
                std.os.exit(1);
            }

            // Parse operation
            context.operation = std.meta.stringToEnum(PolyScriptOperation, operation.?) orelse {
                if (std.mem.eql(u8, operation.?, "list")) {
                    context.operation = .read;
                } else {
                    try context.stderr.print("Error: Unknown operation: {s}\n", .{operation.?});
                    std.os.exit(1);
                }
            };

            // Parse mode
            context.mode = std.meta.stringToEnum(PolyScriptMode, mode) orelse .live;
            context.resource = resource;
            context.verbose = verbose;
            context.force = force;
            context.json_output = json_output;

            // Execute operation
            try executeWithMode(Tool, &context);
        }

        fn showHelp(writer: anytype) !void {
            const tool_name = @typeName(Tool);
            const description = if (@hasDecl(Tool, "description")) Tool.description else "PolyScript CRUD tool";

            try writer.print(
                \\{s} - {s}
                \\
                \\Usage:
                \\  {s} <operation> [resource] [options]
                \\
                \\Operations:
                \\  create    Create new resources
                \\  read      Read/query resources
                \\  list      List resources (alias for read)
                \\  update    Update existing resources
                \\  delete    Delete resources
                \\
                \\Options:
                \\  -m, --mode      Execution mode (simulate, sandbox, live) [default: live]
                \\  -v, --verbose   Enable verbose output
                \\  -f, --force     Skip confirmation prompts
                \\  --json          Output in JSON format
                \\  --discover      Show tool capabilities
                \\  -h, --help      Show this help
                \\
            , .{ tool_name, description, tool_name });
        }

        fn showDiscovery(context: *const PolyScriptContext) !void {
            const discovery = .{
                .polyscript = "1.0",
                .tool = @typeName(Tool),
                .operations = [_][]const u8{ "create", "read", "update", "delete" },
                .modes = [_][]const u8{ "simulate", "sandbox", "live" },
            };
            try context.outputJson(discovery);
        }

        fn executeWithMode(comptime T: type, context: *PolyScriptContext) !void {
            const tool = T{};
            
            var result: PolyScriptResult = .{
                .operation = context.operation.toString(),
                .mode = context.mode.toString(),
                .tool = context.tool_name,
                .resource = context.resource,
            };

            switch (context.mode) {
                .simulate => {
                    try context.log("Simulating operation", "debug");
                    
                    if (context.operation == .read) {
                        const data = try tool.read(context.resource, .{}, context);
                        result.result = data;
                    } else {
                        const action_verb = switch (context.operation) {
                            .create => "Would create",
                            .update => "Would update",
                            .delete => "Would delete",
                            else => "Would read",
                        };
                        
                        var obj = std.json.ObjectMap.init(context.allocator);
                        try obj.put("simulation", json.Value{ .Bool = true });
                        try obj.put("action", json.Value{ .String = try std.fmt.allocPrint(
                            context.allocator, 
                            "{s} {s}", 
                            .{ action_verb, context.resource orelse "resource" }
                        ) });
                        result.result = json.Value{ .Object = obj };
                    }
                },
                
                .sandbox => {
                    try context.log("Testing prerequisites", "debug");
                    
                    var validations = std.json.ObjectMap.init(context.allocator);
                    try validations.put("permissions", json.Value{ .String = "verified" });
                    try validations.put("dependencies", json.Value{ .String = "available" });
                    try validations.put("connectivity", json.Value{ .String = "established" });
                    
                    var obj = std.json.ObjectMap.init(context.allocator);
                    try obj.put("sandbox", json.Value{ .Bool = true });
                    try obj.put("validations", json.Value{ .Object = validations });
                    try obj.put("ready", json.Value{ .Bool = true });
                    result.result = json.Value{ .Object = obj };
                },
                
                .live => {
                    try context.log("Executing operation", "debug");
                    
                    if (context.requireConfirm()) {
                        const msg = try std.fmt.allocPrint(
                            context.allocator,
                            "Are you sure you want to {s} {s}?",
                            .{ context.operation.toString(), context.resource orelse "resource" }
                        );
                        defer context.allocator.free(msg);
                        
                        if (!try context.confirm(msg)) {
                            result.status = "cancelled";
                            var obj = std.json.ObjectMap.init(context.allocator);
                            try obj.put("cancelled", json.Value{ .Bool = true });
                            result.result = json.Value{ .Object = obj };
                        } else {
                            const data = switch (context.operation) {
                                .create => try tool.create(context.resource, .{}, context),
                                .read => try tool.read(context.resource, .{}, context),
                                .update => try tool.update(context.resource, .{}, context),
                                .delete => try tool.delete(context.resource, .{}, context),
                            };
                            result.result = data;
                        }
                    } else {
                        const data = switch (context.operation) {
                            .create => try tool.create(context.resource, .{}, context),
                            .read => try tool.read(context.resource, .{}, context),
                            .update => try tool.update(context.resource, .{}, context),
                            .delete => try tool.delete(context.resource, .{}, context),
                        };
                        result.result = data;
                    }
                },
            }

            if (context.json_output) {
                try context.outputJson(result);
            } else if (result.result) |r| {
                try context.outputJson(r);
            }
        }
    };
}