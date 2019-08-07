/* @flow */
import {Account, Connection} from '@solana/web3.js';

import {
  getConfig,
  refreshMessageFeed,
  postMessage,
  userLogin,
} from './message-feed';
import {newSystemAccountWithAirdrop} from './util/new-system-account-with-airdrop';
import type {Message} from './message-feed';

async function main() {
  const text = process.argv.splice(2).join(' ');

  const baseUrl = 'http://localhost:8081';
  const {firstMessage, loginMethod, programId, url} = await getConfig(
    baseUrl + '/config.json',
  );

  console.log('Cluster RPC URL:', url);
  const connection = new Connection(url);
  const messages: Array<Message> = [];
  await refreshMessageFeed(connection, messages, null, firstMessage);

  if (text.length > 0) {
    if (loginMethod !== 'local') {
      throw new Error(`Unsupported login method: ${loginMethod}`);
    }
    const credentials = {id: new Account().publicKey.toString()};
    const userAccount = await userLogin(
      connection,
      programId,
      baseUrl + '/login',
      credentials,
    );
    const fee = 100; // TODO: Use the FeeCalculator to determine the current cluster transaction fee
    const payerAccount = await newSystemAccountWithAirdrop(
      connection,
      1000 + fee,
    );
    console.log('Posting message:', text);
    await postMessage(
      connection,
      userAccount,
      payerAccount,
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
