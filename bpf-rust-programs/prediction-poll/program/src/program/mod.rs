mod collection;
mod poll;
mod tally;

use crate::result::{ProgramError, ProgramResult};
use crate::util::expect_n_accounts;
use core::convert::TryFrom;
use prediction_poll_data::{
    ClockData, CollectionData, CommandData, InitPollData, PollData, TallyData,
};
use solana_sdk_bpf_utils::entrypoint::SolKeyedAccount;
use solana_sdk_bpf_utils::info;

pub fn process_instruction(
    keyed_accounts: &mut [SolKeyedAccount],
    data: &[u8],
) -> ProgramResult<()> {
    let (command, data) = data.split_at(1);
    let command =
        CommandData::try_from(command[0].to_be()).map_err(|_| ProgramError::InvalidCommand)?;
    match command {
        CommandData::InitCollection => init_collection(keyed_accounts),
        CommandData::InitPoll => init_poll(keyed_accounts, data),
        CommandData::SubmitVote => submit_vote(keyed_accounts),
        CommandData::SubmitClaim => submit_claim(keyed_accounts),
    }
}

fn init_collection(keyed_accounts: &mut [SolKeyedAccount]) -> ProgramResult<()> {
    info!("init collection");
    if !keyed_accounts[0].is_signer {
        return Err(ProgramError::MissingSigner);
    }

    expect_n_accounts(keyed_accounts, 1)?;
    let (collection_account, _) = keyed_accounts.split_first_mut().unwrap();

    let mut collection = CollectionData::from_bytes(collection_account.data);
    collection.init();

    Ok(())
}

fn init_poll(keyed_accounts: &mut [SolKeyedAccount], init_data: &[u8]) -> ProgramResult<()> {
    info!("init poll");
    if !keyed_accounts[0].is_signer || !keyed_accounts[1].is_signer {
        return Err(ProgramError::MissingSigner);
    }

    expect_n_accounts(keyed_accounts, 6)?;
    let (creator_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    // TODO check that poll account is zeroed
    let (poll_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (collection_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (tally_a_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (tally_b_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (clock_account, _) = keyed_accounts.split_first_mut().unwrap();

    let mut collection = CollectionData::from_bytes(collection_account.data);
    let init_poll = InitPollData::from_bytes(init_data);
    let clock = ClockData::from_bytes(clock_account.data);
    let poll_data = PollData::init(
        init_poll,
        creator_account.key,
        tally_a_account.key,
        tally_b_account.key,
        clock.slot,
    );
    let poll_data_slice = poll_data.to_bytes();

    collection::add_poll(&mut collection, poll_account.key)?;
    poll_account.data[0..poll_data_slice.len()].copy_from_slice(&poll_data_slice);

    Ok(())
}

fn submit_vote(keyed_accounts: &mut [SolKeyedAccount]) -> ProgramResult<()> {
    info!("submit vote");
    if !keyed_accounts[0].is_signer {
        return Err(ProgramError::MissingSigner);
    }

    expect_n_accounts(keyed_accounts, 5)?;
    let (user_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (poll_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (tally_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (payout_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (clock_account, _) = keyed_accounts.split_first_mut().unwrap();

    let clock = ClockData::from_bytes(clock_account.data);
    let mut poll = PollData::from_bytes(poll_account.data);
    let mut tally = TallyData::from_bytes(tally_account.data);

    if poll.last_block < clock.slot {
        return Err(ProgramError::PollAlreadyFinished);
    }

    let wager = *user_account.lamports;
    poll::record_wager(&mut poll, tally_account.key, wager)?;
    tally::record_wager(&mut tally, payout_account.key, wager)?;

    *poll_account.lamports += wager;
    *user_account.lamports = 0;

    let poll_data_slice = poll.to_bytes();
    poll_account.data[0..poll_data_slice.len()].copy_from_slice(&poll_data_slice);
    Ok(())
}

fn submit_claim(keyed_accounts: &mut [SolKeyedAccount]) -> ProgramResult<()> {
    info!("submit claim");
    // No signer needed
    expect_n_accounts(keyed_accounts, 3)?;
    let (poll_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (tally_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();
    let (clock_account, keyed_accounts) = keyed_accounts.split_first_mut().unwrap();

    if *poll_account.lamports <= 1 {
        return Err(ProgramError::PollHasNoFunds);
    }

    let clock = ClockData::from_bytes(clock_account.data);
    let poll = PollData::from_bytes(poll_account.data);
    let tally = TallyData::from_bytes(tally_account.data);

    if poll.last_block > clock.slot {
        return Err(ProgramError::PollNotFinished);
    }

    expect_n_accounts(keyed_accounts, *tally.len as usize)?;

    let pot = *poll_account.lamports - 1;
    *poll_account.lamports = 1;

    let winning_quantity = poll::check_winning_tally(&poll, tally_account.key)?;
    tally::payout(&tally, keyed_accounts, winning_quantity, pot)?;

    Ok(())
}
