.PHONY: help build-go build-rust-fast build-rust-rand build-all clean test-go run-go benchmark-all

# Default target
help:
	@echo "Monte Carlo Pi - Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  build-go          - Build Go benchmark binary"
	@echo "  build-rust-fast   - Build Rust (fastrand) benchmark binary"
	@echo "  build-rust-rand   - Build Rust (rand) benchmark binary"
	@echo "  build-all         - Build all benchmark binaries"
	@echo "  run-go            - Run Go benchmark with default settings"
	@echo "  test-go           - Run Go benchmark with test settings"
	@echo "  benchmark-all     - Run all benchmarks (JS, Rust, Go)"
	@echo "  clean             - Remove all build artifacts"
	@echo ""
	@echo "Go benchmark usage:"
	@echo "  make run-go THREADS=6 ITERATIONS=7 RUNS=2"
	@echo ""
	@echo "Example:"
	@echo "  make build-go"
	@echo "  make run-go THREADS=4 ITERATIONS=8 RUNS=3"

# Go benchmark
build-go:
	@echo "🔨 Building Go benchmark (production)..."
	@mkdir -p benchmark-go/target
	@cd benchmark-go && CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o target/benchmark-go
	@echo "✅ Go benchmark built: benchmark-go/target/benchmark-go"

run-go: build-go
	@echo "🟢 Running Go benchmark..."
	@cd benchmark-go && ./target/benchmark-go -mmt $(or $(THREADS),6) -ti $(or $(ITERATIONS),7) -i $(or $(RUNS),2)

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

# Build all
build-all: build-go build-rust-fast build-rust-rand
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
	@cd benchmark-rust-fast && cargo clean 2>/dev/null || true
	@cd benchmark-rust-rand && cargo clean 2>/dev/null || true
	@echo "✅ Clean complete"
