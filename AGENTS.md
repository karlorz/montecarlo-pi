# AGENTS.md

This file provides guidance to Code Agents when working with code in this repository.

## Project Overview

Monte Carlo Pi estimation benchmark suite comparing performance across multiple platforms and languages. All implementations use the Monte Carlo method: randomly generate points in a unit square and count how many fall inside a quarter circle to estimate π ≈ 4 × (points_in_circle / total_points).

## Project Structure

```
montecarlo-pi/
├── Makefile                    # Unified build system (RECOMMENDED)
├── run-benchmarks.sh           # Automated benchmark comparison script
├── benchmark-js.js             # Node.js benchmark (single-threaded)
├── benchmark-go/               # Go multi-threaded CLI
│   ├── main.go
│   └── go.mod
├── benchmark-rust-fast/        # Rust CLI with fastrand (WASM-native PRNG)
│   ├── src/main.rs
│   └── Cargo.toml
├── benchmark-rust-rand/        # Rust CLI with rand (cryptographic RNG)
│   ├── src/main.rs
│   └── Cargo.toml
└── app/
    ├── python/                 # Python multiprocessing implementation
    │   ├── benchmark.py
    │   └── Dockerfile
    ├── pwa/                    # PWA with Web Workers (CPU)
    │   ├── index.html
    │   ├── app.js
    │   └── worker.js
    ├── pwa-gpu/                # PWA with WebGL shaders (GPU)
    │   ├── index.html
    │   └── app.js
    └── pwa-wasm/               # PWA with Rust→WASM (multi-threaded)
        ├── index.html          # Multi-threaded version (default)
        ├── index-st.html       # Single-threaded version
        ├── src/lib.rs
        ├── wasm-worker.js
        └── Cargo.toml
```

## Unified Parameter Interface (CLI Benchmarks)

**All CLI implementations** (Go, Rust, Python) use consistent parameters:

- **THREADS** (`-mmt`): Number of parallel threads (default: 6 for Go/Python, auto-detect for Rust)
- **ITERATIONS** (`-ti`): Power of 10 for total iterations (e.g., 8 = 10^8 = 100 million)
- **RUNS** (`-i`): Number of benchmark runs to average (default: 2-5)

## Quick Start (Makefile - Recommended)

```bash
# Build all CLI benchmarks
make build-all

# Run Go benchmark with defaults (6 threads, 10^8 iterations, 2 runs)
make run-go

# Run Rust (fastrand) with custom settings
make run-rust THREADS=4 ITERATIONS=8 RUNS=3

# Run all benchmarks (JS, Rust fast, Rust rand)
make benchmark-all

# Clean build artifacts
make clean

# See all available commands
make help
```

## Running Individual Implementations

### Go Benchmark (Multi-threaded CLI)

```bash
# Build (production-optimized)
make build-go

# Run with custom parameters
make run-go THREADS=4 ITERATIONS=8 RUNS=3

# Direct execution
cd benchmark-go
./target/benchmark-go -mmt 4 -ti 8 -i 3
```

**Build flags:** `CGO_ENABLED=0`, `-ldflags="-s -w"`, `-trimpath` for static binary

### Rust Benchmarks (Native CLI)

Both Rust implementations support parallel processing with Rayon:

```bash
# Build
make build-rust-fast   # WASM-native fastrand PRNG
make build-rust-rand   # Cryptographic rand PRNG

# Run with consistent interface
make run-rust THREADS=4 ITERATIONS=8 RUNS=3
make run-rust-rand THREADS=6 ITERATIONS=9 RUNS=5

# Arguments: <iterations_power> <runs> <threads>
./benchmark-rust-fast/target/release/montecarlo-pi-benchmark-fast 8 5 6
./benchmark-rust-rand/target/release/montecarlo-pi-benchmark-rand 8 5 6
```

**Key implementations:**
- `benchmark-rust-fast/`: Uses `fastrand` (WASM-native, optimal for Monte Carlo)
- `benchmark-rust-rand/`: Uses `rand::rngs::StdRng` (cryptographic quality, 15x slower)

**Architecture:**
- Rayon parallel iterators for multi-threading
- Atomic counters for thread-safe aggregation
- Per-run seeding to ensure varied results across benchmark runs
- Thread pool initialized once per execution

### JavaScript Benchmark (Node.js)

```bash
# Run with defaults (10^8 iterations, 5 runs)
node benchmark-js.js

# Custom configuration
node benchmark-js.js 100000000 5
```

**Note:** Single-threaded, uses V8 JIT optimizations

### Python Benchmark (Multiprocessing)

```bash
# Direct execution
python3 app/python/benchmark.py -mmt 4 -i 2 -ti 7

# Docker
docker build -t python-benchmark:latest -f app/python/Dockerfile ./app/python
docker run --rm -it python-benchmark:latest python benchmark.py -mmt 4 -i 2 -ti 7

# Docker Compose
docker-compose -f docker-compose-py.yml up
```

**Architecture:** Uses `multiprocessing.Pool` to distribute work across CPU cores

### PWA with Web Workers (CPU)

```bash
# Serve with Docker Compose (port 8000)
docker-compose -f docker-compose-pwa.yml up

# Or use Python server
python3 -m http.server 8000 --directory app/pwa
```

Access at http://localhost:8000

**UI parameters:** Number of Threads, Iterations (Power of 10), Benchmark Iterations

### PWA with WebGL (GPU)

```bash
# Serve with Docker Compose (port 8001)
docker-compose -f docker-compose-pwa-gpu.yml up

# Or use Python server
python3 -m http.server 8000 --directory app/pwa-gpu
```

Access at http://localhost:8001

**Note:** Uses fragment shaders for GPU parallelization. RNG quality is lower than CPU implementations.

### PWA with WebAssembly (WASM)

```bash
# Build and serve with Docker Compose (port 8002)
docker-compose -f docker-compose-pwa-wasm.yml up

# Or build manually
cd app/pwa-wasm
./build.sh  # Requires Rust + wasm-pack
python3 -m http.server 8000
```

Access at http://localhost:8002 (Docker) or http://localhost:8000 (local)

**Versions:**
- `index.html`: Multi-threaded (default, 1-16 threads)
- `index-st.html`: Single-threaded

**Prerequisites:** Rust 1.70+, wasm-pack (`cargo install wasm-pack`)

## Critical Performance Optimizations (WASM)

### Fix #1: WASM-Native PRNG (100-200x speedup)

**Problem:** Using `getrandom` with `features = ["js"]` caused 200M WASM↔JS boundary crossings for 10^8 iterations (20-50 seconds overhead)

**Solution:** Switched to WASM-native `fastrand` PRNG

```toml
# Cargo.toml - BEFORE (SLOW)
getrandom = { version = "0.2", features = ["js"] }

# Cargo.toml - AFTER (FAST)
fastrand = "2.0"
```

### Fix #2: Worker Pool Pattern (1.5-2x speedup)

**Problem:** Creating new workers for every benchmark run caused 240-800ms initialization overhead (72-91% of total time)

**Solution:** Implemented `WorkerPool` class that creates workers once and reuses them

**Architecture:**
- Workers send ready signal after WASM initialization
- Pool waits for all workers to be ready before dispatching tasks
- Initialization cost amortized as one-time upfront cost

## Performance Benchmarks

### CLI Benchmarks (Native - 10^8 iterations, 4 threads)

| Implementation | Avg Time | Speedup |
|---------------|----------|---------|
| **Rust (fastrand)** | **~20ms** | **6x faster** |
| Go | ~125ms | 1.0x (baseline) |
| Rust (rand) | ~43ms | 3x faster |
| JavaScript (Node.js) | ~1000ms | 0.1x (single-threaded) |

### WASM Browser (10^8 iterations)

| Implementation | Time | vs JavaScript |
|---------------|------|---------------|
| **WASM (Optimized)** | **~100-200ms** | **2-10x faster** |
| JavaScript (Web Workers) | ~500-2000ms | 1.0x (baseline) |
| WASM (Old, unoptimized) | ~20-50 seconds | 20-50x slower |

## Key Architectural Differences

- **GPU version (WebGL):** Processes work in chunks asynchronously, parallelization handled by GPU
- **CPU versions (Go, Rust, Python, PWA Workers):** Distribute iterations evenly across threads/workers
- **WASM Multi-threaded:** Compiled Rust + multi-core via Web Workers + worker pool pattern
- **WASM Single-threaded:** Runs on main thread, no parallelization

## Seeding Strategy

**Go implementation:**
- Per-worker seed: `time.Now().UnixNano() + workerID * 1000000`
- Uses `math/rand` with unique seeds per worker

**Rust implementations:**
- Per-run seed: `run * 100000 + timestamp_nanos`
- Per-thread seed: `run_seed * 1000000 + thread_id`
- Ensures varied results across benchmark runs while maintaining determinism within threads

**WASM implementation:**
- Uses `fastrand::seed()` with run-specific seeds
- Avoids boundary crossings by using WASM-native RNG

## Important Implementation Notes

### Rust Parallel Processing

Both `benchmark-rust-fast` and `benchmark-rust-rand` use Rayon for parallelization:

```rust
use rayon::prelude::*;

fn calculate_pi_parallel(iterations: u64, threads: usize, run_seed: u64) -> f64 {
    // Set global thread pool size once in main()
    rayon::ThreadPoolBuilder::new()
        .num_threads(threads)
        .build_global()
        .unwrap();

    // Parallel iteration with unique seeds per thread
    (0..threads).into_par_iter().for_each(|thread_id| {
        let seed = run_seed * 1000000 + thread_id;
        // ... Monte Carlo iterations
    });
}
```

### Go Parallel Processing

Uses goroutines with `sync.WaitGroup`:

```go
func runBenchmark(threads int, totalIterations int64) {
    var wg sync.WaitGroup
    results := make(chan int64, threads)

    for i := 0; i < threads; i++ {
        wg.Add(1)
        go calculatePiWorker(iterationsPerThread, &wg, results)
    }

    wg.Wait()
    // Aggregate results
}
```

### WASM Worker Pool

Persistent worker management to avoid initialization overhead:

```javascript
class WorkerPool {
    constructor(numWorkers) {
        this.workers = [];
        // Create workers once
        for (let i = 0; i < numWorkers; i++) {
            const worker = new Worker('wasm-worker.js', { type: 'module' });
            this.workers.push(worker);
        }
    }

    async executeTask(iterations) {
        // Reuse workers across benchmark runs
        const promises = this.workers.map(worker =>
            this.sendTask(worker, iterations)
        );
        return Promise.all(promises);
    }
}
```

## Known Issues & Lessons Learned

### Resolved: WASM Performance Degradation (2025-10-15)

**Root causes:**
1. WASM↔JS boundary crossings are extremely expensive (~50-200ns per call)
2. Worker initialization overhead dominates short computations
3. `getrandom` with `features = ["js"]` calls back to JavaScript for every random number

**Solutions:**
1. Use WASM-native libraries (avoid JS dependencies in hot loops)
2. Implement worker pooling for reusable workers
3. Profile and measure - counterintuitive issues can arise in WASM

### GPU Implementation Accuracy

WebGL uses lower-quality RNG (`fract(sin(seed + i) * 43758.5453)`) compared to CPU implementations. This may affect π accuracy but provides significant GPU parallelization benefits.

## WSL2 Development Setup

```bash
# Find WSL2 IP
hostname -I

# Forward port from Windows to WSL2 (PowerShell as Administrator)
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL2_IP_ADDRESS>

# Verify port forwarding
netsh interface portproxy show all
```

## GitHub Pages Deployment

Live demos: https://karlorz.github.io/montecarlo-pi/

- **PWA (Web Workers):** `/app/pwa/`
- **PWA (WebGL GPU):** `/app/pwa-gpu/`
- **PWA (WebAssembly):** `/app/pwa-wasm/`

**Automated CI/CD:**
- GitHub Actions builds WASM on every push to `main`
- No compiled binaries committed to repository
- Workflow: `.github/workflows/deploy.yml`

## Testing & Validation

```bash
# Quick test (Go)
make test-go

# Run comprehensive benchmark suite
make benchmark-all

# Custom benchmark comparison
./run-benchmarks.sh 100000000 5
```

## References

- [getrandom docs](https://docs.rs/getrandom/)
- [fastrand docs](https://docs.rs/fastrand/)
- [Rayon docs](https://docs.rs/rayon/)
- [wasm-bindgen performance](https://rustwasm.github.io/docs/book/reference/code-size.html)
