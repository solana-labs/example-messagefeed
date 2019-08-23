// @noflow

import {testnetChannelEndpoint} from '@solana/web3.js';

export let url = process.env.LIVE
  ? testnetChannelEndpoint(process.env.CHANNEL || 'beta', false)
  : 'http://localhost:8899';

export let urlTls = process.env.LIVE
  ? testnetChannelEndpoint(process.env.CHANNEL || 'beta', true)
  : 'http://localhost:8899';

export let walletUrl =
  process.env.WALLET_URL || 'https://solana-example-webwallet.herokuapp.com/';
