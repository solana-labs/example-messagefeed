use alloc::boxed::Box;
use alloc::vec::Vec;
use js_sys::Uint8Array;
use prediction_poll_data::CollectionData;
use solana_sdk::pubkey::Pubkey;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Collection {
    polls: Vec<Pubkey>,
}

impl From<CollectionData<'_>> for Collection {
    fn from(collection_data: CollectionData) -> Self {
        Collection {
            polls: collection_data.to_vec(),
        }
    }
}

#[wasm_bindgen]
impl Collection {
    #[wasm_bindgen(js_name = getPolls)]
    pub fn get_polls(&self) -> Box<[JsValue]> {
        let js_polls: Vec<_> = self
            .polls
            .iter()
            .map(|k| Uint8Array::from(k.as_ref()).into())
            .collect();
        js_polls.into_boxed_slice()
    }

    #[wasm_bindgen(js_name = getPollCount)]
    pub fn get_poll_count(&self) -> usize {
        self.polls.len()
    }

    #[wasm_bindgen(js_name = fromData)]
    pub fn from_data(val: &mut [u8]) -> Self {
        console_error_panic_hook::set_once();
        CollectionData::from_bytes(val).into()
    }
}
