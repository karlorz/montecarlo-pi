# Monte Carlo Pi Benchmark

Cross-platform Monte Carlo Pi estimation benchmark suite comparing performance across JavaScript, Rust, Go, Python, WebAssembly, and GPU implementations.

## 🌐 Live Demos (GitHub Pages)

Try the benchmarks directly in your browser:

- **PWA (Web Workers)**: https://karlorz.github.io/montecarlo-pi/app/pwa/
- **PWA (WebGL GPU)**: https://karlorz.github.io/montecarlo-pi/app/pwa-gpu/
- **PWA (WebAssembly)**: https://karlorz.github.io/montecarlo-pi/app/pwa-wasm/

> **Note**: The WASM version is automatically built by GitHub Actions on each push. No compiled binaries are committed to the repository.

## 📋 Overview

Monte Carlo method benchmarks for calculating π across multiple platforms:

- **Go** (`benchmark-go/`) - Multi-threaded CLI using goroutines
- **Rust CPU** (`benchmark-rust-fast/`, `benchmark-rust-rand/`) - Native CLI with parallel processing
- **Rust GPU** (`benchmark-rust-gpu/`) - WebGPU compute shader (Metal/DirectX/Vulkan)
- **C++** (`benchmark-cpp/`) - Multi-threaded CLI with std::thread
- **JavaScript** (`benchmark-js.js`) - Node.js single-threaded benchmark
- **Python** (`app/python/`) - Multiprocessing implementation
- **Web Apps** - Browser-based implementations:
  - `app/pwa/` - Web Workers (CPU multi-threaded)
  - `app/pwa-gpu/` - WebGL shaders (GPU acceleration)
  - `app/pwa-wasm/` - Rust→WebAssembly (multi-threaded)

### Unified CLI Interface

All CLI implementations use consistent parameters:
- `THREADS` (`-mmt`): Number of parallel threads (default: 6)
- `ITERATIONS` (`-ti`): Power of 10 for total iterations (e.g., 8 = 10^8 = 100 million)
- `RUNS` (`-i`): Number of benchmark runs to average (default: 2-5)

## 🚀 Quick Start

```bash
# Build all CLI benchmarks
make build-all

# Run Go benchmark (default: 6 threads, 10^8 iterations, 2 runs)
make run-go

# Run Rust CPU benchmark with custom settings
make run-rust THREADS=4 ITERATIONS=8 RUNS=3

# Run Rust GPU benchmark
make run-rust-gpu ITERATIONS=8 RUNS=3

# Run C++ CPU benchmark
make run-cpp THREADS=8 ITERATIONS=8 RUNS=3

# Run comprehensive benchmark suite (all implementations)
make benchmark-all

# See all available commands
make help
```

## Prerequisites

- **Go** 1.21+ (for Go benchmarks)
- **Rust** + Cargo (for Rust benchmarks and WASM)
- **C++17 compiler** (g++ 7+, clang++ 5+, or MSVC 2017+) - for C++ benchmarks
- **Node.js** (for JavaScript benchmarks)
- **Python 3.x** (for Python benchmarks and simple HTTP server)
- **Make** (optional but recommended for unified build system)
- **wasm-pack** (for WASM builds): `cargo install wasm-pack`

### GPU Requirements (for Rust GPU benchmark)
- **macOS**: Metal-capable GPU (all Apple Silicon, most Intel Macs 2012+)
- **Windows**: DirectX 12-capable GPU or Vulkan support
- **Linux**: Vulkan-capable GPU with drivers installed

## 📊 Performance Highlights

Recent optimizations (2025-10-15) dramatically improved WebAssembly performance:

### Native CLI Benchmarks (10^8 iterations, 4 threads)

| Implementation | Avg Time | Speedup |
|---------------|----------|---------|
| **Rust (fastrand)** | **~20ms** | **6x faster** ⚡ |
| Go (goroutines) | ~125ms | 1.0x (baseline) |
| Rust (rand) | ~43ms | 3x faster |
| JavaScript (Node.js) | ~1000ms | 0.1x (single-threaded) |

### Browser WASM (10^8 iterations)

| Implementation | Time | vs JavaScript |
|---------------|------|---------------|
| **WASM (Optimized)** | **~100-200ms** | **2-10x faster** ⚡⚡ |
| JavaScript (Web Workers) | ~500-2000ms | 1.0x (baseline) |
| WASM (Old, unoptimized) | ~20-50 seconds | 20-50x slower ❌ |

**Key optimizations:**
1. Replaced `getrandom` with WASM-native `fastrand` PRNG (eliminated 200M boundary crossings)
2. Implemented worker pool pattern (eliminated repeated WASM initialization overhead)
3. Added Rayon parallel processing to native Rust benchmarks

## 🔧 Running Benchmarks

### Using Makefile (Recommended)

```bash
# Build specific implementations
make build-go          # Build Go benchmark
make build-rust-fast   # Build Rust (fastrand) benchmark
make build-rust-rand   # Build Rust (rand) benchmark
make build-rust-gpu    # Build Rust GPU (WebGPU) benchmark
make build-cpp         # Build C++ CPU benchmark

# Run with custom parameters (all use same interface)
make run-go THREADS=8 ITERATIONS=8 RUNS=5
make run-rust THREADS=4 ITERATIONS=9 RUNS=3
make run-rust-rand THREADS=6 ITERATIONS=8 RUNS=2
make run-rust-gpu ITERATIONS=8 RUNS=3
make run-cpp THREADS=8 ITERATIONS=8 RUNS=3

# Run all benchmarks
make benchmark-all

# Quick test
make test-go

# Clean build artifacts
make clean
```

### Direct Execution

#### Go Benchmark

```bash
# Build (production-optimized)
cd benchmark-go
CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o target/benchmark-go

# Run
./target/benchmark-go -mmt 4 -ti 8 -i 3
```

**Build flags:**
- `CGO_ENABLED=0` - Static binary, no external dependencies
- `-ldflags="-s -w"` - Strip debug symbols (~33% size reduction)
- `-trimpath` - Reproducible builds

#### Rust Benchmarks

Both implementations support parallel processing with Rayon:

```bash
# Build
cd benchmark-rust-fast && cargo build --release
cd benchmark-rust-rand && cargo build --release

# Run (args: <iterations_power> <runs> <threads>)
./benchmark-rust-fast/target/release/montecarlo-pi-benchmark-fast 8 5 6
./benchmark-rust-rand/target/release/montecarlo-pi-benchmark-rand 8 5 6
```

**Implementations:**
- `benchmark-rust-fast/`: WASM-native `fastrand` (optimal for Monte Carlo)
- `benchmark-rust-rand/`: Cryptographic `rand::rngs::StdRng` (15x slower)
- `benchmark-rust-gpu/`: WebGPU compute shaders (cross-platform GPU acceleration)

#### C++ Benchmark

```bash
# Build
cd benchmark-cpp
g++ -std=c++17 -O3 -march=native -pthread -o target/benchmark-cpp main.cpp

# Run (args: -mmt <threads> -ti <power> -i <runs>)
./target/benchmark-cpp -mmt 8 -ti 8 -i 3
```

**Features:**
- Uses `std::mt19937_64` PRNG (Mersenne Twister)
- Lock-free atomic aggregation with `std::atomic`
- Optimized with `-O3 -march=native` flags

#### JavaScript Benchmark

```bash
node benchmark-js.js 100000000 5
```

#### Python Benchmark

```bash
# Direct execution
python3 app/python/benchmark.py -mmt 4 -i 2 -ti 7

# Docker
docker build -t python-benchmark:latest -f app/python/Dockerfile ./app/python
docker run --rm -it python-benchmark:latest python benchmark.py -mmt 4 -i 2 -ti 7

# Docker Compose
docker-compose -f docker-compose-py.yml up
```

### Web Applications

#### PWA with Web Workers (CPU)

```bash
# Serve with Docker Compose (port 8000)
docker-compose -f docker-compose-pwa.yml up

# Or use Python's HTTP server
python3 -m http.server 8000 --directory app/pwa
```

Access at http://localhost:8000

**Features:** Multi-threaded CPU processing using Web Workers

#### PWA with WebGL (GPU)

```bash
# Serve with Docker Compose (port 8001)
docker-compose -f docker-compose-pwa-gpu.yml up

# Or use Python's HTTP server
python3 -m http.server 8000 --directory app/pwa-gpu
```

Access at http://localhost:8001

**Features:** GPU-accelerated Monte Carlo using fragment shaders

**Note:** Uses lower-quality RNG for GPU compatibility, may affect π accuracy

#### PWA with WebAssembly

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
- `index.html` - Multi-threaded (1-16 threads, default)
- `index-st.html` - Single-threaded

## 🔍 Performance Analysis

### Critical WASM Optimization #1: WASM-Native PRNG

**Problem:**
- Using `getrandom` with `features = ["js"]` forced WASM to call JavaScript for EVERY random number
- For 10^8 iterations × 2 random numbers = **200 million boundary crossings**
- Each crossing cost ~50-200ns → **10-40 seconds of pure overhead**

**Solution:**
```toml
# Cargo.toml - BEFORE (SLOW)
getrandom = { version = "0.2", features = ["js"] }
rand = "0.8"

# Cargo.toml - AFTER (FAST)
fastrand = "2.0"
```

**Result:** 100-200x speedup by eliminating JS boundary crossings

### Critical WASM Optimization #2: Worker Pool Pattern

**Problem:**
- Created new workers for EVERY benchmark run
- Each worker initialization: ~15-50ms (ES module load + WASM compile/instantiate)
- With 8 threads × 2 runs = 16 worker creations → **240-800ms overhead** (72-91% of total time!)

**Solution:**
- Implemented `WorkerPool` class in `app/pwa-wasm/index.html`
- Creates workers once, reuses across all benchmark runs
- Workers send ready signal after initialization
- Initialization cost amortized as one-time upfront cost

**Result:** 1.5-2x speedup, overhead reduced from 72-91% to <20%

### Combined Performance Impact

```
Before optimization:  20-50 seconds  ❌
After Fix #1:         ~300-500ms     ⚡ (100x faster)
After Fix #1 + #2:    ~100-200ms     ⚡⚡ (200-500x faster, 2-10x faster than JS)
```

### Native Rust Parallel Processing

Both Rust CLI benchmarks now use **Rayon** for multi-threading:

```rust
use rayon::prelude::*;

fn calculate_pi_parallel(iterations: u64, threads: usize, run_seed: u64) -> f64 {
    // Parallel iteration with unique seeds per thread
    (0..threads).into_par_iter().for_each(|thread_id| {
        let seed = run_seed * 1000000 + thread_id;
        // ... Monte Carlo iterations
    });
}
```

**Key improvements:**
- Atomic counters for thread-safe aggregation
- Per-run seeding ensures varied results across benchmark runs
- Thread pool initialized once per execution
- Consistent parameter interface with Go implementation

### Key Lessons

1. **WASM boundary crossings are expensive** - Minimize JS↔WASM calls in hot loops
2. **Use WASM-native libraries** - Avoid dependencies that call back to JS
3. **Reuse workers** - Worker initialization overhead dominates short computations
4. **Match algorithms to use case** - Cryptographic RNG is overkill for Monte Carlo
5. **Profile and measure** - Counterintuitive performance issues can arise in WASM

## 📦 Binary Releases

Pre-built Windows AMD64 binaries are automatically released via GitHub Actions.

**Download:** [Releases page](https://github.com/karlorz/montecarlo-pi/releases)

### Available Binaries

#### Go CPU Benchmark (`benchmark-go-windows-amd64.exe`)
Multi-threaded Go implementation with goroutines.

**Usage:**
```cmd
# Run with default settings (6 threads, 10^8 iterations, 2 runs)
benchmark-go-windows-amd64.exe

# Run with custom settings
benchmark-go-windows-amd64.exe -mmt 8 -ti 9 -i 3
```

#### Rust CPU Benchmark (`benchmark-rust-cpu-windows-amd64.exe`)
High-performance multi-threaded Rust with Rayon and fastrand PRNG.

**Usage:**
```cmd
# Run with defaults (10^8 iterations, 5 runs, auto-detect threads)
benchmark-rust-cpu-windows-amd64.exe

# Custom settings (10^9 iterations, 3 runs, 8 threads)
benchmark-rust-cpu-windows-amd64.exe 9 3 8
```

#### Rust GPU Benchmark (`benchmark-rust-gpu-windows-amd64.exe`)
GPU-accelerated using WebGPU with DirectX 12 backend. Auto-fallback to CPU if GPU unavailable.

**Usage:**
```cmd
# Run with defaults (10^8 iterations, 5 runs)
benchmark-rust-gpu-windows-amd64.exe

# High precision (10^10 iterations, 3 runs)
benchmark-rust-gpu-windows-amd64.exe 10 3

# Extreme precision (10^11 iterations - GPU recommended)
benchmark-rust-gpu-windows-amd64.exe 11 2
```

**GPU Requirements:**
- Windows 10/11 with DirectX 12 support
- NVIDIA GPU (GeForce GTX 900+), AMD GPU (Radeon RX 400+), or Intel Arc/11th gen integrated

### Creating a Release

```bash
# Tag a new version
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Actions workflows automatically:
1. Build Windows AMD64 binaries (Go, Rust CPU, Rust GPU)
2. Create GitHub releases
3. Attach binaries with detailed usage instructions

## 🚀 GitHub Pages Deployment

This repository uses GitHub Actions for automated CI/CD:

**Workflow:**
1. On every push to `main`, GitHub Actions:
   - Builds WebAssembly module from Rust source
   - Deploys all web apps to GitHub Pages
2. No compiled binaries (`pkg/`) committed to repository
3. Build artifacts generated during CI/CD

**Setup GitHub Pages:**
1. Go to **Settings** → **Pages**
2. Under **Source**, select "GitHub Actions"
3. Push to `main` branch to trigger deployment

Workflow file: `.github/workflows/deploy.yml`

## 🔬 WSL2 Development Setup

For Windows users developing with WSL2:

```bash
# Find WSL2 IP address
hostname -I

# Forward port from Windows to WSL2 (PowerShell as Administrator)
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL2_IP_ADDRESS>

# Verify port forwarding
netsh interface portproxy show all
```

**Access web server:**
```
http://localhost:8000
```

## 📚 Project Structure

```
montecarlo-pi/
├── Makefile                    # Unified build system
├── run-benchmarks.sh           # Automated benchmark comparison
├── benchmark-js.js             # Node.js single-threaded
├── benchmark-go/               # Go multi-threaded CLI
├── benchmark-cpp/              # C++ multi-threaded CLI
├── benchmark-rust-fast/        # Rust CLI (fastrand, parallel)
├── benchmark-rust-rand/        # Rust CLI (rand, parallel)
├── benchmark-rust-gpu/         # Rust GPU (WebGPU compute)
└── app/
    ├── python/                 # Python multiprocessing
    ├── pwa/                    # PWA with Web Workers
    ├── pwa-gpu/                # PWA with WebGL GPU
    └── pwa-wasm/               # PWA with Rust→WASM
        ├── index.html          # Multi-threaded (default)
        └── index-st.html       # Single-threaded
```

## 📖 Documentation

- **[AGENTS.md](AGENTS.md)** - Comprehensive guide for code agents and developers
- **[app/pwa-wasm/README.md](app/pwa-wasm/README.md)** - WebAssembly implementation details
- **[app/pwa-gpu/README.md](app/pwa-gpu/README.md)** - WebGL GPU implementation notes
- **[benchmark-cpp/README.md](benchmark-cpp/README.md)** - C++ CPU implementation details
- **[benchmark-rust-gpu/README.md](benchmark-rust-gpu/README.md)** - Rust GPU (WebGPU) implementation details

## 🎯 New Implementations (2025-11)

### C++ CPU Benchmark
Multi-threaded C++ implementation providing a baseline for native performance comparison:
- **std::thread** for parallel execution
- **std::atomic** for lock-free aggregation
- **std::mt19937_64** PRNG (Mersenne Twister)
- Optimized with `-O3 -march=native` compiler flags

**Why C++?** Provides a native baseline to compare against Rust and Go, demonstrating performance across different systems programming languages.

### Rust GPU Benchmark (WebGPU)
Cross-platform GPU acceleration using WebGPU compute shaders:
- **Portable backends**: Metal (macOS), DirectX 12 (Windows), Vulkan (Linux)
- **WGSL compute shaders** for parallel GPU execution
- **Automatic CPU fallback** using Rayon when GPU unavailable
- **256-thread workgroups** with LCG-based PRNG for GPU efficiency

**Why WebGPU?**
- Single codebase works across Metal, DirectX, and Vulkan
- No platform-specific GPU SDKs required (no CUDA/Metal SDK installation)
- Same WGSL shader can be reused in C++ implementations (future work)
- Graceful degradation to CPU on systems without compatible GPUs

**Performance Expectations:**
- Modern GPUs (Apple M1+, NVIDIA RTX 2000+): 10-100x faster than CPU for large iteration counts
- Integrated GPUs: 2-5x faster than CPU
- Older/unsupported GPUs: Automatic CPU fallback

See individual README files for detailed implementation notes and troubleshooting.

## 🧪 Testing & Validation

```bash
# Quick test (Go)
make test-go

# Run comprehensive benchmark suite
make benchmark-all

# Custom benchmark comparison
./run-benchmarks.sh 100000000 5
```

## 🔗 References

- [Monte Carlo method (Wikipedia)](https://en.wikipedia.org/wiki/Monte_Carlo_method)
- [getrandom documentation](https://docs.rs/getrandom/)
- [fastrand documentation](https://docs.rs/fastrand/)
- [Rayon documentation](https://docs.rs/rayon/)
- [wasm-bindgen performance guide](https://rustwasm.github.io/docs/book/reference/code-size.html)

## 📝 License

This project is open source and available under the MIT License.
