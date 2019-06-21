#!/usr/bin/env bash

cd "$(dirname "$0")"

usage() {
    echo ""
    echo "  Usage: do.sh action <project>"
    echo ""
    echo "  If relative_project_path is ommitted then action will"
    echo "  be performed on all projects"
    echo ""
    echo "  Supported actions:"
    echo "    build"
    echo "    clean"
    echo "    clippy"
    echo "    fmt"
    echo ""
}

perform_action() {
    set -e
    case "$1" in
    build)
         ../node_modules/@solana/web3.js/bpf-sdk/rust/build.sh "$PWD"
         mkdir -p ../dist/program
         cp ./target/bpfel-unknown-unknown/release/messagefeed.so ../dist/program
    ;;
    clean)
         ../node_modules/@solana/web3.js/bpf-sdk/rust/clean.sh "$PWD"
    ;;
    clippy)
        (
            echo "clippy $2"
            cargo +nightly clippy
        )
    ;;
    fmt)
        (
            echo "formatting $2"
            cargo fmt
        )
    ;;
    help)
        usage
        exit
        ;;
    *)
        echo "Error: Unknown command"
        usage
        exit
    ;;
    esac
}

set -e

perform_action "$1"