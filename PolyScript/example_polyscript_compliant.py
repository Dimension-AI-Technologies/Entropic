#!/usr/bin/env python3
"""
Example PolyScript-compliant script
Demonstrates the PolyScript v1.0 standard
"""

import argparse
import json
import sys


def main():
    parser = argparse.ArgumentParser(
        description="Example PolyScript-compliant server manager"
    )
    
    # Standard mode argument (required by PolyScript)
    parser.add_argument(
        "--mode",
        choices=["status", "test", "sandbox", "live"],
        default="status",
        help="Execution mode: status (default), test, sandbox, or live"
    )
    
    # Standard flags (required by PolyScript)
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--force", "-f", action="store_true", help="Skip confirmations")
    parser.add_argument("--json", action="store_true", help="Output in JSON format")
    
    # Script-specific operations
    ops = parser.add_mutually_exclusive_group()
    ops.add_argument("--list", action="store_true", help="List servers")
    ops.add_argument("--add", nargs="+", metavar="SERVER", help="Add servers")
    ops.add_argument("--remove", nargs="+", metavar="SERVER", help="Remove servers")
    
    args = parser.parse_args()
    
    # Prepare output data
    output = {
        "mode": args.mode,
        "operation": "unknown",
        "status": "success",
        "message": ""
    }
    
    # Determine operation
    if args.list:
        output["operation"] = "list"
    elif args.add:
        output["operation"] = "add"
        output["servers"] = args.add
    elif args.remove:
        output["operation"] = "remove"
        output["servers"] = args.remove
    
    # Mode-specific behavior
    if args.mode == "status":
        output["message"] = "System status: 3 servers configured"
        if args.verbose:
            output["details"] = ["server1: active", "server2: active", "server3: inactive"]
    
    elif args.mode == "test":
        output["message"] = f"[TEST MODE] Would {output['operation']} servers"
        output["changes"] = "No changes made (test mode)"
    
    elif args.mode == "sandbox":
        output["message"] = "[SANDBOX MODE] Testing connectivity"
        output["tests"] = ["npm: available", "network: connected"]
    
    elif args.mode == "live":
        output["message"] = f"[LIVE MODE] Executing {output['operation']}"
        if not args.force and output["operation"] in ["add", "remove"]:
            output["warning"] = "Use --force to skip confirmation in live mode"
    
    # Output based on format
    if args.json:
        print(json.dumps(output, indent=2))
    else:
        print(output["message"])
        if args.verbose and "details" in output:
            for detail in output["details"]:
                print(f"  - {detail}")
    
    # Return standard exit codes
    return 0 if output["status"] == "success" else 1


if __name__ == "__main__":
    sys.exit(main())