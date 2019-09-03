#![no_std]

#[cfg_attr(test, macro_use)]
extern crate alloc;
#[macro_use]
extern crate arrayref;
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
#[derive(Copy, Clone)]
#[cfg_attr(test, derive(PartialEq, Debug))]
pub enum DataType {
    Unset,
    Collection,
    Poll,
    Tally,
    Invalid,
}

impl From<u8> for DataType {
    fn from(value: u8) -> Self {
        match value {
            0 => DataType::Unset,
            1 => DataType::Collection,
            2 => DataType::Poll,
            3 => DataType::Tally,
            _ => DataType::Invalid,
        }
    }
}
