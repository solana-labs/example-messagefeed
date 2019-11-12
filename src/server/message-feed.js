// @flow
import fs from 'mz/fs';
import path from 'path';
import {Account, BpfLoader, Connection, PublicKey} from '@solana/web3.js';

import {newSystemAccountWithAirdrop} from '../util/new-system-account-with-airdrop';
import * as Program from '../programs/message-feed';

export type MessageFeedMeta = {
  programId: PublicKey,
  firstMessage: Account,
};

/**
 * Manages the active instance of a Message Feed program
 */
export default class MessageFeedController {
  meta: ?MessageFeedMeta;
  loading: boolean;

  constructor(connection: Connection) {
    this.connection = connection;
  }

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
    } catch (err) {
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

    const [, feeCalculator] = await this.connection.getRecentBlockhash();
    const postMessageFee = feeCalculator.lamportsPerSignature * 3; // 1 payer + 2 signer keys
    const minAccountBalances = 2; // 1 message + 1 user account
    const payerAccount = await newSystemAccountWithAirdrop(
      this.connection,
      postMessageFee + minAccountBalances,
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
    const NUM_RETRIES = 100; /* allow some number of retries */
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

    console.log('Loading Message feed program...');
    const [, feeCalculator] = await this.connection.getRecentBlockhash();
    const fees =
      feeCalculator.lamportsPerSignature *
      (BpfLoader.getMinNumSignatures(elfData.length) + NUM_RETRIES);
    const loaderAccount = await newSystemAccountWithAirdrop(
      this.connection,
      fees,
    );
    return BpfLoader.load(this.connection, loaderAccount, elfData);
  }
}
