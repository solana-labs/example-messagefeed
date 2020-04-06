import express from 'express';
import cors from 'cors';
import path from 'path';
import gte from 'semver/functions/gte';
import {Connection} from '@solana/web3.js';

import {cluster, url, urlTls, walletUrl} from '../../urls';
import {newSystemAccountWithAirdrop} from '../util/new-system-account-with-airdrop';
import MessageController from './message-feed';
import PollController from './prediction-poll';
import * as MessageFeedProgram from '../programs/message-feed';

const port = process.env.PORT || 8081;

(async function() {
  let commitment;
  let connection = new Connection(url);
  const version = await connection.getVersion();

  // commitment params are only supported >= 0.21.0
  const solanaCoreVersion = version['solana-core'].split(' ')[0];
  if (gte(solanaCoreVersion, '0.21.0')) {
    commitment = 'recent';
    // eslint-disable-next-line require-atomic-updates
    connection = new Connection(url, commitment);
  }

  const messageController = new MessageController(connection);
  const pollController = new PollController(connection);

  const loginMethod = process.env.LOGIN_METHOD || 'local';
  switch (loginMethod) {
    case 'local':
    case 'google':
      break;
    default:
      throw new Error(`Unknown LOGIN_METHOD: ${loginMethod}`);
  }
  console.log(`Login method: ${loginMethod}`);

  const app = express();
  app.use(cors());
  app.use(express.json()); // for parsing application/json
  app.get('/config.json', async (req, res) => {
    const messageMeta = await messageController.getMeta();
    const pollMeta = await pollController.getMeta();

    const response = {
      loading: !messageMeta || !pollMeta,
      loginMethod,
      url,
      urlTls,
      walletUrl,
      cluster,
    };

    if (commitment) {
      Object.assign(response, {commitment});
    }

    if (pollMeta) {
      Object.assign(response, {
        predictionPoll: {
          programId: pollMeta.programId.toString(),
          collection: pollMeta.collection.publicKey.toString(),
        },
      });
    }

    if (messageMeta) {
      Object.assign(response, {
        messageFeed: {
          programId: messageMeta.programId.toString(),
          firstMessageKey: messageMeta.firstMessageAccount.publicKey.toString(),
        },
      });
    }

    res.send(JSON.stringify(response)).end();
  });

  const users = {};
  app.post('/login', async (req, res) => {
    const meta = await messageController.getMeta();
    if (!meta) {
      res.status(500).send('Loading');
      return;
    }

    const credentials = req.body;
    console.log('login credentials:', credentials);
    let id;
    switch (loginMethod) {
      case 'google':
        throw new Error(
          `TODO unimplemented login method: ${this.state.loginMethod}`,
        );
      case 'local': {
        id = credentials.id;
        break;
      }
      default:
        throw new Error(`Unsupported login method: ${this.state.loginMethod}`);
    }

    if (id in users) {
      console.log(`Account already exists for user ${id}`);
    } else {
      console.log(`Creating new account for user ${id}`);
      const {feeCalculator} = await connection.getRecentBlockhash();
      const fee = feeCalculator.lamportsPerSignature * 3; // 1 payer + 2 signer keys
      const minAccountBalance = 1; // 1 user account

      try {
        const payerAccount = await newSystemAccountWithAirdrop(
          connection,
          100000000 + fee + minAccountBalance,
        );
        const userAccount = await MessageFeedProgram.createUser(
          connection,
          meta.programId,
          payerAccount,
          meta.firstMessageAccount,
        );

        if (id in users) {
          res.status(500).send('Duplicate account');
          return;
        }

        // eslint-disable-next-line require-atomic-updates
        users[id] = userAccount.secretKey;
      } catch (err) {
        console.error('Failed to create user', err);
        res.status(500).send('Failed to login, try again');
        return;
      }
    }
    res
      .send(
        JSON.stringify({userAccount: Buffer.from(users[id]).toString('hex')}),
      )
      .end();
  });

  app.use(express.static(path.join(__dirname, '../../dist/static')));
  app.listen(port);
  console.log('Cluster RPC URL:', url);
  console.log('Listening on port', port);

  // Load the program immediately so the first client doesn't need to wait as long
  messageController.reload().catch(err => console.log(err));
  pollController.reload().catch(err => console.log(err));
})();
