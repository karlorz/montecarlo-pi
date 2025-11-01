# Rust GPU Monte Carlo Pi Benchmark

GPU-accelerated Monte Carlo Pi estimation using WebGPU (wgpu) with automatic CPU fallback.

## Features

- **Cross-platform GPU support** via WebGPU:
  - Metal on macOS/iOS
  - DirectX 12 on Windows
  - Vulkan on Linux/Android
- **Automatic CPU fallback** using Rayon if GPU unavailable
- **WGSL compute shader** for parallel GPU execution
- **Unified CLI interface** matching other benchmarks

## Prerequisites

### GPU Requirements
- **macOS**: Metal-capable GPU (all Apple Silicon, most Intel Macs 2012+)
- **Windows**: DirectX 12-capable GPU (most GPUs from 2015+) or Vulkan support
- **Linux**: Vulkan-capable GPU with drivers installed

### Build Requirements
- Rust 1.70+ and Cargo
- No additional GPU SDKs needed (wgpu handles backend selection)

## Building

```bash
# Using Makefile (recommended)
make build-rust-gpu

# Manual build
cd benchmark-rust-gpu
cargo build --release
```

## Running

```bash
# Using Makefile
make run-rust-gpu ITERATIONS=8 RUNS=3

# Direct execution (args: <iterations_power> <runs> <threads>)
./target/release/montecarlo-pi-benchmark-gpu 8 5 6

# The binary will automatically:
# 1. Try to initialize GPU (Metal/D3D12/Vulkan)
# 2. Fall back to CPU (Rayon) if GPU unavailable
```

## Command Line Arguments

Same as other benchmarks:
- **Arg 1**: Iterations power (default: 8 = 10^8)
- **Arg 2**: Number of benchmark runs (default: 5)
- **Arg 3**: CPU threads for fallback (default: hardware concurrency)

## Performance Notes

### GPU Implementation
- Uses WGSL compute shaders for WebGPU
- Workgroup size: 256 threads
- Iterations per invocation: 1000 (amortizes dispatch overhead)
- LCG-based PRNG (GPU-friendly, minimal divergence)
- Atomic reduction for final count

### CPU Fallback
- Identical to `benchmark-rust-fast` (Rayon + fastrand)
- Activated when GPU unavailable or initialization fails
- Uses per-thread RNG with atomic aggregation

## Backend Selection

wgpu automatically selects the best available backend:

```
macOS:     Metal (default) → Vulkan (via MoltenVK if installed)
Windows:   DirectX 12 (default) → Vulkan
Linux:     Vulkan (default)
```

Check console output on startup to see which backend was selected.

## Troubleshooting

### GPU Not Detected
```bash
# Check for GPU support
RUST_LOG=wgpu=debug ./target/release/montecarlo-pi-benchmark-gpu
```

Common issues:
- **macOS**: Requires macOS 10.13+ for Metal
- **Windows**: Update graphics drivers for DX12 support
- **Linux**: Install Vulkan drivers (`vulkan-tools`, `mesa-vulkan-drivers`)

### CPU Fallback Behavior
If you see "GPU initialization failed" message, the benchmark automatically uses the CPU implementation. This is normal on:
- Systems without compatible GPUs
- Virtual machines without GPU passthrough
- Headless servers

## Implementation Details

### WGSL Shader
- Located in `src/shader.wgsl`
- Portable compute shader (single source for all backends)
- Same PRNG algorithm could be shared with C++ GPU version

### Host Code
- Async GPU initialization with `pollster::block_on`
- Staging buffer pattern for CPU readback
- Graceful error handling with CPU fallback
- Reuses bind groups and pipeline across runs
