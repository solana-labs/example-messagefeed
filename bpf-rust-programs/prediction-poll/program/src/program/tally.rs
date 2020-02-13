use crate::result::PollError;
use prediction_poll_data::TallyData;
use solana_sdk::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};
use std::convert::TryFrom;

pub fn record_wager(tally: &mut TallyData, user_pubkey: &Pubkey, wager: u64) -> ProgramResult {
    if let Some(wager_mut_ref) = tally.get_wager_mut(user_pubkey) {
        let value = u64::from_le_bytes(*wager_mut_ref);
        *wager_mut_ref = (value + wager).to_le_bytes();
        return Ok(());
    }

    if tally.len() >= tally.capacity() {
        Err(PollError::MaxTallyCapacity.into())
    } else {
        tally.add_tally(user_pubkey, wager);
        Ok(())
    }
}

pub fn payout(
    tally: &TallyData,
    accounts: &[AccountInfo],
    winning_quantity: u64,
    pot: u64,
) -> ProgramResult {
    if tally.len() != accounts.len() {
        return Err(PollError::InvalidPayoutList.into());
    }

    let mut remaining = pot;
    let pot = u128::from(pot);
    let winning_quantity = u128::from(winning_quantity);
    for (index, (key, wager)) in tally.iter().enumerate() {
        if key != *accounts[index].key {
            return Err(PollError::InvalidPayoutList.into());
        }

        let mut portion = u64::try_from(pot * u128::from(wager) / winning_quantity).unwrap();
        remaining -= portion;
        if index == accounts.len() - 1 {
            portion += remaining; // last voter gets the rounding error
        }
        **accounts[index].lamports.borrow_mut() += portion;
    }

    Ok(())
}
