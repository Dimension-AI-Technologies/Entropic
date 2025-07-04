{-|
Test Haskell Compiler Tool for PolyScript Framework
CRUD × Modes Architecture: Zero-boilerplate CLI development

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
-}

{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE DeriveGeneric #-}

module Main where

import Control.Monad.IO.Class (liftIO)
import Data.Aeson (object, (.=), Value(..), ToJSON)
import qualified Data.Aeson as Aeson
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time (getCurrentTime, formatTime, defaultTimeLocale)
import GHC.Generics (Generic)
import PolyScript.Framework

-- Test Compiler Tool Implementation
data TestCompilerTool = TestCompilerTool

instance PolyScriptTool TestCompilerTool where
  toolDescription _ = "Test Haskell compiler tool demonstrating CRUD × Modes"
  
  toolCreate _ resource options context = do
    logMessage context "info" $ "Compiling " <> T.pack (show resource) <> "..."
    
    let resourceStr = maybe "main.hs" T.unpack resource
    let outputFile = maybe (T.pack $ resourceStr ++ ".out") T.pack (lookup "output" options >>= parseString)
    let optimize = maybe False parseBool (lookup "optimize" options)
    
    currentTime <- getCurrentTime
    let timestamp = T.pack $ formatTime defaultTimeLocale "%Y-%m-%dT%H:%M:%S%z" currentTime
    
    return $ Right $ object
      [ "compiled" .= resourceStr
      , "output" .= outputFile
      , "optimized" .= optimize
      , "timestamp" .= timestamp
      ]
  
  toolRead _ resource options context = do
    logMessage context "info" "Checking compilation status..."
    
    let sourceFiles = case resource of
          Just r -> [T.unpack r]
          Nothing -> ["Main.hs", "Utils.hs", "Config.hs"]
    
    currentTime <- getCurrentTime
    let timestamp = T.pack $ formatTime defaultTimeLocale "%Y-%m-%dT%H:%M:%S%z" currentTime
    
    return $ Right $ object
      [ "source_files" .= sourceFiles
      , "compiled_files" .= (["Main.hi", "Utils.hi"] :: [String])
      , "missing" .= (["Config.hi"] :: [String])
      , "last_build" .= timestamp
      ]
  
  toolUpdate _ resource options context = do
    logMessage context "info" $ "Recompiling " <> T.pack (show resource) <> "..."
    
    let resourceStr = maybe "main.hs" T.unpack resource
    let incremental = maybe False parseBool (lookup "incremental" options)
    
    currentTime <- getCurrentTime
    let timestamp = T.pack $ formatTime defaultTimeLocale "%Y-%m-%dT%H:%M:%S%z" currentTime
    
    return $ Right $ object
      [ "recompiled" .= resourceStr
      , "reason" .= ("source file changed" :: Text)
      , "incremental" .= incremental
      , "timestamp" .= timestamp
      ]
  
  toolDelete _ resource options context = do
    logMessage context "info" $ "Cleaning " <> maybe "build artifacts" (T.pack . show) resource <> "..."
    
    currentTime <- getCurrentTime
    let timestamp = T.pack $ formatTime defaultTimeLocale "%Y-%m-%dT%H:%M:%S%z" currentTime
    
    return $ Right $ object
      [ "cleaned" .= (["*.hi", "*.o", "dist/"] :: [String])
      , "freed_space" .= ("8.9 MB" :: Text)
      , "timestamp" .= timestamp
      ]

-- Helper functions
parseString :: Aeson.Value -> Maybe String
parseString (String t) = Just $ T.unpack t
parseString _ = Nothing

parseBool :: Aeson.Value -> Bool
parseBool (Bool b) = b
parseBool _ = False

main :: IO ()
main = runTool TestCompilerTool