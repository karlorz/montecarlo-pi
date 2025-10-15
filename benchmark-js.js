#!/usr/bin/env node

/**
 * Pure JavaScript Monte Carlo Pi Benchmark (Local)
 * This provides a baseline for comparison with Rust implementations
 */

function calculatePi(iterations) {
    let countInside = 0;

    for (let i = 0; i < iterations; i++) {
        const x = Math.random();
        const y = Math.random();

        if (x * x + y * y <= 1.0) {
            countInside++;
        }
    }

    return 4.0 * countInside / iterations;
}

function benchmark(iterations, runs = 5) {
    console.log(`\n=== JavaScript Monte Carlo Pi Benchmark ===`);
    console.log(`Iterations: ${iterations.toExponential()}`);
    console.log(`Runs: ${runs}\n`);

    const times = [];
    const piValues = [];

    for (let run = 0; run < runs; run++) {
        const start = process.hrtime.bigint();
        const pi = calculatePi(iterations);
        const end = process.hrtime.bigint();

        const timeMs = Number(end - start) / 1_000_000;
        times.push(timeMs);
        piValues.push(pi);

        console.log(`Run ${run + 1}: Pi = ${pi.toFixed(10)}, Time = ${timeMs.toFixed(2)} ms`);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const avgPi = piValues.reduce((a, b) => a + b, 0) / piValues.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`\n--- Summary ---`);
    console.log(`Average Pi: ${avgPi.toFixed(10)}`);
    console.log(`Average Time: ${avgTime.toFixed(2)} ms`);
    console.log(`Min Time: ${minTime.toFixed(2)} ms`);
    console.log(`Max Time: ${maxTime.toFixed(2)} ms`);
    console.log(`Error from π: ${Math.abs(Math.PI - avgPi).toExponential(3)}`);
}

// Parse command line arguments
const iterations = parseInt(process.argv[2]) || 100_000_000; // Default: 10^8
const runs = parseInt(process.argv[3]) || 5;

benchmark(iterations, runs);
