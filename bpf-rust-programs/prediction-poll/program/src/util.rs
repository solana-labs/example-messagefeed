use crate::result::{ProgramError, ProgramResult};
use solana_sdk_bpf_utils::entrypoint::SolKeyedAccount;
use solana_sdk_bpf_utils::info;

pub fn expect_n_accounts(info: &mut [SolKeyedAccount], n: usize) -> ProgramResult<()> {
    if info.len() < n {
        info!("Incorrect number of accounts");
        Err(ProgramError::InvalidInput)
    } else {
        Ok(())
    }
}
