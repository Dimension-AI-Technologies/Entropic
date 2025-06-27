#!/usr/bin/env python3

import os
import re
import argparse
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import mimetypes

class FileStats:
    def __init__(self):
        self.size = 0
        self.lines_with_blanks = 0
        self.lines_without_blanks = 0
        self.file_count = 0

    def add(self, other):
        self.size += other.size
        self.lines_with_blanks += other.lines_with_blanks
        self.lines_without_blanks += other.lines_without_blanks
        self.file_count += other.file_count

class FileTree:
    def __init__(self):
        self.tree = {'_files': {}, '_dirs': {}}
        self.stats_cache = {}

    def add_file(self, path: str, stats: FileStats):
        parts = path.split(os.sep)
        current = self.tree
        
        # Navigate/create directory structure
        for part in parts[:-1]:
            if '_dirs' not in current:
                current['_dirs'] = {}
            if part not in current['_dirs']:
                current['_dirs'][part] = {'_files': {}, '_dirs': {}}
            current = current['_dirs'][part]
        
        # Add file to current directory
        filename = parts[-1]
        if '_files' not in current:
            current['_files'] = {}
        current['_files'][filename] = stats

    def get_stats(self, path: str = '') -> FileStats:
        if path in self.stats_cache:
            return self.stats_cache[path]
        
        stats = FileStats()
        current = self._navigate_to_path(path)
        
        if current is None:
            return stats
        
        self._aggregate_stats(current, stats)
        self.stats_cache[path] = stats
        return stats

    def _navigate_to_path(self, path: str):
        if not path:
            return self.tree
        
        parts = path.split(os.sep)
        current = self.tree
        
        for part in parts:
            if part in current:
                current = current[part]
            elif '_dirs' in current and part in current['_dirs']:
                current = current['_dirs'][part]
            else:
                return None
        
        return current

    def _aggregate_stats(self, node: dict, stats: FileStats):
        if '_files' in node:
            for file_stats in node['_files'].values():
                stats.add(file_stats)
        
        if '_dirs' in node:
            for subdir in node['_dirs'].values():
                self._aggregate_stats(subdir, stats)
        
        for key, value in node.items():
            if key not in ['_files', '_dirs'] and isinstance(value, dict):
                self._aggregate_stats(value, stats)

    def get_all_paths(self, node=None, current_path=''):
        if node is None:
            node = self.tree
        
        paths = []
        
        if current_path:
            paths.append(current_path)
        
        if '_dirs' in node:
            for dirname, subdir in node['_dirs'].items():
                subpath = os.path.join(current_path, dirname) if current_path else dirname
                paths.extend(self.get_all_paths(subdir, subpath))
        
        for key, value in node.items():
            if key not in ['_files', '_dirs'] and isinstance(value, dict):
                subpath = os.path.join(current_path, key) if current_path else key
                paths.extend(self.get_all_paths(value, subpath))
        
        return paths

def is_text_file(filepath: str) -> bool:
    try:
        mime_type, _ = mimetypes.guess_type(filepath)
        if mime_type and mime_type.startswith('text/'):
            return True
        
        # Common text file extensions that might not be detected by mimetypes
        text_extensions = {
            '.txt', '.md', '.rst', '.log', '.cfg', '.conf', '.ini', '.yaml', '.yml',
            '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts', '.jsx', '.tsx',
            '.py', '.rb', '.pl', '.sh', '.bash', '.zsh', '.fish', '.c', '.h', '.cpp',
            '.hpp', '.cc', '.cxx', '.java', '.cs', '.go', '.rs', '.swift', '.kt',
            '.scala', '.r', '.m', '.php', '.lua', '.vim', '.el', '.lisp', '.clj',
            '.hs', '.ml', '.fs', '.ex', '.exs', '.erl', '.hrl', '.zig', '.nim',
            '.d', '.ada', '.pas', '.f90', '.f95', '.f03', '.jl', '.cr', '.dart',
            '.groovy', '.gradle', '.cmake', '.make', '.dockerfile', '.dockerignore',
            '.gitignore', '.gitattributes', '.editorconfig', '.env', '.toml'
        }
        
        _, ext = os.path.splitext(filepath.lower())
        if ext in text_extensions:
            return True
        
        # Check if file has no extension but might be text (like 'Makefile', 'README')
        basename = os.path.basename(filepath)
        if basename.lower() in {'makefile', 'readme', 'license', 'changelog', 'authors', 'contributors'}:
            return True
        
        # Try to read first few bytes to check if it's text
        try:
            with open(filepath, 'rb') as f:
                chunk = f.read(512)
                if b'\0' in chunk:
                    return False
                try:
                    chunk.decode('utf-8')
                    return True
                except UnicodeDecodeError:
                    return False
        except:
            return False
    except:
        return False

def analyze_file(filepath: str) -> FileStats:
    stats = FileStats()
    stats.file_count = 1
    
    try:
        stats.size = os.path.getsize(filepath)
        
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                stats.lines_with_blanks += 1
                if line.strip():
                    stats.lines_without_blanks += 1
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    
    return stats

def scan_directory(root_path: str, pattern: Optional[str] = None) -> FileTree:
    tree = FileTree()
    regex = re.compile(pattern) if pattern else None
    
    for dirpath, dirnames, filenames in os.walk(root_path):
        # Skip hidden directories and common non-source directories
        dirnames[:] = [d for d in dirnames if not d.startswith('.') and d not in {'node_modules', '__pycache__', 'target', 'dist', 'build'}]
        
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            relative_path = os.path.relpath(filepath, root_path)
            
            if regex and not regex.search(relative_path):
                continue
            
            if is_text_file(filepath):
                stats = analyze_file(filepath)
                tree.add_file(relative_path, stats)
    
    return tree

def format_size(size: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"

def print_results(paths: List[Tuple[str, FileStats]], sort_by: str, threshold: int = 0):
    if not paths:
        print("No results found.")
        return
    
    # Filter by threshold
    if sort_by == 'size':
        paths = [(p, s) for p, s in paths if s.size >= threshold]
    elif sort_by == 'lines_with_blanks':
        paths = [(p, s) for p, s in paths if s.lines_with_blanks >= threshold]
    elif sort_by == 'lines_without_blanks':
        paths = [(p, s) for p, s in paths if s.lines_without_blanks >= threshold]
    
    # Sort
    if sort_by == 'alpha':
        paths.sort(key=lambda x: x[0])
    elif sort_by == 'size':
        paths.sort(key=lambda x: x[1].size, reverse=True)
    elif sort_by == 'lines_with_blanks':
        paths.sort(key=lambda x: x[1].lines_with_blanks, reverse=True)
    elif sort_by == 'lines_without_blanks':
        paths.sort(key=lambda x: x[1].lines_without_blanks, reverse=True)
    
    # Print header
    print(f"{'Path':<60} {'Size':>12} {'Lines (w/ blanks)':>18} {'Lines (w/o blanks)':>19} {'Files':>7}")
    print("-" * 120)
    
    # Print results
    for path, stats in paths:
        if not path:
            path = "."
        print(f"{path:<60} {format_size(stats.size):>12} {stats.lines_with_blanks:>18,} {stats.lines_without_blanks:>19,} {stats.file_count:>7,}")

def main():
    parser = argparse.ArgumentParser(description='Analyze text file sizes and line counts in a directory tree')
    parser.add_argument('path', nargs='?', default='.', help='Root directory to analyze (default: current directory)')
    parser.add_argument('-p', '--pattern', help='Regex pattern to filter files/directories')
    parser.add_argument('-s', '--sort', choices=['alpha', 'size', 'lines_with_blanks', 'lines_without_blanks'], 
                        default='size', help='Sort order (default: size)')
    parser.add_argument('-t', '--threshold', type=int, default=0, 
                        help='Minimum threshold for display (interpretation depends on sort order)')
    parser.add_argument('-d', '--directories-only', action='store_true', 
                        help='Show only directory aggregates, not individual files')
    parser.add_argument('-f', '--files-only', action='store_true',
                        help='Show only individual files, not directory aggregates')
    parser.add_argument('-l', '--level', type=int, 
                        help='Maximum directory depth to display (0 = root only)')
    
    args = parser.parse_args()
    
    print(f"Scanning {os.path.abspath(args.path)}...")
    tree = scan_directory(args.path, args.pattern)
    
    # Get all paths and their stats
    results = []
    
    if not args.files_only:
        all_paths = tree.get_all_paths()
        for path in all_paths:
            stats = tree.get_stats(path)
            if args.level is not None:
                depth = path.count(os.sep) if path else 0
                if depth > args.level:
                    continue
            results.append((path, stats))
    
    if not args.directories_only:
        # Add individual files
        def collect_files(node, current_path=''):
            if '_files' in node:
                for filename, stats in node['_files'].items():
                    filepath = os.path.join(current_path, filename) if current_path else filename
                    results.append((filepath, stats))
            
            if '_dirs' in node:
                for dirname, subdir in node['_dirs'].items():
                    subpath = os.path.join(current_path, dirname) if current_path else dirname
                    collect_files(subdir, subpath)
            
            for key, value in node.items():
                if key not in ['_files', '_dirs'] and isinstance(value, dict):
                    subpath = os.path.join(current_path, key) if current_path else key
                    collect_files(value, subpath)
        
        collect_files(tree.tree)
    
    # Print totals
    total_stats = tree.get_stats('')
    print(f"\nTotal: {total_stats.file_count:,} files, {format_size(total_stats.size)}, "
          f"{total_stats.lines_with_blanks:,} lines (w/ blanks), "
          f"{total_stats.lines_without_blanks:,} lines (w/o blanks)\n")
    
    # Print sorted results
    print_results(results, args.sort, args.threshold)

if __name__ == '__main__':
    main()