use solana_sdk_bpf_utils::info;

#[derive(Debug)]
pub enum ProgramError {
    InvalidInput,
}

pub type ProgramResult<T> = core::result::Result<T, ProgramError>;

impl ProgramError {
    pub fn print(&self) {
        match self {
            ProgramError::InvalidInput => info!("Error: InvalidInput"),
        }
    }
}
