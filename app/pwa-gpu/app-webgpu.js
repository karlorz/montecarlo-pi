// WebGPU Compute Shader Implementation for Monte Carlo Pi Estimation

// WGSL Compute Shader with PCG Random Number Generator
const computeShaderCode = `
// PCG Random Number Generator (high-quality, fast)
fn pcg_hash(input: u32) -> u32 {
    var state = input * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

// Jenkins hash for seed generation
fn jenkins_hash(input: u32) -> u32 {
    var x = input;
    x += x << 10u;
    x ^= x >> 6u;
    x += x << 3u;
    x ^= x >> 11u;
    x += x << 15u;
    return x;
}

// Initialize RNG state for this invocation
fn init_rng(invocation_id: u32, seed: u32) -> u32 {
    return jenkins_hash(invocation_id ^ jenkins_hash(seed));
}

// Generate random float [0, 1)
fn rng_next_float(state: ptr<function, u32>) -> f32 {
    *state = pcg_hash(*state);
    // Convert to float in range [0, 1) by dividing by 2^32
    return f32(*state) / 4294967296.0;
}

struct Params {
    seed: u32,
    iterations_per_thread: u32,
}

// Multi-bucket atomic counters to prevent u32 overflow
// Capacity: 16 × 4.29B = 68.7B iterations
const NUM_BUCKETS: u32 = 16u;

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> results: array<atomic<u32>, NUM_BUCKETS>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let thread_id = global_id.x;
    let bucket = thread_id % NUM_BUCKETS;  // Distribute across buckets

    // Initialize RNG for this thread
    var rng_state = init_rng(thread_id, params.seed);

    var in_circle: u32 = 0u;

    // Monte Carlo simulation
    for (var i = 0u; i < params.iterations_per_thread; i++) {
        let x = rng_next_float(&rng_state);
        let y = rng_next_float(&rng_state);

        if (x * x + y * y <= 1.0) {
            in_circle++;
        }
    }

    // Atomic add to bucket - prevents overflow by distributing load
    atomicAdd(&results[bucket], in_circle);
}
`;

async function runWebGPUBenchmark() {
    const iterationsPower = parseInt(document.getElementById('iterations').value, 10);
    const totalIterations = Math.pow(10, iterationsPower);
    const benchmarkIterations = parseInt(document.getElementById('benchmark-iterations').value, 10);

    const resultsDiv = document.getElementById('webgpu-results');
    resultsDiv.innerHTML = '<p>Initializing WebGPU...</p>';

    // Check WebGPU support
    if (!navigator.gpu) {
        resultsDiv.innerHTML = '<p style="color: red;">❌ WebGPU not supported in this browser</p>';
        return;
    }

    try {
        // Initialize WebGPU
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            resultsDiv.innerHTML = '<p style="color: red;">❌ Failed to get GPU adapter</p>';
            return;
        }

        const device = await adapter.requestDevice();

        resultsDiv.innerHTML = '<p style="color: green;">✓ WebGPU initialized</p>';

        // Create compute pipeline
        const shaderModule = device.createShaderModule({
            code: computeShaderCode
        });

        const pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main'
            }
        });

        // Configuration
        const workgroupSize = 64;
        const numThreads = Math.min(65536, Math.ceil(totalIterations / 1000)); // Up to 64K threads
        const iterationsPerThread = Math.ceil(totalIterations / numThreads);
        const numWorkgroups = Math.ceil(numThreads / workgroupSize);

        // Check for potential u32 overflow in atomic counter
        // With 16 buckets: Max safe value is 16 × 4.29B = 68.7B iterations
        // Since ~π/4 of iterations will be in circle, we need totalIterations * 0.785 < 68.7B
        // This means totalIterations < ~87 billion is safe
        const maxSafeIterations = 87000000000; // 87 billion
        if (totalIterations > maxSafeIterations) {
            resultsDiv.innerHTML += `<p style="color: orange;">⚠️ Warning: ${totalIterations.toLocaleString()} iterations may cause overflow. Results may be inaccurate.</p>`;
            resultsDiv.innerHTML += `<p style="color: orange;">Recommended maximum with 16-bucket implementation: ${maxSafeIterations.toLocaleString()} iterations</p>`;
        }

        resultsDiv.innerHTML += `<p>Threads: ${numThreads}, Iterations/thread: ${iterationsPerThread}, Buckets: 16</p>`;

        let totalPi = 0;
        let totalTime = 0;

        for (let b = 0; b < benchmarkIterations; b++) {
            const startTime = performance.now();

            // Create buffers
            const paramsBuffer = device.createBuffer({
                size: 8, // 2 x u32
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });

            const resultsBuffer = device.createBuffer({
                size: 64, // 16 x u32 for multi-bucket atomics
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });

            const readBuffer = device.createBuffer({
                size: 64, // 16 x u32
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            });

            // Write parameters
            const paramsData = new Uint32Array([
                Math.floor(Math.random() * 0xFFFFFFFF), // seed
                iterationsPerThread
            ]);
            device.queue.writeBuffer(paramsBuffer, 0, paramsData);

            // Initialize results buffer to 0 (all 16 buckets)
            device.queue.writeBuffer(resultsBuffer, 0, new Uint32Array(16).fill(0));

            // Create bind group
            const bindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: paramsBuffer } },
                    { binding: 1, resource: { buffer: resultsBuffer } }
                ]
            });

            // Encode commands
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.dispatchWorkgroups(numWorkgroups);
            passEncoder.end();

            // Copy results to read buffer
            commandEncoder.copyBufferToBuffer(resultsBuffer, 0, readBuffer, 0, 64);

            // Submit commands
            device.queue.submit([commandEncoder.finish()]);

            // Read results (async)
            await readBuffer.mapAsync(GPUMapMode.READ);
            const resultData = new Uint32Array(readBuffer.getMappedRange());

            // Sum all 16 buckets to get total inCircle count
            let inCircle = 0;
            for (let i = 0; i < 16; i++) {
                inCircle += resultData[i];
            }
            readBuffer.unmap();

            // Calculate Pi
            const actualIterations = numThreads * iterationsPerThread;
            const pi = (4.0 * inCircle) / actualIterations;
            const elapsedTime = performance.now() - startTime;

            // Debug output for large iterations
            if (totalIterations > 1000000000) {
                console.log(`Run ${b + 1}: inCircle=${inCircle}, actualIterations=${actualIterations}, ratio=${inCircle/actualIterations}`);
            }

            totalPi += pi;
            totalTime += elapsedTime;

            resultsDiv.innerHTML += `<p>Run ${b + 1}: Pi = ${pi.toFixed(6)}, Time = ${elapsedTime.toFixed(2)} ms, InCircle = ${inCircle.toLocaleString()}</p>`;

            // Cleanup
            paramsBuffer.destroy();
            resultsBuffer.destroy();
            readBuffer.destroy();
        }

        const avgPi = totalPi / benchmarkIterations;
        const avgTime = totalTime / benchmarkIterations;

        resultsDiv.innerHTML += `<hr><h3>WebGPU Average Results</h3>`;
        resultsDiv.innerHTML += `<p><strong>Average Pi: ${avgPi.toFixed(6)}</strong></p>`;
        resultsDiv.innerHTML += `<p><strong>Average Time: ${avgTime.toFixed(2)} ms</strong></p>`;
        resultsDiv.innerHTML += `<p>Throughput: ${(totalIterations / avgTime / 1000).toFixed(2)} million iterations/sec</p>`;

    } catch (error) {
        resultsDiv.innerHTML += `<p style="color: red;">Error: ${error.message}</p>`;
        console.error('WebGPU error:', error);
    }
}

// Export for use in HTML
window.runWebGPUBenchmark = runWebGPUBenchmark;
