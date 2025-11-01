.PHONY: help build-go build-rust-fast build-rust-rand build-rust-gpu build-cpp build-all clean test-go run-go run-rust run-rust-fast run-rust-rand run-rust-gpu run-cpp benchmark-all

# Default target
help:
	@echo "Monte Carlo Pi - Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  build-go          - Build Go benchmark binary"
	@echo "  build-rust-fast   - Build Rust (fastrand) benchmark binary"
	@echo "  build-rust-rand   - Build Rust (rand) benchmark binary"
	@echo "  build-rust-gpu    - Build Rust GPU (WebGPU) benchmark binary"
	@echo "  build-cpp         - Build C++ CPU benchmark binary"
	@echo "  build-all         - Build all benchmark binaries"
	@echo "  run-go            - Run Go benchmark with default settings"
	@echo "  run-rust          - Run Rust (fastrand) benchmark with default settings"
	@echo "  run-rust-fast     - Run Rust (fastrand) benchmark"
	@echo "  run-rust-rand     - Run Rust (rand) benchmark"
	@echo "  run-rust-gpu      - Run Rust GPU (WebGPU) benchmark"
	@echo "  run-cpp           - Run C++ CPU benchmark"
	@echo "  test-go           - Run Go benchmark with test settings"
	@echo "  benchmark-all     - Run all benchmarks (JS, Rust, Go, C++, GPU)"
	@echo "  clean             - Remove all build artifacts"
	@echo ""
	@echo "Go benchmark usage:"
	@echo "  make run-go THREADS=6 ITERATIONS=7 RUNS=2"
	@echo ""
	@echo "Rust benchmark usage:"
	@echo "  make run-rust THREADS=6 ITERATIONS=8 RUNS=5"
	@echo "  make run-rust-gpu ITERATIONS=8 RUNS=3"
	@echo ""
	@echo "C++ benchmark usage:"
	@echo "  make run-cpp THREADS=8 ITERATIONS=8 RUNS=3"
	@echo ""
	@echo "Example:"
	@echo "  make build-go"
	@echo "  make run-go THREADS=4 ITERATIONS=8 RUNS=3"
	@echo "  make run-rust THREADS=4 ITERATIONS=8 RUNS=3"

# Go benchmark
build-go:
	@echo "🔨 Building Go benchmark (production)..."
	@mkdir -p benchmark-go/target
	@cd benchmark-go && CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o target/benchmark-go
	@echo "✅ Go benchmark built: benchmark-go/target/benchmark-go"

run-go: build-go
	@echo "🟢 Running Go benchmark..."
	@cd benchmark-go && ./target/benchmark-go -mmt $(or $(THREADS),6) -ti $(or $(ITERATIONS),8) -i $(or $(RUNS),2)

test-go: build-go
	@echo "🧪 Testing Go benchmark..."
	@cd benchmark-go && ./target/benchmark-go -mmt 4 -ti 6 -i 2

# Rust benchmarks
build-rust-fast:
	@echo "🔨 Building Rust (fastrand) benchmark..."
	@cd benchmark-rust-fast && cargo build --release --quiet
	@echo "✅ Rust (fastrand) benchmark built"

build-rust-rand:
	@echo "🔨 Building Rust (rand) benchmark..."
	@cd benchmark-rust-rand && cargo build --release --quiet
	@echo "✅ Rust (rand) benchmark built"

run-rust: run-rust-fast

run-rust-fast: build-rust-fast
	@echo "🟢 Running Rust (fastrand) benchmark..."
	@cd benchmark-rust-fast && ./target/release/montecarlo-pi-benchmark-fast $(or $(ITERATIONS),8) $(or $(RUNS),5) $(or $(THREADS),6)

run-rust-rand: build-rust-rand
	@echo "🟢 Running Rust (rand) benchmark..."
	@cd benchmark-rust-rand && ./target/release/montecarlo-pi-benchmark-rand $(or $(ITERATIONS),8) $(or $(RUNS),5) $(or $(THREADS),6)

# Rust GPU benchmark
build-rust-gpu:
	@echo "🔨 Building Rust GPU (WebGPU) benchmark..."
	@cd benchmark-rust-gpu && cargo build --release --quiet
	@echo "✅ Rust GPU benchmark built"

run-rust-gpu: build-rust-gpu
	@echo "🟢 Running Rust GPU (WebGPU) benchmark..."
	@cd benchmark-rust-gpu && ./target/release/montecarlo-pi-benchmark-gpu $(or $(ITERATIONS),8) $(or $(RUNS),3)

# C++ CPU benchmark
build-cpp:
	@echo "🔨 Building C++ CPU benchmark..."
	@mkdir -p benchmark-cpp/target
	@g++ -std=c++17 -O3 -march=native -pthread -o benchmark-cpp/target/benchmark-cpp benchmark-cpp/main.cpp
	@echo "✅ C++ benchmark built: benchmark-cpp/target/benchmark-cpp"

run-cpp: build-cpp
	@echo "🟢 Running C++ CPU benchmark..."
	@cd benchmark-cpp && ./target/benchmark-cpp -mmt $(or $(THREADS),6) -ti $(or $(ITERATIONS),8) -i $(or $(RUNS),2)

# Build all
build-all: build-go build-rust-fast build-rust-rand build-rust-gpu build-cpp
	@echo ""
	@echo "✅ All benchmarks built successfully!"

# Run comprehensive benchmark comparison
benchmark-all: build-all
	@echo ""
	@echo "╔═══════════════════════════════════════════════════════════════╗"
	@echo "║     Monte Carlo Pi - Comprehensive Benchmark Suite           ║"
	@echo "╚═══════════════════════════════════════════════════════════════╝"
	@echo ""
	@./run-benchmarks.sh $(or $(ITERS),100000000) $(or $(BENCH_RUNS),5)

# Clean
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf benchmark-go/target
	@rm -rf benchmark-cpp/target
	@cd benchmark-rust-fast && cargo clean 2>/dev/null || true
	@cd benchmark-rust-rand && cargo clean 2>/dev/null || true
	@cd benchmark-rust-gpu && cargo clean 2>/dev/null || true
	@echo "✅ Clean complete"
