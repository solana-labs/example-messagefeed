use prediction_poll_data::ClockData;
use wasm_bindgen::prelude::*;
use core::convert::TryFrom;

#[wasm_bindgen]
pub struct Clock {
    pub slot: u32, // u64, https://caniuse.com/#feat=bigint
}

#[wasm_bindgen]
impl Clock {
    #[wasm_bindgen(js_name = fromData)]
    pub fn from_data(val: &[u8]) -> Self {
        console_error_panic_hook::set_once();
        Clock {
            slot: u32::try_from(ClockData::from_bytes(val).slot).unwrap(),
        }
    }
}
