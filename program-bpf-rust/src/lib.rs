//! @brief Example message feed app

#![no_std]

#[macro_use]
extern crate arrayref;
extern crate solana_sdk_bpf_utils;

use solana_sdk_bpf_utils::entrypoint;
use solana_sdk_bpf_utils::entrypoint::*;
use solana_sdk_bpf_utils::log::*;

struct UserAccountData<'a> {
    pub banned: &'a mut u8, // TODO How to make this a &bool without transmute?
    pub creator: SolPubkey<'a>,
}
impl<'a> UserAccountData<'a> {
    fn new(data: &'a mut [u8]) -> Self {
        let (banned, creator) = data.split_at_mut(1);
        Self {
            banned: &mut banned[0],
            creator: array_mut_ref!(creator, 0, SIZE_PUBKEY),
        }
    }
}

struct MessageAccountData<'a> {
    pub next_message: SolPubkey<'a>,
    pub from: SolPubkey<'a>,
    pub creator: SolPubkey<'a>,
    pub text: &'a mut [u8],
}
impl<'a> MessageAccountData<'a> {
    fn new(data: &'a mut [u8]) -> Self {
        let (next_message, rest) = data.split_at_mut(SIZE_PUBKEY);
        let (from, rest) = rest.split_at_mut(SIZE_PUBKEY);
        let (creator, text) = rest.split_at_mut(SIZE_PUBKEY);
        Self {
            next_message: array_mut_ref!(next_message, 0, SIZE_PUBKEY),
            from: array_mut_ref!(from, 0, SIZE_PUBKEY),
            creator: array_mut_ref!(creator, 0, SIZE_PUBKEY),
            text,
        }
    }
}

entrypoint!(process_instruction);
fn process_instruction(ka: &mut [SolKeyedAccount], _info: &SolClusterInfo, data: &[u8]) -> bool {
    sol_log("message feed entrypoint");

    let len = ka.len();
    if len < 2 {
        sol_log("Error: Expected at least two keys");
        sol_log_64(0, 0, 0, 0, len as u64);
        return false;
    }

    let (user_account, rest) = ka.split_at_mut(1);
    let user_data = UserAccountData::new(user_account[0].data);

    let (message_account, rest) = rest.split_at_mut(1);
    let new_message_data = MessageAccountData::new(message_account[0].data);

    if !user_account[0].is_signer {
        sol_log("Error: not signed by key 0");
        return false;
    }
    if !message_account[0].is_signer {
        sol_log("Error: not signed by key 1");
        return false;
    }

    if *user_data.banned == 1 {
        sol_log("Error: user is banned");
        return false;
    }

    // No instruction data means that a new user account should be initialized
    if data.len() == 0 {
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

        if existing_message_data.next_message != &[0; SIZE_PUBKEY] {
            sol_log("Error: account 1 already has a next_message");
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
            *ban_user_data.banned = 1;
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
        sol_log("user_data/new_message_data creator mismatch");
        return false;
    }

    sol_log("Success");
    true
}
