{-# LANGUAGE NoRebindableSyntax #-}
{-# OPTIONS_GHC -fno-warn-missing-import-lists #-}
{-# OPTIONS_GHC -w #-}
module PackageInfo_polyscript_framework (
    name,
    version,
    synopsis,
    copyright,
    homepage,
  ) where

import Data.Version (Version(..))
import Prelude

name :: String
name = "polyscript_framework"
version :: Version
version = Version [0,1,0,0] []

synopsis :: String
synopsis = "PolyScript Framework for Haskell"
copyright :: String
copyright = ""
homepage :: String
homepage = ""
