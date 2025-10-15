#!/bin/bash

# Build script for Monte Carlo Pi WebAssembly

echo "Building WebAssembly module..."

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null
then
    echo "wasm-pack is not installed. Installing..."
    cargo install wasm-pack
fi

# Build the WASM module with release optimizations
wasm-pack build --release --target web --out-dir pkg

if [ $? -eq 0 ]; then
    echo "Build successful!"
    echo "Output directory: pkg/"
    echo ""
    echo "To run the application:"
    echo "  python3 -m http.server 8000"
    echo "  Then open http://localhost:8000 in your browser"
else
    echo "Build failed!"
    exit 1
fi
