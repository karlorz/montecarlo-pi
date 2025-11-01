# C++ Monte Carlo Pi Benchmark

Multi-threaded C++ implementation using std::thread and std::atomic for lock-free aggregation.

## Prerequisites

- C++17 compiler (g++ 7+, clang++ 5+, MSVC 2017+)
- pthread support (automatic on Unix-like systems)

## Building

```bash
# Using Makefile (recommended)
make build-cpp

# Manual build (Linux/macOS)
g++ -std=c++17 -O3 -march=native -pthread -o target/benchmark-cpp main.cpp

# Manual build (Windows with MinGW)
g++ -std=c++17 -O3 -pthread -o target/benchmark-cpp.exe main.cpp

# Manual build (Windows with MSVC)
cl /std:c++17 /O2 /EHsc /Fe:target\benchmark-cpp.exe main.cpp
```

## Running

```bash
# Using Makefile
make run-cpp THREADS=8 ITERATIONS=8 RUNS=3

# Direct execution
./target/benchmark-cpp -mmt 8 -ti 8 -i 3

# Show help
./target/benchmark-cpp -h
```

## Options

- `-mmt <threads>`: Number of parallel threads (default: hardware concurrency)
- `-ti <power>`: Iterations as power of 10 (e.g., 8 = 10^8 = 100 million)
- `-i <runs>`: Number of benchmark runs to average (default: 2)

## Performance Notes

- Uses `std::mt19937_64` PRNG (Mersenne Twister) for quality random numbers
- Lock-free atomic aggregation for minimal thread contention
- Optimized with `-O3 -march=native` for maximum performance
- Each thread maintains local counter to reduce atomic operations
- Per-run seeding ensures varied results across benchmark runs
