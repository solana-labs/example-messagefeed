[![Build status][travis-image]][travis-url]

[travis-image]: https://api.travis-ci.org/solana-labs/example-messagefeed.svg?branch=master
[travis-url]: https://travis-ci.org/solana-labs/example-messagefeed

# Message Feed on Solana

This project demonstrates how to use the [Solana Javascript API](https://github.com/solana-labs/solana-web3.js)
to build, deploy, and interact with programs on the Solana blockchain, implementing a simple feed of messages
To see it running go to https://solana-example-messagefeed.herokuapp.com/

## Getting Started

First fetch the npm dependencies, including `@solana/web3.js`, by running:
```sh
$ npm install
```

### Select a Network
The example connects to a local Solana network by default.

To start a local Solana network run:
```bash
$ npm run localnet:update
$ npm run localnet:up
```

Solana network logs are available with:
```bash
$ npm run localnet:logs
```

For more details on working with a local network, see the [full instructions](https://github.com/solana-labs/solana-web3.js#local-network).

Alternatively to connect to the public testnet, `export LIVE=1` in your
environment.  By default `LIVE=1` will connect to the
beta testnet.  To use the edge testnet instead define `export CHANNEL=edge` in
your environment (see [url.js](https://github.com/solana-labs/example-messagefeed/blob/master/url.js) for more)

### Build the on-chain program

Two versions of the program are provided, one written in C and the other
in Rust.  The build process for each produce the same a BPF ELF shared object called `dist/program/messagefeed.so`.  They are interchangable so just pick one to use.

#### BPF C
```sh
$ V=1 make -C program-bpf-c
```
or
```
$ npm run build:bpf-c
```

#### BPF Rust
```sh
$ ./program-bpf-rust/build.sh
```
or
```
$ npm run build:bpf-rust
```

### Start the web server
The message feed program is deployed by the web server at `src/server.js`, so
start it first:
```sh
$ npm run start-server
```

### Run the Command-Line Front End
After building the program and starting the web server, you can view the current
message feed by running

```sh
$ npm run start
```

and post a new message with:
```sh
$ npm run start -- "This is a message"
```

### Run the WebApp Front End
After building the program and starting the web server, start the webapp
locally by running:
```sh
$ npm run dev
```
then go to http://localhost:8080/ in your browser.
