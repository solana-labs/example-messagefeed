use alloc::boxed::Box;
use alloc::vec::Vec;
use js_sys::Uint8Array;
use prediction_poll_data::TallyData;
use solana_sdk_types::SolPubkey;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Tally {
    keys: Vec<SolPubkey>,
    values: Vec<u64>,
}

impl From<TallyData<'_>> for Tally {
    fn from(tally_data: TallyData) -> Self {
        let mut keys = Vec::with_capacity(*tally_data.len as usize);
        let mut values = Vec::with_capacity(*tally_data.len as usize);
        for t in 0..*tally_data.len as usize {
            let key = *array_ref!(tally_data.tallies[t], 0, 32);
            let value = array_ref!(tally_data.tallies[t], 32, 8);
            let value = u64::from_be_bytes(*value);
            keys.push(key);
            values.push(value);
        }

        Self { keys, values }
    }
}

#[wasm_bindgen]
impl Tally {
    #[wasm_bindgen(js_name = fromData)]
    pub fn from_data(val: &mut [u8]) -> Self {
        console_error_panic_hook::set_once();
        TallyData::from_bytes(val).into()
    }

    #[wasm_bindgen(method, getter)]
    pub fn keys(&self) -> Box<[JsValue]> {
        let js_keys: Vec<_> = self
            .keys
            .iter()
            .map(|k| Uint8Array::from(&k[..]).into())
            .collect();
        js_keys.into_boxed_slice()
    }
}
