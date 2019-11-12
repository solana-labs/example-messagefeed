/* @flow */
import {Account, Connection, PublicKey} from '@solana/web3.js';

import {
  refreshPoll,
  createPoll,
  vote,
  claim,
} from '../programs/prediction-poll';
import {getConfig, userLogin} from '../client';
import {newSystemAccountWithAirdrop} from '../util/new-system-account-with-airdrop';
import {sleep} from '../util/sleep';

async function main() {
  const baseUrl = 'http://localhost:8081';
  const {predictionPoll, url, commitment} = await getConfig(
    baseUrl + '/config.json',
  );
  const {collection: collectionKey, programId} = predictionPoll;

  console.log('Cluster RPC URL:', url);
  const connection = new Connection(url, commitment);

  const credentials = {id: new Account().publicKey.toString()};
  const creatorAccount = await userLogin(baseUrl + '/login', credentials);
  const [, feeCalculator] = await connection.getRecentBlockhash();
  const wager = 100;
  const minAccountBalances = 4; // 1 poll + 2 tally + 1 user
  const createPollFee = feeCalculator.lamportsPerSignature * 5; // 1 payer + 4 signer keys
  const voteFee = feeCalculator.lamportsPerSignature * 2; // 1 payer + 1 signer key
  const claimFee = feeCalculator.lamportsPerSignature; // 1 payer
  const fees = createPollFee + voteFee + claimFee;
  const payerAccount = await newSystemAccountWithAirdrop(
    connection,
    wager + fees + minAccountBalances,
  );

  console.log(`
Creating new poll...
------------------------------
Q. What's your favorite color?
 - 1. Green
 - 2. Blue
------------------------------`);

  const [, pollAccount] = await createPoll(
    connection,
    programId,
    collectionKey,
    payerAccount,
    creatorAccount,
    'What is your favorite color?',
    'Green',
    'Black',
    5,
  );

  let [poll] = await refreshPoll(connection, pollAccount.publicKey);
  console.log(`Wagering ${wager} tokens for "${poll.optionA.text}"...`);
  await vote(
    connection,
    programId,
    payerAccount,
    pollAccount.publicKey,
    wager,
    new PublicKey(poll.optionA.tallyKey),
  );
  await sleep(3000);

  console.log('Refreshing poll...');
  [poll] = await refreshPoll(connection, pollAccount.publicKey);

  console.log('Claiming winnings...');
  await claim(connection, programId, payerAccount, pollAccount.publicKey, poll);
  console.log(`You won ${wager} tokens (and spent ${fees} lamports in fees)`);
}

main()
  .catch(err => {
    console.error(err);
  })
  .then(() => process.exit());
