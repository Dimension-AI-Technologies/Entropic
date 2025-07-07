{-# LANGUAGE OverloadedStrings #-}
{-
Test compiler for Haskell PolyScript framework
Tests CRUD operations across all modes

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
-}

module Main where

import PolyScript.Framework
import Data.Aeson (object, (.=))
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time.Clock (getCurrentTime)
import System.Environment (getArgs)
import System.Exit (exitSuccess, exitFailure)

-- Test compiler tool implementation
data TestCompiler = TestCompiler

instance PolyScriptTool TestCompiler where
    toolDescription _ = "Test compiler for PolyScript framework"
    
    toolCreate _ resource _ _ = do
        let filename = maybe "test.txt" T.unpack resource
        return $ Right $ object
            [ "action" .= ("compile" :: Text)
            , "file" .= filename
            , "status" .= ("created" :: Text)
            ]
    
    toolRead _ Nothing _ _ = do
        -- List files
        return $ Right $ object
            [ "files" .= (["main.cpp", "utils.cpp", "test.cpp"] :: [Text])
            , "count" .= (3 :: Int)
            ]
    
    toolRead _ (Just resource) _ _ = do
        -- Read specific file
        return $ Right $ object
            [ "file" .= resource
            , "content" .= ("// Sample C++ code" :: Text)
            , "lines" .= (42 :: Int)
            ]
    
    toolUpdate _ resource _ _ = do
        let filename = maybe "test.txt" T.unpack resource
        return $ Right $ object
            [ "action" .= ("recompile" :: Text)
            , "file" .= filename
            , "status" .= ("updated" :: Text)
            ]
    
    toolDelete _ resource _ _ = do
        let filename = maybe "test.txt" T.unpack resource
        return $ Right $ object
            [ "action" .= ("clean" :: Text)
            , "file" .= filename
            , "status" .= ("deleted" :: Text)
            ]

main :: IO ()
main = runTool TestCompiler