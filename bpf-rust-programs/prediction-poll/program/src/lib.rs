//! @brief Example prediction poll app

extern crate alloc;
extern crate solana_sdk;

mod program;
mod result;
mod util;

use program::process_instruction;
use result::PollError;
use solana_sdk::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult,
    program_error::PrintProgramError, pubkey::Pubkey,
};

entrypoint!(_entrypoint);
fn _entrypoint(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if let Err(error) = process_instruction(program_id, accounts, instruction_data) {
        // catch the error so we can print it
        error.print::<PollError>();
        return Err(error);
    }
    Ok(())
}

// Pulls in the stubs required for `info!()`
#[cfg(not(target_arch = "bpf"))]
solana_sdk_bpf_test::stubs!();
