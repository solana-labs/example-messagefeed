[![Build status][travis-image]][travis-url]

[travis-image]: https://api.travis-ci.org/solana-labs/example-messagefeed.svg?branch=v0.23
[travis-url]: https://travis-ci.org/solana-labs/example-messagefeed

# Solana Feed

This project demonstrates how to use the [Solana Javascript API](https://github.com/solana-labs/solana-web3.js)
to build, deploy, and interact with programs on the Solana blockchain,
implementing a simple feed of messages and prediction polls.
To see it running go to https://solana-example-messagefeed.herokuapp.com/

## Table of Contents
- [Solana Feed](#solana-feed)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Message Feed](#message-feed)
    - [User Login](#user-login)
    - [Posting a message](#posting-a-message)
    - [Banning a user](#banning-a-user)
  - [Learn about Solana](#learn-about-solana)
  - [Prediction Polls](#prediction-polls)
    - [Creating a poll](#creating-a-poll)
    - [Voting](#voting)
    - [Claim winnings](#claim-winnings)
    - [Limitations](#limitations)
  - [Getting Started](#getting-started)
    - [Select a Network](#select-a-network)
    - [Build the BPF program](#build-the-bpf-program)
    - [Start the web server](#start-the-web-server)
    - [Run the Command-Line Front End](#run-the-command-line-front-end)
    - [Run the WebApp Front End](#run-the-webapp-front-end)


## Overview

This project uses two Solana programs and a Node server to power a single webapp.
The [Message Feed](#message-feed) program allows users to post messages and ban
each other for bad behavior. The [Prediction Poll](#prediction-polls) program
allows users to create wager-able polls that reward the winning side.

## Message Feed

Messages are represented as a singly-linked list of Solana accounts.

Each Message account contains the message text, public key of the next message,
and the public key of the User Account who posted it.

To post a new message, a User Account is required.  The only way to obtain a
User Account is to present credentials to the Https Server that created the
first message in the chain.

A User Account contains a bit which indicates if they have been banned by another user.

### User Login
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

## Learn about Solana

More information about how Solana works is available in the [Book](https://docs.solana.com/book/)

## Prediction Polls

Polls propose a question and 2 option to choose from. They allow users to wager
tokens on which answer will be the most popular. The winning side gets to split
up the losers' wagers!

Polls are stored in a single Collection account on Solana. The Collection account
contains a list of public keys for the Poll accounts.

In addition to the display text, each poll also has an expiration block height
and 2 tally keys for tracking wagers.

Tally Accounts record wagers for a particular poll option. When the poll
expires, they are used to distribute winnings

### Creating a poll
To create a new poll, a User Account is required. Similar to posting messages,
the user account is retrieved from the server.

1. The user signs in and fetches the prediction poll program id and the current
collection key.
1. The user inputs the poll header and options as well as a block timeout which
will be added to the current block height to compute the poll expiration.
1. A Transaction is constructed with instructions for creating the poll account
and 2 tally accounts and an instruction for initializing the poll with the text
and timeout.
1. Solana then creates the accounts and the prediction poll program processes
the poll initialization instruction to set the poll account data.

### Voting
Voting on a poll involves a token wager which will be transferred to the poll
account and recorded in the poll account data.

1. A user selects a poll option and chooses an appropriate token wager
1. A Transaction is constructed with instructions to create a one-off account
with a balance equal to the token wager and submit a vote.
1. The prediction poll program then drains the one-off account balance and
records the wager in the poll account and the selected option tally account.

### Claim winnings
Once the poll expires, anyone can trigger the distribution of the winnings.

1. Transaction is created which references all of the winning wager keys in a
claim instruction.
1. The prediction poll program verifies that the poll has expired and then
drains the poll account balance and proportionally distributes the tokens to the
winners according to their wagers.

### Limitations
- The number of polls in a collection is limited to the size of the Collection
account data
- The number of participants in a tally are limited by the size of the Tally
account data as well as the maximum size of a transaction. Serialized
transactions must fit inside the MTU size of 1280 bytes.

## Getting Started

The following dependencies are required to build and run this example, 
depending on your OS they may already be installed:

```sh
$ npm --version
$ docker -v
$ wget --version
$ rustc --version
```

Next fetch the npm dependencies, including `@solana/web3.js`, by running:
```sh
$ npm install
```

### Select a Network
The example connects to a local Solana cluster by default.

To enable on-chain program logs, set the `RUST_LOG` environment variable:
```sh
$ export RUST_LOG=solana_runtime::native_loader=trace,solana_runtime::system_instruction_processor=trace,solana_runtime::bank=debug,solana_bpf_loader=debug,solana_rbpf=debug
```

To start a local Solana cluster run:
```sh
$ npm run localnet:update
$ npm run localnet:up
```

Solana cluster logs are available with:
```sh
$ npm run localnet:logs
```

To stop the local solana cluster run:
```sh
$ npm run localnet:down
```

For more details on working with a local cluster, see the [full instructions](https://github.com/solana-labs/solana-web3.js#local-network).

### Build the BPF program
The prediction poll program is only written in Rust. The build command will
produce a BPF ELF shared object called `dist/programs/prediction_poll.so`.

```sh
$ npm run build:bpf-rust
```
or
```sh
$ npm run build:bpf-c
```

### Start the web server
The message feed and prediction poll programs are deployed by the web server at `src/server/index.js`,
so start it first:
```sh
$ npm run dev-server
```

### Run the Command-Line Front End
After building the program and starting the web server, you can view the current
message feed by running

```sh
$ npm run message-cli
```

and post a new message with:
```sh
$ npm run message-cli -- "This is a message"
```

and can create a test poll by running:
```sh
$ npm run poll-cli
```

### Run the WebApp Front End
After building the program and starting the web server, start the webapp
locally by running:
```sh
$ npm run dev
```
then go to http://localhost:8080/ in your browser.
