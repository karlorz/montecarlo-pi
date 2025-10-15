#!/bin/bash

# Benchmark Comparison Script
# Compares JavaScript, Rust (fastrand), and Rust (rand::thread_rng) implementations

set -e

ITERATIONS=${1:-100000000}  # Default: 10^8
RUNS=${2:-5}                 # Default: 5 runs

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     Monte Carlo Pi - Performance Comparison Suite            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  Iterations: ${ITERATIONS}"
echo "  Runs per benchmark: ${RUNS}"
echo ""

# Build Rust benchmarks
echo "🔨 Building Rust benchmarks..."
echo ""

echo "Building fastrand benchmark (release mode)..."
cd benchmark-rust-fast
cargo build --release --quiet
cd ..

echo "Building rand::thread_rng benchmark (release mode)..."
cd benchmark-rust-rand
cargo build --release --quiet
cd ..

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Run JavaScript benchmark
echo "🟨 Running JavaScript benchmark..."
node benchmark-js.js ${ITERATIONS} ${RUNS}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Run Rust (fastrand) benchmark
echo "🟦 Running Rust (fastrand) benchmark..."
./benchmark-rust-fast/target/release/montecarlo-pi-benchmark-fast ${ITERATIONS} ${RUNS}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Run Rust (rand) benchmark
echo "🟥 Running Rust (rand::thread_rng) benchmark..."
./benchmark-rust-rand/target/release/montecarlo-pi-benchmark-rand ${ITERATIONS} ${RUNS}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ All benchmarks complete!"
echo ""
echo "Expected results:"
echo "  - Rust (fastrand) should be the fastest (~2-5x faster than JS)"
echo "  - JavaScript should be competitive"
echo "  - Rust (rand) uses cryptographic RNG, may be slower"
echo ""
echo "Note: In WASM with getrandom 'js' feature, the story is different:"
echo "  - WASM calls JS for every random number (200M boundary crossings!)"
echo "  - This makes WASM catastrophically slower than native JS"
echo "  - The fix: use fastrand in WASM (WASM-native PRNG)"
