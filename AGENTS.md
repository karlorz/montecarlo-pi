# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Monte Carlo Pi estimation benchmark project that implements the same algorithm across four different platforms:
1. **Python backend** - Multiprocessing-based implementation
2. **PWA (CPU)** - Progressive Web App using Web Workers for parallelization
3. **PWA (GPU)** - Progressive Web App using WebGL shaders for GPU acceleration
4. **PWA (WASM)** - Progressive Web App using Rust compiled to WebAssembly

All three implementations use the Monte Carlo method: randomly generate points in a unit square and count how many fall inside a quarter circle to estimate π ≈ 4 × (points_in_circle / total_points).

## Running the Implementations

### Python Backend
```sh
# Build the Docker image
docker build -t python-benchmark:latest -f app/python/Dockerfile ./app/python

# Run with Docker
docker run --rm -it python-benchmark:latest python benchmark.py -mmt 4 -i 2 -ti 7

# Or use docker-compose (default: 4 threads, 1 iteration, 10^7 points)
docker-compose -f docker-compose-py.yml up

# Direct execution (no Docker)
python3 app/python/benchmark.py -mmt 4 -i 2 -ti 7
```

**Python CLI arguments:**
- `-mmt`: Number of threads (defaults to CPU count)
- `-i`: Number of benchmark iterations (default: 4)
- `-ti`: Total iterations as power of 10 (default: 6, meaning 10^6 iterations)

### PWA with Web Workers (CPU)
```sh
# Run with docker-compose (serves on port 8000)
docker-compose -f docker-compose-pwa.yml up

# Or use Python's built-in server
python3 -m http.server 8000 --directory app/pwa
```
Access at http://localhost:8000

**UI parameters:**
- Number of Threads: How many Web Workers to spawn
- Iterations (Power of 10): Total Monte Carlo iterations
- Benchmark Iterations: How many times to repeat for averaging

### PWA with WebGL (GPU)
```sh
# Run with docker-compose (serves on port 8001)
docker-compose -f docker-compose-pwa-gpu.yml up

# Or use Python's built-in server
python3 -m http.server 8000 --directory app/pwa-gpu
```
Access at http://localhost:8001

### PWA with WebAssembly (WASM)
```sh
# Build and run with docker-compose (serves on port 8002)
docker-compose -f docker-compose-pwa-wasm.yml up

# Or build manually and serve
cd app/pwa-wasm
./build.sh  # or: wasm-pack build --target web
python3 -m http.server 8000
```
Access at http://localhost:8002 (Docker) or http://localhost:8000 (local)

**Default**: Multi-threaded version with thread selector (1-16 threads)
**Alternative**: Single-threaded version at `index-st.html`

**Prerequisites for local build:**
- Rust 1.70+
- wasm-pack: `cargo install wasm-pack`

## Architecture Details

### Python Implementation (app/python/benchmark.py)
- Uses `multiprocessing.Pool` to distribute work across CPU cores
- Each worker process runs iterations independently with separate random seeds
- The `TestMC` class encapsulates the parallel execution logic
- Results are aggregated and averaged across benchmark iterations

### PWA CPU Implementation (app/pwa/)
- **app.js**: Main controller that spawns Web Workers and aggregates results
- **worker.js**: Each worker performs Monte Carlo iterations independently
- **index.html**: UI for configuring threads, iterations, and viewing results
- Work distribution: `iterations / threads` per worker
- Sequential benchmark runs to calculate averages

### PWA GPU Implementation (app/pwa-gpu/)
- **app.js**: Single-file implementation using WebGL for GPU computation
- Uses fragment shaders to parallelize Monte Carlo sampling on the GPU
- **RNG approach**: Custom pseudo-random generator using `fract(sin(seed + i) * 43758.5453123)`
- Processes iterations in chunks (10^6 per chunk) using `requestAnimationFrame`
- Reads results back from floating-point framebuffer for precision
- Note: WebGL RNG quality is lower than CPU implementations, which may affect π accuracy

### PWA WASM Implementation (app/pwa-wasm/)
- **src/lib.rs**: Rust implementation compiled to WebAssembly
- **Default (index.html)**: Multi-threaded version using Web Workers + WASM instances
- **Alternative (index-st.html)**: Single-threaded version

**CRITICAL PERFORMANCE FIXES (2025-10-15):**

1. **Fix #1: WASM-Native PRNG (fastrand)**
   - **Previous issue**: `getrandom` with `features = ["js"]` caused 200M WASM↔JS boundary crossings for 10^8 iterations
   - **Impact**: Made WASM 20-50x SLOWER than pure JavaScript (catastrophic)
   - **Solution**: Replaced with WASM-native `fastrand` PRNG (no JS calls)
   - **Result**: 100-200x faster than old implementation

2. **Fix #2: Worker Pool Pattern**
   - **Previous issue**: Created new workers for EVERY benchmark run, each worker initializes WASM (~15-50ms per worker)
   - **Impact**: With 8 threads × 2 runs, initialization overhead was 240-800ms (72-91% of total time!)
   - **Solution**: Implemented `WorkerPool` class that creates workers once and reuses them across all benchmark runs
   - **Result**: 1.5-2x speedup, initialization amortized as one-time cost

**Combined Performance:**
- Old WASM (with getrandom + disposable workers): 20-50 seconds for 10^8 iterations ❌
- New WASM (with fastrand + worker pool): ~100-200ms for 10^8 iterations ⚡
- Pure JavaScript: ~500-2000ms for 10^8 iterations
- **Final: WASM now 2-10x faster than JavaScript** ✅

**Architecture:**
- **Key functions**:
  - `calculate_pi(iterations)`: Returns estimated Pi value directly (f64)
  - `benchmark_pi(iterations, runs)`: Runs multiple iterations and returns averages
- **wasm-worker.js**: Web Worker that loads WASM module once, sends ready signal when initialized
- **WorkerPool class**: Manages persistent workers, waits for initialization before dispatching tasks
- Compiled with aggressive optimizations (`opt-level = 3`, LTO, `codegen-units = 1`, `wasm-opt = ['-O3']`)
- Benefits from near-native performance and type safety
- Thread control: 1-16 threads configurable in UI
- **WASM binary size**: ~45KB (optimized)

### Key Architectural Differences
- **GPU version**: Processes work in fixed-size chunks asynchronously, parallelization handled by GPU
- **CPU versions** (Python, PWA Workers, WASM Multi-threaded): Distribute iterations evenly across threads/workers
- **WASM Single-threaded** (index-st.html): Runs on main thread with compiled performance, no parallelization
- **WASM Multi-threaded** (default): Best of both worlds - compiled code + multi-core parallelization via Web Workers

## WSL2-Specific Setup (from README)

If developing on Windows with WSL2:

```sh
# Find WSL2 IP
hostname -I

# Forward port from Windows to WSL2 (PowerShell as Administrator)
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL2_IP_ADDRESS>

# Verify port forwarding
netsh interface portproxy show all
```

## Known Issues

### Previous Performance Issue (RESOLVED 2025-10-15)
The WASM implementation was catastrophically slow (20-50x slower than JavaScript) due to using `getrandom` crate with `features = ["js"]`, which caused 200 million WASM↔JS boundary crossings for random number generation. **This has been fixed by switching to `fastrand`, a WASM-native PRNG.**

### Accuracy Note
The GPU implementation uses a lower-quality RNG (`fract(sin(seed + i) * 43758.5453123)`) compared to CPU implementations, which may affect π accuracy. The CPU and WASM implementations use high-quality PRNGs with good statistical properties.

## Performance Benchmarks (Local Native - 10^8 iterations)

Based on benchmark testing on 2025-10-15:

| Implementation | Average Time | Speedup vs JS | Notes |
|---------------|--------------|---------------|-------|
| **Rust (fastrand)** | **76.28 ms** | **13.2x faster** | WASM-native PRNG, optimal for Monte Carlo |
| JavaScript (Node.js) | 1004.49 ms | 1.0x (baseline) | V8 optimizations, Math.random() |
| Rust (rand::thread_rng) | 1112.54 ms | 0.9x | Cryptographic-quality RNG (ChaCha20) |

**Key Insights:**
- Rust with `fastrand` provides 13x speedup over JavaScript for Monte Carlo simulations
- WASM in browser should achieve similar performance (76-150ms expected)
- Using cryptographic RNG adds ~15x overhead compared to fast PRNG
- For Monte Carlo simulations, `fastrand` is the optimal choice

See `PERFORMANCE-ANALYSIS.md` for detailed analysis and `benchmark-*/` directories for reproducible benchmarks.
