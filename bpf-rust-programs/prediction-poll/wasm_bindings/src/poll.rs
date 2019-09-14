use alloc::borrow::ToOwned;
use alloc::string::{String, ToString};
use core::convert::TryFrom;
use core::str::from_utf8;
use js_sys::Uint8Array;
use prediction_poll_data::PollData;
use solana_sdk::pubkey::Pubkey;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Poll {
    creator_key: Pubkey,
    header: String,
    option_a: PollOption,
    option_b: PollOption,
    pub last_block: u32, // u64, https://caniuse.com/#feat=bigint
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct PollOption {
    text: String,
    pub quantity: u32, // u64, https://caniuse.com/#feat=bigint
    tally_key: Pubkey,
}

impl From<PollData<'_>> for Poll {
    fn from(poll_data: PollData) -> Self {
        Self {
            creator_key: poll_data.creator_key.to_owned(),
            header: from_utf8(poll_data.header).unwrap().to_string(),
            option_a: PollOption {
                text: from_utf8(poll_data.option_a.text).unwrap().to_string(),
                quantity: u32::try_from(poll_data.option_a.quantity.to_owned()).unwrap(),
                tally_key: poll_data.option_a.tally_key.to_owned(),
            },
            option_b: PollOption {
                text: from_utf8(poll_data.option_b.text).unwrap().to_string(),
                quantity: u32::try_from(poll_data.option_b.quantity.to_owned()).unwrap(),
                tally_key: poll_data.option_b.tally_key.to_owned(),
            },
            last_block: u32::try_from(poll_data.last_block.to_owned()).unwrap(),
        }
    }
}

#[wasm_bindgen]
impl Poll {
    #[wasm_bindgen(js_name = fromData)]
    pub fn from_data(val: &mut [u8]) -> Self {
        console_error_panic_hook::set_once();
        PollData::from_bytes(val).into()
    }

    #[wasm_bindgen(method, getter, js_name = creatorKey)]
    pub fn creator_key(&self) -> JsValue {
        Uint8Array::from(&self.creator_key.as_ref()[..]).into()
    }

    #[wasm_bindgen(method, getter)]
    pub fn header(&self) -> String {
        self.header.clone()
    }

    #[wasm_bindgen(method, getter, js_name = optionA)]
    pub fn option_a(&self) -> PollOption {
        self.option_a.clone()
    }

    #[wasm_bindgen(method, getter, js_name = optionB)]
    pub fn option_b(&self) -> PollOption {
        self.option_b.clone()
    }
}

#[wasm_bindgen]
impl PollOption {
    #[wasm_bindgen(method, getter)]
    pub fn text(&self) -> String {
        self.text.clone()
    }

    #[wasm_bindgen(method, getter, js_name = tallyKey)]
    pub fn tally_key(&self) -> JsValue {
        Uint8Array::from(&self.tally_key.as_ref()[..]).into()
    }
}
