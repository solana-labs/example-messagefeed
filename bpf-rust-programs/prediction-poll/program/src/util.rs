use crate::result::PollError;
use prediction_poll_data::DataType;
use solana_sdk::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
    pubkey::Pubkey,
};

pub fn expect_signed(account: &AccountInfo) -> ProgramResult {
    if !account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    Ok(())
}

pub fn expect_owned_by(account: &AccountInfo, key: &Pubkey) -> ProgramResult {
    if account.owner != key {
        return Err(PollError::InvalidAccount.into());
    }
    Ok(())
}

pub fn expect_data_type(account: &AccountInfo, data_type: DataType) -> ProgramResult {
    if DataType::from(account.data.borrow()[0]) as u8 != data_type as u8 {
        return Err(PollError::InvalidDataType.into());
    }
    Ok(())
}

pub fn expect_new_account(account: &AccountInfo) -> ProgramResult {
    expect_data_type(account, DataType::Unset).map_err(|_| PollError::AccountNotNew.into())
}

pub fn expect_key(account: &AccountInfo, key: &Pubkey) -> ProgramResult {
    if account.key != key {
        return Err(PollError::InvalidKey.into());
    }
    Ok(())
}

pub fn expect_min_size(data: &[u8], min_size: usize) -> ProgramResult {
    if data.len() < min_size {
        return Err(ProgramError::AccountDataTooSmall);
    }
    Ok(())
}

pub fn expect_gt<T: PartialOrd>(left: T, right: T) -> ProgramResult {
    if left <= right {
        return Err(PollError::InvalidInput.into());
    }
    Ok(())
}
