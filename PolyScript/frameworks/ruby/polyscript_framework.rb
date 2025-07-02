#!/usr/bin/env ruby

=begin
PolyScript Framework for Ruby using thor

A true zero-boilerplate framework for creating PolyScript-compliant CLI tools.
Developers write ONLY business logic - the framework handles everything else.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
=end

require 'thor'
require 'json'
require 'io/console'

module PolyScript
  # PolyScript execution modes
  module Mode
    STATUS = 'status'.freeze
    TEST = 'test'.freeze
    SANDBOX = 'sandbox'.freeze
    LIVE = 'live'.freeze
  end

  # PolyScript context for tool execution
  class Context
    attr_reader :mode, :verbose, :force, :json_output, :tool_name, :output_data

    def initialize(mode, verbose: false, force: false, json_output: false, tool_name: 'PolyScriptTool')
      @mode = mode
      @verbose = verbose
      @force = force
      @json_output = json_output
      @tool_name = tool_name
      @output_data = {
        'polyscript' => '1.0',
        'mode' => mode,
        'tool' => tool_name,
        'status' => 'success',
        'data' => {}
      }
    end

    # Log a message at the specified level
    def log(message, level = 'info')
      if @json_output
        # Route to JSON data structure
        key = case level
              when 'error', 'critical'
                'errors'
              when 'warning'
                'warnings'
              when 'info', 'debug'
                'messages' if @verbose
              end

        if key
          @output_data[key] ||= []
          @output_data[key] << "#{level.upcase}: #{message}"
        end
      else
        # Direct console output
        case level
        when 'error', 'critical'
          $stderr.puts "Error: #{message}"
        when 'warning'
          $stderr.puts "Warning: #{message}"
        when 'info'
          puts message
        when 'debug'
          puts message if @verbose
        end
      end
    end

    # Output data in appropriate format
    def output(data, is_error: false)
      if @json_output
        case data
        when String
          key = is_error ? 'errors' : 'messages'
          @output_data[key] ||= []
          @output_data[key] << data
        when Hash
          # Merge into data section
          @output_data['data'].merge!(data)
        else
          # Try to convert to hash
          @output_data['data'].merge!(data.to_h) rescue nil
        end
      else
        if is_error
          $stderr.puts "Error: #{data}"
        elsif data.is_a?(String)
          puts data
        else
          puts JSON.pretty_generate(data)
        end
      end
    end

    # Ask for user confirmation
    def confirm(message)
      return true if @force

      if @json_output
        output({ 'confirmation_required' => message }, is_error: true)
        return false
      end

      print "#{message} [y/N]: "
      response = $stdin.gets.chomp.downcase
      response == 'y'
    end

    # Finalize output (called at the end to output JSON if needed)
    def finalize_output
      if @json_output
        puts JSON.pretty_generate(@output_data)
      end
    end
  end

  # PolyScript error class
  class Error < StandardError
    def initialize(message)
      super(message)
    end
  end

  # Base class for PolyScript tools
  class Tool < Thor
    # Class method to define the tool description
    def self.polyscript_description(desc)
      @polyscript_description = desc
    end

    def self.get_polyscript_description
      @polyscript_description || 'PolyScript-compliant CLI tool'
    end

    # Add global PolyScript options to all commands
    class_option :verbose, aliases: '-v', type: :boolean, desc: 'Enable verbose output'
    class_option :force, aliases: '-f', type: :boolean, desc: 'Skip confirmation prompts'
    class_option :json, type: :boolean, desc: 'Output in JSON format'

    # Define the four PolyScript mode commands
    desc 'status', 'Show current state'
    def status
      execute_mode(Mode::STATUS)
    end

    desc 'test', 'Simulate operations (dry-run)'
    def test
      execute_mode(Mode::TEST)
    end

    desc 'sandbox', 'Test dependencies and environment'
    def sandbox
      execute_mode(Mode::SANDBOX)
    end

    desc 'live', 'Execute actual operations'
    def live
      execute_mode(Mode::LIVE)
    end

    # Default command (status mode)
    default_task :status

    private

    def execute_mode(mode)
      tool_name = self.class.name.split('::').last

      # Create context
      context = Context.new(
        mode,
        verbose: options[:verbose] || false,
        force: options[:force] || false,
        json_output: options[:json] || false,
        tool_name: tool_name
      )

      context.log("Executing #{mode} mode", 'debug')

      begin
        # Execute appropriate method
        result = case mode
                 when Mode::STATUS
                   polyscript_status(context)
                 when Mode::TEST
                   polyscript_test(context)
                 when Mode::SANDBOX
                   polyscript_sandbox(context)
                 when Mode::LIVE
                   polyscript_live(context)
                 else
                   raise PolyScript::Error, "Unknown mode: #{mode}"
                 end

        # Handle result
        context.output(result) if result

        context.finalize_output

      rescue PolyScript::Error => e
        context.output_data['status'] = 'error'
        context.output(e.message, is_error: true)
        context.log("Error details: #{e.backtrace.join("\n")}", 'error') if context.verbose
        context.finalize_output
        exit 1

      rescue StandardError => e
        context.output_data['status'] = 'error'
        context.output("Unhandled error: #{e.message}", is_error: true)
        context.log("Error details: #{e.backtrace.join("\n")}", 'error') if context.verbose
        context.finalize_output
        exit 1
      end
    end

    # Methods that subclasses must implement
    def polyscript_status(context)
      raise NotImplementedError, 'Subclasses must implement polyscript_status method'
    end

    def polyscript_test(context)
      raise NotImplementedError, 'Subclasses must implement polyscript_test method'
    end

    def polyscript_sandbox(context)
      raise NotImplementedError, 'Subclasses must implement polyscript_sandbox method'
    end

    def polyscript_live(context)
      raise NotImplementedError, 'Subclasses must implement polyscript_live method'
    end
  end

  # Utility method to create simple tools
  def self.create_tool(description, &block)
    Class.new(Tool) do
      polyscript_description description
      
      class_eval(&block) if block_given?
    end
  end

  # Example tool implementation
  class ExampleTool < Tool
    polyscript_description 'Example PolyScript tool demonstrating the Ruby framework'

    # Add custom options
    class_option :target, type: :string, default: 'default', desc: 'Target to operate on'
    class_option :count, type: :numeric, default: 1, desc: 'Number of operations'

    private

    def polyscript_status(context)
      context.log('Checking status...')
      {
        'operational' => true,
        'last_check' => Time.now.iso8601,
        'files_ready' => 1234
      }
    end

    def polyscript_test(context)
      context.log('Running test mode...')
      {
        'planned_operations' => [
          { 'operation' => 'Operation 1', 'status' => 'would execute' },
          { 'operation' => 'Operation 2', 'status' => 'would execute' }
        ],
        'total_operations' => 2,
        'note' => 'No changes made in test mode'
      }
    end

    def polyscript_sandbox(context)
      context.log('Testing environment...')
      tests = {
        'ruby' => 'available',
        'filesystem' => 'writable',
        'network' => 'accessible'
      }

      all_passed = tests.values.all? { |status| %w[available writable accessible].include?(status) }

      {
        'dependency_tests' => tests,
        'all_passed' => all_passed
      }
    end

    def polyscript_live(context)
      context.log('Executing live mode...')

      unless context.confirm('Execute operations?')
        return { 'status' => 'cancelled' }
      end

      context.log('Executing operation 1...')
      context.log('Executing operation 2...')

      {
        'executed_operations' => [
          { 'operation' => 'Operation 1', 'status' => 'completed' },
          { 'operation' => 'Operation 2', 'status' => 'completed' }
        ],
        'total_completed' => 2
      }
    end
  end
end

# If run directly, execute example tool
if __FILE__ == $0
  PolyScript::ExampleTool.start(ARGV)
end

=begin
USAGE EXAMPLES:

# Class-based approach
class BackupTool < PolyScript::Tool
  polyscript_description 'Backup tool with zero boilerplate'
  
  class_option :source, type: :string, default: '/source', desc: 'Source directory'
  class_option :dest, type: :string, default: '/dest', desc: 'Destination directory'

  private

  def polyscript_status(context)
    { 'operational' => true }
  end

  def polyscript_test(context)
    { 'would_backup' => ['file1', 'file2'] }
  end

  def polyscript_sandbox(context)
    { 'environment' => 'ok' }
  end

  def polyscript_live(context)
    { 'backup_completed' => true }
  end
end

BackupTool.start(ARGV)

# Functional approach using utility method
SimpleBackupTool = PolyScript.create_tool('Simple backup tool') do
  private

  def polyscript_status(context)
    context.log('Simple status check...')
    { 'ready' => true }
  end

  def polyscript_test(context)
    { 'would_backup' => ['file1'] }
  end

  def polyscript_sandbox(context)
    { 'environment' => 'ok' }
  end

  def polyscript_live(context)
    { 'backup_completed' => true }
  end
end

SimpleBackupTool.start(ARGV)

# Gemfile
source 'https://rubygems.org'
gem 'thor', '~> 1.2'

# Usage:
bundle install
ruby backup_tool.rb status
ruby backup_tool.rb test --verbose
ruby backup_tool.rb sandbox --json
ruby backup_tool.rb live --force
=end