import {
  refreshCollection,
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
    if (callback !== this.pollCallback || !this.connection) return;
    console.log('pollCollection');

    try {
      await refreshCollection(this.collection, this.collection);
      console.log('Refreshed collection');
    } catch (err) {
      console.error(`pollCollection error: ${err}`);
    }

    setTimeout(() => this.pollCollection(callback), 1000);
  }

  updateConfig(connection, config) {
    this.connection = connection;
    const {programId, collection} = config;
    if (!this.programId || !programId.equals(this.programId)) {
      this.programId = programId;
      this.collection = collection;

      console.log({collection});
      // this.polls = []; fill with polls
      return {
        predictionPoll: {
          polls: this.polls,
          programId,
          collection,
        }
      };
    }
  }
}
