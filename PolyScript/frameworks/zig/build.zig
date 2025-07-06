const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const polyscript_module = b.addModule("polyscript", .{
        .source_file = .{ .path = "polyscript_framework.zig" },
    });

    // Link against libpolyscript with graceful fallback if not available
    polyscript_module.addIncludePath(.{ .path = "../../libpolyscript/include" });
    polyscript_module.addLibraryPath(.{ .path = "../../libpolyscript/build" });
    polyscript_module.linkSystemLibrary("polyscript", .{});
    polyscript_module.linkLibC();

    // Add test executable if needed
    const tests = b.addTest(.{
        .root_source_file = .{ .path = "polyscript_framework.zig" },
        .target = target,
        .optimize = optimize,
    });

    // Link test executable with libpolyscript
    tests.addIncludePath(.{ .path = "../../libpolyscript/include" });
    tests.addLibraryPath(.{ .path = "../../libpolyscript/build" });
    tests.linkSystemLibrary("polyscript");
    tests.linkLibC();

    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&tests.step);
}