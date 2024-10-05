// pwa/worker.js
self.onmessage = function(e) {
    const { iters } = e.data;
    let count = 0;
    for (let i = 0; i < iters; i++) {
        const x = Math.random();
        const y = Math.random();
        if (x * x + y * y <= 1) {
            count++;
        }
    }
    self.postMessage(count);
};