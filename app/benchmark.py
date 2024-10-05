# app/benchmark.py
import argparse
import multiprocessing
import time
from random import random

class TestMC:
    def __init__(self, procs, iters):
        self.procs = procs
        self.iters = iters

    def worker(self, iters):
        count = 0
        for _ in range(iters):
            x, y = random(), random()
            if x*x + y*y <= 1:
                count += 1
        return count

    def test_mc(self):
        with multiprocessing.Pool(self.procs) as pool:
            results = pool.map(self.worker, [self.iters] * self.procs)
        total_in = sum(results)
        total = self.iters * self.procs
        pi = (4.0 * total_in) / total
        return pi, total_in, total

def main():
    parser = argparse.ArgumentParser(description="Monte Carlo Pi Benchmark")
    parser.add_argument("-mmt", type=int, help="Number of threads to use")
    parser.add_argument("-i", type=int, default=4, help="Number of benchmark iterations")
    parser.add_argument("-ti", type=int, default=6, help="Number of iterations as power of 10")
    args = parser.parse_args()

    num = int(10**args.ti)
    max_procs = multiprocessing.cpu_count()

    if args.mmt:
        procs = min(args.mmt, max_procs)
    else:
        procs = max_procs

    iters = num // procs

    total_pi = 0
    total_time = 0

    for _ in range(args.i):
        start_time = time.time()

        runtest = TestMC(procs, iters)
        piout, total_in, total = runtest.test_mc()

        elapsed_time = time.time() - start_time
        total_pi += piout
        total_time += elapsed_time

        strelapsed_time = f"{elapsed_time * 1000:.{0}f} ms"

        print(f"Pi: {piout}")
        print(f"Total in: {total_in}")
        print(f"Total: {total}")
        print(f"Elapsed time: {strelapsed_time}")
        print(f"Threads: {procs}")
        print(f"Iterations per thread: {iters}")
        print(f"Total iterations: {total}")
        print("")

    avg_pi = total_pi / args.i
    avg_time = total_time / args.i
    avg_strelapsed_time = f"{avg_time * 1000:.{0}f} ms"

    print(f"Average Pi: {avg_pi}")
    print(f"Average elapsed time: {avg_strelapsed_time}")
    print(f"Threads: {procs}")
    print(f"Iterations per thread: {iters}")
    print(f"Total iterations: {total}")

if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()