// @flow
import {Account, PublicKey} from '@solana/web3.js';
import fetch from 'node-fetch';

import {sleep} from './util/sleep';

export type Config = {
  messageFeed: MessageFeedConfig,
  predictionPoll: PredictionPollConfig,
  loginMethod: string,
  url: string,
  walletUrl: string,
}

export type MessageFeedConfig = {
  programId: PublicKey,
  firstMessage: PublicKey,
};

export type PredictionPollConfig = {
  programId: PublicKey,
  collection: PublicKey,
};

export async function getConfig(configUrl: string): Promise<Config> {
  for (;;) {
    try {
      const response = await fetch(configUrl);
      const config = await response.json();
      if (!config.loading) {
        return {
          messageFeed: {
            firstMessage: new PublicKey(config.messageFeed.firstMessage),
            programId: new PublicKey(config.messageFeed.programId),
          },
          predictionPoll: {
            collection: new PublicKey(config.predictionPoll.collection),
            programId: new PublicKey(config.predictionPoll.programId),
          },
          loginMethod: config.loginMethod,
          url: config.url,
          walletUrl: config.walletUrl,
        };
      }
      console.log(`Waiting for message feed program to finish loading...`);
    } catch (err) {
      console.error(`${err}`);
    }
    await sleep(1000);
  }
}

export async function userLogin(loginUrl: string, credentials: Object): Promise<Account> {
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(credentials),
  });
  const json = await response.json();
  return new Account(Uint8Array.from(Buffer.from(json.userAccount, 'hex')));
}
