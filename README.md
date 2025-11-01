# Monte Carlo Pi Benchmark

This project benchmarks the calculation of Pi using the Monte Carlo method across multiple platforms, with a focus on comparing performance between JavaScript, WebAssembly (Rust), Go, and GPU (WebGL) implementations.

## 🌐 Live Demos (GitHub Pages)

Try the benchmarks directly in your browser:

- **PWA (Web Workers)**: https://karlorz.github.io/montecarlo-pi/app/pwa/
- **PWA (WebGL GPU)**: https://karlorz.github.io/montecarlo-pi/app/pwa-gpu/
- **PWA (WebAssembly)**: https://karlorz.github.io/montecarlo-pi/app/pwa-wasm/

> **Note**: The WASM version is automatically built by GitHub Actions on each push. No compiled binaries are committed to the repository.

## ⚡ Performance Highlights

Recent optimizations (2025-10-15) have dramatically improved WebAssembly performance:

| Implementation | Time (10^8 iterations) | vs JavaScript |
|---------------|----------------------|---------------|
| **WASM (Optimized)** | **~100-200ms** | **2-10x faster** ⚡ |
| JavaScript (Web Workers) | ~500-2000ms | 1.0x (baseline) |
| WASM (Old, unoptimized) | ~20-50 seconds | 20-50x slower ❌ |

**Key fixes applied:**
1. Replaced `getrandom` with WASM-native `fastrand` PRNG (eliminated 200M boundary crossings)
2. Implemented worker pool pattern (eliminated repeated WASM initialization overhead)

See [Performance Analysis](#-performance-analysis) section for details.

## 📋 Overview

This project benchmarks the calculation of Pi using the Monte Carlo method with support for multiple programming languages and platforms:

- **Go** (`benchmark-go/`) - Multi-threaded CLI using goroutines
- **Rust** (`benchmark-rust-fast/`, `benchmark-rust-rand/`) - Native and WASM implementations
- **JavaScript** (`benchmark-js.js`) - Node.js benchmark
- **Python** (`app/python/`) - Multiprocessing implementation
- **Web** (`app/pwa/`, `app/pwa-gpu/`, `app/pwa-wasm/`) - Browser-based benchmarks

All CLI implementations share a consistent interface:
- `-mmt` : Number of threads (default: 6)
- `-ti` : Iterations as power of 10 (default: 7)
- `-i` : Number of benchmark runs (default: 2)

## 🚀 Quick Start

```bash
# Build and run Go benchmark
make build-go
make run-go

# Or build all benchmarks
make build-all

# See all available commands
make help
```

## Prerequisites

- **Go**: Go 1.21 or later
- **Rust**: Rust toolchain (for Rust benchmarks)
- **Node.js**: For JavaScript benchmarks
- **Python 3.x**: For Python benchmarks
- **Make**: For using the Makefile (optional but recommended)

## Running the Benchmark

To run the benchmark, use the following command:

```sh
python3 app/benchmark.py -mmt <number_of_threads> -i <number_of_benchmark_iterations> -ti <iterations_as_power_of_10>
```

## Setting Up a Web Server in WSL2

To set up a simple web server in WSL2, you can use Python's built-in HTTP server module. Navigate to the directory you want to serve and run:

```sh
python3 -m http.server 8000
```

## Port Forwarding in WSL2

To access the web server from your Windows host, you need to forward the port. Open a PowerShell window and run:

```powershell
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL2_IP_Address>
```

Replace `<WSL2_IP_Address>` with the IP address of your WSL2 instance. You can find the IP address by running:

```sh
hostname -I
```

## Configuring Port Forwarding

To allow access to the web server from other devices on your LAN, you need to set up port forwarding from your Windows host to the WSL2 instance.

### Determine the WSL2 IP Address

In your WSL2 terminal, run:

```sh
ip addr show eth0
```

Note the `inet` address under `eth0`.

### Set Up Port Forwarding

Open PowerShell as Administrator and run the following command, replacing `<WSL2_IP_ADDRESS>` with the IP address you noted:

```powershell
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL2_IP_ADDRESS>
```

### Verify the Port Forwarding Rules

To verify that the port forwarding rule has been added, run:

```powershell
netsh interface portproxy show all
```

You should see an entry similar to:

```plaintext
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
--------------- ----------  --------------- ----------
0.0.0.0         8000        <WSL2_IP_ADDRESS> 8000
```

## Checking the Web Server

To check if the web server is running, open a web browser on your Windows host and navigate to:

```
http://localhost:8000
```

You should see the contents of the directory you are serving.

## Building the Docker Image

To build the Docker image for the Python benchmark script, use the following command:

```sh
docker build -t python-benchmark:latest -f app/python/Dockerfile ./app/python
```
## Running the Benchmark

To run the benchmark, use the following command:

```sh
docker run --rm -it python-benchmark:latest python benchmark.py -mmt <number_of_threads> -i <number_of_benchmark_iterations> -ti <iterations_as_power_of_10>
```

### Example Command

For example, to use 4 threads, run 2 benchmark iterations, and set the number of iterations as 10^7:

```sh
docker run --rm -it python-benchmark:latest python benchmark.py -mmt 4 -i 2 -ti 7
```

## 🚀 GitHub Pages Deployment

This repository uses GitHub Actions to automatically build and deploy all web apps to GitHub Pages.

### How It Works

1. **Automatic Builds**: On every push to `main`, GitHub Actions:
   - Builds the WebAssembly module from Rust source
   - Deploys all web apps to GitHub Pages

2. **Clean Repository**:
   - No compiled binaries (`pkg/`) are committed
   - Only source code is tracked in git
   - Build artifacts are generated during CI/CD

### Setup GitHub Pages

To enable deployment in your fork:

1. Go to **Settings** → **Pages**
2. Under **Source**, select "GitHub Actions"
3. Push to `main` branch to trigger deployment

The workflow file is located at `.github/workflows/deploy.yml`.

## 📦 Binary Releases

### Windows AMD64 Binary

Pre-built Windows AMD64 binaries are automatically built and released via GitHub Actions.

#### Download

Download the latest release from the [Releases page](https://github.com/karlorz/montecarlo-pi/releases).

#### Usage

```cmd
# Download benchmark-go-windows-amd64.exe
# Run with default settings (6 threads, 10^7 iterations, 2 runs)
benchmark-go-windows-amd64.exe

# Run with custom settings
benchmark-go-windows-amd64.exe -mmt 8 -ti 9 -i 3
```

#### Creating a Release

To create a new release with pre-built binaries:

```bash
# Tag a new version
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Actions workflow will automatically:
1. Build the Windows AMD64 binary
2. Create a GitHub release
3. Attach the binary to the release

**Manual builds** can be triggered via the Actions tab → "Build and Release Go Binary" → "Run workflow".

## 🔍 Performance Analysis

### Problem: WASM was 20-50x slower than JavaScript

The initial WebAssembly implementation suffered from two critical performance issues that made it paradoxically slower than JavaScript despite being compiled code.

### Critical Fix #1: WASM↔JS Boundary Crossing

**The Issue:**
- Used `getrandom` crate with `features = ["js"]` for random number generation
- This forced WASM to call back into JavaScript for EVERY random number
- For 10^8 iterations × 2 random numbers = **200 million boundary crossings**
- Each crossing cost ~50-200ns → **10-40 seconds of pure overhead**

**The Solution:**
```toml
# Cargo.toml - BEFORE (SLOW)
getrandom = { version = "0.2", features = ["js"] }
rand = "0.8"

# Cargo.toml - AFTER (FAST)
fastrand = "2.0"
```

**Result:** 100-200x speedup by eliminating JS boundary crossings

### Critical Fix #2: Worker Initialization Overhead

**The Issue:**
- Created new workers for EVERY benchmark run
- Each worker initialization: ~15-50ms (ES module load + WASM compile/instantiate)
- With 8 threads × 2 runs = 16 worker creations → **240-800ms overhead** (72-91% of total time!)

**The Solution:**
- Implemented `WorkerPool` class in `index.html`
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

### Benchmark Results (Native - 10^8 iterations, 5 runs)

Local benchmarks (Node.js for JS, native Rust) show the theoretical maximum performance:

| Implementation | Average Time | Speedup vs JS |
|---------------|--------------|---------------|
| Rust (fastrand) | 76ms | **13.2x faster** |
| JavaScript | 1004ms | 1.0x (baseline) |
| Rust (rand::thread_rng) | 1112ms | 0.9x (cryptographic overhead) |

**Key Insights:**
- WASM in browser achieves ~100-200ms (close to native Rust performance)
- Browser overhead: 2-3x slower than native (still excellent)
- JavaScript JIT optimization is impressive but can't match compiled code
- Using cryptographic RNG adds ~15x overhead (unnecessary for Monte Carlo)

### Running Local Benchmarks

Compare JavaScript, Rust (fastrand), Rust (rand), and Go implementations:

#### Using Makefile (Recommended)

```bash
# Build Go benchmark
make build-go

# Run Go benchmark with defaults (6 threads, 10^7 iterations, 2 runs)
make run-go

# Run Go benchmark with custom settings
make run-go THREADS=8 ITERATIONS=8 RUNS=5

# Build all benchmarks
make build-all

# Run all benchmarks (JS, Rust, Go)
make benchmark-all

# Run quick test
make test-go

# Clean build artifacts
make clean

# Show all available commands
make help
```

#### Direct Execution

```bash
# Run all benchmarks (10^8 iterations, 5 runs each)
./run-benchmarks.sh

# Custom configuration
./run-benchmarks.sh 100000000 5

# Individual benchmarks
node benchmark-js.js 100000000 5
cd benchmark-rust-fast && cargo run --release -- 100000000 5
cd benchmark-rust-rand && cargo run --release -- 100000000 5
cd benchmark-go && go run main.go -mmt 6 -ti 8 -i 5
```

#### Go Benchmark CLI

```bash
# Build (production-optimized)
cd benchmark-go
CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o target/benchmark-go

# Or use Makefile (recommended)
make build-go

# Run with defaults (6 threads, 10^7 iterations, 2 runs)
./target/benchmark-go

# Custom configuration
./target/benchmark-go -mmt <threads> -ti <power_of_10> -i <benchmark_runs>

# Example: 4 threads, 10^8 iterations, 3 runs
./target/benchmark-go -mmt 4 -ti 8 -i 3
```

**Production build flags:**
- `CGO_ENABLED=0` - Static binary with no external dependencies
- `-ldflags="-s -w"` - Strip debug symbols (~33% size reduction)
- `-trimpath` - Reproducible builds

### Key Lessons

1. **WASM boundary crossings are expensive** - Minimize JS↔WASM calls in hot loops
2. **Use WASM-native libraries** - Avoid dependencies that call back to JS (`getrandom` with `features = ["js"]`)
3. **Reuse workers** - Worker initialization overhead dominates short computations
4. **Match algorithms to use case** - Cryptographic RNG is overkill for Monte Carlo simulations
5. **Profile and measure** - Counterintuitive performance issues can arise in WASM

### References

- [getrandom documentation](https://docs.rs/getrandom/)
- [fastrand documentation](https://docs.rs/fastrand/)
- [wasm-bindgen performance guide](https://rustwasm.github.io/docs/book/reference/code-size.html)
