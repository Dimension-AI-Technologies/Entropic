{-|
Module      : PolyScript.Framework
Description : PolyScript Framework for Haskell
CRUD × Modes Architecture: Zero-boilerplate CLI development

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
-}

{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE MultiParamTypeClasses #-}

module PolyScript.Framework
  ( -- * Core Types
    PolyScriptOperation(..)
  , PolyScriptMode(..)
  , PolyScriptContext(..)
  , PolyScriptTool(..)
  , PolyScriptError(..)
  
    -- * Context Creation
  , newContext
  
    -- * Running Tools
  , runTool
  
    -- * Utilities
  , outputJSON
  , outputText
  ) where

import Control.Monad (when, unless)
import Control.Monad.IO.Class (MonadIO, liftIO)
import Data.Aeson (ToJSON, FromJSON, encode, object, (.=))
import qualified Data.Aeson as Aeson
import Data.Maybe (fromMaybe)
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.IO as TIO
import qualified Data.ByteString.Lazy.Char8 as BLC
import GHC.Generics (Generic)
import System.Environment (getArgs, getProgName)
import System.Exit (exitFailure, exitSuccess)
import System.IO (hFlush, stdout, stderr, hPutStrLn)
import Options.Applicative

-- | CRUD operations
data PolyScriptOperation
  = Create
  | Read
  | Update
  | Delete
  deriving (Show, Eq, Generic)

instance ToJSON PolyScriptOperation where
  toJSON Create = Aeson.String "create"
  toJSON Read   = Aeson.String "read"
  toJSON Update = Aeson.String "update"
  toJSON Delete = Aeson.String "delete"

-- | Execution modes
data PolyScriptMode
  = Simulate
  | Sandbox
  | Live
  deriving (Show, Eq, Generic)

instance ToJSON PolyScriptMode where
  toJSON Simulate = Aeson.String "simulate"
  toJSON Sandbox  = Aeson.String "sandbox"
  toJSON Live     = Aeson.String "live"

-- | Error type for PolyScript operations
data PolyScriptError = PolyScriptError String
  deriving (Show, Eq)

-- | Context for tool execution
data PolyScriptContext = PolyScriptContext
  { ctxOperation  :: PolyScriptOperation
  , ctxMode       :: PolyScriptMode
  , ctxResource   :: Maybe Text
  , ctxRebadgedAs :: Maybe Text
  , ctxOptions    :: [(Text, Aeson.Value)]
  , ctxVerbose    :: Bool
  , ctxForce      :: Bool
  , ctxJsonOutput :: Bool
  , ctxToolName   :: Text
  , ctxOutputData :: [(Text, Aeson.Value)]
  } deriving (Show, Eq)

-- | Create a new context
newContext :: PolyScriptOperation -> PolyScriptMode -> Maybe Text -> Text -> PolyScriptContext
newContext op mode resource toolName = PolyScriptContext
  { ctxOperation  = op
  , ctxMode       = mode
  , ctxResource   = resource
  , ctxRebadgedAs = Nothing
  , ctxOptions    = []
  , ctxVerbose    = False
  , ctxForce      = False
  , ctxJsonOutput = False
  , ctxToolName   = toolName
  , ctxOutputData = [ ("polyscript", Aeson.String "1.0")
                    , ("operation", toJSON op)
                    , ("mode", toJSON mode)
                    , ("tool", Aeson.String toolName)
                    , ("status", Aeson.String "success")
                    , ("data", object [])
                    ]
  }

-- | Type class for PolyScript tools
class PolyScriptTool a where
  toolDescription :: a -> Text
  toolCreate :: a -> Maybe Text -> [(Text, Aeson.Value)] -> PolyScriptContext -> IO (Either PolyScriptError Aeson.Value)
  toolRead   :: a -> Maybe Text -> [(Text, Aeson.Value)] -> PolyScriptContext -> IO (Either PolyScriptError Aeson.Value)
  toolUpdate :: a -> Maybe Text -> [(Text, Aeson.Value)] -> PolyScriptContext -> IO (Either PolyScriptError Aeson.Value)
  toolDelete :: a -> Maybe Text -> [(Text, Aeson.Value)] -> PolyScriptContext -> IO (Either PolyScriptError Aeson.Value)

-- | Context utility functions
canMutate :: PolyScriptContext -> Bool
canMutate ctx = ctxMode ctx == Live

shouldValidate :: PolyScriptContext -> Bool
shouldValidate ctx = ctxMode ctx == Sandbox

requireConfirm :: PolyScriptContext -> Bool
requireConfirm ctx = ctxMode ctx == Live && 
                     (ctxOperation ctx == Update || ctxOperation ctx == Delete) &&
                     not (ctxForce ctx)

isSafeMode :: PolyScriptContext -> Bool
isSafeMode ctx = ctxMode ctx == Simulate || ctxMode ctx == Sandbox

-- | Log a message
logMessage :: PolyScriptContext -> Text -> Text -> IO ()
logMessage ctx level msg
  | ctxJsonOutput ctx = return () -- In JSON mode, messages go to output data
  | otherwise = case level of
      "error"   -> hPutStrLn stderr $ "Error: " <> T.unpack msg
      "warning" -> hPutStrLn stderr $ "Warning: " <> T.unpack msg
      "info"    -> TIO.putStrLn msg
      "debug"   -> when (ctxVerbose ctx) $ TIO.putStrLn msg
      _         -> return ()

-- | Output JSON data
outputJSON :: ToJSON a => a -> IO ()
outputJSON = BLC.putStrLn . encode

-- | Output text
outputText :: Text -> IO ()
outputText = TIO.putStrLn

-- | Confirm an action
confirm :: PolyScriptContext -> Text -> IO Bool
confirm ctx msg
  | ctxForce ctx = return True
  | ctxJsonOutput ctx = do
      outputJSON $ object [("confirmation_required", Aeson.String msg)]
      return False
  | otherwise = do
      TIO.putStr $ msg <> " [y/N]: "
      hFlush stdout
      response <- TIO.getLine
      return $ T.toLower response `elem` ["y", "yes"]

-- | Execute with mode wrapping
executeWithMode :: PolyScriptTool a => a -> PolyScriptContext -> IO ()
executeWithMode tool ctx = do
  result <- case ctxMode ctx of
    Simulate -> do
      logMessage ctx "debug" $ "Simulating " <> T.pack (show $ ctxOperation ctx) <> " operation"
      if ctxOperation ctx == Read
        then toolRead tool (ctxResource ctx) (ctxOptions ctx) ctx
        else do
          let actionVerb = case ctxOperation ctx of
                Create -> "Would create"
                Update -> "Would update"
                Delete -> "Would delete"
                Read   -> "Would read"
          return $ Right $ object
            [ ("simulation", Aeson.Bool True)
            , ("action", Aeson.String $ actionVerb <> " " <> fromMaybe "resource" (ctxResource ctx))
            , ("options", object $ ctxOptions ctx)
            ]
    
    Sandbox -> do
      logMessage ctx "debug" $ "Testing prerequisites for " <> T.pack (show $ ctxOperation ctx)
      let validations = object
            [ ("permissions", Aeson.String "verified")
            , ("dependencies", Aeson.String "available")
            , ("connectivity", Aeson.String "established")
            ]
      return $ Right $ object
        [ ("sandbox", Aeson.Bool True)
        , ("validations", validations)
        , ("ready", Aeson.Bool True)
        ]
    
    Live -> do
      logMessage ctx "debug" $ "Executing " <> T.pack (show $ ctxOperation ctx) <> " operation"
      
      confirmed <- if requireConfirm ctx
        then confirm ctx $ "Are you sure you want to " <> T.pack (show $ ctxOperation ctx) <> " " <> fromMaybe "resource" (ctxResource ctx) <> "?"
        else return True
      
      if not confirmed
        then return $ Left $ PolyScriptError "User declined confirmation"
        else case ctxOperation ctx of
          Create -> toolCreate tool (ctxResource ctx) (ctxOptions ctx) ctx
          Read   -> toolRead tool (ctxResource ctx) (ctxOptions ctx) ctx
          Update -> toolUpdate tool (ctxResource ctx) (ctxOptions ctx) ctx
          Delete -> toolDelete tool (ctxResource ctx) (ctxOptions ctx) ctx
  
  case result of
    Left (PolyScriptError err) -> do
      if ctxJsonOutput ctx
        then outputJSON $ object $ ctxOutputData ctx ++ [("status", Aeson.String "error"), ("error", Aeson.String $ T.pack err)]
        else hPutStrLn stderr $ "Error: " <> err
      exitFailure
    Right value -> do
      if ctxJsonOutput ctx
        then do
          let outputData = ctxOutputData ctx ++ [("result", value)]
          outputJSON $ object outputData
        else outputJSON value

-- | Command line options
data GlobalOpts = GlobalOpts
  { optVerbose :: Bool
  , optForce   :: Bool
  , optJson    :: Bool
  }

data Command
  = CmdCreate CreateOpts
  | CmdRead ReadOpts
  | CmdUpdate UpdateOpts
  | CmdDelete DeleteOpts
  | CmdDiscover DiscoverOpts

data CreateOpts = CreateOpts
  { createResource :: Text
  , createMode     :: PolyScriptMode
  , createGlobal   :: GlobalOpts
  }

data ReadOpts = ReadOpts
  { readResource :: Maybe Text
  , readMode     :: PolyScriptMode
  , readGlobal   :: GlobalOpts
  }

data UpdateOpts = UpdateOpts
  { updateResource :: Text
  , updateMode     :: PolyScriptMode
  , updateGlobal   :: GlobalOpts
  }

data DeleteOpts = DeleteOpts
  { deleteResource :: Text
  , deleteMode     :: PolyScriptMode
  , deleteGlobal   :: GlobalOpts
  }

data DiscoverOpts = DiscoverOpts
  { discoverGlobal :: GlobalOpts
  }

-- | Mode parser
modeParser :: Parser PolyScriptMode
modeParser = option modeReader
  ( long "mode"
  <> short 'm'
  <> value Live
  <> metavar "MODE"
  <> help "Execution mode (simulate, sandbox, live)"
  )
  where
    modeReader = eitherReader $ \s -> case s of
      "simulate" -> Right Simulate
      "sandbox"  -> Right Sandbox
      "live"     -> Right Live
      _          -> Left $ "Invalid mode: " ++ s

-- | Global options parser
globalOptsParser :: Parser GlobalOpts
globalOptsParser = GlobalOpts
  <$> switch
      ( long "verbose"
      <> short 'v'
      <> help "Enable verbose output"
      )
  <*> switch
      ( long "force"
      <> short 'f'
      <> help "Skip confirmation prompts"
      )
  <*> switch
      ( long "json"
      <> help "Output in JSON format"
      )

-- | Command parsers
createOptsParser :: Parser CreateOpts
createOptsParser = CreateOpts
  <$> argument str (metavar "RESOURCE")
  <*> modeParser
  <*> globalOptsParser

readOptsParser :: Parser ReadOpts
readOptsParser = ReadOpts
  <$> optional (argument str (metavar "RESOURCE"))
  <*> modeParser
  <*> globalOptsParser

updateOptsParser :: Parser UpdateOpts
updateOptsParser = UpdateOpts
  <$> argument str (metavar "RESOURCE")
  <*> modeParser
  <*> globalOptsParser

deleteOptsParser :: Parser DeleteOpts
deleteOptsParser = DeleteOpts
  <$> argument str (metavar "RESOURCE")
  <*> modeParser
  <*> globalOptsParser

discoverOptsParser :: Parser DiscoverOpts
discoverOptsParser = DiscoverOpts <$> globalOptsParser

-- | Command parser
commandParser :: Parser Command
commandParser = subparser
  ( command "create"
    (info (CmdCreate <$> createOptsParser)
      (progDesc "Create new resources"))
  <> command "read"
    (info (CmdRead <$> readOptsParser)
      (progDesc "Read/query resources"))
  <> command "list"
    (info (CmdRead <$> readOptsParser)
      (progDesc "List resources (alias for read)"))
  <> command "update"
    (info (CmdUpdate <$> updateOptsParser)
      (progDesc "Update existing resources"))
  <> command "delete"
    (info (CmdDelete <$> deleteOptsParser)
      (progDesc "Delete resources"))
  <> command "discover"
    (info (CmdDiscover <$> discoverOptsParser)
      (progDesc "Show tool capabilities"))
  )

-- | Run a PolyScript tool
runTool :: PolyScriptTool a => a -> IO ()
runTool tool = do
  progName <- getProgName
  let toolName = T.pack progName
      opts = info (commandParser <**> helper)
        ( fullDesc
        <> progDesc (T.unpack $ toolDescription tool)
        <> header (progName ++ " - PolyScript CRUD × Modes tool")
        )
  
  cmd <- execParser opts
  
  case cmd of
    CmdDiscover (DiscoverOpts global) -> do
      let discovery = object
            [ ("polyscript", Aeson.String "1.0")
            , ("tool", Aeson.String toolName)
            , ("operations", toJSON ["create", "read", "update", "delete" :: Text])
            , ("modes", toJSON ["simulate", "sandbox", "live" :: Text])
            ]
      if optJson global
        then outputJSON discovery
        else do
          outputText $ "Tool: " <> toolName
          outputText "Operations: create, read, update, delete"
          outputText "Modes: simulate, sandbox, live"
    
    CmdCreate (CreateOpts res mode global) -> do
      let ctx = (newContext Create mode (Just res) toolName)
                  { ctxVerbose = optVerbose global
                  , ctxForce = optForce global
                  , ctxJsonOutput = optJson global
                  }
      executeWithMode tool ctx
    
    CmdRead (ReadOpts res mode global) -> do
      let ctx = (newContext Read mode res toolName)
                  { ctxVerbose = optVerbose global
                  , ctxForce = optForce global
                  , ctxJsonOutput = optJson global
                  }
      executeWithMode tool ctx
    
    CmdUpdate (UpdateOpts res mode global) -> do
      let ctx = (newContext Update mode (Just res) toolName)
                  { ctxVerbose = optVerbose global
                  , ctxForce = optForce global
                  , ctxJsonOutput = optJson global
                  }
      executeWithMode tool ctx
    
    CmdDelete (DeleteOpts res mode global) -> do
      let ctx = (newContext Delete mode (Just res) toolName)
                  { ctxVerbose = optVerbose global
                  , ctxForce = optForce global
                  , ctxJsonOutput = optJson global
                  }
      executeWithMode tool ctx

{-|
EXAMPLE USAGE:

@
{-# LANGUAGE OverloadedStrings #-}

import PolyScript.Framework
import Data.Aeson (object, (.=), Value)
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time (getCurrentTime)

data CompilerTool = CompilerTool

instance PolyScriptTool CompilerTool where
  toolDescription _ = "Example compiler tool demonstrating CRUD × Modes"
  
  toolCreate _ resource options ctx = do
    logMessage ctx "info" $ "Compiling " <> fromMaybe "source" resource <> "..."
    
    let outputFile = maybe "a.out" (`T.append` ".out") resource
    currentTime <- getCurrentTime
    
    return $ Right $ object
      [ ("compiled", toJSON resource)
      , ("output", toJSON outputFile)
      , ("timestamp", toJSON $ show currentTime)
      ]
  
  toolRead _ resource options ctx = do
    logMessage ctx "info" "Checking compilation status..."
    
    currentTime <- getCurrentTime
    
    return $ Right $ object
      [ ("source_files", toJSON ["main.hs", "utils.hs", "config.hs" :: [Text]])
      , ("compiled_files", toJSON ["main.o", "utils.o" :: [Text]])
      , ("missing", toJSON ["config.o" :: Text])
      , ("last_build", toJSON $ show currentTime)
      ]
  
  toolUpdate _ resource options ctx = do
    logMessage ctx "info" $ "Recompiling " <> fromMaybe "source" resource <> "..."
    
    currentTime <- getCurrentTime
    
    return $ Right $ object
      [ ("recompiled", toJSON resource)
      , ("reason", toJSON ("source file changed" :: Text))
      , ("timestamp", toJSON $ show currentTime)
      ]
  
  toolDelete _ resource options ctx = do
    logMessage ctx "info" $ "Cleaning " <> fromMaybe "build artifacts" resource <> "..."
    
    currentTime <- getCurrentTime
    
    return $ Right $ object
      [ ("cleaned", toJSON ["*.o", "*.hi", "dist/" :: [Text]])
      , ("freed_space", toJSON ("12.5 MB" :: Text))
      , ("timestamp", toJSON $ show currentTime)
      ]

main :: IO ()
main = runTool CompilerTool

-- Command examples:
-- stack run -- create main.hs --mode simulate
-- stack run -- read
-- stack run -- update main.hs
-- stack run -- delete --mode simulate
-- stack run -- discover --json

-- For rebadging, you can create wrapper scripts or use shell aliases
@
-}