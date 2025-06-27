#!/usr/bin/env python3
"""
Find GitHub repositories with large-scale deletions in the last N days.
Uses GitHub CLI for authentication to access private repos.
"""

import asyncio
import aiohttp
import click
import json
import subprocess
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class DeletionInfo:
    date: str
    repo: str
    sha: str
    deletions: int
    files_affected: int
    main_file: str
    message: str

def get_gh_token() -> str:
    """Get GitHub token from gh CLI."""
    try:
        result = subprocess.run(['gh', 'auth', 'token'], 
                              capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        raise click.ClickException("GitHub CLI not authenticated. Please run: gh auth login")

def get_repos_list(account: str) -> List[str]:
    """Get repository list using gh CLI to access private repos."""
    try:
        result = subprocess.run([
            'gh', 'repo', 'list', account, 
            '--limit', '1000', 
            '--json', 'name',
            '--jq', '.[].name'
        ], capture_output=True, text=True, check=True)
        
        repos = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
        return repos
    except subprocess.CalledProcessError as e:
        raise click.ClickException(f"Failed to get repositories for {account}: {e.stderr}")

class GitHubAPI:
    def __init__(self):
        self.token = get_gh_token()
        self.headers = {
            'Authorization': f'token {self.token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        self.base_url = 'https://api.github.com'
    
    async def get_commits_in_range(self, session: aiohttp.ClientSession, account: str, repo: str, 
                                   since: str, until: str) -> List[Dict]:
        """Get commits for a repository in date range."""
        url = f"{self.base_url}/repos/{account}/{repo}/commits"
        params = {
            'since': f"{since}T00:00:00Z",
            'until': f"{until}T23:59:59Z",
            'per_page': 100
        }
        
        try:
            async with session.get(url, headers=self.headers, params=params) as resp:
                if resp.status == 409:  # Empty repository
                    return []
                elif resp.status == 404:  # Repository not found or no access
                    return []
                elif resp.status != 200:
                    return []
                
                commits = await resp.json()
                return commits
        except Exception:
            return []
    
    async def get_commit_stats(self, session: aiohttp.ClientSession, account: str, repo: str, sha: str) -> Optional[Dict]:
        """Get detailed stats for a specific commit."""
        url = f"{self.base_url}/repos/{account}/{repo}/commits/{sha}"
        
        try:
            async with session.get(url, headers=self.headers) as resp:
                if resp.status != 200:
                    return None
                
                commit_data = await resp.json()
                return commit_data
        except Exception:
            return None

async def check_repo_for_deletions(api: GitHubAPI, session: aiohttp.ClientSession, 
                                   account: str, repo: str, since: str, until: str, 
                                   threshold: int) -> List[DeletionInfo]:
    """Check a single repository for large deletions."""
    deletions = []
    
    # Get commits in date range
    commits = await api.get_commits_in_range(session, account, repo, since, until)
    
    if not commits:
        return deletions
    
    # Check each commit for large deletions
    for commit in commits:
        sha = commit['sha']
        commit_date = commit['commit']['author']['date'][:10]  # YYYY-MM-DD
        message = commit['commit']['message'].split('\n')[0][:80]  # First line, truncated
        
        # Get detailed stats
        commit_data = await api.get_commit_stats(session, account, repo, sha)
        
        if not commit_data or 'stats' not in commit_data:
            continue
        
        stats = commit_data['stats']
        deletions_count = stats.get('deletions', 0)
        
        if deletions_count >= threshold:
            # Find the file with most deletions
            files = commit_data.get('files', [])
            main_file = 'unknown'
            files_affected = len([f for f in files if f.get('deletions', 0) > 0])
            
            if files:
                max_file = max(files, key=lambda f: f.get('deletions', 0))
                filename = max_file['filename']
                if len(filename) > 40:
                    filename = '...' + filename[-37:]  # Truncate long filenames
                main_file = f"{filename} (-{max_file.get('deletions', 0)})"
            
            deletions.append(DeletionInfo(
                date=commit_date,
                repo=repo,
                sha=sha[:8],  # Short SHA
                deletions=deletions_count,
                files_affected=files_affected,
                main_file=main_file,
                message=message
            ))
    
    return deletions

async def scan_account(account: str, days: int, threshold: int, max_concurrent: int = 15) -> List[DeletionInfo]:
    """Scan all repositories in an account for large deletions."""
    api = GitHubAPI()
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    since_str = start_date.strftime('%Y-%m-%d')
    until_str = end_date.strftime('%Y-%m-%d')
    
    # Get all repositories using gh CLI
    click.echo("📋 Fetching repository list...")
    repos = get_repos_list(account)
    click.echo(f"📁 Found {len(repos)} repositories")
    
    if not repos:
        click.echo("No repositories found")
        return []
    
    async with aiohttp.ClientSession() as session:
        # Process repositories concurrently
        click.echo(f"🔍 Scanning for deletions ≥{threshold} lines...")
        
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def check_repo_with_semaphore(repo):
            async with semaphore:
                return await check_repo_for_deletions(api, session, account, repo, 
                                                      since_str, until_str, threshold)
        
        # Progress tracking
        completed = 0
        all_deletions = []
        
        # Process repositories in batches
        tasks = [check_repo_with_semaphore(repo) for repo in repos]
        
        for coro in asyncio.as_completed(tasks):
            repo_deletions = await coro
            all_deletions.extend(repo_deletions)
            completed += 1
            
            click.echo(f"\rProgress: {completed}/{len(repos)} repos checked, "
                      f"{len(all_deletions)} large deletions found", nl=False)
        
        click.echo()  # New line after progress
        
        # Sort by date (newest first)
        all_deletions.sort(key=lambda d: d.date, reverse=True)
        
        return all_deletions

@click.command()
@click.option('--account', required=True, help='GitHub account or organization name')
@click.option('--days', default=7, help='Number of days to look back (default: 7)')
@click.option('--threshold', default=100, help='Minimum lines deleted to report (default: 100)')
@click.option('--max-concurrent', default=15, help='Maximum concurrent API requests (default: 15)')
def main(account: str, days: int, threshold: int, max_concurrent: int):
    """Find GitHub repositories with large-scale deletions in the last N days."""
    
    click.echo(f"🔍 Scanning {account} for large deletions")
    click.echo(f"📅 Period: Last {days} days")
    click.echo(f"📏 Threshold: {threshold}+ lines deleted")
    click.echo("=" * 50)
    
    try:
        deletions = asyncio.run(scan_account(account, days, threshold, max_concurrent))
        
        click.echo("\n" + "=" * 50)
        click.echo("✅ Analysis complete!")
        click.echo(f"\n📊 Found {len(deletions)} large deletions")
        
        if deletions:
            click.echo(f"\n🗑️  Large deletions (newest first):")
            click.echo("-" * 50)
            
            for i, deletion in enumerate(deletions, 1):
                click.echo(f"{i}. {deletion.date} | {deletion.repo} | {deletion.sha}")
                click.echo(f"   💥 {deletion.deletions:,} lines deleted across {deletion.files_affected} files")
                click.echo(f"   📄 Largest: {deletion.main_file}")
                click.echo(f"   💬 {deletion.message}")
                click.echo()
            
            # Repository summary
            repo_totals = {}
            for deletion in deletions:
                repo_totals[deletion.repo] = repo_totals.get(deletion.repo, 0) + deletion.deletions
            
            if len(repo_totals) > 1:
                click.echo("📈 Top repositories by total deletions:")
                for repo, total in sorted(repo_totals.items(), key=lambda x: x[1], reverse=True)[:5]:
                    click.echo(f"   {repo}: {total:,} lines")
        else:
            click.echo(f"\nNo large-scale deletions found in the last {days} days.")
    
    except KeyboardInterrupt:
        click.echo("\n⏹️  Scan interrupted by user")
    except Exception as e:
        click.echo(f"\n❌ Error: {e}", err=True)
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()