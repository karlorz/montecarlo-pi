#include <iostream>
#include <vector>
#include <thread>
#include <atomic>
#include <random>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <algorithm>

// Calculate Pi using Monte Carlo method for a single thread
void calculate_pi_worker(uint64_t iterations, uint64_t seed, std::atomic<uint64_t>& count_inside) {
    // Use fast LCG-based random number generator (similar to fastrand)
    std::mt19937_64 rng(seed);
    std::uniform_real_distribution<double> dist(0.0, 1.0);

    uint64_t local_count = 0;

    for (uint64_t i = 0; i < iterations; i++) {
        double x = dist(rng);
        double y = dist(rng);

        if (x * x + y * y <= 1.0) {
            local_count++;
        }
    }

    count_inside.fetch_add(local_count, std::memory_order_relaxed);
}

// Run parallel Monte Carlo simulation
double calculate_pi_parallel(uint64_t total_iterations, size_t num_threads, uint64_t run_seed) {
    uint64_t iterations_per_thread = total_iterations / num_threads;
    std::atomic<uint64_t> count_inside{0};
    std::vector<std::thread> threads;

    // Launch worker threads
    for (size_t i = 0; i < num_threads; i++) {
        uint64_t seed = run_seed * 1000000 + i;
        threads.emplace_back(calculate_pi_worker, iterations_per_thread, seed, std::ref(count_inside));
    }

    // Wait for all threads to complete
    for (auto& t : threads) {
        t.join();
    }

    uint64_t total = num_threads * iterations_per_thread;
    return 4.0 * static_cast<double>(count_inside.load()) / static_cast<double>(total);
}

void run_benchmark(uint64_t iterations, int runs, size_t threads) {
    std::cout << "\n=== C++ Monte Carlo Pi Benchmark (Multi-threaded) ===\n";
    std::cout << "Iterations: " << std::scientific << std::setprecision(2) << static_cast<double>(iterations) << "\n";
    std::cout << "Runs: " << runs << "\n";
    std::cout << "Threads: " << threads << "\n\n";

    std::vector<double> times;
    std::vector<double> pi_values;
    times.reserve(runs);
    pi_values.reserve(runs);

    for (int run = 0; run < runs; run++) {
        auto start = std::chrono::high_resolution_clock::now();

        // Create unique seed for each run
        uint64_t run_seed = static_cast<uint64_t>(run) * 100000 +
                           std::chrono::duration_cast<std::chrono::nanoseconds>(
                               std::chrono::system_clock::now().time_since_epoch()
                           ).count() % 1000000;

        double pi = calculate_pi_parallel(iterations, threads, run_seed);

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
        double time_ms = duration.count() / 1000.0;

        times.push_back(time_ms);
        pi_values.push_back(pi);

        std::cout << std::fixed << std::setprecision(10);
        std::cout << "Run " << (run + 1) << ": Pi = " << pi;
        std::cout << std::setprecision(2) << ", Time = " << time_ms << " ms\n";
    }

    // Calculate statistics
    double avg_time = std::accumulate(times.begin(), times.end(), 0.0) / times.size();
    double avg_pi = std::accumulate(pi_values.begin(), pi_values.end(), 0.0) / pi_values.size();
    double min_time = *std::min_element(times.begin(), times.end());
    double max_time = *std::max_element(times.begin(), times.end());

    std::cout << "\n--- Summary ---\n";
    std::cout << std::fixed << std::setprecision(10);
    std::cout << "Average Pi: " << avg_pi << "\n";
    std::cout << std::setprecision(2);
    std::cout << "Average Time: " << avg_time << " ms\n";
    std::cout << "Min Time: " << min_time << " ms\n";
    std::cout << "Max Time: " << max_time << " ms\n";
    std::cout << "Threads: " << threads << "\n";
    std::cout << "Iterations per thread: " << (iterations / threads) << "\n";
    std::cout << "Total iterations: " << iterations << "\n";
    std::cout << std::scientific << std::setprecision(3);
    std::cout << "Error from π: " << std::abs(M_PI - avg_pi) << "\n";
}

void print_usage(const char* prog_name) {
    std::cout << "Usage: " << prog_name << " [options]\n";
    std::cout << "Options:\n";
    std::cout << "  -mmt <threads>      Number of threads (default: hardware concurrency)\n";
    std::cout << "  -ti <power>         Iterations as power of 10 (default: 8 = 10^8)\n";
    std::cout << "  -i <runs>           Number of benchmark runs (default: 2)\n";
    std::cout << "  -h, --help          Show this help message\n";
}

int main(int argc, char* argv[]) {
    // Default values
    size_t threads = std::thread::hardware_concurrency();
    int iterations_power = 8;
    int runs = 2;

    // Parse command line arguments
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];

        if (arg == "-h" || arg == "--help") {
            print_usage(argv[0]);
            return 0;
        } else if (arg == "-mmt" && i + 1 < argc) {
            threads = std::stoul(argv[++i]);
        } else if (arg == "-ti" && i + 1 < argc) {
            iterations_power = std::stoi(argv[++i]);
        } else if (arg == "-i" && i + 1 < argc) {
            runs = std::stoi(argv[++i]);
        } else {
            std::cerr << "Unknown argument: " << arg << "\n";
            print_usage(argv[0]);
            return 1;
        }
    }

    // Calculate total iterations
    uint64_t iterations = static_cast<uint64_t>(std::pow(10, iterations_power));

    // Cap threads at hardware concurrency
    size_t max_threads = std::thread::hardware_concurrency();
    if (threads > max_threads) {
        std::cerr << "Warning: Requested " << threads << " threads, but only "
                  << max_threads << " CPUs available. Using " << max_threads << " threads.\n";
        threads = max_threads;
    }

    run_benchmark(iterations, runs, threads);

    return 0;
}
