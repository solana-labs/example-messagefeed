use alloc::boxed::Box;
use alloc::vec::Vec;
use js_sys::Uint8Array;
use prediction_poll_data::TallyData;
use solana_sdk_bpf_utils::entrypoint::SolPubkey;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Tally {
    tallies: Vec<(SolPubkey, u64)>,
}

impl From<TallyData<'_>> for Tally {
    fn from(tally_data: TallyData) -> Self {
        Self {
            tallies: tally_data.iter().map(|(k, w)| (*k, w)).collect(),
        }
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
            .tallies
            .iter()
            .map(|(key, _)| Uint8Array::from(&key[..]).into())
            .collect();
        js_keys.into_boxed_slice()
    }

    #[wasm_bindgen(method, getter)]
    pub fn wagers(&self) -> Box<[u64]> {
        let js_wagers: Vec<_> = self
            .tallies
            .iter()
            .map(|(_, wager)| wager)
            .cloned()
            .collect();
        js_wagers.into_boxed_slice()
    }
}
