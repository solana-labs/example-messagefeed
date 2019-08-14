mod command;

use alloc::vec::Vec;
use crate::collection::Collection;
use prediction_poll_types::Collection as CollectionType;
use crate::result::{ProgramError, ProgramResult};
use crate::simple_serde::SimpleSerde;
use command::Command;
use solana_sdk_bpf_utils::entrypoint::SolKeyedAccount;
use solana_sdk_bpf_utils::info;
use crate::util::expect_n_accounts;

pub fn process_instruction(
    keyed_accounts: &mut [SolKeyedAccount],
    data: &[u8],
) -> ProgramResult<()> {
    let command = Command::deserialize(data)?;
    match command {
        Command::InitCollection => init_collection(keyed_accounts)?,
        Command::InitPoll => init_poll(keyed_accounts)?,
    }

    Ok(())
}

fn init_collection(keyed_accounts: &mut [SolKeyedAccount]) -> ProgramResult<()> {
    const COLLECTION_INDEX: usize = 0;
    expect_n_accounts(keyed_accounts, 1)?;
    info!("init_collection");
    // let mut collection: Option<CollectionType> = serde_json::from_slice(&keyed_accounts[COLLECTION_INDEX].data).unwrap();
    //
    // match collection {
    //     None => {
    //         collection = Some(Default::default());
    //         Ok(())
    //     }
    //     _ => {
    //         info!("Invalid collection state for InitCollection");
    //         Err(ProgramError::InvalidInput)
    //     }
    // }?;
    //
    info!("create default collection type");
    let collection = CollectionType::default();
    info!("serde_json::to_vec");
    let coll_vec: Vec<u8> = serde_json::to_vec(&collection).unwrap();
    let coll_len = coll_vec.len();
    info!("copy_from_slice");
    keyed_accounts[COLLECTION_INDEX].data[..coll_len].copy_from_slice(&coll_vec[..]);
    Ok(())
}

fn init_poll(keyed_accounts: &mut [SolKeyedAccount]) -> ProgramResult<()> {
    const COLLECTION_INDEX: usize = 0;
    const POLL_INDEX: usize = 1;
    expect_n_accounts(keyed_accounts, 2)?;
    info!("init_poll");
    // let collection: CollectionType = serde_json::from_slice(&keyed_accounts[COLLECTION_INDEX].data).unwrap();
    // let mut collection = Collection(collection);
    // collection.add_poll(&keyed_accounts[POLL_INDEX].key)?;
    // let coll_vec: Vec<u8> = serde_json::to_vec(&Some(collection.0)).unwrap();
    // let coll_len = coll_vec.len();
    // keyed_accounts[COLLECTION_INDEX].data[..coll_len].copy_from_slice(&coll_vec[..]);
    Ok(())
}
