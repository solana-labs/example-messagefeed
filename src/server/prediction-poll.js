// @flow
import fs from 'mz/fs';
import path from 'path';
import {
  Account,
  BpfLoader,
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

import {newSystemAccountWithAirdrop} from '../util/new-system-account-with-airdrop';
import {sleep} from '../util/sleep';
import {url} from '../../urls';
import {Command} from '../../wasm';

export type PollMeta = {
  programId: PublicKey,
  collection: Account,
};

/**
 * Manages the active instance of a Prediction Poll program
 */
export default class PollController {
  connection = new Connection(url);
  meta: ?PollMeta;
  loading: boolean;

  async getMeta(): Promise<?PollMeta> {
    if (this.loading) return;

    if (this.meta) {
      const {programId} = this.meta;
      try {
        await Promise.race([
          sleep(2000),
          this.connection.getAccountInfo(programId),
        ]);
        return this.meta;
      } catch (err) {
        console.error(
          `getAccountInfo of programId ${programId.toString()} failed: ${err}`,
        );
        this.meta = undefined;
      }
    }

    this.reload();
  }

  async reload() {
    this.loading = true;
    try {
      this.meta = await this.createProgram();
      this.loading = false;
    } catch (err) {
      console.error(`create poll program failed: ${err}`);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Creates a new Prediction Poll collection.
   */
  async createProgram(): Promise<PollMeta> {
    const programId = await this.loadProgram();
    console.log('Prediction Poll program:', programId.toString());
    console.log('Creating collection...');

    const collection = await this.createCollection(programId);
    console.log('Collection public key:', collection.publicKey.toString());
    return {programId, collection};
  }

  /**
   * Creates a new Prediction Poll collection.
   */
  async createCollection(programId: PublicKey): Promise<Account> {
    const fee = 100; // TODO: Use the FeeCalculator to determine the current cluster transaction fee
    const programFunds = 10000;
    const payerAccount = await newSystemAccountWithAirdrop(
      this.connection,
      programFunds + fee,
    );

    const collectionAccount = new Account();
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.createAccount(
        payerAccount.publicKey,
        collectionAccount.publicKey,
        programFunds,
        // TODO add more data
        32 + 32 + 32, // 32 = size of a public key
        programId,
      ),
    );

    transaction.add({
      keys: [
        {
          pubkey: collectionAccount.publicKey,
          isSigner: true,
          isDebitable: true,
        },
      ],
      programId,
      data: Command.initCollection(),
    });

    await sendAndConfirmTransaction(
      this.connection,
      transaction,
      payerAccount,
      collectionAccount,
    );

    return collectionAccount;
  }

  /**
   * Load a new instance of the Prediction Poll program
   */
  async loadProgram(): Promise<PublicKey> {
    const elfFile = path.join(
      __dirname,
      '..',
      '..',
      'dist',
      'programs',
      'prediction_poll.so',
    );
    console.log(`Reading ${elfFile}...`);
    const elfData = await fs.readFile(elfFile);

    console.log('Loading program...');
    const loaderAccount = await newSystemAccountWithAirdrop(
      this.connection,
      100000,
    );
    return BpfLoader.load(this.connection, loaderAccount, elfData);
  }
}
