import {PublicKey} from '@solana/web3.js';

import {
  refreshCollection,
  createPoll,
  refreshPoll,
  claim,
  vote,
} from '../../programs/prediction-poll';

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
          const pollKeys = collection.getPolls().map(key => new PublicKey(key));
          // remove old polls
          this.polls = this.polls.filter(([k]) => {
            return pollKeys.some(pollKey => k.equals(pollKey));
          });
          this.pollCallback(this.polls);
          this.refreshPolls(pollKeys);
        }
      } catch (err) {
        console.error(`pollCollection error: ${err}`);
      }
    }

    setTimeout(() => this.pollCollection(callback), this.creating ? 250 : 1000);
  }

  async refreshPolls(pollKeys) {
    if (this.refreshingPolls) return;
    this.refreshingPolls = true;
    for (const pollKey of pollKeys) {
      if (this.pollCallback) {
        try {
          const [poll, balance, tallies] = await refreshPoll(
            this.connection,
            pollKey,
          );
          const pollIndex = this.polls.findIndex(([k]) => k.equals(pollKey));
          const pollTuple = [pollKey, poll, balance, tallies];
          if (pollIndex >= 0) {
            this.polls.splice(pollIndex, 1, pollTuple);
          } else {
            this.polls.push(pollTuple);
          }
          this.pollCallback(this.polls);
        } catch (err) {
          console.error(`Failed to fetch poll ${pollKey.toString()}`, err);
        }
      }
    }
    this.refreshingPolls = false;
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

  async vote(payerAccount, pollKey, wager, tallyKey) {
    try {
      const transactionSignature = await vote(
        this.connection,
        this.programId,
        payerAccount,
        pollKey,
        wager,
        tallyKey,
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
        pollKey,
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
    if (!creatorAccount) {
      return {
        snackMessage: 'Only logged in users can create a poll',
      };
    }

    this.creating = true;
    try {
      const [transactionSignature] = await createPoll(
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
