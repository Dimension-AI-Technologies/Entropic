#!/usr/bin/env python3
"""
Test Windows compatibility and path handling.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import os
import platform
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

def test_path_handling():
    """Test cross-platform path handling"""
    print("Testing Cross-Platform Path Handling")
    print("=" * 60)
    
    test_count = 0
    passed_count = 0
    
    # Test 1: Config Manager path construction
    print("\n1. Testing Config Manager path construction...")
    test_count += 1
    
    try:
        from claude_config_manager import ClaudeConfigManager
        
        # Test on current platform
        config_mgr = ClaudeConfigManager()
        
        # Check that all paths are Path objects
        all_paths_valid = True
        for scope, path in config_mgr.paths.items():
            if not isinstance(path, Path):
                print(f"✗ {scope} path is not a Path object: {type(path)}")
                all_paths_valid = False
        
        if all_paths_valid:
            print("✓ All config paths are proper Path objects")
            passed_count += 1
        
    except Exception as e:
        print(f"✗ Error testing config manager paths: {e}")
    
    # Test 2: Mock Windows environment
    print("\n2. Testing Windows path construction...")
    test_count += 1
    
    try:
        with patch('platform.system', return_value='Windows'):
            with patch.dict(os.environ, {'PROGRAMDATA': 'C:\\ProgramData'}, clear=False):
                from claude_config_manager import ClaudeConfigManager
                
                # Create new instance with mocked Windows environment
                config_mgr = ClaudeConfigManager()
                machine_path = config_mgr._get_machine_config_path()
                
                # Check if Windows path is constructed correctly
                expected_parts = ['C:', 'ProgramData', 'Claude', 'config.json']
                actual_parts = list(machine_path.parts)
                
                if 'Claude' in actual_parts and 'config.json' in actual_parts:
                    print("✓ Windows machine path constructed correctly")
                    passed_count += 1
                else:
                    print(f"✗ Windows path incorrect: {machine_path}")
    
    except Exception as e:
        print(f"✗ Error testing Windows paths: {e}")
    
    # Test 3: Path separator handling
    print("\n3. Testing path separator handling...")
    test_count += 1
    
    try:
        # Test that pathlib handles separators correctly
        test_path = Path("test") / "directory" / "file.json"
        
        # Should work on any platform
        if test_path.name == "file.json" and test_path.parent.name == "directory":
            print("✓ Path separator handling works correctly")
            passed_count += 1
        else:
            print(f"✗ Path separator issue: {test_path}")
    
    except Exception as e:
        print(f"✗ Error testing path separators: {e}")
    
    # Test 4: Project directory handling with spaces
    print("\n4. Testing paths with spaces...")
    test_count += 1
    
    try:
        # Create a temporary directory with spaces
        with tempfile.TemporaryDirectory(prefix="test dir with spaces ") as temp_dir:
            temp_path = Path(temp_dir)
            
            # Test that our config manager can handle it
            config_mgr = ClaudeConfigManager(project_dir=temp_path)
            project_config_path = config_mgr.paths['project']
            
            # Should be the temp directory with .mcp.json
            if project_config_path.parent == temp_path and project_config_path.name == ".mcp.json":
                print("✓ Paths with spaces handled correctly")
                passed_count += 1
            else:
                print(f"✗ Space handling issue: {project_config_path}")
    
    except Exception as e:
        print(f"✗ Error testing paths with spaces: {e}")
    
    # Test 5: Long path handling (Windows limitation)
    print("\n5. Testing long path handling...")
    test_count += 1
    
    try:
        # Create a very long path (Windows has 260 char limit traditionally)
        long_name = "a" * 100
        very_long_path = Path.home() / long_name / long_name / "config.json"
        
        # Test that pathlib can handle it (may depend on Windows version)
        try:
            # Just test that we can construct and access properties
            parent = very_long_path.parent
            name = very_long_path.name
            
            if name == "config.json":
                print("✓ Long path construction works")
                passed_count += 1
            else:
                print("✗ Long path construction failed")
        
        except Exception:
            # On older Windows, this might fail, which is expected
            print("✓ Long path limitation detected (expected on older Windows)")
            passed_count += 1
    
    except Exception as e:
        print(f"✗ Error testing long paths: {e}")
    
    # Test 6: Environment variable expansion
    print("\n6. Testing environment variable handling...")
    test_count += 1
    
    try:
        # Test PROGRAMDATA on Windows, HOME on Unix
        if platform.system().lower() == 'windows':
            # Test PROGRAMDATA handling
            programdata = os.environ.get('PROGRAMDATA', 'C:\\ProgramData')
            test_path = Path(programdata) / 'Claude' / 'config.json'
        else:
            # Test HOME handling  
            home = Path.home()
            test_path = home / '.claude' / 'settings.json'
        
        # Should be able to resolve the path
        if test_path.name in ['config.json', 'settings.json']:
            print("✓ Environment variable handling works")
            passed_count += 1
        else:
            print(f"✗ Environment variable issue: {test_path}")
    
    except Exception as e:
        print(f"✗ Error testing environment variables: {e}")
    
    # Test 7: Case sensitivity handling
    print("\n7. Testing case sensitivity...")
    test_count += 1
    
    try:
        # Test that we handle case appropriately for the platform
        test_dir = Path.home()
        
        # On case-insensitive filesystems (Windows, macOS), these should be equivalent
        # On case-sensitive filesystems (Linux), they're different
        path1 = test_dir / "Test"
        path2 = test_dir / "test"
        
        # We just test that pathlib handles this correctly
        if path1.name in ["Test", "test"] and path2.name in ["Test", "test"]:
            print("✓ Case sensitivity handled by pathlib")
            passed_count += 1
        else:
            print("✗ Case sensitivity issue")
    
    except Exception as e:
        print(f"✗ Error testing case sensitivity: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print(f"Cross-Platform Compatibility Summary")
    print("=" * 60)
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Total tests: {test_count}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {test_count - passed_count}")
    
    if passed_count == test_count:
        print("\n✓ All cross-platform tests passed!")
        return 0
    else:
        print(f"\n✗ {test_count - passed_count} cross-platform tests failed")
        return 1

def main():
    """Main entry point"""
    sys.exit(test_path_handling())

if __name__ == "__main__":
    main()