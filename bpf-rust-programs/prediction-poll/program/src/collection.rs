use crate::result::{ProgramError, ProgramResult};
use alloc::vec::Vec;
use serde::{Deserialize, Serialize};
use solana_sdk_bpf_utils::info;
use solana_sdk_types::SolPubkey;

#[derive(Debug, Default, Clone, PartialEq, Serialize, Deserialize)]
pub struct Collection {
    pub polls: Vec<SolPubkey>,
}

impl Collection {
    pub fn add_poll(&mut self, poll_pubkey: &SolPubkey) -> ProgramResult<()> {
        if self.polls.len() > 0 {
            info!("polls not empty");
        }
        if !self.polls.iter().any(|pubkey| *pubkey == *poll_pubkey) {
            info!("added new poll");
            self.polls.push(*poll_pubkey);
            Ok(())
        } else {
            info!("poll already exists");
            Err(ProgramError::PollAlreadyCreated)
        }
    }
}
