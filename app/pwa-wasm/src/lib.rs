use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Calculate Pi using Monte Carlo method with fastrand (WASM-native PRNG)
///
/// # Arguments
/// * `iterations` - Number of random points to generate (passed as f64 from JS)
///
/// # Returns
/// Estimated value of Pi
#[wasm_bindgen]
pub fn calculate_pi(iterations: f64) -> f64 {
    let iterations = iterations as u64;
    let mut count_inside = 0u64;

    for _ in 0..iterations {
        let x = fastrand::f64();
        let y = fastrand::f64();

        if x * x + y * y <= 1.0 {
            count_inside += 1;
        }
    }

    4.0 * (count_inside as f64) / (iterations as f64)
}

/// Run benchmark with multiple iterations and return average
///
/// # Arguments
/// * `iterations` - Number of random points per benchmark run (passed as f64 from JS)
/// * `benchmark_runs` - Number of times to repeat the benchmark
///
/// # Returns
/// Vec containing [avg_pi, avg_time_ms, total_runs]
#[wasm_bindgen]
pub fn benchmark_pi(iterations: f64, benchmark_runs: f64) -> Vec<f64> {
    let benchmark_runs = benchmark_runs as u32;
    let mut total_pi = 0.0;
    let mut total_time = 0.0;

    for run in 0..benchmark_runs {
        let start = js_sys::Date::now();

        let pi = calculate_pi(iterations);

        let elapsed = js_sys::Date::now() - start;

        total_pi += pi;
        total_time += elapsed;

        log(&format!("Run {}: Pi = {}, Time = {} ms", run + 1, pi, elapsed));
    }

    let avg_pi = total_pi / (benchmark_runs as f64);
    let avg_time = total_time / (benchmark_runs as f64);

    vec![avg_pi, avg_time, benchmark_runs as f64]
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
