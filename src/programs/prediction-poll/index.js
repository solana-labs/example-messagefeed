/* @flow */
import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import type {AccountInfo} from '@solana/web3.js';

export async function refreshCollection(
  connection: Connection,
  collection: PublicKey,
) {
  console.log(`Loading collection ${collection.toString()}`);
  const data = await readCollection(connection, collection);
  console.log({data});
}

/**
 * Read the contents of a collection
 */
async function readCollection(
  connection: Connection,
  collection: PublicKey,
): Promise<AccountInfo> {
  return await connection.getAccountInfo(collection);
}
