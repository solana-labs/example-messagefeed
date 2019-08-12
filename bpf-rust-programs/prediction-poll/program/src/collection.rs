use crate::simple_serde::SimpleSerde;
use crate::result::{ProgramResult, ProgramError};
use core::ops::{Deref, DerefMut};
use alloc::vec::Vec;
use solana_sdk_types::SolPubkey;
use prediction_poll_types::Collection as CollectionType;
use solana_sdk_bpf_utils::info;

#[derive(Debug, Default, Clone, PartialEq)]
pub struct Collection(pub CollectionType);

impl Deref for Collection {
    type Target = CollectionType;

    fn deref<'a>(&'a self) -> &'a CollectionType {
        &self.0
    }
}

impl DerefMut for Collection {
    fn deref_mut<'a>(&'a mut self) -> &'a mut CollectionType {
        &mut self.0
    }
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
