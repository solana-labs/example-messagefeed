//! @brief Example message feed app

#![no_std]

use core::mem::size_of;
use core::panic::PanicInfo;
use core::slice::{from_raw_parts, from_raw_parts_mut};

// Panic handling
extern "C" {
    pub fn sol_panic_() -> !;
}
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    sol_log("Panic!");
    // TODO crashes! sol_log(_info.payload().downcast_ref::<&str>().unwrap());
    if let Some(location) = _info.location() {
        if !location.file().is_empty() {
            // TODO location.file() returns empty str, if we get here its been fixed
            sol_log(location.file());
            sol_log("location.file() is fixed!!");
            unsafe {
                sol_panic_();
            }
        }
        sol_log_64(0, 0, 0, location.line() as u64, location.column() as u64);
    } else {
        sol_log("Panic! but could not get location information");
    }
    unsafe {
        sol_panic_();
    }
}

extern "C" {
    fn sol_log_(message: *const u8);
}
/// Helper function that prints a string to stdout
#[inline(never)] // stack intensive, block inline so everyone does not incur
pub fn sol_log(message: &str) {
    // TODO This is extremely slow, do something better
    let mut buf: [u8; 128] = [0; 128];
    for (i, b) in message.as_bytes().iter().enumerate() {
        if i >= 126 {
            break;
        }
        buf[i] = *b;
    }
    unsafe {
        sol_log_(buf.as_ptr());
    }
}

extern "C" {
    fn sol_log_64_(arg1: u64, arg2: u64, arg3: u64, arg4: u64, arg5: u64);
}
/// Helper function that prints a 64 bit values represented in hexadecimal
/// to stdout
pub fn sol_log_64(arg1: u64, arg2: u64, arg3: u64, arg4: u64, arg5: u64) {
    unsafe {
        sol_log_64_(arg1, arg2, arg3, arg4, arg5);
    }
}

/// Prints the hexadecimal representation of a public key
///
/// @param key The public key to print
#[allow(dead_code)]
pub fn sol_log_key(key: &SolPubkey) {
    for (i, k) in key.key.iter().enumerate() {
        sol_log_64(0, 0, 0, i as u64, u64::from(*k));
    }
}

/// Prints the hexadecimal representation of a slice
///
/// @param slice The array to print
#[allow(dead_code)]
pub fn sol_log_slice(slice: &[u8]) {
    for (i, s) in slice.iter().enumerate() {
        sol_log_64(0, 0, 0, i as u64, u64::from(*s));
    }
}

/// Prints the hexadecimal representation of the program's input parameters
///
/// @param ka A pointer to an array of SolKeyedAccount to print
/// @param data A pointer to the instruction data to print
#[allow(dead_code)]
pub fn sol_log_params(ka: &[SolKeyedAccount], index: usize, data: &[u8]) {
    sol_log("- Number of KeyedAccounts");
    sol_log_64(0, 0, 0, 0, ka.len() as u64);
    sol_log("Reporting #");
    sol_log_64(0, 0, 0, 0, index as u64);
    // for k in ka.iter() {
    sol_log("- Is signer");
    sol_log_64(0, 0, 0, 0, ka[index].is_signer as u64);
    sol_log("- Key");
    sol_log_key(&ka[index].key);
    sol_log("- Lamports");
    sol_log_64(0, 0, 0, 0, ka[index].lamports);
    sol_log("- AccountData");
    sol_log_slice(ka[index].data);
    sol_log("- Owner");
    sol_log_key(&ka[index].owner);
    // }
    sol_log("- Instruction data");
    sol_log_slice(data);
}

pub fn sol_memcpy(dst: &mut [u8], src: &[u8], start: usize) {
    for (i, a) in src.iter().enumerate() {
        for (j, b) in dst.iter_mut().enumerate() {
            if i + start == j {
                *b = *a;
            }
        }
    }
}

pub fn sol_key_default(key: &SolPubkey) -> bool {
    for k in key.key.iter() {
        if *k != 0 {
            return false;
        }
    }
    true
}

pub const SIZE_PUBKEY: usize = 32;

/// Public key
pub struct SolPubkey<'a> {
    pub key: &'a [u8],
}

/// Keyed Account
pub struct SolKeyedAccount<'a> {
    /// Public key of the account
    pub key: SolPubkey<'a>,
    /// Public key of the account
    pub is_signer: bool,
    /// Number of lamports owned by this account
    pub lamports: u64,
    /// On-chain data within this account
    pub data: &'a mut [u8],
    /// Program that owns this account
    pub owner: SolPubkey<'a>,
}

#[no_mangle]
pub extern "C" fn entrypoint(input: *mut u8) -> bool {
    // const NUM_KA: usize = 2; // Number of KeyedAccounts expected
    let mut offset: usize = 0;

    // Number of KeyedAccounts present

    let num_ka = unsafe {
        #[allow(clippy::cast_ptr_alignment)]
        let num_ka_ptr: *const u64 = input.add(offset) as *const u64;
        *num_ka_ptr
    };
    offset += 8;

    if num_ka < 1 || num_ka > 2 {
        sol_log("Error: expecting 1 or 2 accounts");
        return false;
    }

    // KeyedAccounts

    let mut ka = {
        let is_signer = unsafe {
            #[allow(clippy::cast_ptr_alignment)]
            let is_signer_ptr: *const u64 = input.add(offset) as *const u64;
            if *is_signer_ptr == 0 {
                false
            } else {
                true
            }
        };
        offset += size_of::<u64>();

        let key_slice = unsafe { from_raw_parts(input.add(offset), SIZE_PUBKEY) };
        let key = SolPubkey { key: &key_slice };
        offset += SIZE_PUBKEY;

        let lamports = unsafe {
            #[allow(clippy::cast_ptr_alignment)]
            let lamports_ptr: *const u64 = input.add(offset) as *const u64;
            *lamports_ptr
        };
        offset += size_of::<u64>();

        let data_length = unsafe {
            #[allow(clippy::cast_ptr_alignment)]
            let data_length_ptr: *const u64 = input.add(offset) as *const u64;
            *data_length_ptr
        } as usize;
        offset += size_of::<u64>();

        let data = unsafe { from_raw_parts_mut(input.add(offset), data_length) };
        offset += data_length;

        let owner_slice = unsafe { from_raw_parts(input.add(offset), SIZE_PUBKEY) };
        let owner = SolPubkey { key: &owner_slice };
        offset += SIZE_PUBKEY;

        if num_ka > 1 {
            let is_signer2 = unsafe {
                #[allow(clippy::cast_ptr_alignment)]
                let is_signer_ptr: *const u64 = input.add(offset) as *const u64;
                if *is_signer_ptr == 0 {
                    false
                } else {
                    true
                }
            };
            offset += size_of::<u64>();

            let key_slice = unsafe { from_raw_parts(input.add(offset), SIZE_PUBKEY) };
            let key2 = SolPubkey { key: &key_slice };
            offset += SIZE_PUBKEY;

            let lamports2 = unsafe {
                #[allow(clippy::cast_ptr_alignment)]
                let lamports_ptr: *const u64 = input.add(offset) as *const u64;
                *lamports_ptr
            };
            offset += size_of::<u64>();

            let data_length2 = unsafe {
                #[allow(clippy::cast_ptr_alignment)]
                let data_length_ptr: *const u64 = input.add(offset) as *const u64;
                *data_length_ptr
            } as usize;
            offset += size_of::<u64>();

            let data2 = unsafe { from_raw_parts_mut(input.add(offset), data_length2) };
            offset += data_length2;

            let owner_slice = unsafe { from_raw_parts(input.add(offset), SIZE_PUBKEY) };
            let owner2 = SolPubkey { key: &owner_slice };
            offset += SIZE_PUBKEY;

            [
                SolKeyedAccount {
                    key,
                    is_signer,
                    lamports,
                    data,
                    owner,
                },
                SolKeyedAccount {
                    key: key2,
                    is_signer: is_signer2,
                    lamports: lamports2,
                    data: data2,
                    owner: owner2,
                },
            ]
        } else {
            let data2 = &mut [0_u8; 0];
            [
                SolKeyedAccount {
                    key,
                    is_signer,
                    lamports,
                    data,
                    owner,
                },
                SolKeyedAccount {
                    key: SolPubkey { key: &[0_u8; 0] },
                    is_signer: false,
                    lamports: 0,
                    data: data2,
                    owner: SolPubkey { key: &[0_u8; 0] },
                },
            ]
        }
    };

    // Instruction data

    let data_length = unsafe {
        #[allow(clippy::cast_ptr_alignment)]
        let data_length_ptr: *const u64 = input.add(offset) as *const u64;
        *data_length_ptr
    } as usize;
    offset += size_of::<u64>();

    let data = unsafe { from_raw_parts(input.add(offset), data_length) };

    // Call user implementable function

    process(num_ka, &mut ka, &data)
}

// User defined program

fn process(num_ka: u64, ka: &mut [SolKeyedAccount], data: &[u8]) -> bool {
    sol_log("message feed entrypoint");

    if !ka[0].is_signer {
        sol_log("Error: not signed by key 0");
        return false;
    }

    if !ka[1].is_signer {
        sol_log("Error: not signed by key 1");
        return false;
    }

    // No instruction data means that a new user account should be initialized
    if data.len() == 0 {
        sol_memcpy(&mut ka[0].data, &ka[1].key.key, 1);
        return true;
    }

    // Record the message into account 1
    if ka[1].data.len() - 3 * SIZE_PUBKEY < data.len() {
        sol_log("Error: account data to small to hold message");
        return false;
    }
    sol_memcpy(&mut ka[1].data, &data, 3 * SIZE_PUBKEY);

    // Save the pubkey of who posted the message into account 1
    sol_memcpy(&mut ka[1].data, &ka[0].key.key, SIZE_PUBKEY);

    if num_ka > 2 {
        if !sol_key_default(&SolPubkey { key: &ka[2].data }) {
            sol_log("Error: account 1 is already linked");
            return false;
        }

        // Link the next_message field of account 2 to account 1
        sol_memcpy(&mut ka[2].data, &ka[1].key.key, 0);

        // Propagate the chain creator to the new message
        let mut creator = [0; SIZE_PUBKEY];
        sol_memcpy(&mut creator, &ka[2].data, 0);
        sol_memcpy(&mut ka[1].data, &creator, 2 * SIZE_PUBKEY);
    } else {
        // This is the first message in the chain, it is the "creator"
        sol_memcpy(&mut ka[1].data, &ka[1].key.key, 2 * SIZE_PUBKEY);
    }

    // TODO: Add SolPubkey_same() equivalent and uncomment:
    /*
    if (!SolPubkey_same(&user_data->creator, &new_message_data->creator)) {
        sol_log("user_data/new_message_data creator mismatch");
        return false;
    }
    */

    // Check if a user should be banned
    if num_ka > 3 {
        sol_memcpy(&mut ka[3].data, &[1], 0);
    }

    true
}
