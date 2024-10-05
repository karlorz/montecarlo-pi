// pwa/app.js
document.getElementById('start-button').addEventListener('click', () => {
    const threads = parseInt(document.getElementById('threads').value, 10);
    const iterations = Math.pow(10, parseInt(document.getElementById('iterations').value, 10));
    const benchmarkIterations = parseInt(document.getElementById('benchmark-iterations').value, 10);

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    let totalPi = 0;
    let totalTime = 0;

    function runBenchmark(b) {
        const startTime = performance.now();
        const workers = [];
        const itersPerThread = Math.floor(iterations / threads);
        let totalIn = 0;
        let completedWorkers = 0;

        for (let t = 0; t < threads; t++) {
            const worker = new Worker('worker.js');
            workers.push(worker);
            worker.postMessage({ iters: itersPerThread });

            worker.onmessage = function(e) {
                totalIn += e.data;
                completedWorkers++;
                if (completedWorkers === threads) {
                    const pi = (4.0 * totalIn) / (itersPerThread * threads);
                    const elapsedTime = performance.now() - startTime;
                    totalPi += pi;
                    totalTime += elapsedTime;

                    resultsDiv.innerHTML += `
                        <p>Pi: ${pi}</p>
                        <p>Elapsed time: ${elapsedTime.toFixed(0)} ms</p>
                        <p>Threads: ${threads}</p>
                        <p>Iterations per thread: ${itersPerThread}</p>
                        <p>Total iterations: ${itersPerThread * threads}</p>
                        <hr>
                    `;

                    if (b < benchmarkIterations - 1) {
                        runBenchmark(b + 1);
                    } else {
                        const avgPi = totalPi / benchmarkIterations;
                        const avgTime = totalTime / benchmarkIterations;
                        resultsDiv.innerHTML += `
                            <h2>Average Results</h2>
                            <p>Average Pi: ${avgPi}</p>
                            <p>Average elapsed time: ${avgTime.toFixed(0)} ms</p>
                            <p>Threads: ${threads}</p>
                            <p>Iterations per thread: ${itersPerThread}</p>
                            <p>Total iterations: ${itersPerThread * threads}</p>
                        `;
                    }
                }
            };
        }
    }

    runBenchmark(0);
});