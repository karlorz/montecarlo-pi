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
- Uses Rust's `rand` crate for high-quality random number generation
- **Key functions**:
  - `calculate_pi(iterations)`: Returns `[pi_estimate, points_in_circle, total_points]`
  - `benchmark_pi(iterations, runs)`: Runs multiple iterations and returns averages
- **wasm-worker.js**: Web Worker that loads and runs WASM module
- Compiled with optimizations (`opt-level = "s"`, LTO enabled)
- Multi-threaded version: Spawns N workers, each running a WASM instance
- Benefits from near-native performance and type safety
- Thread control: 1-16 threads configurable in UI

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

Based on recent commits ("update pi still not correct"), there may be accuracy issues with the π calculation, particularly in the GPU implementation where the RNG quality and accumulation logic are potential sources of error.
