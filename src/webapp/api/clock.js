import {refreshClock} from '../../programs/prediction-poll';

export default class ClockApi {
  constructor() {
    this.clock = 0;
  }

  updateConfig(connection) {
    this.connection = connection;
  }

  subscribe(onClock) {
    this.clockCallback = onClock;
    if (this.clock > 0) {
      this.clockCallback(this.clock);
    }
    this.pollClock(onClock);
  }

  unsubscribe() {
    this.clockCallback = null;
  }

  async pollClock(callback) {
    if (callback !== this.clockCallback) return;
    if (this.connection) {
      try {
        const clock = await refreshClock(this.connection);
        this.clock = parseInt(clock.slot.toString());
        if (this.clockCallback) {
          this.clockCallback(this.clock);
        }
      } catch (err) {
        console.error(`pollClock error: ${err}`);
      }
    }

    setTimeout(() => this.pollClock(callback), 250);
  }
}
