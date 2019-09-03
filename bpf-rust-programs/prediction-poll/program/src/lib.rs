//! @brief Example prediction poll app

#![no_std]

extern crate alloc;
extern crate arrayref;
#[cfg(not(test))]
extern crate solana_sdk_bpf_no_std;
extern crate solana_sdk_bpf_utils;

mod program;
mod result;
mod util;

use program::process_instruction;
use solana_sdk_bpf_utils::entrypoint;
use solana_sdk_bpf_utils::entrypoint::{SolClusterInfo, SolKeyedAccount};

entrypoint!(_entrypoint);
fn _entrypoint(keyed_accounts: &mut [SolKeyedAccount], info: &SolClusterInfo, data: &[u8]) -> bool {
    match process_instruction(keyed_accounts, info, data) {
        Err(err) => {
            err.print();
            false
        }
        _ => true,
    }
}
