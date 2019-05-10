/* @flow */
import {Connection, PublicKey} from '@solana/web3.js';
import fetch from 'node-fetch';

import {sleep} from './util/sleep';
import {url} from '../url';
import {refreshMessageFeed, postMessage} from './message-feed';
import type {Messages} from './message-feed';

async function getFirstMessage(configUrl: string): Promise<PublicKey> {
  for (;;) {
    try {
      console.log(`Fetching ${configUrl}`);
      const response = await fetch(configUrl);
      const config = await response.json();

      if (!config.loading) {
        return new PublicKey(config.firstMessage);
      }
      console.log(`Waiting for message feed program to finish loading...`);
    } catch (err) {
      console.error(`${err}`);
    }
    await sleep(2000);
  }
}

async function main() {
  const text = process.argv.splice(2).join(' ');

  const firstMessage = await getFirstMessage(
    'http://localhost:8080/config.json',
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
