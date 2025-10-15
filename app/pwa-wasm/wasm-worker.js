// WASM Worker - persistent worker with initialization signal
// Initialize WASM once at worker startup
let calculate_pi = null;
let initialized = false;

async function initWasm() {
    if (!initialized) {
        const { default: init, calculate_pi: calc } = await import('./pkg/montecarlo_pi_wasm.js');
        await init();
        calculate_pi = calc;
        initialized = true;
        // Signal to main thread that worker is ready
        self.postMessage({ type: 'ready' });
    }
}

// Initialize immediately when worker starts
initWasm();

self.onmessage = async function(e) {
    const { iters } = e.data;

    // Wait for initialization if not ready yet
    if (!initialized) {
        await initWasm();
    }

    // Calculate pi using WASM (now returns f64 directly)
    const pi = calculate_pi(iters);

    // Calculate count_inside from pi: pi = 4 * count_inside / iters
    // So: count_inside = (pi * iters) / 4
    const count_inside = Math.round((pi * iters) / 4.0);

    self.postMessage({ type: 'result', data: count_inside });
};
