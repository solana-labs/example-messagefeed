use crate::result::PollError;
use prediction_poll_data::PollData;
use solana_sdk::{entrypoint::ProgramResult, program_error::ProgramError, pubkey::Pubkey};

pub fn record_wager(poll: &mut PollData, tally_pubkey: &Pubkey, wager: u64) -> ProgramResult {
    let (selected, unselected) = if poll.option_a.tally_key == *tally_pubkey {
        (&mut poll.option_a, &mut poll.option_b)
    } else if poll.option_b.tally_key == *tally_pubkey {
        (&mut poll.option_b, &mut poll.option_a)
    } else {
        return Err(PollError::InvalidTallyKey.into());
    };

    if *selected.quantity + wager == *unselected.quantity {
        return Err(PollError::PollCannotBeEven.into());
    }

    *selected.quantity += wager;
    Ok(())
}

pub fn check_winning_tally(poll: &PollData, tally_pubkey: &Pubkey) -> Result<u64, ProgramError> {
    if poll.option_a.tally_key == *tally_pubkey {
        if *poll.option_a.quantity > *poll.option_b.quantity {
            Ok(*poll.option_a.quantity)
        } else {
            Err(PollError::CannotPayoutToLosers.into())
        }
    } else if poll.option_b.tally_key == *tally_pubkey {
        if *poll.option_b.quantity > *poll.option_a.quantity {
            Ok(*poll.option_b.quantity)
        } else {
            Err(PollError::CannotPayoutToLosers.into())
        }
    } else {
        Err(PollError::InvalidTallyKey.into())
    }
}
