# Monte Carlo Pi Benchmark

This script benchmarks the calculation of Pi using the Monte Carlo method with multiprocessing.

## Prerequisites

- Python 3.x
- WSL2 on Windows 10
- `argparse` and `multiprocessing` modules (included in the Python standard library)

## Running the Benchmark

To run the benchmark, use the following command:

```sh
python3 app/benchmark.py -mmt <number_of_threads> -i <number_of_benchmark_iterations> -ti <iterations_as_power_of_10>
```

## Setting Up a Web Server in WSL2

To set up a simple web server in WSL2, you can use Python's built-in HTTP server module. Navigate to the directory you want to serve and run:

```sh
python3 -m http.server 8000
```

## Port Forwarding in WSL2

To access the web server from your Windows host, you need to forward the port. Open a PowerShell window and run:

```powershell
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL2_IP_Address>
```

Replace `<WSL2_IP_Address>` with the IP address of your WSL2 instance. You can find the IP address by running:

```sh
hostname -I
```

## Checking the Web Server

To check if the web server is running, open a web browser on your Windows host and navigate to:

```
http://localhost:8000
```

You should see the contents of the directory you are serving.
