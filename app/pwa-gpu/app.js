document.getElementById('start-button').addEventListener('click', () => {
    const iterationsPower = parseInt(document.getElementById('iterations').value, 10);
    const totalIterations = Math.pow(10, iterationsPower);
    const benchmarkIterations = parseInt(document.getElementById('benchmark-iterations').value, 10);
    const chunkSize = Math.pow(10, 6); // Larger chunk for better GPU utilization

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

        // WebGL setup
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) {
            resultsDiv.innerHTML += `<p>WebGL not supported</p>`;
            console.error('WebGL not supported');
            return;
        }

        // Check for floating-point texture support
        const ext = gl.getExtension('OES_texture_float') || gl.getExtension('WEBGL_color_buffer_float');
        if (!ext) {
            resultsDiv.innerHTML += `<p>Floating-point textures not supported</p>`;
            console.error('Floating-point textures not supported');
            return;
        }

        // WebGL shader and program setup
        const vertexShaderSource = `
            attribute vec4 a_position;
            void main() {
                gl_Position = a_position;
            }
        `;

        // Improved RNG for WebGL: Based on fractional sine for pseudo-random numbers
        const fragmentShaderSource = `
            precision highp float;
            uniform float u_seed;
            const int u_iterations = ${chunkSize}; // Larger chunk size for better GPU utilization

            // Custom random number generator using a fractional sine method
            float random(float seed, float i) {
                return fract(sin(seed + i) * 43758.5453123);
            }

            void main() {
                float x, y;
                int inCircle = 0;
                float seed = u_seed;

                for (int i = 0; i < u_iterations; i++) {
                    x = random(seed, float(i));
                    y = random(seed, float(i) + 1.0);
                    if (x * x + y * y <= 1.0) {
                        inCircle++;
                    }
                }

                // Return the ratio of points inside the circle to total points
                gl_FragColor = vec4(float(inCircle) / float(u_iterations), 0.0, 0.0, 1.0); // Output ratio directly
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
        gl.uniform1f(seedLocation, Math.random() * 1000); // Random seed for RNG

        // Floating-point framebuffer setup
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.FLOAT, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Error creating floating-point framebuffer');
            return;
        }

        let inCircleTotal = 0;
        let iterationsProcessed = 0;

        function drawAndReadPixels() {
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Read the pixel data as floating-point for higher precision
            const pixels = new Float32Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixels);
            const inCircleRatio = pixels[0]; // This should now give the ratio of points inside the circle
            inCircleTotal += inCircleRatio * chunkSize;
            iterationsProcessed += chunkSize;

            if (iterationsProcessed < totalIterations) {
                requestAnimationFrame(drawAndReadPixels);
            } else {
                const finalPi = (4.0 * inCircleTotal) / totalIterations;
                const elapsedTime = performance.now() - startTime;
                totalPi += finalPi;
                totalTime += elapsedTime;

                resultsDiv.innerHTML += `<p>Pi: ${finalPi}</p>`;
                resultsDiv.innerHTML += `<p>Elapsed time: ${elapsedTime} ms</p>`;

                runBenchmark(b + 1);
            }
        }

        requestAnimationFrame(drawAndReadPixels);
    }

    runBenchmark(0);
});
