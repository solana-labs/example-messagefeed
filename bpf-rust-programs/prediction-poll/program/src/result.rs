use num_derive::FromPrimitive;
use num_traits::FromPrimitive;
use solana_sdk::{
    info,
    program_error::{PrintProgramError, ProgramError},
    program_utils::DecodeError,
};
use thiserror::Error;

#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum PollError {
    #[error("todo")]
    AccountNotNew,
    #[error("todo")]
    CannotPayoutToLosers,
    #[error("todo")]
    InvalidAccount,
    #[error("todo")]
    InvalidDataType,
    #[error("todo")]
    InvalidInput,
    #[error("todo")]
    InvalidKey,
    #[error("todo")]
    InvalidCommand,
    #[error("todo")]
    InvalidTallyKey,
    #[error("todo")]
    InvalidPayoutList,
    #[error("todo")]
    MaxPollCapacity,
    #[error("todo")]
    MaxTallyCapacity,
    #[error("todo")]
    PollAlreadyCreated,
    #[error("todo")]
    PollAlreadyFinished,
    #[error("todo")]
    PollNotFinished,
    #[error("todo")]
    PollHasNoFunds,
    #[error("todo")]
    PollCannotBeEven,
    #[error("todo")]
    WagerHasNoFunds,
}
impl From<PollError> for ProgramError {
    fn from(e: PollError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
impl<T> DecodeError<T> for PollError {
    fn type_of() -> &'static str {
        "ProgramError"
    }
}
impl PrintProgramError for PollError {
    fn print<E>(&self)
    where
        E: 'static + std::error::Error + DecodeError<E> + PrintProgramError + FromPrimitive,
    {
        match self {
            PollError::AccountNotNew => info!("Error: todo"),
            PollError::CannotPayoutToLosers => info!("Error: todo"),
            PollError::InvalidAccount => info!("Error: todo"),
            PollError::InvalidDataType => info!("Error: todo"),
            PollError::InvalidInput => info!("Error: todo"),
            PollError::InvalidKey => info!("Error: todo"),
            PollError::InvalidCommand => info!("Error: todo"),
            PollError::InvalidTallyKey => info!("Error: todo"),
            PollError::InvalidPayoutList => info!("Error: todo"),
            PollError::MaxPollCapacity => info!("Error: todo"),
            PollError::MaxTallyCapacity => info!("Error: todo"),
            PollError::PollAlreadyCreated => info!("Error: todo"),
            PollError::PollAlreadyFinished => info!("Error: todo"),
            PollError::PollNotFinished => info!("Error: todo"),
            PollError::PollHasNoFunds => info!("Error: todo"),
            PollError::PollCannotBeEven => info!("Error: todo"),
            PollError::WagerHasNoFunds => info!("Error: todo"),
        }
    }
}
