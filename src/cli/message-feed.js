/* @flow */
import {Account, Connection} from '@solana/web3.js';

import {
  refreshMessageFeed,
  postMessage,
  messageAccountSize,
} from '../programs/message-feed';
import {getConfig, userLogin} from '../client';
import {newSystemAccountWithAirdrop} from '../util/new-system-account-with-airdrop';
import type {Message} from '../programs/message-feed';

async function main() {
  const text = process.argv.splice(2).join(' ');

  const baseUrl = 'http://localhost:8081';
  const {messageFeed, loginMethod, url, commitment} = await getConfig(
    baseUrl + '/config.json',
  );
  const {firstMessageKey} = messageFeed;

  console.log('Cluster RPC URL:', url);
  const connection = new Connection(url, commitment);
  const messages: Array<Message> = [];
  await refreshMessageFeed(connection, messages, null, firstMessageKey);

  if (text.length > 0) {
    if (loginMethod !== 'local') {
      throw new Error(`Unsupported login method: ${loginMethod}`);
    }
    const credentials = {id: new Account().publicKey.toString()};
    const userAccount = await userLogin(baseUrl + '/login', credentials);
    const {feeCalculator} = await connection.getRecentBlockhash();
    const postMessageFee = feeCalculator.lamportsPerSignature * 3; // 1 payer and 2 signer keys
    const minAccountBalance = await connection.getMinimumBalanceForRentExemption(
      messageAccountSize(text),
    );
    const payerAccount = await newSystemAccountWithAirdrop(
      connection,
      postMessageFee + minAccountBalance,
    );
    console.log('Posting message:', text);
    await postMessage(
      connection,
      payerAccount,
      userAccount,
      text,
      messages[messages.length - 1].publicKey,
    );
    await refreshMessageFeed(connection, messages);
  }

  console.log();
  console.log('Message Feed');
  console.log('------------');
  messages.reverse().forEach((message, index) => {
    console.log(`Message #${index} from "${message.name}": ${message.text}`);
  });
}

main()
  .catch(err => {
    console.error(err);
  })
  .then(() => process.exit());
