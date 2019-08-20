import {Account, Connection} from '@solana/web3.js';
import localforage from 'localforage';

import {getConfig, userLogin} from '../../client';
import MessageFeedApi from './message-feed';

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

    this.messageFeed = new MessageFeedApi();
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

  unsubscribe() {
    this.balanceCallback = null;
    this.configCallback = null;
    this.messageFeed.unsubscribe();
  }

  explorerUrl() {
    let explorerUrl = 'http://localhost:3000';
    const matches = this.connectionUrl.match(
      'https://api.(.*)testnet.solana.com',
    );
    if (matches) {
      const testnet = matches[1];
      explorerUrl = `http://${testnet}testnet.solana.com`;
    }
    return explorerUrl;
  }

  // Periodically polls for a new program id, which indicates either a cluster reset
  // or new message feed server deployment
  async pollConfig(callback) {
    if (callback !== this.configCallback) return;
    console.log('pollConfig');
    try {
      const {loginMethod, messageFeed, url, walletUrl} = await getConfig(
        this.configUrl,
      );

      this.connection = new Connection(url);
      this.connectionUrl = url;
      this.walletUrl = walletUrl;

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
    console.log('pollBalance');
    if (this.connection) {
      const payerAccount = await this.getPayerAccount();
      try {
        const payerBalance = await this.connection.getBalance(
          payerAccount.publicKey,
        );
        if (this.balanceCallback) {
          this.balanceCallback(payerBalance);
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
      'toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=500, height=600';
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
              amount: 150,
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
                amount: 150,
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
