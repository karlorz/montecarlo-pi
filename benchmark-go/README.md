# Go Monte Carlo Pi Benchmark

A high-performance Go implementation of the Monte Carlo Pi calculation benchmark.

## Features

- Multi-threaded execution using goroutines
- Command-line interface consistent with other implementations
- Detailed performance statistics
- Thread-safe random number generation with unique seeds per worker
- Optimized for speed using traditional `math/rand`

## Building

### Production Build (Recommended)

```bash
cd benchmark-go
CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o target/benchmark-go
```

The production build uses:
- `CGO_ENABLED=0` - Creates static binary (no external dependencies)
- `-ldflags="-s -w"` - Strips debug symbols for smaller binary size
- `-trimpath` - Removes file system paths for reproducible builds

### Development Build

```bash
cd benchmark-go
go build -o target/benchmark-go
```

The binary will be built to `target/benchmark-go` to match the Rust project convention.

## Usage

Run with default settings (6 threads, 10^7 iterations, 2 benchmark runs):
```bash
./target/benchmark-go
```

Custom configuration:
```bash
./target/benchmark-go -mmt <threads> -ti <power_of_10> -i <benchmark_iterations>
```

### Example Commands

Use 4 threads, 10^8 iterations, 5 benchmark runs:
```bash
./target/benchmark-go -mmt 4 -ti 8 -i 5
```

Use 8 threads, 10^7 iterations, 2 benchmark runs:
```bash
./target/benchmark-go -mmt 8 -ti 7 -i 2
```

## Command-line Arguments

- `-mmt` : Number of threads (goroutines) to use (default: 6)
- `-i` : Number of benchmark iterations to run (default: 2)
- `-ti` : Number of iterations as power of 10 (default: 7, meaning 10^7 iterations)

## Output

The benchmark provides:
- Per-run statistics (Pi approximation, time, iterations)
- Summary statistics (average Pi, average/min/max time)
- Error from actual π value

## Performance Notes

- Go's goroutines provide efficient parallelism
- Each goroutine gets its own seeded random number generator to avoid contention
- Uses atomic counter for unique worker IDs across runs
- The implementation uses `GOMAXPROCS` to match the requested thread count
- **Performance**: ~970ms for 10^9 iterations with 6 threads

## Random Number Generator Choice

After benchmarking multiple RNG implementations:

| RNG Implementation | Time (10^9 iterations, 6 threads) | Notes |
|-------------------|-----------------------------------|--------|
| **math/rand (chosen)** | **~970ms** ✅ | Traditional RNG, fastest for this use case |
| math/rand/v2 ChaCha8 | ~1330ms | Cryptographically secure but slower |
| Global rand/v2 | ~1700ms | Contention issues with shared generator |

**Conclusion**: For Monte Carlo simulations where cryptographic security isn't needed, the traditional `math/rand` with per-worker generators provides the best performance. The newer ChaCha8, while more secure, adds ~37% overhead for this specific use case.
