import {Account, Connection, PublicKey} from '@solana/web3.js';
import localforage from 'localforage';

import {
  getConfig,
  postMessage,
  refreshMessageFeed,
  userBanned,
  userLogin,
} from '../message-feed';

export default class Api {
  constructor() {
    let baseUrl = window.location.origin;
    let hostname = window.location.hostname;
    switch (hostname) {
      case 'localhost':
      case '127.0.0.1':
      case '0.0.0.0':
        baseUrl = 'http://' + hostname + ':8081';
    }

    this.messages = [];
    this.postCount = 0;
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
    this.messageCallback = onMessages;
    if (this.messages.length > 0) {
      this.messageCallback(this.messages);
    }
    this.pollMessages(onMessages);
  }

  unsubscribe() {
    this.balanceCallback = null;
    this.configCallback = null;
    this.messageCallback = null;
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
      const {
        firstMessage,
        loginMethod,
        url,
        walletUrl,
        programId,
      } = await getConfig(this.configUrl);

      this.connection = new Connection(url);
      this.connectionUrl = url;
      this.walletUrl = walletUrl;

      const explorerUrl = this.explorerUrl(this.connectionUrl);
      const response = {explorerUrl, loginMethod, walletUrl};

      if (!this.programId || !programId.equals(this.programId)) {
        this.programId = programId;
        this.firstMessage = firstMessage;
        this.messages = [];
        this.userAccount = await this.loadUserAccount(programId);
        Object.assign(response, {
          busyLoading: true,
          messages: this.messages,
          programId,
          userAccount: this.userAccount,
        });
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

  // Refresh messages.
  // TODO: Rewrite this function to use the solana-web3.js websocket pubsub
  //       instead of polling
  async pollMessages(callback) {
    console.log('pollMessages');

    const onUpdate = () => {
      if (this.messageCallback) {
        this.messageCallback(this.messages);
      }
    };

    try {
      for (;;) {
        if (callback !== this.messageCallback) return;
        if (!this.connection) break;
        const {postCount} = this;
        await refreshMessageFeed(
          this.connection,
          this.messages,
          () => onUpdate(),
          this.messages.length === 0 ? this.firstMessage : null,
        );
        if (postCount === this.postCount) {
          break;
        }

        console.log('Post count increased, refreshing');
      }
    } catch (err) {
      console.error(`pollMessages error: ${err}`);
    }

    setTimeout(() => this.pollMessages(callback), this.posting ? 250 : 1000);
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

  async postMessage(userAccount, newMessage, lastMessageKey, userToBan = null) {
    this.posting = true;
    try {
      const payerAccount = await this.getPayerAccount();
      if (await userBanned(this.connection, userAccount.publicKey)) {
        return {
          snackMessage: 'You are banned',
        };
      }

      const transactionSignature = await postMessage(
        this.connection,
        payerAccount,
        userAccount,
        newMessage,
        lastMessageKey,
        userToBan,
      );
      this.postCount++;

      return {
        snackMessage: 'Message posted',
        transactionSignature,
      };
    } catch (err) {
      console.error(`Failed to post message: ${err}`);
      return {
        snackMessage: 'An error occured when posting the message',
      };
    } finally {
      this.posting = false;
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
        userAccount = await userLogin(
          this.connection,
          this.programId,
          this.loginUrl,
          credentials,
        );
        break;
      }
      default:
        throw new Error(`Unsupported login method: ${loginMethod}`);
    }

    try {
      console.log('Saved user account:', userAccount.publicKey.toString());
      await localforage.setItem('programId', this.programId.toString());
      await localforage.setItem('userAccount', userAccount.secretKey);
    } catch (err) {
      console.error(`Unable to store user account in localforage: ${err}`);
    }

    return userAccount;
  }

  async isUserBanned(userKey) {
    return await userBanned(this.connection, userKey);
  }

  async loadUserAccount(programId) {
    try {
      const savedProgramId = await localforage.getItem('programId');
      const savedUserAccount = await localforage.getItem('userAccount');
      if (
        savedUserAccount &&
        savedProgramId &&
        programId.equals(new PublicKey(savedProgramId))
      ) {
        const userAccount = new Account(savedUserAccount);
        console.log('Restored user account:', userAccount.publicKey.toString());
        return userAccount;
      }
    } catch (err) {
      console.error(`Unable to load user account from localforage: ${err}`);
    }
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
