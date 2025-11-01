use rayon::prelude::*;
use std::env;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use rand::Rng;
use rand::SeedableRng;
use rand::rngs::StdRng;

/// Calculate Pi using Monte Carlo method with rand (parallel version)
fn calculate_pi_parallel(iterations: u64, threads: usize, run_seed: u64) -> f64 {
    let iterations_per_thread = iterations / threads as u64;
    let count_inside = AtomicU64::new(0);

    // Run parallel computation across threads
    (0..threads).into_par_iter().for_each(|thread_id| {
        // Create a unique seed for each thread and run combination
        let seed = run_seed.wrapping_mul(1000000).wrapping_add(thread_id as u64);
        let mut rng = StdRng::seed_from_u64(seed);
        let mut local_count = 0u64;

        for _ in 0..iterations_per_thread {
            let x: f64 = rng.gen();
            let y: f64 = rng.gen();

            if x * x + y * y <= 1.0 {
                local_count += 1;
            }
        }

        count_inside.fetch_add(local_count, Ordering::Relaxed);
    });

    let total = threads as u64 * iterations_per_thread;
    4.0 * (count_inside.load(Ordering::Relaxed) as f64) / (total as f64)
}

fn benchmark(iterations: u64, runs: u32, threads: usize) {
    println!("\n=== Rust Monte Carlo Pi Benchmark (rand - Parallel) ===");
    println!("Iterations: {:.2e}", iterations as f64);
    println!("Runs: {}", runs);
    println!("Threads: {}\n", threads);

    let mut times = Vec::with_capacity(runs as usize);
    let mut pi_values = Vec::with_capacity(runs as usize);

    for run in 0..runs {
        let start = Instant::now();
        // Use run number and timestamp to create unique seed for each run
        let run_seed = (run as u64).wrapping_mul(100000).wrapping_add(start.elapsed().as_nanos() as u64);
        let pi = calculate_pi_parallel(iterations, threads, run_seed);
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
    println!("Threads: {}", threads);
    println!("Iterations per thread: {}", iterations / threads as u64);
    println!("Total iterations: {}", iterations);
    println!("Error from π: {:.3e}", (std::f64::consts::PI - avg_pi).abs());
}

fn main() {
    let args: Vec<String> = env::args().collect();

    // Parse command line arguments to match Go's interface
    // Args: <iterations_power> <runs> <threads>
    let iterations_power = if args.len() > 1 {
        args[1].parse().unwrap_or(8) // Default: 10^8
    } else {
        8
    };

    let iterations = 10u64.pow(iterations_power);

    let runs = if args.len() > 2 {
        args[2].parse().unwrap_or(5)
    } else {
        5
    };

    let threads = if args.len() > 3 {
        args[3].parse().unwrap_or_else(|_| num_cpus::get())
    } else {
        // Default to number of logical CPUs
        num_cpus::get()
    };

    // Cap threads at available CPUs
    let available_cpus = num_cpus::get();
    let actual_threads = threads.min(available_cpus);

    if threads > available_cpus {
        eprintln!(
            "Warning: Requested {} threads, but only {} CPUs available. Using {} threads.",
            threads, available_cpus, actual_threads
        );
    }

    // Set the global thread pool size once before running benchmarks
    rayon::ThreadPoolBuilder::new()
        .num_threads(actual_threads)
        .build_global()
        .unwrap();

    benchmark(iterations, runs, actual_threads);
}
