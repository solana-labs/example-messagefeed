/* @flow */
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
import type {TransactionSignature} from '@solana/web3.js';

import {publicKeyToName} from '../util/publickey-to-name';

export type Message = {
  publicKey: PublicKey,
  from: PublicKey,
  name: string,
  text: string,
};

type MessageData = {
  nextMessage: PublicKey,
  from: PublicKey,
  programId: PublicKey,
  text: string,
};

const publicKeyLayout = (property: string = 'publicKey'): Object => {
  return BufferLayout.blob(32, property);
};

function createUserAccount(
  connection: Connection,
  programId: PublicKey,
  payerAccount: Account,
  messageAccount: Account,
  transaction: Transaction,
): Account {
  const userAccount = new Account();

  // Allocate the user account
  transaction.add(
    SystemProgram.createAccount(
      payerAccount.publicKey,
      userAccount.publicKey,
      1,
      1 + 32, // 32 = size of a public key
      programId,
    ),
  );

  // Initialize the user account
  const keys = [
    {pubkey: userAccount.publicKey, isSigner: true, isDebitable: false},
    {pubkey: messageAccount.publicKey, isSigner: true, isDebitable: false},
  ];
  transaction.add(
    BpfLoader.invokeMainInstruction({
      keys,
      programId,
    }),
  );

  return userAccount;
}

export async function createUser(
  connection: Connection,
  programId: PublicKey,
  payerAccount: Account,
  messageAccount: Account,
): Promise<Account> {
  const transaction = new Transaction();
  const userAccount = createUserAccount(
    connection,
    programId,
    payerAccount,
    messageAccount,
    transaction,
  );
  await sendAndConfirmTransaction(
    connection,
    transaction,
    payerAccount,
    userAccount,
    messageAccount,
  );

  return userAccount;
}

/**
 * Checks if a user has been banned
 */
export async function userBanned(
  connection: Connection,
  user: PublicKey,
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(user);

  const userAccountDataLayout = BufferLayout.struct([
    BufferLayout.u8('banned'),
    publicKeyLayout('creator'),
  ]);
  const userAccountData = userAccountDataLayout.decode(accountInfo.data);

  return userAccountData.banned !== 0;
}

/**
 * Read the contents of a message
 */
async function readMessage(
  connection: Connection,
  message: PublicKey,
): Promise<MessageData> {
  const accountInfo = await connection.getAccountInfo(message);

  const messageAccountDataLayout = BufferLayout.struct([
    publicKeyLayout('nextMessage'),
    publicKeyLayout('from'),
    publicKeyLayout('creator'),
    BufferLayout.cstr('text'),
  ]);
  const messageAccountData = messageAccountDataLayout.decode(accountInfo.data);

  return {
    nextMessage: new PublicKey(messageAccountData.nextMessage),
    from: new PublicKey(messageAccountData.from),
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
  messages: Array<Message>,
  onNewMessage: Function | null,
  message: PublicKey | null = null,
): Promise<void> {
  var currentMessage = message;
  const emptyMessage = new PublicKey(0);
  for (;;) {
    if (currentMessage === null) {
      const lastMessage = messages[messages.length - 1].publicKey;
      const lastMessageData = await readMessage(connection, lastMessage);
      currentMessage = lastMessageData.nextMessage;
    }

    if (currentMessage.equals(emptyMessage)) {
      return;
    }

    console.log(`Loading message ${currentMessage.toString()}`);
    const messageData = await readMessage(connection, currentMessage);
    messages.push({
      publicKey: currentMessage,
      from: messageData.from,
      name: publicKeyToName(messageData.from),
      text: messageData.text,
    });
    onNewMessage && onNewMessage();
    currentMessage = messageData.nextMessage;
  }
}

/**
 * Posts a new message
 */
export async function postMessage(
  connection: Connection,
  payerAccount: Account,
  userAccount: Account,
  text: string,
  previousMessage: PublicKey,
  userToBan: PublicKey | null = null,
): Promise<TransactionSignature> {
  const messageData = await readMessage(connection, previousMessage);
  const messageAccount = new Account();
  return postMessageWithProgramId(
    connection,
    messageData.programId,
    payerAccount,
    userAccount,
    messageAccount,
    text,
    previousMessage,
    userToBan,
  );
}

export async function postMessageWithProgramId(
  connection: Connection,
  programId: PublicKey,
  payerAccount: Account,
  userAccountArg: Account | null,
  messageAccount: Account,
  text: string,
  previousMessagePublicKey: PublicKey | null = null,
  userToBan: PublicKey | null = null,
): Promise<TransactionSignature> {
  const transaction = new Transaction();
  const textBuffer = Buffer.from(text);

  // Allocate the message account
  transaction.add(
    SystemProgram.createAccount(
      payerAccount.publicKey,
      messageAccount.publicKey,
      1,
      32 + 32 + 32 + textBuffer.length, // 32 = size of a public key
      programId,
    ),
  );

  let userAccount = userAccountArg;
  if (userAccount === null) {
    userAccount = createUserAccount(
      connection,
      programId,
      payerAccount,
      messageAccount,
      transaction,
    );
  }

  // The second instruction in the transaction posts the message, optionally
  // links it to the previous message and optionally bans another user
  const keys = [
    {pubkey: userAccount.publicKey, isSigner: true, isDebitable: false},
    {pubkey: messageAccount.publicKey, isSigner: true, isDebitable: false},
  ];
  if (previousMessagePublicKey) {
    keys.push({
      pubkey: previousMessagePublicKey,
      isSigner: false,
      isDebitable: true,
    });

    if (userToBan) {
      keys.push({pubkey: userToBan, isSigner: false, isDebitable: true});
    }
  }
  transaction.add(
    BpfLoader.invokeMainInstruction({
      keys,
      programId,
      data: textBuffer,
    }),
  );
  return await sendAndConfirmTransaction(
    connection,
    transaction,
    payerAccount,
    userAccount,
    messageAccount,
  );
}
