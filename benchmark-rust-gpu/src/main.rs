use bytemuck::{Pod, Zeroable};
use rayon::prelude::*;
use std::env;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use wgpu::util::DeviceExt;

#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
struct ComputeParams {
    iterations_per_invocation: u32,
    seed_base: u32,
}

struct GpuContext {
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipeline: wgpu::ComputePipeline,
    bind_group_layout: wgpu::BindGroupLayout,
}

impl GpuContext {
    async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // Request adapter with high performance preference
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
            .ok_or("Failed to find suitable GPU adapter")?;

        // Print adapter info
        let info = adapter.get_info();
        eprintln!(
            "GPU: {} ({:?} backend)",
            info.name, info.backend
        );

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("Monte Carlo Device"),
                    required_features: wgpu::Features::empty(),
                    required_limits: wgpu::Limits::default(),
                    memory_hints: Default::default(),
                },
                None,
            )
            .await?;

        // Load and compile shader
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Monte Carlo Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
        });

        // Create bind group layout
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Bind Group Layout"),
            entries: &[
                // Uniform buffer for params
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Storage buffer for results
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        // Create pipeline
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Monte Carlo Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "main",
            compilation_options: Default::default(),
            cache: None,
        });

        Ok(Self {
            device,
            queue,
            pipeline,
            bind_group_layout,
        })
    }

    fn calculate_pi_gpu(&self, total_iterations: u64, seed: u32) -> f64 {
        const WORKGROUP_SIZE: u64 = 256;
        const ITERATIONS_PER_INVOCATION: u32 = 1000;
        const NUM_BUCKETS: usize = 256; // Multiple buckets to avoid u32 overflow
        const MAX_DISPATCH_SIZE: u32 = 65535; // WebGPU limit per dimension

        // Calculate number of workgroups needed
        let total_invocations = (total_iterations + ITERATIONS_PER_INVOCATION as u64 - 1)
            / ITERATIONS_PER_INVOCATION as u64;
        let num_workgroups = (total_invocations + WORKGROUP_SIZE - 1) / WORKGROUP_SIZE;

        // Calculate 2D dispatch to handle workgroups > 65535
        let (dispatch_x, dispatch_y) = if num_workgroups <= MAX_DISPATCH_SIZE as u64 {
            (num_workgroups as u32, 1)
        } else {
            // Use 2D grid: try to keep it roughly square for better occupancy
            let sqrt = (num_workgroups as f64).sqrt().ceil() as u32;
            let x = sqrt.min(MAX_DISPATCH_SIZE);
            let y = ((num_workgroups + x as u64 - 1) / x as u64).min(MAX_DISPATCH_SIZE as u64) as u32;
            (x, y)
        };

        // Create uniform buffer for params
        let params = ComputeParams {
            iterations_per_invocation: ITERATIONS_PER_INVOCATION,
            seed_base: seed,
        };

        let uniform_buffer = self
            .device
            .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("Uniform Buffer"),
                contents: bytemuck::cast_slice(&[params]),
                usage: wgpu::BufferUsages::UNIFORM,
            });

        // Create storage buffer with 256 buckets (initialized to 0)
        let zero_buckets = vec![0u32; NUM_BUCKETS];
        let results_buffer = self
            .device
            .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("Results Buffer"),
                contents: bytemuck::cast_slice(&zero_buckets),
                usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            });

        // Create staging buffer for reading results
        let staging_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Staging Buffer"),
            size: (NUM_BUCKETS * 4) as u64, // 256 buckets * 4 bytes each
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        // Create bind group
        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: uniform_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: results_buffer.as_entire_binding(),
                },
            ],
        });

        // Create command encoder and dispatch compute shader
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Compute Encoder"),
            });

        {
            let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Monte Carlo Pass"),
                timestamp_writes: None,
            });
            compute_pass.set_pipeline(&self.pipeline);
            compute_pass.set_bind_group(0, &bind_group, &[]);
            compute_pass.dispatch_workgroups(dispatch_x, dispatch_y, 1);
        }

        // Copy results to staging buffer
        encoder.copy_buffer_to_buffer(&results_buffer, 0, &staging_buffer, 0, (NUM_BUCKETS * 4) as u64);

        self.queue.submit(std::iter::once(encoder.finish()));

        // Read back results
        let buffer_slice = staging_buffer.slice(..);
        let (sender, receiver) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            sender.send(result).unwrap();
        });

        self.device.poll(wgpu::Maintain::Wait);
        receiver.recv().unwrap().unwrap();

        let data = buffer_slice.get_mapped_range();

        // Sum all buckets to get total count (using u64 to avoid overflow during sum)
        let mut total_count_inside: u64 = 0;
        for i in 0..NUM_BUCKETS {
            let bucket_value = u32::from_ne_bytes(data[i*4..(i+1)*4].try_into().unwrap());
            total_count_inside += bucket_value as u64;
        }

        drop(data);
        staging_buffer.unmap();

        // Calculate actual workgroups dispatched (may be more than requested due to 2D rounding)
        let actual_workgroups = dispatch_x as u64 * dispatch_y as u64;
        let actual_iterations = actual_workgroups * WORKGROUP_SIZE * ITERATIONS_PER_INVOCATION as u64;
        4.0 * (total_count_inside as f64) / (actual_iterations as f64)
    }
}

/// Fallback CPU implementation using Rayon (same as benchmark-rust-fast)
fn calculate_pi_parallel_cpu(iterations: u64, threads: usize, run_seed: u64) -> f64 {
    let iterations_per_thread = iterations / threads as u64;
    let count_inside = AtomicU64::new(0);

    (0..threads).into_par_iter().for_each(|thread_id| {
        let seed = run_seed.wrapping_mul(1000000).wrapping_add(thread_id as u64);
        fastrand::seed(seed);

        let mut local_count = 0u64;

        for _ in 0..iterations_per_thread {
            let x = fastrand::f64();
            let y = fastrand::f64();

            if x * x + y * y <= 1.0 {
                local_count += 1;
            }
        }

        count_inside.fetch_add(local_count, Ordering::Relaxed);
    });

    let total = threads as u64 * iterations_per_thread;
    4.0 * (count_inside.load(Ordering::Relaxed) as f64) / (total as f64)
}

fn run_benchmark_gpu(gpu: &GpuContext, iterations: u64, runs: u32) {
    println!("\n=== Rust Monte Carlo Pi Benchmark (GPU - WebGPU) ===");
    println!("Iterations: {:.2e}", iterations as f64);
    println!("Runs: {}\n", runs);

    let mut times = Vec::with_capacity(runs as usize);
    let mut pi_values = Vec::with_capacity(runs as usize);

    for run in 0..runs {
        let start = Instant::now();
        let seed = (run as u32).wrapping_mul(100000);
        let pi = gpu.calculate_pi_gpu(iterations, seed);
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
    println!("Total iterations: {}", iterations);
    println!("Error from π: {:.3e}", (std::f64::consts::PI - avg_pi).abs());
}

fn run_benchmark_cpu(iterations: u64, runs: u32, threads: usize) {
    println!("\n=== Rust Monte Carlo Pi Benchmark (CPU Fallback - Rayon) ===");
    println!("Iterations: {:.2e}", iterations as f64);
    println!("Runs: {}", runs);
    println!("Threads: {}\n", threads);

    let mut times = Vec::with_capacity(runs as usize);
    let mut pi_values = Vec::with_capacity(runs as usize);

    for run in 0..runs {
        let start = Instant::now();
        let run_seed = (run as u64).wrapping_mul(100000);
        let pi = calculate_pi_parallel_cpu(iterations, threads, run_seed);
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
    println!("Total iterations: {}", iterations);
    println!("Error from π: {:.3e}", (std::f64::consts::PI - avg_pi).abs());
}

fn main() {
    let args: Vec<String> = env::args().collect();

    let iterations_power = if args.len() > 1 {
        args[1].parse().unwrap_or(8)
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
        num_cpus::get()
    };

    // Try to initialize GPU, fall back to CPU if unavailable
    match pollster::block_on(GpuContext::new()) {
        Ok(gpu) => {
            eprintln!("Using GPU acceleration\n");
            run_benchmark_gpu(&gpu, iterations, runs);
        }
        Err(e) => {
            eprintln!("GPU initialization failed: {}", e);
            eprintln!("Falling back to CPU implementation\n");

            let available_cpus = num_cpus::get();
            let actual_threads = threads.min(available_cpus);

            rayon::ThreadPoolBuilder::new()
                .num_threads(actual_threads)
                .build_global()
                .unwrap();

            run_benchmark_cpu(iterations, runs, actual_threads);
        }
    }
}
