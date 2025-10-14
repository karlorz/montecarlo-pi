# Monte Carlo Pi WebAssembly

This directory contains the WebAssembly (Rust) implementation of the Monte Carlo Pi benchmark.

## Prerequisites

- Rust (1.70+)
- wasm-pack
- A web browser with WebAssembly support

## Installation

### Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Install wasm-pack
```bash
cargo install wasm-pack
```

## Building

### Option 1: Using the build script
```bash
./build.sh
```

### Option 2: Manual build
```bash
wasm-pack build --target web --out-dir pkg
```

This will create a `pkg/` directory containing:
- `montecarlo_pi_wasm_bg.wasm` - The compiled WebAssembly binary
- `montecarlo_pi_wasm.js` - JavaScript bindings
- `montecarlo_pi_wasm.d.ts` - TypeScript definitions

## Running

### Option 1: Python HTTP server
```bash
python3 -m http.server 8000
```

### Option 2: Node.js http-server
```bash
npx http-server . -p 8000
```

### Option 3: Docker
```bash
# Build and run
docker-compose -f ../../docker-compose-pwa-wasm.yml up

# Or manually
docker build -t montecarlo-wasm .
docker run -p 8002:8000 montecarlo-wasm
```

Then open http://localhost:8000 (or http://localhost:8002 for Docker) in your browser.

## Available Versions

This implementation provides **two versions**:

### 1. Multi-threaded (`index.html`) - **DEFAULT** ⭐
- **URL**: http://localhost:8000/ or http://localhost:8000/index.html
- **Execution**: Spawns multiple Web Workers, each running WASM
- **Use case**: Maximum performance utilizing multiple CPU cores
- **Thread selection**: Configurable in UI (1-16 threads)
- **Architecture**: JavaScript Web Workers + WASM instances

### 2. Single-threaded (`index-st.html`)
- **URL**: http://localhost:8000/index-st.html
- **Execution**: Runs on a single core
- **Use case**: Benchmarking raw single-threaded WASM performance
- **No thread selection**: Runs on main thread only

> **Note**: The default multi-threaded version uses Web Workers to spawn multiple WASM instances in parallel, similar to the PWA (CPU) implementation but with compiled Rust code in each worker for better performance.

## Implementation Details

The Monte Carlo Pi calculation is implemented in Rust (`src/lib.rs`) and compiled to WebAssembly. Key features:

- **Native performance**: Near-native speed for computation-intensive operations
- **Quality RNG**: Uses Rust's `rand` crate with proper random number generation
- **Memory efficient**: Compiled with optimization flags (`opt-level = "s"`, LTO enabled)
- **Type safe**: Rust's type system prevents common bugs at compile time

### API

The WASM module exports two main functions:

1. `calculate_pi(iterations: f64) -> Vec<f64>`
   - Returns `[pi_estimate, points_in_circle, total_points]`

2. `benchmark_pi(iterations: f64, benchmark_runs: f64) -> Vec<f64>`
   - Runs multiple iterations and returns `[avg_pi, avg_time_ms, total_runs]`

### Multi-threading Approach

**Why not use wasm-threads?**
- WASM threads (via `SharedArrayBuffer`) require special HTTP headers (COOP/COEP)
- Not compatible with GitHub Pages by default
- More complex setup and browser compatibility issues

**Current approach: Web Workers + WASM**
- ✅ Works on all modern browsers
- ✅ Compatible with GitHub Pages
- ✅ Each worker runs its own WASM instance
- ✅ Similar architecture to PWA (CPU) version but with compiled performance

## Performance Comparison

Expected performance characteristics compared to other implementations:

**Single-threaded version:**
- **Faster than**: JavaScript (single-threaded)
- **Slower than**: WebGL GPU, Python multiprocessing, JavaScript Web Workers (multi-threaded)

**Multi-threaded version (default):**
- **Faster than**: JavaScript Web Workers (due to compiled code)
- **Comparable to**: Native Python with multiprocessing
- **Slower than**: WebGL GPU implementation (for very large iterations)
- **Best choice**: For CPU-based benchmarks with multi-core utilization

The WebAssembly version benefits from:
- Compiled code execution
- Better random number generation quality
- No GIL (Global Interpreter Lock) limitations
- Efficient memory layout
