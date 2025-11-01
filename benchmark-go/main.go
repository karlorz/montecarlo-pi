package main

import (
	"flag"
	"fmt"
	"math"
	"math/rand"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

var workerCounter int64

// calculatePiWorker runs Monte Carlo simulation for a given number of iterations
func calculatePiWorker(iterations int64, wg *sync.WaitGroup, results chan<- int64) {
	defer wg.Done()

	var countInside int64
	// Use traditional math/rand with unique seed per worker
	// This is actually faster than ChaCha8 for this use case
	workerID := atomic.AddInt64(&workerCounter, 1)
	seed := time.Now().UnixNano() + workerID*1000000
	rng := rand.New(rand.NewSource(seed))

	for i := int64(0); i < iterations; i++ {
		x := rng.Float64()
		y := rng.Float64()

		if x*x+y*y <= 1.0 {
			countInside++
		}
	}

	results <- countInside
}

// runBenchmark executes one complete benchmark run using multiple threads
func runBenchmark(threads int, totalIterations int64) (float64, int64, int64, time.Duration) {
	iterationsPerThread := totalIterations / int64(threads)

	var wg sync.WaitGroup
	results := make(chan int64, threads)

	startTime := time.Now()

	// Launch worker goroutines
	for i := 0; i < threads; i++ {
		wg.Add(1)
		go calculatePiWorker(iterationsPerThread, &wg, results)
	}

	// Wait for all workers to complete
	wg.Wait()
	close(results)

	elapsed := time.Since(startTime)

	// Collect results
	var totalInside int64
	for count := range results {
		totalInside += count
	}

	total := int64(threads) * iterationsPerThread
	pi := 4.0 * float64(totalInside) / float64(total)

	return pi, totalInside, total, elapsed
}

func main() {
	// Define command-line flags
	threads := flag.Int("mmt", 6, "Number of threads to use")
	benchmarkIterations := flag.Int("i", 2, "Number of benchmark iterations")
	iterationsPower := flag.Int("ti", 7, "Number of iterations as power of 10")
	flag.Parse()

	// Calculate total iterations
	totalIterations := int64(math.Pow(10, float64(*iterationsPower)))

	// Get max available CPUs
	maxProcs := runtime.NumCPU()
	actualThreads := *threads
	if actualThreads > maxProcs {
		actualThreads = maxProcs
		fmt.Printf("Warning: Requested %d threads, but only %d CPUs available. Using %d threads.\n", *threads, maxProcs, actualThreads)
	}

	// Set GOMAXPROCS to match our thread count
	runtime.GOMAXPROCS(actualThreads)

	fmt.Printf("\n=== Go Monte Carlo Pi Benchmark ===\n")
	fmt.Printf("Iterations: %.2e\n", float64(totalIterations))
	fmt.Printf("Benchmark Runs: %d\n", *benchmarkIterations)
	fmt.Printf("Threads: %d\n\n", actualThreads)

	var totalPi float64
	var totalTime time.Duration
	times := make([]float64, 0, *benchmarkIterations)
	piValues := make([]float64, 0, *benchmarkIterations)

	// Run benchmarks
	for run := 0; run < *benchmarkIterations; run++ {
		pi, totalInside, total, elapsed := runBenchmark(actualThreads, totalIterations)

		totalPi += pi
		totalTime += elapsed
		elapsedMs := float64(elapsed.Milliseconds())
		times = append(times, elapsedMs)
		piValues = append(piValues, pi)

		fmt.Printf("Run %d:\n", run+1)
		fmt.Printf("  Pi: %.10f\n", pi)
		fmt.Printf("  Total in: %d\n", totalInside)
		fmt.Printf("  Total: %d\n", total)
		fmt.Printf("  Elapsed time: %.0f ms\n", elapsedMs)
		fmt.Printf("  Threads: %d\n", actualThreads)
		fmt.Printf("  Iterations per thread: %d\n", totalIterations/int64(actualThreads))
		fmt.Printf("  Total iterations: %d\n\n", total)
	}

	// Calculate statistics
	avgPi := totalPi / float64(*benchmarkIterations)
	avgTime := totalTime / time.Duration(*benchmarkIterations)
	avgTimeMs := float64(avgTime.Milliseconds())

	var minTime, maxTime float64 = times[0], times[0]
	for _, t := range times {
		if t < minTime {
			minTime = t
		}
		if t > maxTime {
			maxTime = t
		}
	}

	fmt.Printf("--- Summary ---\n")
	fmt.Printf("Average Pi: %.10f\n", avgPi)
	fmt.Printf("Average elapsed time: %.0f ms\n", avgTimeMs)
	fmt.Printf("Min Time: %.2f ms\n", minTime)
	fmt.Printf("Max Time: %.2f ms\n", maxTime)
	fmt.Printf("Threads: %d\n", actualThreads)
	fmt.Printf("Iterations per thread: %d\n", totalIterations/int64(actualThreads))
	fmt.Printf("Total iterations: %d\n", totalIterations)
	fmt.Printf("Error from π: %.3e\n", math.Abs(math.Pi-avgPi))
}