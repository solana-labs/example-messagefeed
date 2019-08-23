use solana_sdk_bpf_utils::info;

#[derive(Debug)]
pub enum ProgramError {
    AccountNotNew,
    AccountDataTooSmall,
    CannotPayoutToLosers,
    CannotPayoutToSubset,
    InvalidAccount,
    InvalidDataType,
    InvalidInput,
    InvalidKey,
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
    WagerHasNoFunds,
}

pub type ProgramResult<T> = core::result::Result<T, ProgramError>;

impl ProgramError {
    pub fn print(&self) {
        match self {
            ProgramError::AccountNotNew => info!("Error: AccountNotNew"),
            ProgramError::AccountDataTooSmall => info!("Error: AccountDataTooSmall"),
            ProgramError::CannotPayoutToLosers => info!("Error: CannotPayoutToLosers"),
            ProgramError::CannotPayoutToSubset => info!("Error: CannotPayoutToSubset"),
            ProgramError::InvalidAccount => info!("Error: InvalidAccount"),
            ProgramError::InvalidDataType => info!("Error: InvalidDataType"),
            ProgramError::InvalidInput => info!("Error: InvalidInput"),
            ProgramError::InvalidCommand => info!("Error: InvalidCommand"),
            ProgramError::InvalidKey => info!("Error: InvalidKey"),
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
            ProgramError::WagerHasNoFunds => info!("Error: WagerHasNoFunds"),
        }
    }
}
