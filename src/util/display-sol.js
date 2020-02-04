import {LAMPORTS_PER_SOL} from '@solana/web3.js';

// TODO: move to web3 sdk
export function balanceInSOL(balance) {
  const sol = balance / LAMPORTS_PER_SOL;

  if (balance >= 1000 * LAMPORTS_PER_SOL) {
    return sol.toFixed();
  }

  let precision = 2;
  if (balance >= LAMPORTS_PER_SOL / 100) {
    precision = 4;
  }

  // Strip trailing zeroes from decimal
  //   For example: 1.200 -> 1.2 and 1.000 -> 1
  let solString = sol.toPrecision(precision);
  while (solString.length > 1) {
    const lastChar = solString.charAt(solString.length - 1);
    if (lastChar != '0' && lastChar != '.') break;
    solString = solString.substring(0, solString.length - 1);
    if (lastChar == '.') break;
  }

  return solString;
}
