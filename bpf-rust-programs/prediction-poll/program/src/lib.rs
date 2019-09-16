//! @brief Example prediction poll app

extern crate alloc;
extern crate solana_sdk;

mod program;
mod result;
mod util;

use program::process_instruction;
use solana_sdk::{account_info::AccountInfo, entrypoint, entrypoint::SUCCESS, pubkey::Pubkey};

entrypoint!(_entrypoint);
fn _entrypoint(program_id: &Pubkey, accounts: &mut [AccountInfo], data: &[u8]) -> u32 {
    const FAILURE: u32 = 1;

    match process_instruction(program_id, accounts, data) {
        Err(err) => {
            err.print();
            FAILURE
        }
        _ => SUCCESS,
    }
}
