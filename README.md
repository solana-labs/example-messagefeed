[![Build status][travis-image]][travis-url]

[travis-image]: https://api.travis-ci.org/solana-labs/example-messagefeed.svg?branch=master
[travis-url]: https://travis-ci.org/solana-labs/example-messagefeed

# Message Feed on Solana

This project demonstrates how to use the [Solana Javascript API](https://github.com/solana-labs/solana-web3.js)
to build, deploy, and interact with programs on the Solana blockchain, implementing a simple feed of messages
To see it running go to https://solana-example-messagefeed.herokuapp.com/

## How it works at a high-level
Messages are represented as a singly-linked list of Solana accounts.

Each Message account contains the message text, public key of the next message, and the public key of the User Account who posted it.

To post a new message, a User Account is required.  The only way to obtain a
User Account is to present credentials to the Https Server that created the first
message in the chain.

A User Account contains a bit which indicates if they have been banned by another user.

### New User sign-up
Only the mechanism to obtain User Accounts is centralized.  This will ensure
each User Account is associated with a real person using whatever user
authentication system (such as Google) is preferred.  The only requirement on
the authentication system is that that each authenticated user have a unique
user id.

1. Https Server loads the Message Feed program on Solana and posts the first message
1. New User authenticates against Google and receives a JWT
1. New User sends JWT to Https Server
1. Https Server verifies the JWT contents and extracts their unique user id
1. Https Server creates a User Account on behalf of New User if not already created
1. Https Server returns the private key for the User Account to the New User, and the public key of the first message

Note: presently the JWT workflow is not fully implemented.  No technical reason, just work that hasn't been done yet :)

### Posting a message
1. With the public key of the first message and a User Account, the user uses
   the RPC APIs of a Solana fullnode to fetch the latest message in the chain.
1. The user constructs a new Transaction with the user message, the public key
   of their User Account and the public key of the latest message.  The
   Transaction is signed with their User Account private key, then submitted to
   the Solana cluster.
1. The Message Feed program processes the Transaction on-chain, confirms the user is not
   banned and links the new message to the chain.

### Banning a user
Any user can construct a Transaction that bans any other user.  All messages
posted by a user contains the public key of their User Account, so it's easy to
identify the origin of each post.

1. The ban Transaction includes the public key of the User Account to ban, the
   public key of the banning user's User Account, and a message to include with
   the ban.  The ban Transaction is signed with the banning user's User Account
   private key, then submitted to the Solana cluster.
1. The Message Feed program processes the Transaction on chain, confirms the banning user
   is not also banned, and then sets the banned bit on the target user.


## Getting Started

First fetch the npm dependencies, including `@solana/web3.js`, by running:
```sh
$ npm install
```

### Select a Cluster
The example connects to a local Solana cluster by default.

To start a local Solana cluster run:
```bash
$ npm run localnet:update
$ npm run localnet:up
```

Solana cluster logs are available with:
```bash
$ npm run localnet:logs
```

For more details on working with a local cluster, see the [full instructions](https://github.com/solana-labs/solana-web3.js#local-network).

Alternatively to connect to the public testnet, `export LIVE=1` in your
environment.  By default `LIVE=1` will connect to the
beta testnet.  To use the edge testnet instead define `export CHANNEL=edge` in
your environment (see [url.js](https://github.com/solana-labs/example-messagefeed/blob/master/url.js) for more)

### Build the on-chain program

Two versions of the program are provided, one written in C and the other in
Rust.  The build processes for each version produce a BPF ELF shared object
called `dist/programs/messagefeed.so`.  They are interchangeable so just pick one
to use.

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
