// @flow
import fs from 'mz/fs';
import path from 'path';
import {Account, BpfLoader, Connection, PublicKey} from '@solana/web3.js';
import {newSystemAccountWithAirdrop} from '../util/new-system-account-with-airdrop';
import {url, walletUrl} from '../../urls';
import {createUser, postMessageWithProgramId} from '../message-feed';

export type MessageFeedMeta = {
  programId: PublicKey,
  firstMessage: Account,
};

/**
 * Manages the active instance of a Message Feed program
 */
export class MessageFeedController {
  meta: ?MessageFeedMeta;
  loading: boolean;

  async checkMessageFeed(): Promise<?MessageFeedMeta> {
    if (this.loading) return;
    const connection = new Connection(url);

    if (this.meta) {
      const {firstMessage} = this.meta;
      try {
        await connection.getAccountInfo(firstMessage.publicKey);
        return this.meta;
      } catch (err) {
        console.error(
          `getAccountInfo of ${firstMessage.publicKey.toString()} failed: ${err}`,
        );
        this.meta = undefined;
      }
    }

    this.updateMessageFeed(connection);
  }

  async updateMessageFeed(connection: Connection) {
    this.loading = true;
    try {
      this.meta = await this.createMessageFeed(connection);
      this.loading = false;
    } catch(err) {
      console.error(`createMessageFeed failed: ${err}`);
    } finally {
      this.loading = false;
    }
  }

  /**
  * Load a new instance of the Message Feed program
  */
  async loadMessageFeedProgram(
    connection: Connection,
  ): Promise<PublicKey> {
    const elfFile = path.join(
      __dirname,
      '..',
      '..',
      'dist',
      'programs',
      'messagefeed.so',
    );
    console.log(`Reading ${elfFile}...`);
    const elfData = await fs.readFile(elfFile);

    console.log('Loading program...');
    const loaderAccount = await newSystemAccountWithAirdrop(connection, 100000);
    return BpfLoader.load(connection, loaderAccount, elfData);
  }

  /**
  * Creates a new Message Feed.
  */
  async createMessageFeed(
    connection: Connection,
  ): Promise<MessageFeedMeta> {
    const programId = await this.loadMessageFeedProgram(connection);
    console.log('Message feed program:', programId.toString());
    console.log('Posting first message...');

    const fee = 100; // TODO: Use the FeeCalculator to determine the current cluster transaction fee
    const payerAccount = await newSystemAccountWithAirdrop(
      connection,
      1000 + fee,
    );
    const firstMessage = new Account();
    await postMessageWithProgramId(
      connection,
      programId,
      payerAccount,
      null,
      firstMessage,
      'First post! 💫',
    );
    console.log('First message public key:', firstMessage.publicKey.toString());
    return {
      programId,
      firstMessage,
    };
  }
}
