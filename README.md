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

## Configuring Port Forwarding

To allow access to the web server from other devices on your LAN, you need to set up port forwarding from your Windows host to the WSL2 instance.

### Determine the WSL2 IP Address

In your WSL2 terminal, run:

```sh
ip addr show eth0
```

Note the `inet` address under `eth0`.

### Set Up Port Forwarding

Open PowerShell as Administrator and run the following command, replacing `<WSL2_IP_ADDRESS>` with the IP address you noted:

```powershell
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=<WSL2_IP_ADDRESS>
```

### Verify the Port Forwarding Rules

To verify that the port forwarding rule has been added, run:

```powershell
netsh interface portproxy show all
```

You should see an entry similar to:

```plaintext
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
--------------- ----------  --------------- ----------
0.0.0.0         8000        <WSL2_IP_ADDRESS> 8000
```

## Checking the Web Server

To check if the web server is running, open a web browser on your Windows host and navigate to:

```
http://localhost:8000
```

You should see the contents of the directory you are serving.

## Building the Docker Image

To build the Docker image for the Python benchmark script, use the following command:

```sh
docker build -t python-benchmark:latest -f app/python/Dockerfile ./app/python
```
## Running the Benchmark

To run the benchmark, use the following command:

```sh
docker run --rm -it python-benchmark:latest python benchmark.py -mmt <number_of_threads> -i <number_of_benchmark_iterations> -ti <iterations_as_power_of_10>
```

### Example Command

For example, to use 4 threads, run 2 benchmark iterations, and set the number of iterations as 10^7:

```sh
docker run --rm -it python-benchmark:latest python benchmark.py -mmt 4 -i 2 -ti 7
```
