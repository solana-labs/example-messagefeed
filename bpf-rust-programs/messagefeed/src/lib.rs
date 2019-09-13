//! @brief Example message feed app

extern crate solana_sdk;

use solana_sdk::{
    account_info::AccountInfo, entrypoint, entrypoint::SUCCESS, info, pubkey::Pubkey,
};
use std::mem::size_of;

const FAILURE: u32 = 1;

struct UserAccountData<'a> {
    pub banned: &'a mut bool,
    pub creator: Pubkey,
}
impl<'a> UserAccountData<'a> {
    fn new(data: &'a mut [u8]) -> Self {
        let (banned, creator) = data.split_at_mut(1);
        Self {
            banned: unsafe { &mut *(&mut banned[0] as *mut u8 as *mut bool) },
            creator: Pubkey::new(creator),
        }
    }
}

struct MessageAccountData<'a> {
    pub next_message: Pubkey,
    pub from: Pubkey,
    pub creator: Pubkey,
    pub text: &'a mut [u8],
}
impl<'a> MessageAccountData<'a> {
    fn new(data: &'a mut [u8]) -> Self {
        let (next_message, rest) = data.split_at_mut(size_of::<Pubkey>());
        let (from, rest) = rest.split_at_mut(size_of::<Pubkey>());
        let (creator, text) = rest.split_at_mut(size_of::<Pubkey>());
        Self {
            next_message: Pubkey::new(next_message),
            from: Pubkey::new(from),
            creator: Pubkey::new(creator),
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
    let mut user_data = UserAccountData::new(user_account[0].data);

    let (message_account, rest) = rest.split_at_mut(1);
    let mut new_message_data = MessageAccountData::new(message_account[0].data);

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
        user_data.creator = *message_account[0].key;
        return SUCCESS;
    }

    // Write the message text into new_message_data
    new_message_data.text.clone_from_slice(data);

    // Save the pubkey of who posted the message
    new_message_data.from = *user_account[0].key;

    if len > 2 {
        let (existing_message_account, rest) = rest.split_at_mut(1);
        let mut existing_message_data = MessageAccountData::new(existing_message_account[0].data);

        if existing_message_data.next_message != Pubkey::default() {
            info!("Error: account 1 already has a next_message");
            return FAILURE;
        }

        // Link the new_message to the existing_message
        existing_message_data.next_message = *message_account[0].key;

        // Check if a user should be banned
        if len > 3 {
            let (ban_user_account, _) = rest.split_at_mut(1);
            let ban_user_data = UserAccountData::new(ban_user_account[0].data);
            *ban_user_data.banned = true;
        }

        // Propagate the chain creator to the new message
        new_message_data.creator = existing_message_data.creator;
    } else {
        // This is the first message in the chain, it is the "creator"
        new_message_data.creator = *message_account[0].key;
    }

    if user_data.creator != new_message_data.creator {
        info!("user_data/new_message_data creator mismatch");
        return FAILURE;
    }

    info!("Success");
    SUCCESS
}
