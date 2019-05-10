import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'mz/fs';
import {BpfLoader, Connection, PublicKey} from '@solana/web3.js';

import {url} from '../url';
import {newSystemAccountWithAirdrop} from './util/new-system-account-with-airdrop';
import {postMessageWithProgramId} from './message-feed';

const port = process.env.PORT || 8081;

type MessageFeedMeta = {
  programId: PublicKey,
  firstMessage: PublicKey,
};

let messageFeedMeta: MessageFeedMeta | null = null;
let loading = false;

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
async function createMessageFeed(
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
app.use(cors());
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

app.use(express.static(path.join(__dirname, '../dist')));
app.listen(port);
console.log('Cluster RPC URL:', url);
console.log('Listening on port', port);
