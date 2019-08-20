use prediction_poll_data::ClockData;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Clock {
    pub slot: u64,
}

#[wasm_bindgen]
impl Clock {
    #[wasm_bindgen(js_name = fromData)]
    pub fn from_data(val: &[u8]) -> Self {
        console_error_panic_hook::set_once();
        Clock {
            slot: ClockData::from_bytes(val).slot,
        }
    }
}
