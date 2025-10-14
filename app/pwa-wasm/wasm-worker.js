// WASM Worker - spawns multiple Web Workers, each running WASM
self.onmessage = async function(e) {
    const { iters } = e.data;

    // Import and initialize WASM in this worker
    const { default: init, calculate_pi } = await import('./pkg/montecarlo_pi_wasm.js');
    await init();

    // Calculate pi using WASM
    const result = calculate_pi(iters);
    const count_inside = result[1];

    self.postMessage(count_inside);
};
