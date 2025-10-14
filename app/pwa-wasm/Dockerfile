# Multi-stage Dockerfile for WebAssembly build

# Stage 1: Build the WASM module
FROM rust:1.75 as builder

# Install wasm-pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /app

# Copy Cargo files first for dependency caching
COPY Cargo.toml ./
COPY src ./src

# Build the WASM module
RUN wasm-pack build --target web --out-dir pkg

# Stage 2: Serve with a lightweight HTTP server
FROM python:3.11-slim

WORKDIR /app

# Copy the built WASM files and HTML from builder
COPY --from=builder /app/pkg ./pkg
COPY index.html ./

EXPOSE 8000

# Run Python HTTP server
CMD ["python3", "-m", "http.server", "8000"]
