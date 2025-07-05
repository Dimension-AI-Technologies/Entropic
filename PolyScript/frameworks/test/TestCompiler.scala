/*
 * Test Scala Compiler Tool for PolyScript Framework
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

import polyscript.Framework._
import play.api.libs.json._
import scala.util.{Try, Success}
import java.time.Instant

object TestCompilerTool extends PolyScriptTool {
  def description: String = "Test Scala compiler tool demonstrating CRUD × Modes"
  
  def create(resource: Option[String], options: Map[String, Any], context: PolyScriptContext): Try[JsValue] = {
    context.log(s"Compiling ${resource.getOrElse("source")}...")
    
    Success(Json.obj(
      "compiled" -> resource.getOrElse("Main.scala"),
      "output" -> resource.map(_.replace(".scala", ".class")).getOrElse("Main.class"),
      "optimized" -> options.getOrElse("optimize", false).toString.toBoolean,
      "timestamp" -> Instant.now().toString
    ))
  }
  
  def read(resource: Option[String], options: Map[String, Any], context: PolyScriptContext): Try[JsValue] = {
    context.log("Checking compilation status...")
    
    Success(Json.obj(
      "source_files" -> Json.arr("Main.scala", "Utils.scala", "Config.scala"),
      "compiled_files" -> Json.arr("Main.class", "Utils.class"),
      "missing" -> Json.arr("Config.class"),
      "last_build" -> Instant.now().minusSeconds(7200).toString
    ))
  }
  
  def update(resource: Option[String], options: Map[String, Any], context: PolyScriptContext): Try[JsValue] = {
    context.log(s"Recompiling ${resource.getOrElse("source")}...")
    
    Success(Json.obj(
      "recompiled" -> resource.getOrElse("Main.scala"),
      "reason" -> "source file changed",
      "incremental" -> options.getOrElse("incremental", false).toString.toBoolean,
      "timestamp" -> Instant.now().toString
    ))
  }
  
  def delete(resource: Option[String], options: Map[String, Any], context: PolyScriptContext): Try[JsValue] = {
    context.log(s"Cleaning ${resource.getOrElse("build artifacts")}...")
    
    Success(Json.obj(
      "cleaned" -> Json.arr("*.class", "target/", ".bsp/"),
      "freed_space" -> "31.2 MB",
      "timestamp" -> Instant.now().toString
    ))
  }
}

object TestCompiler extends App {
  Framework.run(args, TestCompilerTool)
}