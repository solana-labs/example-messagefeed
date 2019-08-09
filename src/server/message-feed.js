// @flow
import fs from 'mz/fs';
import path from 'path';
import {Account, BpfLoader, Connection, PublicKey} from '@solana/web3.js';
import {newSystemAccountWithAirdrop} from '../util/new-system-account-with-airdrop';
import {url, walletUrl} from '../../urls';
import * as Program from '../programs/message-feed';

export type MessageFeedMeta = {
  programId: PublicKey,
  firstMessage: Account,
};

/**
 * Manages the active instance of a Message Feed program
 */
export default class MessageFeedController {
  connection = new Connection(url);
  meta: ?MessageFeedMeta;
  loading: boolean;

  async getMeta(): Promise<?MessageFeedMeta> {
    if (this.loading) return;
    if (this.meta) {
      const {firstMessage} = this.meta;
      try {
        await this.connection.getAccountInfo(firstMessage.publicKey);
        return this.meta;
      } catch (err) {
        console.error(
          `getAccountInfo of ${firstMessage.publicKey.toString()} failed: ${err}`,
        );
        this.meta = undefined;
      }
    }

    this.reload();
  }

  async reload() {
    this.loading = true;
    try {
      this.meta = await this.createMessageFeed();
      this.loading = false;
    } catch(err) {
      console.error(`createMessageFeed failed: ${err}`);
    } finally {
      this.loading = false;
    }
  }

  /**
  * Creates a new Message Feed.
  */
  async createMessageFeed(): Promise<MessageFeedMeta> {
    const programId = await this.loadProgram();
    console.log('Message feed program:', programId.toString());
    console.log('Posting first message...');

    const fee = 100; // TODO: Use the FeeCalculator to determine the current cluster transaction fee
    const payerAccount = await newSystemAccountWithAirdrop(
      this.connection,
      1000 + fee,
    );
    const firstMessage = new Account();
    await Program.postMessageWithProgramId(
      this.connection,
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

  /**
  * Load a new instance of the Message Feed program
  */
  async loadProgram(): Promise<PublicKey> {
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
    const loaderAccount = await newSystemAccountWithAirdrop(this.connection, 100000);
    return BpfLoader.load(this.connection, loaderAccount, elfData);
  }
}
