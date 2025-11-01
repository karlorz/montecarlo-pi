# Monte Carlo Pi Estimation - WebGL vs WebGPU Comparison

This application compares the performance of WebGL fragment shaders vs WebGPU compute shaders for Monte Carlo Pi estimation.

## 🚀 Quick Start

### Using Docker
```bash
# From project root
docker-compose -f docker-compose-pwa-gpu.yml up --build

# Open browser to:
http://localhost:8001
```

### Without Docker
```bash
# Any simple HTTP server works
cd app/pwa-gpu
python3 -m http.server 8001
# or
npx serve -p 8001
```

Then open: http://localhost:8001

## 🎯 What This Tests

### WebGL Implementation (Old)
- **Technology**: WebGL 1.0 Fragment Shaders
- **RNG**: `sin()` based (slow, poor quality)
- **Architecture**: 1 million iterations per fragment shader invocation
- **Parallelism**: Limited to rasterization pipeline
- **Bottlenecks**:
  - Sequential loop in fragment shader
  - Synchronous `readPixels()` calls
  - `requestAnimationFrame()` throttling (~16ms delays)

### WebGPU Implementation (New)
- **Technology**: WebGPU Compute Shaders (WGSL)
- **RNG**: PCG (Permuted Congruential Generator) - fast, high quality
- **Architecture**: Up to 16.7M parallel threads (65535 × 256), configurable iterations per thread
- **Parallelism**: True GPGPU with 64-thread workgroups
- **Overflow Protection**: 256-bucket atomic counters (supports up to 1.1 trillion iterations)
- **Dispatch**: 2D grid layout to exceed 65,535 workgroup limit
- **Optimizations**:
  - Multi-bucket atomic operations for result aggregation
  - Asynchronous buffer mapping
  - No rendering pipeline overhead
  - Workgroup size: 64 (industry standard)

## 📊 Expected Performance

| Implementation | Typical Performance | Speedup |
|---------------|-------------------|---------|
| WebGL | ~500-2,000 iterations/ms | 1x (baseline) |
| WebGPU | ~50,000-1,000,000 iterations/ms | **50-500x faster** |

*Actual performance depends on GPU hardware*

## 🧪 How to Test

1. **Run WebGL Only**: Click "▶ Run WebGL" (blue button)
2. **Run WebGPU Only**: Click "▶ Run WebGPU" (green button)
3. **Run Both**: Click "▶▶ Run Both (Sequential)" (orange button)

### Browser Requirements

**WebGL**: All modern browsers
**WebGPU**:
- Chrome/Edge 113+ (enabled by default since Chrome 113)
- Safari Technology Preview (experimental)
- Firefox Nightly (behind flag)

*Note: WebGPU is cutting-edge technology (2023-2024)*

## 🔬 Technical Details

### WebGPU Compute Shader Features

```wgsl
// PCG Random Number Generator
fn pcg_hash(input: u32) -> u32 {
    var state = input * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

// Parallel Monte Carlo with multi-bucket atomic aggregation
// 256 buckets prevent u32 overflow at high iteration counts
const NUM_BUCKETS: u32 = 256u;
@group(0) @binding(1) var<storage, read_write> results: array<atomic<u32>, NUM_BUCKETS>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let thread_id = global_id.x;
    let bucket = thread_id % NUM_BUCKETS;
    // ... Monte Carlo computation ...
    atomicAdd(&results[bucket], in_circle);
}
```

### Configuration

- **Workgroup Size**: 64 threads (optimal for most GPUs)
- **Max Threads**: ~16.7 million (65535 × 256 via 2D dispatch)
- **Buckets**: 256 atomic u32 counters (prevents overflow up to 1.1 trillion iterations)
- **Max Safe Iterations**: ~1.4 trillion (1.4 × 10^12)
- **Iterations Distribution**: Dynamically calculated per thread

## 📈 Benchmark Settings

- **Default Iterations**: 10^7 (10 million)
- **Range**: 10^1 to 10^11 (100 billion)
- **Benchmark Runs**: 3 (for averaging)
- **WebGPU Max**: Up to 1.4 trillion iterations supported

## 🐛 Troubleshooting

### "WebGPU not supported"
- Update to Chrome 113+ or Edge 113+
- Check `chrome://gpu` for WebGPU status
- Ensure hardware acceleration is enabled

### Poor Performance
- Try different iteration counts
- Check GPU isn't throttled (cooling, power)
- Close other GPU-intensive applications

### Accuracy Issues
Both implementations should converge to π ≈ 3.14159 with enough iterations. If not:
- Check RNG quality (WebGPU should be better)
- Increase iteration count
- Run multiple benchmark iterations

### Overflow at High Iterations (10^10+)
If Pi is incorrect at very high iteration counts (e.g., showing ~1.4 instead of ~3.14):
- This was fixed in 2025-11 with 256-bucket implementation
- Supports up to ~1.4 trillion iterations
- Clear cache and reload if using old version
- Check browser console for overflow warnings

## 📝 Implementation Files

- `index.html` - Comparison UI with side-by-side results
- `app.js` - Original WebGL implementation
- `app-webgpu.js` - New WebGPU compute shader implementation

## 🎓 Learning Resources

- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [WGSL Specification](https://www.w3.org/TR/WGSL/)
- [PCG Random Number Generation](https://www.pcg-random.org/)
- [Monte Carlo Method](https://en.wikipedia.org/wiki/Monte_Carlo_method)
