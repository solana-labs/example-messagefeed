//! @brief Example prediction poll app

#![no_std]

extern crate alloc;
extern crate arrayref;
#[cfg(not(test))]
extern crate solana_sdk_bpf_no_std;
extern crate solana_sdk_bpf_utils;

mod collection;
mod program_command;
mod result;
mod simple_serde;

use collection::Collection;
use core::mem::size_of;
use core::option::Option;
use program_command::Command;
use result::{ProgramError, Result as ProgramResult};
use simple_serde::SimpleSerde;
use solana_sdk_bpf_utils::entrypoint::*;
use solana_sdk_bpf_utils::{entrypoint, info};

fn expect_n_accounts(info: &mut [SolKeyedAccount], n: usize) -> ProgramResult<()> {
    if info.len() < n {
        info!("Incorrect number of accounts");
        Err(ProgramError::InvalidInput)
    } else {
        Ok(())
    }
}

fn process_instruction(
    keyed_accounts: &mut [SolKeyedAccount],
    _: &SolClusterInfo,
    data: &[u8],
) -> ProgramResult<()> {
    let command = Command::deserialize(data)?;
    if command == Command::InitCollection {
        const COLLECTION_INDEX: usize = 0;
        expect_n_accounts(keyed_accounts, 1)?;
        let mut collection = <Option<Collection> as SimpleSerde>::deserialize(
            &keyed_accounts[COLLECTION_INDEX].data,
        )?;

        match collection {
            None => {
                collection = Some(Default::default());
                Ok(())
            }
            _ => {
                info!("Invalid collection state for InitCollection");
                Err(ProgramError::InvalidInput)
            }
        }?;

        collection.serialize(&mut keyed_accounts[COLLECTION_INDEX].data)?;
        return Ok(());
    }

    Ok(())
}

entrypoint!(_entrypoint);
fn _entrypoint(keyed_accounts: &mut [SolKeyedAccount], info: &SolClusterInfo, data: &[u8]) -> bool {
    if !keyed_accounts[0].is_signer {
        info!("key 0 did not sign the transaction");
        return false;
    }

    match process_instruction(keyed_accounts, info, data) {
        Err(err) => {
            err.print();
            false
        }
        _ => true,
    }
}
