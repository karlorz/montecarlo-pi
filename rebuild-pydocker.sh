#!/bin/bash

# Define variables
IMAGE_NAME="python-benchmark"
DOCKERFILE_PATH="app/python/Dockerfile"
CONTEXT_PATH="./app/python"
COMMAND="python benchmark.py -mmt 4 -i 2 -ti 7"

# Update the repository (if applicable)
# Uncomment the following line if you need to pull updates from a remote repository
# git pull origin main

# Build the Docker image
echo "Building Docker image..."
docker build -t $IMAGE_NAME:latest -f $DOCKERFILE_PATH $CONTEXT_PATH

# Run the Docker container with the specified command
# echo "Running Docker container..."
# docker run --rm -it $IMAGE_NAME:latest $COMMAND