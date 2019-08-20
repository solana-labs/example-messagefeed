use crate::result::{ProgramError, ProgramResult};
use prediction_poll_data::CollectionData;
use solana_sdk_bpf_utils::entrypoint::SolPubkey;

pub fn add_poll(collection: &mut CollectionData, poll_pubkey: &SolPubkey) -> ProgramResult<()> {
    if collection.len() >= collection.capacity() {
        Err(ProgramError::MaxPollCapacity)
    } else if collection.contains(poll_pubkey) {
        Err(ProgramError::PollAlreadyCreated)
    } else {
        Ok(collection.add_poll(poll_pubkey))
    }
}
