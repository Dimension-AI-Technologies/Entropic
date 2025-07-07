/**
 * Rust FFI bindings for libpolyscript
 * Provides safe Rust wrapper around the C interface
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};

/// CRUD operations matching libpolyscript enum
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(C)]
pub enum Operation {
    Create = 0,
    Read = 1,
    Update = 2,
    Delete = 3,
}

/// Execution modes matching libpolyscript enum
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(C)]
pub enum Mode {
    Simulate = 0,
    Sandbox = 1,
    Live = 2,
}

/// Context structure for PolyScript operations
#[derive(Debug)]
pub struct PolyScriptContext {
    pub operation: Operation,
    pub mode: Mode,
    pub resource: Option<String>,
    pub rebadged_as: Option<String>,
    pub verbose: bool,
    pub force: bool,
    pub json_output: bool,
    pub tool_name: String,
}

impl PolyScriptContext {
    pub fn new(operation: Operation, mode: Mode, tool_name: String) -> Self {
        Self {
            operation,
            mode,
            resource: None,
            rebadged_as: None,
            verbose: false,
            force: false,
            json_output: false,
            tool_name,
        }
    }
    
    /// Check if this context allows mutations
    pub fn can_mutate(&self) -> bool {
        unsafe { polyscript_can_mutate(self.mode as c_int) }
    }
    
    /// Check if this context should validate prerequisites
    pub fn should_validate(&self) -> bool {
        unsafe { polyscript_should_validate(self.mode as c_int) }
    }
    
    /// Check if this operation requires confirmation
    pub fn require_confirm(&self) -> bool {
        unsafe { 
            polyscript_require_confirm(self.mode as c_int, self.operation as c_int) && !self.force 
        }
    }
    
    /// Check if this is a safe (non-mutating) mode
    pub fn is_safe_mode(&self) -> bool {
        unsafe { polyscript_is_safe_mode(self.mode as c_int) }
    }
}

/// Raw FFI declarations matching the C interface
extern "C" {
    // Core behavioral query functions
    fn polyscript_can_mutate(mode: c_int) -> bool;
    fn polyscript_should_validate(mode: c_int) -> bool;
    fn polyscript_require_confirm(mode: c_int, operation: c_int) -> bool;
    fn polyscript_is_safe_mode(mode: c_int) -> bool;
    
    // String conversion functions
    fn polyscript_operation_to_string(operation: c_int) -> *const c_char;
    fn polyscript_mode_to_string(mode: c_int) -> *const c_char;
    fn polyscript_string_to_operation(str: *const c_char) -> c_int;
    fn polyscript_string_to_mode(str: *const c_char) -> c_int;
    
    // Version information
    fn polyscript_get_version() -> *const c_char;
    fn polyscript_get_version_major() -> c_int;
    fn polyscript_get_version_minor() -> c_int;
    fn polyscript_get_version_patch() -> c_int;
    
    // Discovery functions
    fn polyscript_format_discovery_json(tool_name: *const c_char) -> *mut c_char;
    fn polyscript_free_string(str: *mut c_char);
    
    // Context validation
    fn polyscript_validate_operation(operation: c_int) -> bool;
    fn polyscript_validate_mode(mode: c_int) -> bool;
}

/// Safe wrapper for operation to string conversion
pub fn operation_to_string(operation: Operation) -> &'static str {
    unsafe {
        let c_str = polyscript_operation_to_string(operation as c_int);
        CStr::from_ptr(c_str).to_str().unwrap_or("unknown")
    }
}

/// Safe wrapper for mode to string conversion
pub fn mode_to_string(mode: Mode) -> &'static str {
    unsafe {
        let c_str = polyscript_mode_to_string(mode as c_int);
        CStr::from_ptr(c_str).to_str().unwrap_or("unknown")
    }
}

/// Safe wrapper for string to operation conversion
pub fn string_to_operation(s: &str) -> Option<Operation> {
    let c_str = CString::new(s).ok()?;
    let result = unsafe { polyscript_string_to_operation(c_str.as_ptr()) };
    match result {
        0 => Some(Operation::Create),
        1 => Some(Operation::Read),
        2 => Some(Operation::Update),
        3 => Some(Operation::Delete),
        _ => None,
    }
}

/// Safe wrapper for string to mode conversion
pub fn string_to_mode(s: &str) -> Mode {
    let c_str = CString::new(s).unwrap_or_default();
    let result = unsafe { polyscript_string_to_mode(c_str.as_ptr()) };
    match result {
        0 => Mode::Simulate,
        1 => Mode::Sandbox,
        _ => Mode::Live, // Default to Live
    }
}

/// Get PolyScript version
pub fn get_version() -> &'static str {
    unsafe {
        let c_str = polyscript_get_version();
        CStr::from_ptr(c_str).to_str().unwrap_or("unknown")
    }
}

/// Format discovery information as JSON
pub fn format_discovery_json(tool_name: &str) -> Result<String, std::ffi::NulError> {
    let c_tool_name = CString::new(tool_name)?;
    
    unsafe {
        let json_ptr = polyscript_format_discovery_json(c_tool_name.as_ptr());
        if json_ptr.is_null() {
            return Ok(String::new());
        }
        
        let c_str = CStr::from_ptr(json_ptr);
        let result = c_str.to_string_lossy().into_owned();
        
        // Free the allocated string
        polyscript_free_string(json_ptr);
        
        Ok(result)
    }
}

/// Validate an operation value
pub fn validate_operation(operation: Operation) -> bool {
    unsafe { polyscript_validate_operation(operation as c_int) }
}

/// Validate a mode value  
pub fn validate_mode(mode: Mode) -> bool {
    unsafe { polyscript_validate_mode(mode as c_int) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        let version = get_version();
        assert_eq!(version, "1.0");
    }
    
    #[test]
    fn test_operation_conversions() {
        assert_eq!(operation_to_string(Operation::Create), "create");
        assert_eq!(operation_to_string(Operation::Read), "read");
        assert_eq!(operation_to_string(Operation::Update), "update");
        assert_eq!(operation_to_string(Operation::Delete), "delete");
        
        assert_eq!(string_to_operation("create"), Some(Operation::Create));
        assert_eq!(string_to_operation("read"), Some(Operation::Read));
        assert_eq!(string_to_operation("invalid"), None);
    }
    
    #[test]
    fn test_mode_conversions() {
        assert_eq!(mode_to_string(Mode::Simulate), "simulate");
        assert_eq!(mode_to_string(Mode::Sandbox), "sandbox");
        assert_eq!(mode_to_string(Mode::Live), "live");
        
        assert_eq!(string_to_mode("simulate"), Mode::Simulate);
        assert_eq!(string_to_mode("sandbox"), Mode::Sandbox);
        assert_eq!(string_to_mode("live"), Mode::Live);
        assert_eq!(string_to_mode("invalid"), Mode::Live); // Default
    }
    
    #[test]
    fn test_mode_behaviors() {
        let simulate_ctx = PolyScriptContext::new(Operation::Create, Mode::Simulate, "test".to_string());
        assert!(!simulate_ctx.can_mutate());
        assert!(!simulate_ctx.should_validate());
        assert!(simulate_ctx.is_safe_mode());
        
        let sandbox_ctx = PolyScriptContext::new(Operation::Create, Mode::Sandbox, "test".to_string());
        assert!(!sandbox_ctx.can_mutate());
        assert!(sandbox_ctx.should_validate());
        assert!(sandbox_ctx.is_safe_mode());
        
        let live_ctx = PolyScriptContext::new(Operation::Create, Mode::Live, "test".to_string());
        assert!(live_ctx.can_mutate());
        assert!(!live_ctx.should_validate());
        assert!(!live_ctx.is_safe_mode());
    }
    
    #[test]
    fn test_discovery_json() {
        let json = format_discovery_json("TestTool").unwrap();
        assert!(json.contains("\"polyscript\": \"1.0\""));
        assert!(json.contains("\"tool\": \"TestTool\""));
        assert!(json.contains("\"operations\""));
        assert!(json.contains("\"modes\""));
    }
    
    #[test]
    fn test_validation() {
        assert!(validate_operation(Operation::Create));
        assert!(validate_operation(Operation::Read));
        assert!(validate_operation(Operation::Update));
        assert!(validate_operation(Operation::Delete));
        
        assert!(validate_mode(Mode::Simulate));
        assert!(validate_mode(Mode::Sandbox));
        assert!(validate_mode(Mode::Live));
    }
}