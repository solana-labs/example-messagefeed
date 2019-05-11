#!/usr/bin/env bash

cd "$(dirname "$0")"

cargo install xargo

set -e

# Ensure the sdk is installed
../node_modules/@solana/web3.js/bpf-sdk/scripts/install.sh
rustup override set bpf

export RUSTFLAGS="$RUSTFLAGS \
    -C lto=no \
    -C opt-level=2 \
    -C link-arg=-Tbpf.ld \
    -C link-arg=-z -C link-arg=notext \
    -C link-arg=--Bdynamic \
    -C link-arg=-shared \
    -C link-arg=--entry=entrypoint \
    -C linker=../node_modules/@solana/web3.js/bpf-sdk/llvm-native/bin/ld.lld"
export XARGO_HOME="$PWD/target/xargo"
export XARGO_RUST_SRC="../node_modules/@solana/web3.js/bpf-sdk/rust-bpf-sysroot/src"
xargo build --target bpfel-unknown-unknown --release -v

mkdir -p ../dist/program/
cp ./target/bpfel-unknown-unknown/release/messagefeed.so ../dist/program/

{ { set +x; } 2>/dev/null; echo Success; }
