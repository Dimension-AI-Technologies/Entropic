#!/usr/bin/env ruby

=begin
Example: Backup Tool using PolyScript Ruby Framework

This demonstrates how the Ruby PolyScript framework eliminates boilerplate.
Shows Ruby's elegant syntax with zero CLI boilerplate.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
=end

require_relative 'polyscript_framework'
require 'fileutils'
require 'find'

# Full-featured backup tool using class approach
class BackupTool < PolyScript::Tool
  polyscript_description <<~DESC
    PolyScript-compliant backup tool with zero boilerplate

    Backs up directories with full PolyScript mode support.
    Provides status checking, dry-run testing, dependency validation,
    and live backup operations.
  DESC

  # Add custom options
  class_option :source, type: :string, default: '/source', desc: 'Source directory to backup'
  class_option :dest, type: :string, default: '/dest', desc: 'Destination directory'
  class_option :overwrite, type: :boolean, default: false, desc: 'Overwrite existing destination'

  private

  def polyscript_status(context)
    context.log('Checking backup status...')

    source_info = get_directory_info(source_path)
    dest_info = get_directory_info(dest_path)

    {
      'source' => {
        'path' => source_path,
        'exists' => source_info[:exists],
        'size_bytes' => source_info[:size],
        'file_count' => source_info[:files]
      },
      'destination' => {
        'path' => dest_path,
        'exists' => dest_info[:exists],
        'size_bytes' => dest_info[:size],
        'would_overwrite' => dest_info[:exists] && !overwrite?
      },
      'backup_needed' => source_info[:exists] && (!dest_info[:exists] || overwrite?)
    }
  end

  def polyscript_test(context)
    context.log('Planning backup operations...')

    source_info = get_directory_info(source_path)
    dest_info = get_directory_info(dest_path)

    unless source_info[:exists]
      context.output('Source directory does not exist', is_error: true)
      raise PolyScript::Error, 'Source directory does not exist'
    end

    operations = []

    if dest_info[:exists] && !overwrite?
      operations << {
        'operation' => 'skip',
        'reason' => 'destination exists and overwrite not specified',
        'source' => source_path,
        'destination' => dest_path
      }
    else
      operations << {
        'operation' => 'backup',
        'source' => source_path,
        'destination' => dest_path,
        'file_count' => source_info[:files],
        'size_bytes' => source_info[:size],
        'would_overwrite' => dest_info[:exists]
      }
    end

    {
      'planned_operations' => operations,
      'total_files' => source_info[:files],
      'total_size' => source_info[:size],
      'note' => 'No changes made in test mode'
    }
  end

  def polyscript_sandbox(context)
    context.log('Testing backup environment...')

    tests = {
      'source_readable' => test_source_readable,
      'destination_writable' => test_destination_writable,
      'sufficient_space' => test_sufficient_space,
      'filesystem_access' => test_filesystem_access
    }

    all_passed = tests.values.all? { |status| status == 'passed' }

    {
      'dependency_tests' => tests,
      'all_passed' => all_passed
    }
  end

  def polyscript_live(context)
    context.log('Preparing backup execution...')

    source_info = get_directory_info(source_path)
    unless source_info[:exists]
      context.output('Source directory does not exist', is_error: true)
      raise PolyScript::Error, 'Source directory does not exist'
    end

    dest_info = get_directory_info(dest_path)
    if dest_info[:exists] && !overwrite?
      unless context.confirm("Destination #{dest_path} exists. Overwrite?")
        return { 'status' => 'cancelled' }
      end
    end

    context.log("Starting backup from #{source_path} to #{dest_path}")

    begin
      # Simulate backup operation
      # In real implementation:
      # FileUtils.rm_rf(dest_path) if dest_info[:exists]
      # FileUtils.cp_r(source_path, dest_path)

      # For demo, just simulate with sleep
      sleep(1)
      context.log('Backup operation completed (simulated)')

      result_info = get_directory_info(dest_path)

      {
        'operation' => 'backup_completed',
        'source' => source_path,
        'destination' => dest_path,
        'files_copied' => result_info[:files],
        'bytes_copied' => result_info[:size]
      }

    rescue StandardError => e
      raise PolyScript::Error, "Backup failed: #{e.message}"
    end
  end

  # Helper methods - pure business logic
  def source_path
    options[:source]
  end

  def dest_path
    options[:dest]
  end

  def overwrite?
    options[:overwrite]
  end

  def get_directory_info(path)
    return { exists: false, size: 0, files: 0 } unless File.directory?(path)

    total_size = 0
    file_count = 0

    begin
      Find.find(path) do |file_path|
        next unless File.file?(file_path)
        
        file_count += 1
        total_size += File.size(file_path) rescue 0
      end
    rescue Errno::ENOENT, Errno::EACCES
      # Handle permission errors gracefully
    end

    { exists: true, size: total_size, files: file_count }
  end

  def test_source_readable
    File.readable?(source_path) ? 'passed' : 'failed'
  rescue StandardError
    'error'
  end

  def test_destination_writable
    dest_dir = File.dirname(dest_path)
    File.writable?(dest_dir) ? 'passed' : 'failed'
  rescue StandardError
    'error'
  end

  def test_sufficient_space
    source_info = get_directory_info(source_path)
    return 'unknown' unless source_info[:exists]

    # Simplified space check - in real implementation, check actual disk space
    # For demo, assume sufficient if source is less than 1GB
    source_info[:size] < 1_000_000_000 ? 'passed' : 'failed'
  rescue StandardError
    'error'
  end

  def test_filesystem_access
    temp_file = File.join(Dir.tmpdir, '.polyscript_test')
    File.write(temp_file, 'test')
    File.delete(temp_file)
    'passed'
  rescue StandardError
    'failed'
  end
end

# Simple tool using utility method
SimpleBackupTool = PolyScript.create_tool('Simple backup tool demonstrating utility approach') do
  class_option :simple, type: :boolean, desc: 'Simple mode flag'

  private

  def polyscript_status(context)
    context.log('Simple status check...')
    {
      'operational' => true,
      'ready' => true
    }
  end

  def polyscript_test(context)
    context.log('Simple test mode...')
    {
      'would_backup' => ['file1', 'file2'],
      'note' => 'No changes made in test mode'
    }
  end

  def polyscript_sandbox(context)
    context.log('Simple sandbox test...')
    {
      'environment' => 'ok',
      'all_passed' => true
    }
  end

  def polyscript_live(context)
    context.log('Simple live execution...')
    if context.confirm('Execute backup?')
      {
        'backup_completed' => true,
        'files_backed_up' => 42
      }
    else
      { 'status' => 'cancelled' }
    end
  end
end

# Elegant Ruby patterns demonstration
class ElegantTool < PolyScript::Tool
  polyscript_description 'Tool demonstrating Ruby\'s elegant patterns'

  private

  def polyscript_status(context)
    context.log('Elegant status check...')
    
    # Ruby's elegant hash syntax
    services = %w[database api cache].map do |service|
      [service, check_service(service)]
    end.to_h

    {
      'services' => services,
      'all_healthy' => services.values.all? { |status| status == 'healthy' }
    }
  end

  def polyscript_test(context)
    context.log('Elegant test operations...')
    
    # Ruby blocks and enumerable methods
    steps = (1..3).map do |i|
      sleep(0.1)
      context.log("Completed step #{i}", 'debug')
      "Step #{i} completed"
    end

    {
      'test_steps' => steps,
      'duration_ms' => 300
    }
  end

  def polyscript_sandbox(context)
    context.log('Testing Ruby environment...')
    
    # Ruby's elegant condition checking
    ruby_features = {
      'version' => RUBY_VERSION,
      'blocks' => 'available',
      'metaprogramming' => 'available',
      'gems' => defined?(Gem) ? 'available' : 'unavailable'
    }

    {
      'ruby_features' => ruby_features,
      'all_available' => ruby_features.values.all? { |v| v != 'unavailable' }
    }
  end

  def polyscript_live(context)
    context.log('Elegant live execution...')
    
    return { 'status' => 'cancelled' } unless context.confirm('Run elegant operations?')

    # Ruby's beautiful syntax
    start_time = Time.now
    sleep(0.5)
    duration = ((Time.now - start_time) * 1000).round

    {
      'operation' => 'elegant_completed',
      'duration_ms' => duration,
      'ruby_version' => RUBY_VERSION
    }
  end

  private

  def check_service(service)
    # Simulate service check
    sleep(rand * 0.1)
    rand > 0.1 ? 'healthy' : 'unhealthy'
  end
end

# Main execution - demonstrate different tools
def main
  tool_type = ENV['TOOL_TYPE'] || 'backup'
  
  tool_class = case tool_type
               when 'simple'
                 SimpleBackupTool
               when 'elegant'
                 ElegantTool
               when 'backup'
                 BackupTool
               else
                 BackupTool
               end

  tool_class.start(ARGV)
rescue PolyScript::Error => e
  $stderr.puts "PolyScript Error: #{e.message}"
  exit 1
rescue StandardError => e
  $stderr.puts "Fatal error: #{e.message}"
  $stderr.puts e.backtrace if ENV['DEBUG']
  exit 1
end

# Export for testing
module BackupToolExports
  def self.backup_tool
    BackupTool
  end

  def self.simple_tool
    SimpleBackupTool
  end

  def self.elegant_tool
    ElegantTool
  end
end

# Run if called directly
main if __FILE__ == $0

=begin
GEMFILE:
source 'https://rubygems.org'

gem 'thor', '~> 1.2'

# Optional for enhanced functionality
gem 'fileutils'

PROJECT STRUCTURE:
backup-tool/
├── Gemfile
├── Gemfile.lock
├── backup_tool_example.rb
└── polyscript_framework.rb

USAGE EXAMPLES:
bundle install
ruby backup_tool_example.rb status
ruby backup_tool_example.rb test --verbose
ruby backup_tool_example.rb sandbox --json
ruby backup_tool_example.rb live --force
ruby backup_tool_example.rb status --source /home/docs --dest /backup --overwrite

# Test different tools
TOOL_TYPE=simple ruby backup_tool_example.rb status
TOOL_TYPE=elegant ruby backup_tool_example.rb test --verbose

# Global installation
gem build backup-tool.gemspec
gem install backup-tool-1.0.0.gem
backup-tool status --json

The framework automatically provides:
- All CLI argument parsing and validation with thor
- Command routing for the four PolyScript modes
- --json, --verbose, --force standard flags
- PolyScript v1.0 JSON output formatting
- Error handling and exit codes
- Help text generation
- Confirmation prompts
- RubyGems distribution

BENEFITS OF RUBY APPROACH:
- ZERO boilerplate code
- Elegant and expressive syntax
- Excellent for text processing and automation
- Strong metaprogramming capabilities
- Beautiful block syntax for iterations
- Great for DevOps and deployment tools
- Duck typing for flexible interfaces
- Rich standard library

RUBY-SPECIFIC ADVANTAGES:
- Blocks and yield for elegant control flow
- Metaprogramming for dynamic behavior
- String interpolation and manipulation
- Excellent regular expression support
- Enumerable methods for data processing
- Open classes for extending functionality
- Symbol-based hash keys
- Method chaining and fluent interfaces
- Strong testing culture and tools
=end