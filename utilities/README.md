# Utilities

General-purpose tools for file analysis and API testing.

## Scripts

### `find_size.py`
Analyze file sizes and statistics in a directory with comprehensive reporting.

```bash
./find_size.py [directory]
```

**Features:**
- File size analysis by extension and mime type
- Line counting (with and without blank lines)
- Detailed statistics and summaries
- Support for various file types and formats

### `test_api.py`
Test GitHub API connectivity and endpoints for authentication and access verification.

```bash
./test_api.py
```

**Features:**
- Tests multiple GitHub API endpoints
- Verifies GITHUB_TOKEN authentication
- Async HTTP requests for performance
- Useful for debugging API access issues

## Requirements

- **Python 3** with asyncio support
- **aiohttp** library (for API testing)
- **GITHUB_TOKEN** environment variable (for API testing)

## Use Cases

- **File analysis**: Understanding codebase composition and size metrics
- **API testing**: Verifying GitHub API connectivity and permissions
- **Development debugging**: Quick utilities for common development tasks