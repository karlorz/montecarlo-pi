use std::env;
use std::time::Instant;
use rand::Rng;

/// Calculate Pi using Monte Carlo method with rand::thread_rng (current approach)
fn calculate_pi(iterations: u64) -> f64 {
    let mut rng = rand::thread_rng();
    let mut count_inside = 0u64;

    for _ in 0..iterations {
        let x: f64 = rng.gen();
        let y: f64 = rng.gen();

        if x * x + y * y <= 1.0 {
            count_inside += 1;
        }
    }

    4.0 * (count_inside as f64) / (iterations as f64)
}

fn benchmark(iterations: u64, runs: u32) {
    println!("\n=== Rust Monte Carlo Pi Benchmark (rand::thread_rng - cryptographic) ===");
    println!("Iterations: {:.2e}", iterations as f64);
    println!("Runs: {}\n", runs);

    let mut times = Vec::with_capacity(runs as usize);
    let mut pi_values = Vec::with_capacity(runs as usize);

    for run in 0..runs {
        let start = Instant::now();
        let pi = calculate_pi(iterations);
        let elapsed = start.elapsed();

        let time_ms = elapsed.as_secs_f64() * 1000.0;
        times.push(time_ms);
        pi_values.push(pi);

        println!("Run {}: Pi = {:.10}, Time = {:.2} ms", run + 1, pi, time_ms);
    }

    let avg_time: f64 = times.iter().sum::<f64>() / times.len() as f64;
    let avg_pi: f64 = pi_values.iter().sum::<f64>() / pi_values.len() as f64;
    let min_time = times.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_time = times.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    println!("\n--- Summary ---");
    println!("Average Pi: {:.10}", avg_pi);
    println!("Average Time: {:.2} ms", avg_time);
    println!("Min Time: {:.2} ms", min_time);
    println!("Max Time: {:.2} ms", max_time);
    println!("Error from π: {:.3e}", (std::f64::consts::PI - avg_pi).abs());
}

fn main() {
    let args: Vec<String> = env::args().collect();

    let iterations = if args.len() > 1 {
        args[1].parse().unwrap_or(100_000_000)
    } else {
        100_000_000 // Default: 10^8
    };

    let runs = if args.len() > 2 {
        args[2].parse().unwrap_or(5)
    } else {
        5
    };

    benchmark(iterations, runs);
}
