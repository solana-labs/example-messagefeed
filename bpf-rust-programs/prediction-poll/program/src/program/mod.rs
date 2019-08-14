mod command;

use crate::collection::Collection;
use crate::result::ProgramResult;
use crate::simple_serde::SimpleSerde;
use crate::util::expect_n_accounts;
use alloc::vec::Vec;
use command::Command;
use solana_sdk_bpf_utils::entrypoint::SolKeyedAccount;
use solana_sdk_bpf_utils::info;

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
    info!("init_collection");
    const COLLECTION_INDEX: usize = 0;
    expect_n_accounts(keyed_accounts, 1)?;
    info!("CollectionType::default()");
    let collection = Collection::default();
    info!("serde_json::to_vec");
    let coll_vec: Vec<u8> = serde_json::to_vec(&collection).unwrap();
    let coll_len = coll_vec.len();
    info!("copy_from_slice");
    keyed_accounts[COLLECTION_INDEX].data[..coll_len].copy_from_slice(&coll_vec[..]);
    Ok(())
}

fn init_poll(keyed_accounts: &mut [SolKeyedAccount]) -> ProgramResult<()> {
    info!("init_poll");
    const COLLECTION_INDEX: usize = 0;
    const POLL_INDEX: usize = 1;
    expect_n_accounts(keyed_accounts, 2)?;
    info!("serde_json::from_slice");
    let mut collection: Collection =
        serde_json::from_slice(&keyed_accounts[COLLECTION_INDEX].data).unwrap();
    info!("collection.add_poll");
    collection.add_poll(&keyed_accounts[POLL_INDEX].key)?;
    info!("serde_json::to_vec");
    let coll_vec: Vec<u8> = serde_json::to_vec(&collection).unwrap();
    let coll_len = coll_vec.len();
    info!("copy_from_slice");
    keyed_accounts[COLLECTION_INDEX].data[..coll_len].copy_from_slice(&coll_vec[..]);
    Ok(())
}
