import express from 'express';
import path from 'path';
import {Connection} from '@solana/web3.js';

import {url} from '../url';
import {createMessageFeed} from './message-feed';
import type {MessageFeedMeta} from './message-feed';

const port = process.env.PORT || 8080;

let messageFeedMeta: MessageFeedMeta | null = null;
let loading = false;

async function checkMessageFeed() {
  const connection = new Connection(url);

  if (messageFeedMeta !== null) {
    const {firstMessage} = messageFeedMeta;
    try {
      await connection.getAccountInfo(firstMessage);
      return;
    } catch (err) {
      console.error(`getAccountInfo of ${firstMessage} failed: ${err}`);
      messageFeedMeta = null;
    }
  }

  if (loading) return;
  loading = true;

  createMessageFeed(connection)
    .then(feedMeta => {
      messageFeedMeta = feedMeta;
    })
    .catch(err => console.error(`createMessageFeed failed: ${err}`))
    .then(() => {
      loading = false;
    });
}

const app = express();
app.get('/config.json', async (req, res) => {
  await checkMessageFeed();
  res
    .send(
      JSON.stringify({
        loading,
        firstMessage: messageFeedMeta
          ? messageFeedMeta.firstMessage.toString()
          : null,
      }),
    )
    .end();
});

app.use(express.static(path.join(__dirname, '../../dist')));
app.listen(port);
console.log('Cluster RPC URL:', url);
console.log('Listening on port', port);
