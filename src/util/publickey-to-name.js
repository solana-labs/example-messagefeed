import Haikunator from 'haikunator';
import type {PublicKey} from '@solana/web3.js';

export function publicKeyToName(publicKey: PublicKey): string {
  const haikunator = new Haikunator({
    seed: publicKey.toString(),
  });
  return haikunator.haikunate();
}
