use wasm_bindgen::prelude::*;
use rand::Rng;

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

/// Calculate Pi using Monte Carlo method
///
/// # Arguments
/// * `iterations` - Number of random points to generate (passed as f64 from JS)
///
/// # Returns
/// Tuple of (estimated_pi, points_in_circle, total_points)
#[wasm_bindgen]
pub fn calculate_pi(iterations: f64) -> Vec<f64> {
    let iterations = iterations as u64;
    let mut rng = rand::thread_rng();
    let mut count_inside = 0u64;

    for _ in 0..iterations {
        let x: f64 = rng.gen();
        let y: f64 = rng.gen();

        if x * x + y * y <= 1.0 {
            count_inside += 1;
        }
    }

    let pi = 4.0 * (count_inside as f64) / (iterations as f64);

    // Return as Vec since wasm-bindgen can convert this to JS array
    vec![pi, count_inside as f64, iterations as f64]
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

        let result = calculate_pi(iterations);
        let pi = result[0];

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
