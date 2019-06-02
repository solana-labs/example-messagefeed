import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'mz/fs';
import {Account, BpfLoader, Connection, PublicKey} from '@solana/web3.js';

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

const loginMethod = process.env.LOGIN_METHOD || 'none';
switch (loginMethod) {
  case 'none':
  case 'local':
  case 'google':
    break;
  default:
    throw new Error(`Unknown LOGIN_METHOD: ${loginMethod}`);
}
console.log(`Login method: ${loginMethod}`);

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

  const firstMessageAccount = new Account();
  await postMessageWithProgramId(
    connection,
    programId,
    firstMessageAccount,
    'First post! 💫',
  );
  const firstMessage = firstMessageAccount.publicKey;
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
        loginMethod,
        url,
        firstMessage: messageFeedMeta
          ? messageFeedMeta.firstMessage.toString()
          : null,
        programId: messageFeedMeta
          ? messageFeedMeta.programId.toString()
          : null,
      }),
    )
    .end();
});

app.use(express.static(path.join(__dirname, '../dist')));
app.listen(port);
console.log('Cluster RPC URL:', url);
console.log('Listening on port', port);

// Load the program immediately so the first client doesn't need to wait as long
checkMessageFeed().catch(err => console.log(err));
