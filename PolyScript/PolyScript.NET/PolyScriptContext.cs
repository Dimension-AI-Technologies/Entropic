/*
 * PolyScript.NET Context wrapper with libpolyscript integration
 * Provides unified behavioral contract interface for .NET languages
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

using System;

namespace PolyScript.NET
{
    /// <summary>
    /// PolyScript CRUD operations
    /// </summary>
    public enum PolyScriptOperation
    {
        Create = 0,
        Read = 1,
        Update = 2,
        Delete = 3
    }

    /// <summary>
    /// PolyScript execution modes
    /// </summary>
    public enum PolyScriptMode
    {
        Simulate = 0,
        Sandbox = 1,
        Live = 2
    }

    /// <summary>
    /// Context providing behavioral contract queries via libpolyscript FFI
    /// </summary>
    public class PolyScriptContext
    {
        public PolyScriptOperation Operation { get; set; }
        public PolyScriptMode Mode { get; set; }
        public string? Resource { get; set; }
        public string? RebadgedAs { get; set; }
        public bool Verbose { get; set; }
        public bool Force { get; set; }
        public bool JsonOutput { get; set; }
        public string ToolName { get; set; }

        private static bool _libpolyscriptAvailable = true;

        public PolyScriptContext(PolyScriptOperation operation, PolyScriptMode mode, string toolName)
        {
            Operation = operation;
            Mode = mode;
            ToolName = toolName ?? "UnknownTool";
        }

        /// <summary>
        /// Check if current mode allows mutations
        /// </summary>
        public bool CanMutate()
        {
            if (_libpolyscriptAvailable)
            {
                try
                {
                    return LibPolyScript.polyscript_can_mutate((int)Mode);
                }
                catch (DllNotFoundException)
                {
                    _libpolyscriptAvailable = false;
                    // Fall through to fallback
                }
                catch (Exception)
                {
                    // Fall through to fallback
                }
            }

            // Fallback implementation
            return Mode == PolyScriptMode.Live;
        }

        /// <summary>
        /// Check if current mode should validate prerequisites
        /// </summary>
        public bool ShouldValidate()
        {
            if (_libpolyscriptAvailable)
            {
                try
                {
                    return LibPolyScript.polyscript_should_validate((int)Mode);
                }
                catch (DllNotFoundException)
                {
                    _libpolyscriptAvailable = false;
                    // Fall through to fallback
                }
                catch (Exception)
                {
                    // Fall through to fallback
                }
            }

            // Fallback implementation
            return Mode == PolyScriptMode.Sandbox;
        }

        /// <summary>
        /// Check if confirmation is required for destructive operations
        /// </summary>
        public bool RequireConfirm()
        {
            if (_libpolyscriptAvailable)
            {
                try
                {
                    return LibPolyScript.polyscript_require_confirm((int)Mode, (int)Operation) && !Force;
                }
                catch (DllNotFoundException)
                {
                    _libpolyscriptAvailable = false;
                    // Fall through to fallback
                }
                catch (Exception)
                {
                    // Fall through to fallback
                }
            }

            // Fallback implementation
            return Mode == PolyScriptMode.Live &&
                   (Operation == PolyScriptOperation.Update || Operation == PolyScriptOperation.Delete) &&
                   !Force;
        }

        /// <summary>
        /// Check if current mode is safe (non-mutating)
        /// </summary>
        public bool IsSafeMode()
        {
            if (_libpolyscriptAvailable)
            {
                try
                {
                    return LibPolyScript.polyscript_is_safe_mode((int)Mode);
                }
                catch (DllNotFoundException)
                {
                    _libpolyscriptAvailable = false;
                    // Fall through to fallback
                }
                catch (Exception)
                {
                    // Fall through to fallback
                }
            }

            // Fallback implementation
            return Mode != PolyScriptMode.Live;
        }

        /// <summary>
        /// Get discovery information as JSON
        /// </summary>
        public string GetDiscoveryJson()
        {
            return LibPolyScript.FormatDiscoveryJson(ToolName);
        }

        /// <summary>
        /// Get libpolyscript version
        /// </summary>
        public static string GetLibraryVersion()
        {
            return LibPolyScript.GetVersion();
        }
    }
}