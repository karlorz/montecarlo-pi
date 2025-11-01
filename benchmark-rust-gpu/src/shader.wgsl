// WGSL Compute Shader for Monte Carlo Pi Estimation
// This shader performs parallel random sampling on the GPU
// Uses multiple u32 buckets to avoid overflow at high iteration counts

struct ComputeParams {
    iterations_per_invocation: u32,
    seed_base: u32,
}

@group(0) @binding(0) var<uniform> params: ComputeParams;
@group(0) @binding(1) var<storage, read_write> results: array<atomic<u32>>;

// Simple LCG (Linear Congruential Generator) for GPU-friendly PRNG
// Constants from Numerical Recipes
fn lcg(state: ptr<function, u32>) -> u32 {
    *state = (*state * 1664525u + 1013904223u);
    return *state;
}

// Generate random float in [0, 1)
fn random_f32(state: ptr<function, u32>) -> f32 {
    let rand_u32 = lcg(state);
    return f32(rand_u32) / 4294967296.0; // 2^32
}

@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let invocation_id = global_id.x;

    // Initialize RNG with unique seed per invocation
    var rng_state = params.seed_base + invocation_id * 12345u;

    var count_inside = 0u;

    // Perform Monte Carlo iterations
    for (var i = 0u; i < params.iterations_per_invocation; i = i + 1u) {
        let x = random_f32(&rng_state);
        let y = random_f32(&rng_state);

        // Check if point is inside unit circle
        if (x * x + y * y <= 1.0) {
            count_inside = count_inside + 1u;
        }
    }

    // Use bucket approach to avoid u32 overflow
    // With 256 buckets, each can hold up to 4.29B, supporting up to ~1 trillion total points
    let bucket_index = invocation_id % 256u;
    atomicAdd(&results[bucket_index], count_inside);
}
