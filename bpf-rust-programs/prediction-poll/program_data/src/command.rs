use core::convert::TryFrom;

#[repr(u8)]
pub enum CommandData {
    InitCollection,
    InitPoll,
    SubmitVote,
    SubmitClaim,
}

impl TryFrom<u8> for CommandData {
    type Error = ();

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(CommandData::InitCollection),
            1 => Ok(CommandData::InitPoll),
            2 => Ok(CommandData::SubmitVote),
            3 => Ok(CommandData::SubmitClaim),
            _ => Err(()),
        }
    }
}
