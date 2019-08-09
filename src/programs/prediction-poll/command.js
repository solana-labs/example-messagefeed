/**
 * The commands (encoded as Transaction Instructions) that are accepted by the
 * TicTacToe Game and Dashboard program
 *
 * @flow
 */

import * as BufferLayout from 'buffer-layout';
import {PublicKey} from '@solana/web3.js';

const COMMAND_LENGTH = 8;

const Command = {
  InitCollection: 0,
  InitPoll: 1,
};

function zeroPad(command: Buffer): Buffer {
  if (command.length > COMMAND_LENGTH) {
    throw new Error(
      `command buffer too large: ${command.length} > ${COMMAND_LENGTH}`,
    );
  }
  const buffer = Buffer.alloc(COMMAND_LENGTH);
  command.copy(buffer);
  return buffer;
}

function commandWithNoArgs(command: number): Buffer {
  const layout = BufferLayout.struct([BufferLayout.u32('command')]);
  const buffer = Buffer.alloc(layout.span);
  layout.encode({command}, buffer);
  return zeroPad(buffer);
}

export function initCollection(): Buffer {
  return commandWithNoArgs(Command.InitCollection);
}

export function initPoll(): Buffer {
  return commandWithNoArgs(Command.InitPoll);
}

/**
 * Public key that identifies the Clock Sysvar Account Public Key
 */
export function getSysvarClockPublicKey(): PublicKey {
  return new PublicKey('SysvarC1ock11111111111111111111111111111111');
}
