#![no_std]

/// Public key
pub type SolPubkey = [u8; 32];

/// Keyed Account
pub struct SolKeyedAccount<'a> {
    /// Public key of the account
    pub key: &'a SolPubkey,
    /// Public key of the account
    pub is_signer: bool,
    /// Number of lamports owned by this account
    pub lamports: u64,
    /// On-chain data within this account
    pub data: &'a mut [u8],
    /// Program that owns this account
    pub owner: &'a SolPubkey,
}

/// Information about the state of the cluster immediately before the program
/// started executing the current instruction
pub struct SolClusterInfo<'a> {
    /// program_id of the currently executing program
    pub program_id: &'a SolPubkey,
}
