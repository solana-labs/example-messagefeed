//! @brief Example message feed app

#![no_std]

#[macro_use]
extern crate arrayref;
extern crate solana_sdk_bpf_utils;

use core::mem::size_of;
use solana_sdk_bpf_utils::entrypoint::*;
use solana_sdk_bpf_utils::{entrypoint, info};

struct UserAccountData<'a> {
    pub banned: &'a mut bool,
    pub creator: &'a mut SolPubkey,
}
impl<'a> UserAccountData<'a> {
    fn new(data: &'a mut [u8]) -> Self {
        let (banned, creator) = data.split_at_mut(1);
        Self {
            banned: unsafe {&mut *(&mut banned[0] as *mut u8 as *mut bool) },
            creator: array_mut_ref!(creator, 0, size_of::<SolPubkey>()),
        }
    }
}

struct MessageAccountData<'a> {
    pub next_message: &'a mut SolPubkey,
    pub from: &'a mut SolPubkey,
    pub creator: &'a mut SolPubkey,
    pub text: &'a mut [u8],
}
impl<'a> MessageAccountData<'a> {
    fn new(data: &'a mut [u8]) -> Self {
        let (next_message, rest) = data.split_at_mut(size_of::<SolPubkey>());
        let (from, rest) = rest.split_at_mut(size_of::<SolPubkey>());
        let (creator, text) = rest.split_at_mut(size_of::<SolPubkey>());
        Self {
            next_message: array_mut_ref!(next_message, 0, size_of::<SolPubkey>()),
            from: array_mut_ref!(from, 0, size_of::<SolPubkey>()),
            creator: array_mut_ref!(creator, 0, size_of::<SolPubkey>()),
            text,
        }
    }
}

entrypoint!(process_instruction);
fn process_instruction(ka: &mut [SolKeyedAccount], _info: &SolClusterInfo, data: &[u8]) -> bool {
    info!("message feed entrypoint");

    let len = ka.len();
    if len < 2 {
        info!("Error: Expected at least two keys");
        return false;
    }

    let (user_account, rest) = ka.split_at_mut(1);
    let user_data = UserAccountData::new(user_account[0].data);

    let (message_account, rest) = rest.split_at_mut(1);
    let new_message_data = MessageAccountData::new(message_account[0].data);

    if !user_account[0].is_signer {
        info!("Error: not signed by key 0");
        return false;
    }
    if !message_account[0].is_signer {
        info!("Error: not signed by key 1");
        return false;
    }

    if *user_data.banned {
        info!("Error: user is banned");
        return false;
    }

    // No instruction data means that a new user account should be initialized
    if data.is_empty() {
        user_data.creator.clone_from_slice(message_account[0].key);
        return true;
    }

    // Write the message text into new_message_data
    new_message_data.text.clone_from_slice(data);

    // Save the pubkey of who posted the message
    new_message_data.from.clone_from_slice(user_account[0].key);

    if len > 2 {
        let (existing_message_account, rest) = rest.split_at_mut(1);
        let existing_message_data = MessageAccountData::new(existing_message_account[0].data);

        if existing_message_data.next_message != &[0; size_of::<SolPubkey>()] {
            info!("Error: account 1 already has a next_message");
            return false;
        }

        // Link the new_message to the existing_message
        existing_message_data
            .next_message
            .clone_from_slice(message_account[0].key);

        // Check if a user should be banned
        if len > 3 {
            let (ban_user_account, _) = rest.split_at_mut(1);
            let ban_user_data = UserAccountData::new(ban_user_account[0].data);
            *ban_user_data.banned = true;
        }

        // Propagate the chain creator to the new message
        new_message_data
            .creator
            .clone_from_slice(existing_message_data.creator);
    } else {
        // This is the first message in the chain, it is the "creator"
        new_message_data
            .creator
            .clone_from_slice(message_account[0].key);
    }

    if user_data.creator != new_message_data.creator {
        info!("user_data/new_message_data creator mismatch");
        return false;
    }

    info!("Success");
    true
}
