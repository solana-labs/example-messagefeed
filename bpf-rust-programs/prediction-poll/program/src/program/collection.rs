use crate::result::{ProgramError, ProgramResult};
use prediction_poll_data::CollectionData;
use solana_sdk::pubkey::Pubkey;

pub fn add_poll(collection: &mut CollectionData, poll_pubkey: &Pubkey) -> ProgramResult<()> {
    if collection.len() >= collection.capacity() {
        Err(ProgramError::MaxPollCapacity)
    } else if collection.contains(poll_pubkey) {
        Err(ProgramError::PollAlreadyCreated)
    } else {
        collection.add_poll(poll_pubkey);
        Ok(())
    }
}
