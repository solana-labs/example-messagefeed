/* @flow */
import {Connection} from '@solana/web3.js';

import {getFirstMessage, refreshMessageFeed, postMessage} from './message-feed';
import type {Messages} from './message-feed';

async function main() {
  const text = process.argv.splice(2).join(' ');

  const {firstMessage, url} = await getFirstMessage(
    'http://localhost:8081/config.json',
  );

  console.log('Cluster RPC URL:', url);
  const connection = new Connection(url);
  const messages: Messages = [];
  await refreshMessageFeed(connection, messages, firstMessage);

  if (text.length > 0) {
    console.log('Posting message:', text);
    await postMessage(
      connection,
      text,
      messages[messages.length - 1].publicKey,
    );
    await refreshMessageFeed(connection, messages);
  }

  console.log();
  console.log('Message Feed');
  console.log('------------');
  messages.reverse().forEach((message, index) => {
    console.log(`Message #${index}: ${message.text}`);
  });
}

main()
  .catch(err => {
    console.error(err);
  })
  .then(() => process.exit());
