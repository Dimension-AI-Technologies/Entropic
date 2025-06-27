# Git Analysis Tools

Tools for analyzing GitHub repositories, commits, and large-scale deletions.

## Scripts

### `find_large_deletions.sh`
Shell script using GitHub CLI to find repositories with large deletions in recent days.

```bash
./find_large_deletions.sh --account <github-account> [--days <N>] [--threshold <lines>]
```

### `find_large_deletions.py`
Fast async Python implementation using GitHub API directly for better performance.

```bash
./find_large_deletions.py --account <github-account> [--days <N>] [--threshold <lines>]
```

### `find_large_deletions_gh.py`
Uses GitHub CLI for private repository access when direct API access is insufficient.

```bash
./find_large_deletions_gh.py --account <github-account> [--days <N>] [--threshold <lines>]
```

### `batch_check_commits.sh`
Analyze commits for a specific date across multiple repositories.

```bash
./batch_check_commits.sh --account <github-account> --date <YYYYMMDD> [--threshold <lines>]
```

### `batch_check_commits_days.sh`
Check commits over multiple days with standard performance.

```bash
./batch_check_commits_days.sh --account <github-account> --days <N> [--threshold <lines>]
```

### `batch_check_commits_days_fast.sh`
Optimized version for checking commits over multiple days with improved performance.

```bash
./batch_check_commits_days_fast.sh --account <github-account> --days <N> [--threshold <lines>]
```

## Requirements

- **GitHub CLI** (`gh`) - Must be installed and authenticated
- **Python 3** with asyncio support (for Python scripts)
- **GITHUB_TOKEN** environment variable (for Python API scripts)

## Architecture

- **Shell scripts** use `gh` CLI for simplicity and private repo access
- **Python scripts** use async HTTP requests for performance with public repos
- **_gh.py variants** specifically use GitHub CLI for enhanced private repo support

All scripts include parameter validation and help messages accessible via `--help`.