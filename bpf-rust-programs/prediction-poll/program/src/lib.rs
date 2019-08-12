//! @brief Example prediction poll app

#![no_std]

extern crate alloc;
extern crate arrayref;
#[cfg(not(test))]
extern crate solana_sdk_bpf_no_std;
extern crate solana_sdk_bpf_utils;

mod collection;
mod program;
mod result;
mod simple_serde;
mod util;

use program::process_instruction;
use solana_sdk_bpf_utils::entrypoint::{SolKeyedAccount, SolClusterInfo};
use solana_sdk_bpf_utils::{entrypoint, info};

entrypoint!(_entrypoint);
fn _entrypoint(keyed_accounts: &mut [SolKeyedAccount], _: &SolClusterInfo, data: &[u8]) -> bool {
    if !keyed_accounts[0].is_signer {
        info!("key 0 did not sign the transaction");
        return false;
    }

    match process_instruction(keyed_accounts, data) {
        Err(err) => {
            err.print();
            false
        }
        _ => true,
    }
}
