import {Account, Connection} from '@solana/web3.js';
import localforage from 'localforage';

import {getConfig, userLogin} from '../../client';
import ClockApi from './clock';
import MessageFeedApi from './message-feed';
import PredictionPollApi from './prediction-poll';

export default class Api {
  constructor() {
    let baseUrl = window.location.origin;
    let hostname = window.location.hostname;
    switch (hostname) {
      case 'localhost':
      case '127.0.0.1':
      case '0.0.0.0':
        baseUrl = `http://${hostname}:${process.env.PORT || 8081}`;
    }

    this.clock = new ClockApi();
    this.messageFeed = new MessageFeedApi();
    this.predictionPoll = new PredictionPollApi();
    this.configUrl = baseUrl + '/config.json';
    this.loginUrl = baseUrl + '/login';
  }

  subscribeBalance(onBalance) {
    this.balanceCallback = onBalance;
    this.pollBalance(onBalance);
  }

  subscribeConfig(onConfig) {
    this.configCallback = onConfig;
    this.pollConfig(onConfig);
  }

  subscribeMessages(onMessages) {
    this.messageFeed.subscribe(onMessages);
  }

  subscribePolls(onPolls) {
    this.predictionPoll.subscribe(onPolls);
  }

  subscribeClock(onClock) {
    this.clock.subscribe(onClock);
  }

  unsubscribe() {
    this.balanceCallback = null;
    this.configCallback = null;
    this.clock.unsubscribe();
    this.messageFeed.unsubscribe();
    this.predictionPoll.unsubscribe();
  }

  explorerUrl() {
    let explorerUrl = 'http://localhost:3000';
    const matches = this.connectionUrl.match('https://(.*)testnet.solana.com');
    if (matches) {
      const testnet = matches[1];
      explorerUrl = `https://${testnet}explorer.solana.com/v1`;
    }
    return explorerUrl;
  }

  // Periodically polls for a new program id, which indicates either a cluster reset
  // or new message feed server deployment
  async pollConfig(callback) {
    if (callback !== this.configCallback) return;
    try {
      const {
        loginMethod,
        messageFeed,
        predictionPoll,
        urlTls,
        walletUrl,
      } = await getConfig(this.configUrl);

      this.connection = new Connection(urlTls);
      this.connectionUrl = urlTls;
      this.walletUrl = walletUrl;
      this.clock.updateConfig(this.connection);

      const explorerUrl = this.explorerUrl(this.connectionUrl);
      const response = {explorerUrl, loginMethod, walletUrl};

      try {
        Object.assign(
          response,
          await this.messageFeed.updateConfig(this.connection, messageFeed),
        );
      } catch (err) {
        console.error('failed to update message feed config', err);
      }

      Object.assign(
        response,
        this.predictionPoll.updateConfig(this.connection, predictionPoll),
      );

      if (this.configCallback) {
        this.configCallback(response);
      }
    } catch (err) {
      console.error('config poll error', err);
    }
    setTimeout(() => this.pollConfig(callback), 10 * 1000);
  }

  async pollBalance(callback) {
    if (callback !== this.balanceCallback) return;
    if (this.connection) {
      const payerAccount = await this.getPayerAccount();
      try {
        const payerBalance = await this.connection.getBalance(
          payerAccount.publicKey,
        );
        if (this.balanceCallback) {
          this.balanceCallback(payerBalance, payerAccount.publicKey);
        }
      } catch (err) {
        console.error('Failed to refresh balance', err);
      }
    }
    setTimeout(() => this.pollBalance(callback), 1000);
  }

  async requestFunds(callback) {
    this.walletCallback = callback;

    const payerAccount = await this.getPayerAccount();
    const windowName = 'wallet';
    const windowOptions =
      'toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=500, height=1200';
    if (!this.walletWindow) {
      window.addEventListener('message', e => this.onWalletMessage(e));
      this.walletWindow = window.open(
        this.walletUrl,
        windowName,
        windowOptions,
      );
    } else {
      if (this.walletWindow.closed) {
        this.walletWindow = window.open(
          this.walletUrl,
          windowName,
          windowOptions,
        );
      } else {
        this.walletWindow.focus();
        this.walletWindow.postMessage(
          {
            method: 'addFunds',
            params: {
              pubkey: payerAccount.publicKey.toString(),
              amount: 500,
              network: this.connectionUrl,
            },
          },
          this.walletUrl,
        );
      }
    }
  }

  async onWalletMessage(e) {
    if (e.origin === window.location.origin) return;

    const payerAccount = await this.getPayerAccount();
    if (e.data) {
      switch (e.data.method) {
        case 'ready': {
          this.walletWindow.postMessage(
            {
              method: 'addFunds',
              params: {
                pubkey: payerAccount.publicKey.toString(),
                amount: 500,
                network: this.connectionUrl,
              },
            },
            this.walletUrl,
          );
          break;
        }
        case 'addFundsResponse': {
          const params = e.data.params;
          const response = {snackMessage: 'Unexpected wallet response'};
          if (params.amount && params.signature) {
            Object.assign(response, {
              snackMessage: `Received ${params.amount} from wallet`,
              transactionSignature: params.signature,
            });
          } else if (params.err) {
            response.snackMessage = 'Funds request failed';
          }
          if (this.walletCallback) {
            this.walletCallback(response);
          }
          break;
        }
      }
    }
  }

  async postMessage(newMessage, userToBan) {
    const payerAccount = await this.getPayerAccount();
    return await this.messageFeed.postMessage(
      payerAccount,
      newMessage,
      userToBan,
    );
  }

  async createPoll(header, optionA, optionB, timeout) {
    const payerAccount = await this.getPayerAccount();
    const creatorAccount = this.messageFeed.getUserAccount();
    return await this.predictionPoll.createPoll(
      payerAccount,
      creatorAccount,
      header,
      optionA,
      optionB,
      timeout,
    );
  }

  async vote(pollKey, wager, tally) {
    const payerAccount = await this.getPayerAccount();
    return await this.predictionPoll.vote(payerAccount, pollKey, wager, tally);
  }

  async claim(poll, pollKey) {
    const payerAccount = await this.getPayerAccount();
    return await this.predictionPoll.claim(payerAccount, poll, pollKey);
  }

  async isUserBanned(userKey) {
    return await this.messageFeed.isUserBanned(userKey);
  }

  async login(loginMethod) {
    if (!this.connection) {
      throw new Error('Cannot login while disconnected');
    }

    let userAccount;
    switch (loginMethod) {
      case 'google':
        throw new Error(`TODO unimplemented login method: ${loginMethod}`);
      case 'local': {
        const credentials = {id: new Account().publicKey.toString()};
        userAccount = await userLogin(this.loginUrl, credentials);
        break;
      }
      default:
        throw new Error(`Unsupported login method: ${loginMethod}`);
    }

    await this.messageFeed.saveUser(userAccount);

    return userAccount;
  }

  async getPayerAccount() {
    if (!this.payerAccount) {
      this.payerAccount = await this.loadPayerAccount();
    }
    return this.payerAccount;
  }

  async loadPayerAccount() {
    let payerAccount = new Account();
    try {
      const savedPayerAccount = await localforage.getItem('payerAccount');
      if (savedPayerAccount !== null) {
        payerAccount = new Account(savedPayerAccount);
        console.log(
          'Restored payer account:',
          payerAccount.publicKey.toString(),
        );
      } else {
        payerAccount = new Account();
        await localforage.setItem('payerAccount', payerAccount.secretKey);
      }
    } catch (err) {
      console.error(`Unable to load payer account from localforage: ${err}`);
    }

    return payerAccount;
  }
}
