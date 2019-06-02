/* @flow */
import {Connection} from '@solana/web3.js';

import {getFirstMessage, refreshMessageFeed, postMessage} from './message-feed';
import type {Message} from './message-feed';

async function main() {
  const text = process.argv.splice(2).join(' ');

  const {firstMessage, loginMethod, url} = await getFirstMessage(
    'http://localhost:8081/config.json',
  );

  console.log('Cluster RPC URL:', url);
  const connection = new Connection(url);
  const messages: Array<Message> = [];
  await refreshMessageFeed(connection, messages, null, firstMessage);

  if (text.length > 0) {
    if (loginMethod !== 'none') {
      throw new Error(`Unsupported login method: ${loginMethod}`);
    }
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
    console.log(`Message #${index} from "${message.name}": ${message.text}`);
  });
}

main()
  .catch(err => {
    console.error(err);
  })
  .then(() => process.exit());
