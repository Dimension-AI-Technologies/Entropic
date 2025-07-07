/*
 * PolyScript.NET P/Invoke wrapper for libpolyscript
 * Provides .NET interop for C#, F#, VB.NET, and PowerShell
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

using System;
using System.Runtime.InteropServices;

namespace PolyScript.NET
{
    /// <summary>
    /// P/Invoke wrapper for libpolyscript C++ library
    /// </summary>
    public static class LibPolyScript
    {
        // Platform-specific library names
        private const string LibraryName = "libpolyscript";
        
        // For cross-platform compatibility, we need different library names
        private static readonly string PlatformLibraryName = RuntimeInformation.IsOSPlatform(OSPlatform.Windows) 
            ? "libpolyscript.dll"
            : RuntimeInformation.IsOSPlatform(OSPlatform.OSX)
                ? "libpolyscript.dylib" 
                : "libpolyscript.so";

        /// <summary>
        /// Check if the current mode allows mutations
        /// </summary>
        /// <param name="mode">Mode enum value (0=Simulate, 1=Sandbox, 2=Live)</param>
        /// <returns>True if mutations are allowed</returns>
        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        [return: MarshalAs(UnmanagedType.I1)]
        public static extern bool polyscript_can_mutate(int mode);

        /// <summary>
        /// Check if the current mode should validate prerequisites
        /// </summary>
        /// <param name="mode">Mode enum value (0=Simulate, 1=Sandbox, 2=Live)</param>
        /// <returns>True if validation should occur</returns>
        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        [return: MarshalAs(UnmanagedType.I1)]
        public static extern bool polyscript_should_validate(int mode);

        /// <summary>
        /// Check if confirmation is required for the operation
        /// </summary>
        /// <param name="mode">Mode enum value (0=Simulate, 1=Sandbox, 2=Live)</param>
        /// <param name="operation">Operation enum value (0=Create, 1=Read, 2=Update, 3=Delete)</param>
        /// <returns>True if confirmation is required</returns>
        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        [return: MarshalAs(UnmanagedType.I1)]
        public static extern bool polyscript_require_confirm(int mode, int operation);

        /// <summary>
        /// Check if the current mode is safe (non-mutating)
        /// </summary>
        /// <param name="mode">Mode enum value (0=Simulate, 1=Sandbox, 2=Live)</param>
        /// <returns>True if mode is safe</returns>
        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        [return: MarshalAs(UnmanagedType.I1)]
        public static extern bool polyscript_is_safe_mode(int mode);

        /// <summary>
        /// Get the library version string
        /// </summary>
        /// <returns>Version string pointer</returns>
        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr polyscript_get_version();

        /// <summary>
        /// Format discovery information as JSON
        /// </summary>
        /// <param name="toolName">Tool name</param>
        /// <returns>JSON string pointer (must be freed with polyscript_free_string)</returns>
        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr polyscript_format_discovery_json([MarshalAs(UnmanagedType.LPStr)] string toolName);

        /// <summary>
        /// Free memory allocated by libpolyscript
        /// </summary>
        /// <param name="ptr">Pointer to free</param>
        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void polyscript_free_string(IntPtr ptr);

        /// <summary>
        /// Safe wrapper to get version string
        /// </summary>
        /// <returns>Version string</returns>
        public static string GetVersion()
        {
            try
            {
                var ptr = polyscript_get_version();
                return Marshal.PtrToStringAnsi(ptr) ?? "unknown";
            }
            catch (DllNotFoundException)
            {
                return "1.0-fallback";
            }
            catch (Exception)
            {
                return "unknown";
            }
        }

        /// <summary>
        /// Safe wrapper to format discovery JSON
        /// </summary>
        /// <param name="toolName">Tool name</param>
        /// <returns>Discovery JSON string</returns>
        public static string FormatDiscoveryJson(string toolName)
        {
            try
            {
                var ptr = polyscript_format_discovery_json(toolName);
                if (ptr == IntPtr.Zero)
                    return "{}";
                
                var result = Marshal.PtrToStringAnsi(ptr) ?? "{}";
                polyscript_free_string(ptr);
                return result;
            }
            catch (DllNotFoundException)
            {
                // Fallback JSON format
                return $@"{{
    ""polyscript"": ""1.0"",
    ""tool"": ""{toolName}"",
    ""operations"": [""create"", ""read"", ""update"", ""delete""],
    ""modes"": [""simulate"", ""sandbox"", ""live""],
    ""source"": ""fallback""
}}";
            }
            catch (Exception)
            {
                return "{}";
            }
        }
    }
}