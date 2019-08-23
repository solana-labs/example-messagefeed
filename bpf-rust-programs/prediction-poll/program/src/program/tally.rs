use crate::result::{ProgramError, ProgramResult};
use prediction_poll_data::TallyData;
use solana_sdk_bpf_utils::entrypoint::{SolKeyedAccount, SolPubkey};

pub fn record_wager(
    tally: &mut TallyData,
    user_pubkey: &SolPubkey,
    wager: u64,
) -> ProgramResult<()> {
    if let Some(wager_mut_ref) = tally.get_wager_mut(user_pubkey) {
        let value = u64::from_be_bytes(*wager_mut_ref);
        *wager_mut_ref = (value + wager).to_be_bytes();
        return Ok(());
    }

    if tally.len() >= tally.capacity() {
        Err(ProgramError::MaxTallyCapacity)
    } else {
        tally.add_tally(user_pubkey, wager);
        Ok(())
    }
}

pub fn payout(
    tally: &TallyData,
    accounts: &mut [SolKeyedAccount],
    winning_quantity: u64,
    pot: u64,
) -> ProgramResult<()> {
    if tally.len() != accounts.len() {
        return Err(ProgramError::InvalidPayoutList);
    }

    let mut disbursed = 0;
    for (index, (key, wager)) in tally.iter().enumerate() {
        if key != accounts[index].key {
            return Err(ProgramError::InvalidPayoutList);
        }

        let mut portion = pot * wager / winning_quantity;
        disbursed += portion;
        if index == accounts.len() - 1 {
            portion += pot - disbursed; // last voter gets the rounding error
        }
        *accounts[index].lamports += portion;
    }

    Ok(())
}
