#![no_std]

#[macro_use]
extern crate alloc;
extern crate arrayref;
#[cfg(feature = "wasm")]
extern crate console_error_panic_hook;
#[cfg(feature = "bpf")]
extern crate solana_sdk_bpf_no_std;
#[cfg(feature = "wasm")]
extern crate std;

mod collection;

pub use collection::*;
