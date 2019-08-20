import {PublicKey} from '@solana/web3.js';

import {
  refreshCollection,
  createPoll,
  refreshPoll,
  claim,
  vote,
} from '../../programs/prediction-poll';

function compare(a, b) {
  for (let i = a.length; -1 < i; i -= 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export default class PredictionPollApi {
  constructor() {
    this.polls = [];
  }

  subscribe(onPolls) {
    this.pollCallback = onPolls;
    if (this.polls.length > 0) {
      this.pollCallback(this.polls);
    }
    this.pollCollection(onPolls);
  }

  unsubscribe() {
    this.pollCallback = null;
  }

  async pollCollection(callback) {
    if (callback !== this.pollCallback) return;
    if (this.connection) {
      try {
        const collection = await refreshCollection(
          this.connection,
          this.collection,
        );
        if (this.pollCallback) {
          this.pollCallback(this.polls);
          this.refreshPolls(collection.getPolls());
        }
      } catch (err) {
        console.error(`pollCollection error: ${err}`);
      }
    }

    setTimeout(() => this.pollCollection(callback), this.creating ? 250 : 1000);
  }

  async refreshPolls(keys) {
    if (this.refreshingPolls) return;
    this.refreshingPolls = true;
    try {
      for (const pollKey of keys) {
        if (this.pollCallback) {
          const poll = await refreshPoll(
            this.connection,
            new PublicKey(pollKey),
          );

          const pollIndex = this.polls.findIndex(([k]) => compare(k, pollKey));
          if (pollIndex >= 0) {
            this.polls.splice(pollIndex, 1, [pollKey, poll]);
          } else {
            this.polls.push([pollKey, poll]);
          }
          this.pollCallback(this.polls);
        }
      }
    } finally {
      this.refreshingPolls = false;
    }
  }

  updateConfig(connection, config) {
    this.connection = connection;
    const {programId, collection} = config;
    if (!this.programId || !programId.equals(this.programId)) {
      this.programId = programId;
      this.collection = collection;
      this.polls = [];
      return {
        predictionPoll: {
          polls: this.polls,
          programId,
          collection,
        },
      };
    }
  }

  async vote(payerAccount, pollKey, wager, tally) {
    try {
      const transactionSignature = await vote(
        this.connection,
        this.programId,
        payerAccount,
        new PublicKey(pollKey),
        wager,
        new PublicKey(tally),
      );

      return {
        snackMessage: 'Vote submitted',
        transactionSignature,
      };
    } catch (err) {
      console.error(`Failed to vote on poll: ${err}`);
      return {
        snackMessage: 'An error occured when voting',
      };
    }
  }

  async claim(payerAccount, poll, pollKey) {
    try {
      const transactionSignature = await claim(
        this.connection,
        this.programId,
        payerAccount,
        new PublicKey(pollKey),
        poll,
      );

      return {
        snackMessage: 'Claim submitted',
        transactionSignature,
      };
    } catch (err) {
      console.error(`Failed to submit claim: ${err}`);
      return {
        snackMessage: 'An error occured when submitting claim',
      };
    }
  }

  async createPoll(
    payerAccount,
    creatorAccount,
    header,
    optionA,
    optionB,
    timeout,
  ) {
    this.creating = true;
    try {
      if (!creatorAccount) {
        return {
          snackMessage: 'Only logged in users can create a poll',
        };
      }

      console.log({header, optionA, optionB, timeout});
      const transactionSignature = await createPoll(
        this.connection,
        this.programId,
        this.collection,
        payerAccount,
        creatorAccount,
        header,
        optionA,
        optionB,
        timeout,
      );

      return {
        snackMessage: 'Poll created',
        transactionSignature,
      };
    } catch (err) {
      console.error(`Failed to create poll: ${err}`);
      return {
        snackMessage: 'An error occured when creating the poll',
      };
    } finally {
      this.creating = false;
    }
  }
}
