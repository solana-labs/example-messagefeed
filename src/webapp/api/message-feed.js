import localforage from 'localforage';
import {Account, PublicKey} from '@solana/web3.js';

import {
  postMessage,
  refreshMessageFeed,
  userBanned,
} from '../../programs/message-feed';

export default class MessageFeedApi {
  constructor() {
    this.messages = [];
    this.postCount = 0;
  }

  subscribe(onMessages) {
    this.messageCallback = onMessages;
    if (this.messages.length > 0) {
      this.messageCallback(this.messages);
    }
    this.pollMessages(onMessages);
  }

  unsubscribe() {
    this.messageCallback = null;
  }

  async updateConfig(connection, config) {
    this.connection = connection;
    const {programId, firstMessageAccount} = config;
    if (!this.programId || !programId.equals(this.programId)) {
      this.programId = programId;
      this.firstMessageAccount = firstMessageAccount;
      this.messages = [];
      this.userAccount = await this.loadUserAccount(programId);
      return {
        ...config,
        loadingMessages: true,
        messages: this.messages,
        userAccount: this.userAccount,
      };
    }
  }

  async saveUser(userAccount) {
    this.userAccount = userAccount;
    try {
      console.log('Saved user account:', userAccount.publicKey.toString());
      await localforage.setItem('programId', this.programId.toString());
      await localforage.setItem('userAccount', userAccount.secretKey);
    } catch (err) {
      console.error(`Unable to store user account in localforage: ${err}`);
    }
  }

  async isUserBanned(userKey) {
    return await userBanned(this.connection, userKey);
  }

  getUserAccount() {
    return this.userAccount;
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

  // Refresh messages.
  // TODO: Rewrite this function to use the solana-web3.js websocket pubsub
  //       instead of polling
  async pollMessages(callback) {
    const onUpdate = () => {
      console.log('updateMessage');
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
          this.messages.length === 0 ? this.firstMessageAccount : null,
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

  async postMessage(payerAccount, newMessage, userToBan = null) {
    this.posting = true;
    try {
      if (await userBanned(this.connection, this.userAccount.publicKey)) {
        return {
          snackMessage: 'You are banned',
        };
      }

      const lastMessageKey = this.messages[this.messages.length - 1].publicKey;
      const transactionSignature = await postMessage(
        this.connection,
        payerAccount,
        this.userAccount,
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
}
