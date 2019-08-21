#![no_std]

extern crate alloc;
#[macro_use]
extern crate arrayref;
#[cfg(feature = "bpf")]
extern crate solana_sdk_bpf_no_std;
#[cfg(feature = "wasm")]
extern crate wasm_bindgen;

mod clock;
mod collection;
mod command;
mod poll;
mod tally;

pub use clock::*;
pub use collection::*;
pub use command::*;
pub use poll::*;
pub use tally::*;

#[repr(u8)]
pub enum DataType {
    Invalid,
    Collection,
    Poll,
    Tally,
}

impl From<u8> for DataType {
    fn from(value: u8) -> Self {
        match value {
            1 => DataType::Collection,
            2 => DataType::Poll,
            3 => DataType::Tally,
            _ => DataType::Invalid,
        }
    }
}
