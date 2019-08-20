use crate::result::{ProgramError, ProgramResult};
use prediction_poll_data::PollData;
use solana_sdk_types::SolPubkey;

pub fn record_wager(
    poll: &mut PollData,
    tally_pubkey: &SolPubkey,
    wager: u64,
) -> ProgramResult<()> {
    let (selected, unselected) = if poll.option_a.tally_key == tally_pubkey {
        (&mut poll.option_a, &mut poll.option_b)
    } else if poll.option_b.tally_key == tally_pubkey {
        (&mut poll.option_b, &mut poll.option_a)
    } else {
        return Err(ProgramError::InvalidTallyKey);
    };

    if selected.quantity + wager == unselected.quantity {
        return Err(ProgramError::PollCannotBeEven);
    }

    Ok(selected.quantity += wager)
}

pub fn check_winning_tally(poll: &PollData, tally_pubkey: &SolPubkey) -> ProgramResult<u64> {
    if poll.option_a.tally_key == tally_pubkey {
        if poll.option_a.quantity > poll.option_b.quantity {
            Ok(poll.option_a.quantity)
        } else {
            Err(ProgramError::CannotPayoutToLosers)
        }
    } else if poll.option_b.tally_key == tally_pubkey {
        if poll.option_b.quantity > poll.option_a.quantity {
            Ok(poll.option_b.quantity)
        } else {
            Err(ProgramError::CannotPayoutToLosers)
        }
    } else {
        Err(ProgramError::InvalidTallyKey)
    }
}
