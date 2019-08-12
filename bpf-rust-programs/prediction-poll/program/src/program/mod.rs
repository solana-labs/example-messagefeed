mod command;

use crate::collection::Collection;
use prediction_poll_types::Collection as CollectionType;
use crate::result::{ProgramError, ProgramResult};
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
    let mut collection: Option<CollectionType> = bincode::deserialize(&keyed_accounts[COLLECTION_INDEX].data);

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
    Ok(())
}

fn init_poll(keyed_accounts: &mut [SolKeyedAccount]) -> ProgramResult<()> {
    const COLLECTION_INDEX: usize = 0;
    const POLL_INDEX: usize = 1;
    expect_n_accounts(keyed_accounts, 2)?;
    let collection =
        <Option<CollectionType> as SimpleSerde>::deserialize(&keyed_accounts[COLLECTION_INDEX].data)?;

    if collection.is_none() {
        info!("Invalid collection state for InitCollection");
        return Err(ProgramError::InvalidInput);
    }

    let mut collection = Collection(collection.unwrap());
    collection.add_poll(&keyed_accounts[POLL_INDEX].key)?;
    collection.serialize(&mut keyed_accounts[COLLECTION_INDEX].data)?;
    Ok(())
}
