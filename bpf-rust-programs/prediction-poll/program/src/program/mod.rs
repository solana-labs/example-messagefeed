mod collection;
mod poll;
mod tally;

use crate::result::{ProgramError, ProgramResult};
use crate::util::{
    expect_data_type, expect_gt, expect_key, expect_min_size, expect_n_accounts,
    expect_new_account, expect_owned_by, expect_signed,
};
use core::convert::TryFrom;
use prediction_poll_data::{
    ClockData, CollectionData, CommandData, DataType, InitPollData, PollData, TallyData,
    MIN_COLLECTION_SIZE, MIN_TALLY_SIZE,
};
use solana_sdk::{account_info::AccountInfo, info, pubkey::Pubkey, sysvar::clock};

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &mut [AccountInfo],
    data: &[u8],
) -> ProgramResult<()> {
    let (command, data) = data.split_at(1);
    let command =
        CommandData::try_from(command[0].to_le()).map_err(|_| ProgramError::InvalidCommand)?;
    match command {
        CommandData::InitCollection => init_collection(program_id, accounts),
        CommandData::InitPoll => init_poll(program_id, accounts, data),
        CommandData::SubmitVote => submit_vote(program_id, accounts),
        CommandData::SubmitClaim => submit_claim(program_id, accounts),
    }
}

fn init_collection(program_id: &Pubkey, accounts: &mut [AccountInfo]) -> ProgramResult<()> {
    info!("init collection");
    expect_n_accounts(accounts, 1)?;

    let (collection_account, _) = accounts.split_first_mut().unwrap();
    expect_signed(collection_account)?;
    expect_owned_by(collection_account, program_id)?;
    expect_min_size(collection_account.borrow().data, MIN_COLLECTION_SIZE)?;
    expect_new_account(collection_account)?;

    collection_account.borrow_mut().data[0] = DataType::Collection as u8;

    Ok(())
}

fn init_poll(
    program_id: &Pubkey,
    accounts: &mut [AccountInfo],
    init_data: &[u8],
) -> ProgramResult<()> {
    info!("init poll");
    expect_n_accounts(accounts, 6)?;

    let (creator_account, accounts) = accounts.split_first_mut().unwrap();
    expect_signed(creator_account)?;

    let (poll_account, accounts) = accounts.split_first_mut().unwrap();
    expect_signed(poll_account)?;
    expect_owned_by(poll_account, program_id)?;
    expect_new_account(poll_account)?;

    let (collection_account, accounts) = accounts.split_first_mut().unwrap();
    expect_owned_by(collection_account, program_id)?;
    expect_data_type(collection_account, DataType::Collection)?;

    let (tally_a_account, accounts) = accounts.split_first_mut().unwrap();
    expect_signed(tally_a_account)?;
    expect_owned_by(tally_a_account, program_id)?;
    expect_min_size(tally_a_account.borrow().data, MIN_TALLY_SIZE)?;
    expect_new_account(tally_a_account)?;

    let (tally_b_account, accounts) = accounts.split_first_mut().unwrap();
    expect_signed(tally_b_account)?;
    expect_owned_by(tally_b_account, program_id)?;
    expect_min_size(tally_b_account.borrow().data, MIN_TALLY_SIZE)?;
    expect_new_account(tally_b_account)?;

    let (clock_account, _) = accounts.split_first_mut().unwrap();
    expect_key(clock_account, &clock::id())?;

    let mut collection_account_borrow = collection_account.borrow_mut();
    let mut collection = CollectionData::from_bytes(&mut collection_account_borrow.data);
    let clock = ClockData::from_bytes(clock_account.borrow().data);
    let init_poll = InitPollData::from_bytes(init_data);
    expect_gt(init_poll.header_len, 0)?;
    expect_gt(init_poll.option_a_len, 0)?;
    expect_gt(init_poll.option_b_len, 0)?;

    collection::add_poll(&mut collection, poll_account.key)?;
    let mut poll_account_borrow = poll_account.borrow_mut();
    PollData::copy_to_bytes(
        &mut poll_account_borrow.data,
        init_poll,
        creator_account.key,
        tally_a_account.key,
        tally_b_account.key,
        clock.slot,
    );

    tally_a_account.borrow_mut().data[0] = DataType::Tally as u8;
    tally_b_account.borrow_mut().data[0] = DataType::Tally as u8;

    Ok(())
}

fn submit_vote(program_id: &Pubkey, accounts: &mut [AccountInfo]) -> ProgramResult<()> {
    info!("submit vote");
    expect_n_accounts(accounts, 5)?;

    let (user_account, accounts) = accounts.split_first_mut().unwrap();
    expect_signed(user_account)?;
    expect_owned_by(user_account, program_id)?;

    let (poll_account, accounts) = accounts.split_first_mut().unwrap();
    expect_owned_by(poll_account, program_id)?;
    expect_data_type(poll_account, DataType::Poll)?;

    let (tally_account, accounts) = accounts.split_first_mut().unwrap();
    expect_owned_by(tally_account, program_id)?;
    expect_data_type(tally_account, DataType::Tally)?;

    let (payout_account, accounts) = accounts.split_first_mut().unwrap();
    let (clock_account, _) = accounts.split_first_mut().unwrap();
    expect_key(clock_account, &clock::id())?;

    let clock = ClockData::from_bytes(clock_account.borrow().data);
    let mut poll_borrow = poll_account.borrow_mut();
    let mut poll = PollData::from_bytes(&mut poll_borrow.data);
    let mut tally_borrow = tally_account.borrow_mut();
    let mut tally = TallyData::from_bytes(&mut tally_borrow.data);

    if poll.last_block < clock.slot {
        return Err(ProgramError::PollAlreadyFinished);
    }

    if user_account.lamports() == 0 {
        return Err(ProgramError::WagerHasNoFunds);
    }

    let wager = user_account.lamports();
    poll::record_wager(&mut poll, tally_account.key, wager)?;
    tally::record_wager(&mut tally, payout_account.key, wager)?;

    *poll_borrow.lamports += wager;
    *user_account.borrow_mut().lamports = 0;

    Ok(())
}

fn submit_claim(program_id: &Pubkey, accounts: &mut [AccountInfo]) -> ProgramResult<()> {
    info!("submit claim");
    // No signer needed
    expect_n_accounts(accounts, 3)?;

    let (poll_account, accounts) = accounts.split_first_mut().unwrap();
    expect_owned_by(poll_account, program_id)?;
    expect_data_type(poll_account, DataType::Poll)?;

    let (tally_account, accounts) = accounts.split_first_mut().unwrap();
    expect_owned_by(tally_account, program_id)?;
    expect_data_type(tally_account, DataType::Tally)?;

    let (clock_account, accounts) = accounts.split_first_mut().unwrap();
    expect_key(clock_account, &clock::id())?;

    if poll_account.lamports() <= 1 {
        return Err(ProgramError::PollHasNoFunds);
    }

    let mut poll_borrow = poll_account.borrow_mut();
    let pot = *poll_borrow.lamports - 1;
    *poll_borrow.lamports = 1;

    let clock = ClockData::from_bytes(clock_account.borrow().data);
    let poll = PollData::from_bytes(&mut poll_borrow.data);
    let mut tally_borrow = tally_account.borrow_mut();
    let tally = TallyData::from_bytes(&mut tally_borrow.data);

    if poll.last_block > clock.slot {
        return Err(ProgramError::PollNotFinished);
    }

    expect_n_accounts(accounts, tally.len())?;

    let winning_quantity = poll::check_winning_tally(&poll, tally_account.key)?;
    tally::payout(&tally, accounts, winning_quantity, pot)?;

    Ok(())
}
