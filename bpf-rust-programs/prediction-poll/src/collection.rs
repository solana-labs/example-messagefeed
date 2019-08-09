use crate::simple_serde::SimpleSerde;
use serde::{Deserialize, Serialize};
use crate::result::{ProgramResult, ProgramError};
use alloc::vec::Vec;
use solana_sdk_bpf_utils::entrypoint::SolPubkey;

#[repr(C)]
#[derive(Debug, Default, Clone, Serialize, Deserialize, PartialEq)]
pub struct Collection {
    polls: Vec<SolPubkey>,
}

impl Collection {
    pub fn add_poll(&mut self, poll_pubkey: &SolPubkey) -> ProgramResult<()> {
        if !self.polls.iter().any(|pubkey| pubkey == poll_pubkey) {
            self.polls.push(*poll_pubkey);
            Ok(())
        } else {
            Err(ProgramError::PollAlreadyCreated)
        }
    }
}

impl SimpleSerde for Collection {}
