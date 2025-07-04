#!/usr/bin/env ruby

require_relative '../ruby/polyscript_framework'
require 'time'

class TestCompilerTool < PolyScript::Tool
  polyscript_description 'Test compiler tool for validating CRUD × Modes framework'

  option :optimize, type: :boolean, aliases: '-O', desc: 'Enable optimizations'
  option :output, type: :string, aliases: '-o', desc: 'Output file name'
  option :incremental, type: :boolean, aliases: '-i', desc: 'Enable incremental compilation'

  private

  def polyscript_create(resource, options, context)
    context.log("Creating compilation target: #{resource}")
    
    output_file = options[:output] || resource.gsub(/\.(rb|cr)$/, '.out')
    
    {
      'operation' => 'create',
      'compiled' => resource,
      'output' => output_file,
      'optimized' => options[:optimize] || false,
      'timestamp' => Time.now.iso8601,
      'mode' => context.mode
    }
  end

  def polyscript_read(resource, options, context)
    context.log('Checking compilation status...')
    
    files = resource ? [resource] : ['main.rb', 'utils.rb', 'config.rb']
    
    {
      'operation' => 'read',
      'source_files' => files,
      'compiled_files' => files[0..-2].map { |f| f.gsub(/\.rb$/, '.out') },
      'missing' => [files.last.gsub(/\.rb$/, '.out')],
      'last_build' => Time.now.iso8601,
      'mode' => context.mode
    }
  end

  def polyscript_update(resource, options, context)
    raise PolyScript::Error, 'Resource is required for update operation' unless resource
    
    context.log("Recompiling #{resource}...")
    
    {
      'operation' => 'update',
      'recompiled' => resource,
      'reason' => 'source file changed',
      'timestamp' => Time.now.iso8601,
      'incremental' => options[:incremental] || false,
      'mode' => context.mode
    }
  end

  def polyscript_delete(resource, options, context)
    context.log("Cleaning build artifacts#{resource ? ' for ' + resource : ''}...")
    
    targets = resource ? ["#{resource}.out"] : ['*.out', '*.rbc', 'tmp/']
    
    {
      'operation' => 'delete',
      'cleaned' => targets,
      'freed_space' => '18.7 MB',
      'timestamp' => Time.now.iso8601,
      'mode' => context.mode
    }
  end
end

# Run the tool
TestCompilerTool.start(ARGV) if __FILE__ == $0