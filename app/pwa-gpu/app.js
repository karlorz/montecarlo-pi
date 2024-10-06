document.getElementById('start-button').addEventListener('click', () => {
    const iterationsPower = parseInt(document.getElementById('iterations').value, 10);
    const totalIterations = Math.pow(10, iterationsPower);
    const benchmarkIterations = parseInt(document.getElementById('benchmark-iterations').value, 10);
    const chunkSize = Math.pow(10, 4); // Process in smaller chunks

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    let totalPi = 0;
    let totalTime = 0;

    function runBenchmark(b) {
        if (b >= benchmarkIterations) {
            const avgPi = totalPi / benchmarkIterations;
            const avgTime = totalTime / benchmarkIterations;
            resultsDiv.innerHTML += `<p>Average Pi: ${avgPi}</p>`;
            resultsDiv.innerHTML += `<p>Average elapsed time: ${avgTime} ms</p>`;
            return;
        }

        const startTime = performance.now();

        // WebGL code for GPU acceleration
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) {
            resultsDiv.innerHTML += `<p>WebGL not supported</p>`;
            console.error('WebGL not supported');
            return;
        }

        // WebGL shader and program setup
        const vertexShaderSource = `
            attribute vec4 a_position;
            void main() {
                gl_Position = a_position;
            }
        `;

        const fragmentShaderSource = `
            precision highp float;
            uniform float u_seed;
            const int u_iterations = ${chunkSize};
            float random(float seed, float i) {
                return fract(sin(seed + i * 1.0) * 43758.5453123);
            }
            void main() {
                float x, y;
                int inCircle = 0;
                for (int i = 0; i < u_iterations; i++) {
                    x = random(u_seed, float(i));
                    y = random(u_seed, float(i) + 1.0);
                    if (x * x + y * y <= 1.0) {
                        inCircle++;
                    }
                }
                gl_FragColor = vec4(float(inCircle) / float(u_iterations), 0.0, 0.0, 1.0);
            }
        `;

        function createShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        function createProgram(gl, vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error(gl.getProgramInfoLog(program));
                gl.deleteProgram(program);
                return null;
            }
            return program;
        }

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = createProgram(gl, vertexShader, fragmentShader);

        if (!program) {
            resultsDiv.innerHTML += `<p>Failed to create WebGL program</p>`;
            return;
        }

        gl.useProgram(program);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1,
        ]), gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const seedLocation = gl.getUniformLocation(program, 'u_seed');

        gl.uniform1f(seedLocation, Math.random() * 1000);

        let inCircleTotal = 0;
        let iterationsProcessed = 0;

        function drawAndReadPixels() {
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            const pixels = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            const inCircle = pixels[0] / 255.0 * chunkSize;
            inCircleTotal += inCircle;
            iterationsProcessed += chunkSize;

            if (iterationsProcessed < totalIterations) {
                requestAnimationFrame(drawAndReadPixels);
            } else {
                const pi = (4.0 * inCircleTotal) / totalIterations;
                const elapsedTime = performance.now() - startTime;
                totalPi += pi;
                totalTime += elapsedTime;

                resultsDiv.innerHTML += `<p>Pi: ${pi}</p>`;
                resultsDiv.innerHTML += `<p>Elapsed time: ${elapsedTime} ms</p>`;

                runBenchmark(b + 1);
            }
        }

        requestAnimationFrame(drawAndReadPixels);
    }

    runBenchmark(0);
});