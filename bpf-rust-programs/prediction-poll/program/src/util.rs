use crate::result::{ProgramError, ProgramResult};
use prediction_poll_data::DataType;
use solana_sdk::{account_info::AccountInfo, pubkey::Pubkey};

pub fn expect_n_accounts(info: &mut [AccountInfo], n: usize) -> ProgramResult<()> {
    if info.len() < n {
        Err(ProgramError::InvalidInput)
    } else {
        Ok(())
    }
}

pub fn expect_signed(account: &AccountInfo) -> ProgramResult<()> {
    if !account.is_signer {
        return Err(ProgramError::MissingSigner);
    }
    Ok(())
}

pub fn expect_owned_by(account: &AccountInfo, key: &Pubkey) -> ProgramResult<()> {
    if account.owner != key {
        return Err(ProgramError::InvalidAccount);
    }
    Ok(())
}

pub fn expect_data_type(account: &AccountInfo, data_type: DataType) -> ProgramResult<()> {
    if DataType::from(account.data[0]) as u8 != data_type as u8 {
        return Err(ProgramError::InvalidDataType);
    }
    Ok(())
}

pub fn expect_new_account(account: &AccountInfo) -> ProgramResult<()> {
    expect_data_type(account, DataType::Unset).map_err(|_| ProgramError::AccountNotNew)
}

pub fn expect_key(account: &AccountInfo, key: &Pubkey) -> ProgramResult<()> {
    if account.key != key {
        return Err(ProgramError::InvalidKey);
    }
    Ok(())
}

pub fn expect_min_size(data: &[u8], min_size: usize) -> ProgramResult<()> {
    if data.len() < min_size {
        return Err(ProgramError::AccountDataTooSmall);
    }
    Ok(())
}

pub fn expect_gt<T: PartialOrd>(left: T, right: T) -> ProgramResult<()> {
    if left <= right {
        return Err(ProgramError::InvalidInput);
    }
    Ok(())
}
