// app.js
document.getElementById('start-button').addEventListener('click', startBenchmark);

function startBenchmark() {
    const threads = parseInt(document.getElementById('threads').value);
    const iterationsPower = parseInt(document.getElementById('iterations').value);
    const benchmarkIterations = parseInt(document.getElementById('benchmark-iterations').value);
    const iterations = Math.pow(10, iterationsPower);
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    let totalPi = 0;
    let totalTime = 0;

    function worker(iters) {
        let count = 0;
        for (let i = 0; i < iters; i++) {
            const x = Math.random();
            const y = Math.random();
            if (x * x + y * y <= 1) {
                count++;
            }
        }
        return count;
    }

    function runBenchmark() {
        const startTime = performance.now();

        const promises = [];
        for (let i = 0; i < threads; i++) {
            promises.push(new Promise((resolve) => {
                resolve(worker(iterations / threads));
            }));
        }

        Promise.all(promises).then((results) => {
            const totalIn = results.reduce((acc, val) => acc + val, 0);
            const total = iterations;
            const pi = (4.0 * totalIn) / total;

            const elapsedTime = performance.now() - startTime;
            totalPi += pi;
            totalTime += elapsedTime;

            const resultHtml = `
                <p>Pi: ${pi}</p>
                <p>Total in: ${totalIn}</p>
                <p>Total: ${total}</p>
                <p>Elapsed time: ${elapsedTime.toFixed(0)} ms</p>
                <p>Threads: ${threads}</p>
                <p>Iterations per thread: ${iterations / threads}</p>
                <p>Total iterations: ${total}</p>
                <hr>
            `;
            resultsDiv.innerHTML += resultHtml;

            if (--benchmarkIterations > 0) {
                runBenchmark();
            } else {
                const avgPi = totalPi / parseInt(document.getElementById('benchmark-iterations').value);
                const avgTime = totalTime / parseInt(document.getElementById('benchmark-iterations').value);
                const avgResultHtml = `
                    <h2>Average Results</h2>
                    <p>Average Pi: ${avgPi}</p>
                    <p>Average elapsed time: ${avgTime.toFixed(0)} ms</p>
                    <p>Threads: ${threads}</p>
                    <p>Iterations per thread: ${iterations / threads}</p>
                    <p>Total iterations: ${total}</p>
                `;
                resultsDiv.innerHTML += avgResultHtml;
            }
        });
    }

    runBenchmark();
}