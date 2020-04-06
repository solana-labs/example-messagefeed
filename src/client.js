// @flow
import {Account, PublicKey} from '@solana/web3.js';
import type {Commitment, Cluster} from '@solana/web3.js';
import fetch from 'node-fetch';

import {sleep} from './util/sleep';

export type Config = {
  messageFeed: MessageFeedConfig,
  predictionPoll: PredictionPollConfig,
  loginMethod: string,
  url: string,
  urlTls: string,
  cluster: ?Cluster,
  walletUrl: string,
  commitment: ?Commitment,
};

export type MessageFeedConfig = {
  programId: PublicKey,
  firstMessageKey: PublicKey,
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
            firstMessageKey: new PublicKey(config.messageFeed.firstMessageKey),
            programId: new PublicKey(config.messageFeed.programId),
          },
          predictionPoll: {
            collection: new PublicKey(config.predictionPoll.collection),
            programId: new PublicKey(config.predictionPoll.programId),
          },
          loginMethod: config.loginMethod,
          url: config.url,
          urlTls: config.urlTls,
          cluster: config.cluster,
          walletUrl: config.walletUrl,
          commitment: config.commitment,
        };
      }
      console.log(`Waiting for programs to finish loading...`);
    } catch (err) {
      console.error(`${err}`);
    }
    await sleep(1000);
  }
}

export async function userLogin(
  loginUrl: string,
  credentials: Object,
): Promise<Account> {
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(credentials),
  });
  const json = await response.json();
  return new Account(Uint8Array.from(Buffer.from(json.userAccount, 'hex')));
}
