use crate::result::{ProgramError, ProgramResult};
use prediction_poll_data::TallyData;
use solana_sdk_bpf_utils::entrypoint::SolKeyedAccount;
use solana_sdk_bpf_utils::info;
use solana_sdk_types::SolPubkey;

pub fn record_wager(
    tally: &mut TallyData,
    user_pubkey: &SolPubkey,
    wager: u64,
) -> ProgramResult<()> {
    for t in 0..*tally.len as usize {
        let key = array_ref!(tally.tallies[t], 0, 32);
        if key == user_pubkey {
            let value_mut_ref = array_mut_ref!(tally.tallies[t], 32, 8);
            let value = u64::from_be_bytes(*value_mut_ref);
            *value_mut_ref = (value + wager).to_be_bytes();
            return Ok(());
        }
    }

    if (*tally.len as usize) >= tally.tallies.len() {
        Err(ProgramError::MaxTallyCapacity)
    } else {
        let wager_bytes = wager.to_be_bytes();
        for i in 0..32usize {
            tally.tallies[*tally.len as usize][i] = user_pubkey[i];
        }
        for i in 0..8usize {
            tally.tallies[*tally.len as usize][32 + i] = wager_bytes[i];
        }
        *tally.len += 1;
        Ok(())
    }
}

pub fn payout(
    tally: &TallyData,
    accounts: &mut [SolKeyedAccount],
    winning_quantity: u64,
    pot: u64,
) -> ProgramResult<()> {
    if *tally.len as usize != accounts.len() {
        return Err(ProgramError::CannotPayoutToSubset);
    }

    let mut disbursed = 0;
    for index in 0..accounts.len() {
        let key = *array_ref!(tally.tallies[index], 0, 32);
        let value = *array_ref!(tally.tallies[index], 32, 8);
        let value = u64::from_be_bytes(value);
        if key != *accounts[index].key {
            return Err(ProgramError::InvalidPayoutOrder);
        }
        let mut portion = pot * value / winning_quantity;
        disbursed += portion;
        if index == accounts.len() - 1 {
            portion += pot - disbursed; // last voter gets the rounding error
        }
        info!(portion, pot, winning_quantity, *accounts[index].lamports, 0);
        *accounts[index].lamports += portion;
    }

    Ok(())
}
