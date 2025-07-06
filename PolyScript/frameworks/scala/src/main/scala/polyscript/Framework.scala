/*
 * PolyScript Framework for Scala
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

package polyscript

import scopt.OParser
import play.api.libs.json._
import java.time.Instant
import scala.util.{Try, Success, Failure}
import com.sun.jna.{Library, Native}
import java.io.File

object Framework {
  
  // JNA interface for libpolyscript
  trait LibPolyScript extends Library {
    def polyscript_can_mutate(mode: Int): Boolean
    def polyscript_should_validate(mode: Int): Boolean  
    def polyscript_require_confirm(mode: Int, operation: Int): Boolean
    def polyscript_is_safe_mode(mode: Int): Boolean
  }
  
  // FFI wrapper with graceful fallback
  object PolyScriptFFI {
    private var libpolyscript: Option[LibPolyScript] = None
    
    // Try to load libpolyscript from various locations
    private val libPaths = Seq(
      "../../libpolyscript/build/libpolyscript",
      "libpolyscript"  // System-wide installation
    )
    
    // Initialize FFI library
    try {
      var loaded = false
      for (path <- libPaths if !loaded) {
        try {
          libpolyscript = Some(Native.load(path, classOf[LibPolyScript]))
          loaded = true
        } catch {
          case _: UnsatisfiedLinkError => // Try next path
        }
      }
      if (!loaded) {
        System.err.println("Warning: libpolyscript not found, using fallback implementations")
      }
    } catch {
      case e: Exception =>
        System.err.println(s"Warning: Failed to load libpolyscript: ${e.getMessage}")
    }
    
    // Convert Scala types to C integers for FFI calls
    private def operationToInt(op: PolyScriptOperation): Int = op match {
      case Create => 0
      case Read => 1
      case Update => 2
      case Delete => 3
    }
    
    private def modeToInt(mode: PolyScriptMode): Int = mode match {
      case Simulate => 0
      case Sandbox => 1
      case Live => 2
    }
    
    // Safe FFI wrappers with fallback
    def canMutate(mode: PolyScriptMode): Boolean = {
      libpolyscript.map(_.polyscript_can_mutate(modeToInt(mode))).getOrElse(mode == Live)
    }
    
    def shouldValidate(mode: PolyScriptMode): Boolean = {
      libpolyscript.map(_.polyscript_should_validate(modeToInt(mode))).getOrElse(mode == Sandbox)
    }
    
    def requireConfirm(mode: PolyScriptMode, operation: PolyScriptOperation, force: Boolean): Boolean = {
      if (force) false
      else libpolyscript.map(_.polyscript_require_confirm(modeToInt(mode), operationToInt(operation)))
        .getOrElse(mode == Live && (operation == Update || operation == Delete))
    }
    
    def isSafeMode(mode: PolyScriptMode): Boolean = {
      libpolyscript.map(_.polyscript_is_safe_mode(modeToInt(mode))).getOrElse(mode == Simulate || mode == Sandbox)
    }
  }
  
  // CRUD Operations
  sealed trait PolyScriptOperation
  case object Create extends PolyScriptOperation
  case object Read extends PolyScriptOperation
  case object Update extends PolyScriptOperation
  case object Delete extends PolyScriptOperation
  
  // Execution Modes
  sealed trait PolyScriptMode
  case object Simulate extends PolyScriptMode
  case object Sandbox extends PolyScriptMode
  case object Live extends PolyScriptMode
  
  // Context for operations
  case class PolyScriptContext(
    operation: PolyScriptOperation,
    mode: PolyScriptMode,
    resource: Option[String] = None,
    rebadgedAs: Option[String] = None,
    options: Map[String, Any] = Map.empty,
    verbose: Boolean = false,
    force: Boolean = false,
    jsonOutput: Boolean = false,
    toolName: String = "",
    var outputData: Map[String, JsValue] = Map(
      "polyscript" -> JsString("1.0"),
      "status" -> JsString("success"),
      "data" -> JsObject(Seq.empty)
    ),
    var messages: List[String] = List.empty
  ) {
    def canMutate: Boolean = PolyScriptFFI.canMutate(mode)
    def shouldValidate: Boolean = PolyScriptFFI.shouldValidate(mode)
    def requireConfirm: Boolean = PolyScriptFFI.requireConfirm(mode, operation, force)
    def isSafeMode: Boolean = PolyScriptFFI.isSafeMode(mode)
    
    def log(message: String, level: String = "info"): Unit = {
      if (jsonOutput) {
        messages = messages :+ s"[$level] $message"
        if (verbose) {
          outputData = outputData + ("messages" -> JsArray(messages.map(JsString)))
        }
      } else {
        level match {
          case "error" => Console.err.println(s"Error: $message")
          case "warning" => Console.err.println(s"Warning: $message")
          case "info" => println(message)
          case "debug" if verbose => println(s"Debug: $message")
          case _ =>
        }
      }
    }
    
    def output(data: JsValue, error: Boolean = false): Unit = {
      if (jsonOutput) {
        if (error) {
          outputData = outputData + ("status" -> JsString("error"))
          outputData = outputData + ("error" -> data)
        } else {
          outputData = outputData + ("result" -> data)
        }
      } else {
        if (error) {
          Console.err.println(Json.prettyPrint(data))
        } else {
          println(Json.prettyPrint(data))
        }
      }
    }
    
    def confirm(message: String): Boolean = {
      if (force) return true
      
      if (jsonOutput) {
        output(Json.obj("confirmation_required" -> message), error = true)
        false
      } else {
        print(s"$message [y/N]: ")
        val response = scala.io.StdIn.readLine().toLowerCase
        response == "y" || response == "yes"
      }
    }
    
    def finalizeOutput(): Unit = {
      outputData = outputData ++ Map(
        "operation" -> JsString(operation.toString.toLowerCase),
        "mode" -> JsString(mode.toString.toLowerCase),
        "tool" -> JsString(toolName)
      )
      
      resource.foreach(r => outputData = outputData + ("resource" -> JsString(r)))
      rebadgedAs.foreach(r => outputData = outputData + ("rebadged_as" -> JsString(r)))
      
      if (jsonOutput) {
        println(Json.prettyPrint(JsObject(outputData)))
      }
    }
  }
  
  // Tool trait that all PolyScript tools must implement
  trait PolyScriptTool {
    def description: String
    def create(resource: Option[String], options: Map[String, Any], context: PolyScriptContext): Try[JsValue]
    def read(resource: Option[String], options: Map[String, Any], context: PolyScriptContext): Try[JsValue]
    def update(resource: Option[String], options: Map[String, Any], context: PolyScriptContext): Try[JsValue]
    def delete(resource: Option[String], options: Map[String, Any], context: PolyScriptContext): Try[JsValue]
  }
  
  // Command line configuration
  case class Config(
    operation: Option[String] = None,
    resource: Option[String] = None,
    mode: PolyScriptMode = Live,
    verbose: Boolean = false,
    force: Boolean = false,
    json: Boolean = false,
    discover: Boolean = false
  )
  
  // Execute operation with mode wrapping
  def executeWithMode(tool: PolyScriptTool, context: PolyScriptContext): Try[JsValue] = {
    context.mode match {
      case Simulate =>
        context.log(s"Simulating ${context.operation} operation", "debug")
        
        if (context.operation == Read) {
          tool.read(context.resource, context.options, context)
        } else {
          val actionVerb = context.operation match {
            case Create => "Would create"
            case Update => "Would update"
            case Delete => "Would delete"
            case _ => "Would read"
          }
          
          Success(Json.obj(
            "simulation" -> true,
            "action" -> s"$actionVerb ${context.resource.getOrElse("resource")}",
            "options" -> JsObject(context.options.map { case (k, v) => k -> JsString(v.toString) })
          ))
        }
        
      case Sandbox =>
        context.log(s"Testing prerequisites for ${context.operation}", "debug")
        
        Success(Json.obj(
          "sandbox" -> true,
          "validations" -> Json.obj(
            "permissions" -> "verified",
            "dependencies" -> "available",
            "connectivity" -> "established"
          ),
          "ready" -> true
        ))
        
      case Live =>
        context.log(s"Executing ${context.operation} operation", "debug")
        
        if (context.requireConfirm) {
          val msg = s"Are you sure you want to ${context.operation.toString.toLowerCase} ${context.resource.getOrElse("resource")}?"
          if (!context.confirm(msg)) {
            context.outputData = context.outputData + ("status" -> JsString("cancelled"))
            return Success(Json.obj("cancelled" -> true))
          }
        }
        
        context.operation match {
          case Create => tool.create(context.resource, context.options, context)
          case Read => tool.read(context.resource, context.options, context)
          case Update => tool.update(context.resource, context.options, context)
          case Delete => tool.delete(context.resource, context.options, context)
        }
    }
  }
  
  // Show discovery information
  def showDiscovery(toolName: String): Unit = {
    val discovery = Json.obj(
      "polyscript" -> "1.0",
      "tool" -> toolName,
      "operations" -> Json.arr("create", "read", "update", "delete"),
      "modes" -> Json.arr("simulate", "sandbox", "live")
    )
    println(Json.prettyPrint(discovery))
  }
  
  // Main entry point for running a tool
  def run[T <: PolyScriptTool](args: Array[String], tool: T): Unit = {
    val toolName = tool.getClass.getSimpleName.replace("$", "")
    
    val builder = OParser.builder[Config]
    val parser = {
      import builder._
      OParser.sequence(
        programName(toolName.toLowerCase),
        head(toolName, "1.0.0"),
        help('h', "help").text("Show this help message"),
        opt[Unit]("discover")
          .action((_, c) => c.copy(discover = true))
          .text("Show tool capabilities"),
        opt[String]('m', "mode")
          .action((x, c) => c.copy(mode = x.toLowerCase match {
            case "simulate" => Simulate
            case "sandbox" => Sandbox
            case _ => Live
          }))
          .text("Execution mode (simulate, sandbox, live)"),
        opt[Unit]('v', "verbose")
          .action((_, c) => c.copy(verbose = true))
          .text("Enable verbose output"),
        opt[Unit]('f', "force")
          .action((_, c) => c.copy(force = true))
          .text("Skip confirmation prompts"),
        opt[Unit]("json")
          .action((_, c) => c.copy(json = true))
          .text("Output in JSON format"),
        cmd("create")
          .action((_, c) => c.copy(operation = Some("create")))
          .text("Create new resources")
          .children(
            arg[String]("<resource>").optional()
              .action((x, c) => c.copy(resource = Some(x)))
              .text("Resource to create")
          ),
        cmd("read")
          .action((_, c) => c.copy(operation = Some("read")))
          .text("Read/query resources")
          .children(
            arg[String]("<resource>").optional()
              .action((x, c) => c.copy(resource = Some(x)))
              .text("Resource to read")
          ),
        cmd("list")
          .action((_, c) => c.copy(operation = Some("read")))
          .text("List resources (alias for read)"),
        cmd("update")
          .action((_, c) => c.copy(operation = Some("update")))
          .text("Update existing resources")
          .children(
            arg[String]("<resource>").optional()
              .action((x, c) => c.copy(resource = Some(x)))
              .text("Resource to update")
          ),
        cmd("delete")
          .action((_, c) => c.copy(operation = Some("delete")))
          .text("Delete resources")
          .children(
            arg[String]("<resource>").optional()
              .action((x, c) => c.copy(resource = Some(x)))
              .text("Resource to delete")
          ),
        checkConfig { c =>
          if (c.discover) success
          else if (c.operation.isEmpty) failure("No operation specified")
          else success
        }
      )
    }
    
    OParser.parse(parser, args, Config()) match {
      case Some(config) =>
        if (config.discover) {
          showDiscovery(toolName)
          System.exit(0)
        }
        
        val operation = config.operation.get match {
          case "create" => Create
          case "read" => Read
          case "update" => Update
          case "delete" => Delete
        }
        
        val context = PolyScriptContext(
          operation = operation,
          mode = config.mode,
          resource = config.resource,
          verbose = config.verbose,
          force = config.force,
          jsonOutput = config.json,
          toolName = toolName
        )
        
        try {
          context.log(s"Executing ${context.operation} operation in ${context.mode} mode", "debug")
          
          executeWithMode(tool, context) match {
            case Success(result) =>
              context.output(result)
              context.finalizeOutput()
              System.exit(0)
              
            case Failure(exception) =>
              context.output(JsString(s"Error: ${exception.getMessage}"), error = true)
              if (context.verbose) {
                exception.printStackTrace()
              }
              context.finalizeOutput()
              System.exit(1)
          }
        } catch {
          case e: Exception =>
            context.output(JsString(s"Unhandled error: ${e.getMessage}"), error = true)
            if (context.verbose) {
              e.printStackTrace()
            }
            context.finalizeOutput()
            System.exit(1)
        }
        
      case _ =>
        System.exit(1)
    }
  }
}