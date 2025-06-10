#!/bin/bash

# Build JavaScript image
docker build -t code-executor-javascript -f Dockerfile.javascript .

# Build Python image
docker build -t code-executor-python -f Dockerfile.python .

# Build Java image
docker build -t code-executor-java -f Dockerfile.java .

# Build C++ image
docker build -t code-executor-cpp -f Dockerfile.cpp .


echo "Docker images built successfully!" 