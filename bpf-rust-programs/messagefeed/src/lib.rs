//! @brief Example message feed app

extern crate solana_sdk;

use arrayref::array_mut_ref;
use solana_sdk::{
    account_info::AccountInfo, entrypoint, entrypoint::SUCCESS, info, pubkey::Pubkey,
};
use std::mem::size_of;

type PubkeyData = [u8; 32];

const FAILURE: u32 = 1;

struct UserAccountData<'a> {
    pub banned: &'a mut bool,
    pub creator: &'a mut PubkeyData,
}
impl<'a> UserAccountData<'a> {
    fn new(data: &'a mut [u8]) -> Self {
        let (banned, creator) = data.split_at_mut(1);
        Self {
            banned: unsafe { &mut *(&mut banned[0] as *mut u8 as *mut bool) },
            creator: array_mut_ref!(creator, 0, size_of::<PubkeyData>()),
        }
    }
}

struct MessageAccountData<'a> {
    pub next_message: &'a mut PubkeyData,
    pub from: &'a mut PubkeyData,
    pub creator: &'a mut PubkeyData,
    pub text: &'a mut [u8],
}
impl<'a> MessageAccountData<'a> {
    fn new(data: &'a mut [u8]) -> Self {
        let (next_message, rest) = data.split_at_mut(size_of::<PubkeyData>());
        let (from, rest) = rest.split_at_mut(size_of::<PubkeyData>());
        let (creator, text) = rest.split_at_mut(size_of::<PubkeyData>());
        Self {
            next_message: array_mut_ref!(next_message, 0, size_of::<PubkeyData>()),
            from: array_mut_ref!(from, 0, size_of::<PubkeyData>()),
            creator: array_mut_ref!(creator, 0, size_of::<PubkeyData>()),
            text,
        }
    }
}

entrypoint!(process_instruction);
fn process_instruction(_program_id: &Pubkey, accounts: &mut [AccountInfo], data: &[u8]) -> u32 {
    info!("message feed entrypoint");

    let len = accounts.len();
    if len < 2 {
        info!("Error: Expected at least two keys");
        return FAILURE;
    }

    let (user_account, rest) = accounts.split_at_mut(1);
    let user_data = UserAccountData::new(user_account[0].data);

    let (message_account, rest) = rest.split_at_mut(1);
    let new_message_data = MessageAccountData::new(message_account[0].data);

    if !user_account[0].is_signer {
        info!("Error: not signed by key 0");
        return FAILURE;
    }
    if !message_account[0].is_signer {
        info!("Error: not signed by key 1");
        return FAILURE;
    }

    if *user_data.banned {
        info!("Error: user is banned");
        return FAILURE;
    }

    // No instruction data means that a new user account should be initialized
    if data.is_empty() {
        user_data
            .creator
            .clone_from_slice(message_account[0].key.as_ref());
        return SUCCESS;
    }

    // Write the message text into new_message_data
    new_message_data.text.clone_from_slice(data);

    // Save the pubkey of who posted the message
    new_message_data
        .from
        .clone_from_slice(user_account[0].key.as_ref());

    if len > 2 {
        let (existing_message_account, rest) = rest.split_at_mut(1);
        let existing_message_data = MessageAccountData::new(existing_message_account[0].data);

        if existing_message_data.next_message != &[0; size_of::<PubkeyData>()] {
            info!("Error: account 1 already has a next_message");
            return FAILURE;
        }

        // Link the new_message to the existing_message
        existing_message_data
            .next_message
            .clone_from_slice(message_account[0].key.as_ref());

        // Check if a user should be banned
        if len > 3 {
            let (ban_user_account, _) = rest.split_at_mut(1);
            let ban_user_data = UserAccountData::new(ban_user_account[0].data);
            *ban_user_data.banned = true;
        }

        // Propagate the chain creator to the new message
        new_message_data
            .creator
            .clone_from_slice(existing_message_data.creator.as_ref());
    } else {
        // This is the first message in the chain, it is the "creator"
        new_message_data
            .creator
            .clone_from_slice(message_account[0].key.as_ref());
    }

    if user_data.creator != new_message_data.creator {
        info!("user_data/new_message_data creator mismatch");
        return FAILURE;
    }

    info!("Success");
    SUCCESS
}
