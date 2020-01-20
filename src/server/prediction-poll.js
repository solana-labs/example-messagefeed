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
import {Command} from '../../wasm';

export type PollMeta = {
  programId: PublicKey,
  collection: Account,
};

/**
 * Manages the active instance of a Prediction Poll program
 */
export default class PollController {
  meta: ?PollMeta;
  loading: boolean;
  connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async getMeta(): Promise<?PollMeta> {
    if (this.loading) return;

    if (this.meta) {
      const {collection} = this.meta;
      try {
        await this.connection.getAccountInfo(collection.publicKey);
        return this.meta;
      } catch (err) {
        console.error(
          `getAccountInfo of programId ${collection.publicKey.toString()} failed: ${err}`,
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
    const dataSize = 1500; // 50+ polls
    const {feeCalculator} = await this.connection.getRecentBlockhash();
    const fee = feeCalculator.lamportsPerSignature * 2; // 1 payer + 1 signer key
    const minimumBalance = await this.connection.getMinimumBalanceForRentExemption(
      dataSize,
    );
    const programFunds = 2000 * 1000; // 1000 Polls
    const payerAccount = await newSystemAccountWithAirdrop(
      this.connection,
      minimumBalance + programFunds + fee,
    );

    const collectionAccount = new Account();
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.createAccount(
        payerAccount.publicKey,
        collectionAccount.publicKey,
        minimumBalance,
        dataSize,
        programId,
      ),
    );

    transaction.add({
      keys: [
        {
          pubkey: collectionAccount.publicKey,
          isSigner: true,
          isWritable: true,
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
    const NUM_RETRIES = 500; /* allow some number of retries */
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

    const {feeCalculator} = await this.connection.getRecentBlockhash();
    const fees =
      feeCalculator.lamportsPerSignature *
        (BpfLoader.getMinNumSignatures(elfData.length) + NUM_RETRIES) +
      (await this.connection.getMinimumBalanceForRentExemption(elfData.length));

    console.log('Loading Poll program...');
    const loaderAccount = await newSystemAccountWithAirdrop(
      this.connection,
      fees,
    );
    return BpfLoader.load(this.connection, loaderAccount, elfData);
  }
}
