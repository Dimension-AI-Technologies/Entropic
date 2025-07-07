package main

import (
    "fmt"
)

/*
#cgo LDFLAGS: -L/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/build -lpolyscript
#cgo CFLAGS: -I/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/include
#include <stdbool.h>

extern bool polyscript_can_mutate(int mode);
extern bool polyscript_require_confirm(int mode, int operation);
*/
import "C"

func main() {
    // Test Live mode (2) with Update operation (2)
    liveModeCanMutate := bool(C.polyscript_can_mutate(2))
    liveUpdateRequiresConfirm := bool(C.polyscript_require_confirm(2, 2))
    
    fmt.Printf("Live mode can mutate: %v\n", liveModeCanMutate)
    fmt.Printf("Live update requires confirm: %v\n", liveUpdateRequiresConfirm)
    
    if liveModeCanMutate && liveUpdateRequiresConfirm {
        fmt.Println("SUCCESS: Go FFI correctly calls libpolyscript")
    } else {
        fmt.Printf("FAIL: Unexpected behavior - can_mutate=%v, require_confirm=%v\n", 
                   liveModeCanMutate, liveUpdateRequiresConfirm)
    }
}