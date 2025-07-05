const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const polyscript_module = b.addModule("polyscript", .{
        .source_file = .{ .path = "polyscript_framework.zig" },
    });

    // Add test executable if needed
    const tests = b.addTest(.{
        .root_source_file = .{ .path = "polyscript_framework.zig" },
        .target = target,
        .optimize = optimize,
    });

    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&tests.step);
}