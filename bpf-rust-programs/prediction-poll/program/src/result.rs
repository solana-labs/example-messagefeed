use solana_sdk_bpf_utils::info;

#[derive(Debug)]
pub enum ProgramError {
    CannotPayoutToLosers,
    CannotPayoutToSubset,
    InvalidInput,
    InvalidCommand,
    InvalidTallyKey,
    InvalidPayoutOrder,
    MaxPollCapacity,
    MaxTallyCapacity,
    MissingSigner,
    PollAlreadyCreated,
    PollAlreadyFinished,
    PollNotFinished,
    PollHasNoFunds,
    PollCannotBeEven,
}

pub type ProgramResult<T> = core::result::Result<T, ProgramError>;

impl ProgramError {
    pub fn print(&self) {
        match self {
            ProgramError::CannotPayoutToLosers => info!("Error: CannotPayoutToLosers"),
            ProgramError::CannotPayoutToSubset => info!("Error: CannotPayoutToSubset"),
            ProgramError::InvalidInput => info!("Error: InvalidInput"),
            ProgramError::InvalidCommand => info!("Error: InvalidCommand"),
            ProgramError::InvalidTallyKey => info!("Error: InvalidTallyKey"),
            ProgramError::InvalidPayoutOrder => info!("Error: InvalidPayoutOrder"),
            ProgramError::MaxPollCapacity => info!("Error: MaxPollCapacity"),
            ProgramError::MaxTallyCapacity => info!("Error: MaxTallyCapacity"),
            ProgramError::MissingSigner => info!("Error: MissingSigner"),
            ProgramError::PollAlreadyCreated => info!("Error: PollAlreadyCreated"),
            ProgramError::PollAlreadyFinished => info!("Error: PollAlreadyFinished"),
            ProgramError::PollNotFinished => info!("Error: PollNotFinished"),
            ProgramError::PollHasNoFunds => info!("Error: PollHasNoFunds"),
            ProgramError::PollCannotBeEven => info!("Error: PollCannotBeEven"),
        }
    }
}
