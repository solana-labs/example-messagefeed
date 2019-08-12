use serde::{Deserialize, Serialize};
use solana_sdk_types::SolPubkey;
#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[repr(C)]
#[cfg_attr(feature="wasm", wasm_bindgen)]
#[derive(Debug, Default, Clone, Serialize, Deserialize, PartialEq)]
pub struct Collection<'a> {
    // #[wasm_bindgen(skip)]
    pub polls: &'a [SolPubkey],

}

#[cfg_attr(feature="wasm", wasm_bindgen)]
impl Collection<'_> {
    #[cfg(feature = "wasm")]
    #[wasm_bindgen(js_name = getPolls)]
    pub fn get_polls(&self) -> JsValue {
        JsValue::from_serde(&self.polls).unwrap()
    }

    #[cfg(feature = "wasm")]
    #[wasm_bindgen(js_name = fromData)]
    pub fn from_polls(val: JsValue) -> Self {
        console_error_panic_hook::set_once();
        let array = js_sys::Uint8Array::from(val);
        let mut dst: Vec<u8> = vec![0; array.length() as usize];
        array.copy_to(&mut dst);

        let s: &Self = unsafe { &*(&dst[0] as *const u8 as *const Self) };
        let c = (*s).clone();
        c
    }
}
