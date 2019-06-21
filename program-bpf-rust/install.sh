#!/usr/bin/env bash

cd "$(dirname "$0")"

if [ ! -f "./target/bpfel-unknown-unknown/release/messagefeed.so" ]; then
      echo "Error: Must build the project first via: npm run build:bpf-rust"
    exit 1
fi

mkdir -p ../dist/program
cp ./target/bpfel-unknown-unknown/release/messagefeed.so ../dist/program