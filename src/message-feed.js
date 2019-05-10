/* @flow */
import path from 'path';
import fs from 'mz/fs';
import {
  Account,
  BpfLoader,
  Connection,
  SystemProgram,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as BufferLayout from 'buffer-layout';

import {newSystemAccountWithAirdrop} from './util/new-system-account-with-airdrop';

export type Messages = {
  publicKey: PublicKey,
  text: string,
};

export type MessageFeedMeta = {
  programId: PublicKey,
  firstMessage: PublicKey,
};

type MessageData = {
  nextMessage: PublicKey,
  programId: PublicKey,
  text: string,
};

/**
 * Load a new instance of the Message Feed program
 */
async function loadMessageFeedProgram(
  connection: Connection,
): Promise<PublicKey> {
  const elfFile = path.join(
    __dirname,
    '..',
    'dist',
    'program',
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
export async function createMessageFeed(
  connection: Connection,
): Promise<MessageFeedMeta> {
  const programId = await loadMessageFeedProgram(connection);
  console.log('Message feed program:', programId.toString());

  console.log('Posting first message...');
  const firstMessage = await postMessageWithProgramId(
    connection,
    programId,
    'First post!',
  );
  console.log('First message public key:', firstMessage.toString());
  return {
    programId,
    firstMessage,
  };
}

/**
 * Read the contents of a message
 */
async function readMessage(
  connection: Connection,
  message: PublicKey,
): Promise<MessageData> {
  const accountInfo = await connection.getAccountInfo(message);

  const publicKeyLayout = (property: string = 'publicKey'): Object => {
    return BufferLayout.blob(32, property);
  };

  const messageAccountDataLayout = BufferLayout.struct([
    publicKeyLayout('nextMessage'),
    BufferLayout.cstr('text'),
  ]);
  const messageAccountData = messageAccountDataLayout.decode(accountInfo.data);
  return {
    nextMessage: new PublicKey(messageAccountData.nextMessage),
    programId: accountInfo.owner,
    text: messageAccountData.text,
  };
}

/**
 * Checks a message feed for new messages and loads them into the provided
 * messages array.
 */
export async function refreshMessageFeed(
  connection: Connection,
  messages: Array<Messages>,
  message: PublicKey | null = null,
): Promise<void> {
  const emptyMessage = new PublicKey(0);
  for (;;) {
    if (message === null) {
      const lastMessage = messages[messages.length - 1].publicKey;
      const lastMessageData = await readMessage(connection, lastMessage);
      message = lastMessageData.nextMessage;
    }

    if (message.equals(emptyMessage)) {
      return;
    }

    console.log(`Loading message ${message}`);
    const messageData = await readMessage(connection, message);
    messages.push({
      publicKey: message,
      text: messageData.text,
    });

    message = messageData.nextMessage;
  }
}

/**
 * Posts a new message
 */
export async function postMessage(
  connection: Connection,
  text: string,
  previousMessage: PublicKey,
): Promise<PublicKey> {
  const messageData = await readMessage(connection, previousMessage);
  return postMessageWithProgramId(
    connection,
    messageData.programId,
    text,
    previousMessage,
  );
}

async function postMessageWithProgramId(
  connection,
  programId: PublicKey,
  text: string,
  previousMessagePublicKey: PublicKey | null,
): Promise<PublicKey> {
  const fee = 10; // TODO: Use the FeeCalculator to determine the current cluster transaction fee
  const payerAccount = await newSystemAccountWithAirdrop(connection, 1 + fee);

  const messageAccount = new Account();
  const transaction = new Transaction();

  const textBuffer = Buffer.from(text);

  // The first instruction of the transaction allocates an account for the
  // message
  transaction.add(
    SystemProgram.createAccount(
      payerAccount.publicKey,
      messageAccount.publicKey,
      1,
      32 + textBuffer.length, // 32 = size of a public key
      programId,
    ),
  );

  // The second instruction in the transaction posts the message and optionally
  // links it to the previous message
  const keys = [{pubkey: messageAccount.publicKey, isSigner: true}];
  if (previousMessagePublicKey) {
    keys.push({pubkey: previousMessagePublicKey, isSigner: false});
  }
  transaction.add({
    keys,
    programId,
    data: textBuffer,
  });
  await sendAndConfirmTransaction(
    connection,
    transaction,
    payerAccount,
    messageAccount,
  );

  return messageAccount.publicKey;
}
