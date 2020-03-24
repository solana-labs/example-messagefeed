/* @flow */
import {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import type {TransactionSignature} from '@solana/web3.js';

import {Clock, Collection, Command, InitPoll, Poll, Tally} from '../../wasm';

/**
 * Refreshes a poll collection
 */
export async function refreshCollection(
  connection: Connection,
  collection: PublicKey,
): Collection {
  const accountInfo = await connection.getAccountInfo(collection);
  return Collection.fromData(accountInfo.data);
}

/**
 * Refreshes the clock
 */
export async function refreshClock(connection: Connection): Clock {
  const clockKey = getSysvarClockPublicKey();
  const accountInfo = await connection.getAccountInfo(clockKey);
  return Clock.fromData(accountInfo.data);
}

/**
 * Fetches poll info
 */
export async function refreshPoll(
  connection: Connection,
  pollKey: PublicKey,
): Promise<[Poll, number, [Tally, Tally]]> {
  const accountInfo = await connection.getAccountInfo(pollKey);
  const poll = Poll.fromData(accountInfo.data);
  const [tallyA, tallyB] = await Promise.all(
    [poll.optionA, poll.optionB].map(async option => {
      const tallyKey = new PublicKey(option.tallyKey);
      const tallyInfo = await connection.getAccountInfo(tallyKey);
      return Tally.fromData(tallyInfo.data);
    }),
  );
  return [poll, accountInfo.lamports, [tallyA, tallyB]];
}

/**
 * Creates a new poll with two options and a block timeout
 */
export async function createPoll(
  connection: Connection,
  programId: PublicKey,
  collectionKey: PublicKey,
  payerAccount: Account,
  creatorAccount: Account,
  header: string,
  optionA: string,
  optionB: string,
  timeout: number,
): Promise<[TransactionSignature, Account]> {
  const transaction = new Transaction();

  const pollAccount = new Account();
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payerAccount.publicKey,
      newAccountPubkey: pollAccount.publicKey,
      lamports: 2000,
      space: 1000, // 150 for keys and numbers + 850 for text
      programId,
    }),
  );

  const tallyAccounts = [new Account(), new Account()];
  for (const tallyAccount of tallyAccounts) {
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payerAccount.publicKey,
        newAccountPubkey: tallyAccount.publicKey,
        lamports: 2000,
        space: 1000, // 30+ votes
        programId,
      }),
    );
  }

  transaction.add({
    keys: [
      {pubkey: creatorAccount.publicKey, isSigner: true, isWritable: false},
      {pubkey: pollAccount.publicKey, isSigner: true, isWritable: true},
      {pubkey: collectionKey, isSigner: false, isWritable: true},
      {pubkey: tallyAccounts[0].publicKey, isSigner: true, isWritable: true},
      {pubkey: tallyAccounts[1].publicKey, isSigner: true, isWritable: true},
      {
        pubkey: getSysvarClockPublicKey(),
        isSigner: false,
        isWritable: false,
      },
    ],
    programId,
    data: Command.initPoll(new InitPoll(header, optionA, optionB, timeout)),
  });

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    payerAccount,
    creatorAccount,
    pollAccount,
    tallyAccounts[0],
    tallyAccounts[1],
  );

  return [signature, pollAccount];
}

/**
 * Submit a vote to a poll
 */
export async function vote(
  connection: Connection,
  programId: PublicKey,
  payerAccount: Account,
  poll: PublicKey,
  wager: number,
  tally: PublicKey,
): Promise<TransactionSignature> {
  const transaction = new Transaction();

  const userAccount = new Account();
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payerAccount.publicKey,
      newAccountPubkey: userAccount.publicKey,
      lamports: wager,
      space: 2000,
      programId,
    }),
  );

  transaction.add({
    keys: [
      {pubkey: userAccount.publicKey, isSigner: true, isWritable: true},
      {pubkey: poll, isSigner: false, isWritable: true},
      {pubkey: tally, isSigner: false, isWritable: true},
      {pubkey: payerAccount.publicKey, isSigner: false, isWritable: false},
      {
        pubkey: getSysvarClockPublicKey(),
        isSigner: false,
        isWritable: false,
      },
    ],
    programId,
    data: Command.submitVote(),
  });

  return await sendAndConfirmTransaction(
    connection,
    transaction,
    payerAccount,
    userAccount,
  );
}

/**
 * Submit a claim to an expired poll
 */
export async function claim(
  connection: Connection,
  programId: PublicKey,
  payerAccount: Account,
  pollKey: PublicKey,
  poll: Poll,
): Promise<TransactionSignature> {
  const tallyKey =
    poll.optionA.quantity > poll.optionB.quantity
      ? new PublicKey(poll.optionA.tallyKey)
      : new PublicKey(poll.optionB.tallyKey);

  const clockKey = getSysvarClockPublicKey();
  const tallyAccount = await connection.getAccountInfo(tallyKey);
  const tally = Tally.fromData(tallyAccount.data);

  const transaction = new Transaction();
  const payoutKeys = tally.keys.map(k => {
    const pubkey = new PublicKey(k);
    return {pubkey, isSigner: false, isWritable: false};
  });

  transaction.add({
    keys: [
      {pubkey: pollKey, isSigner: false, isWritable: true},
      {pubkey: tallyKey, isSigner: false, isWritable: false},
      {pubkey: clockKey, isSigner: false, isWritable: false},
      ...payoutKeys,
    ],
    programId,
    data: Command.submitClaim(),
  });

  return await sendAndConfirmTransaction(connection, transaction, payerAccount);
}

/**
 * Public key that identifies the Clock Sysvar Account Public Key
 */
export function getSysvarClockPublicKey(): PublicKey {
  return new PublicKey('SysvarC1ock11111111111111111111111111111111');
}
