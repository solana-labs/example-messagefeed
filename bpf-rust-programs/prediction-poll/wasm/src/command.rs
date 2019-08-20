use crate::InitPoll;
use alloc::boxed::Box;
use prediction_poll_data::CommandData;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Command;

#[wasm_bindgen]
impl Command {
    #[wasm_bindgen(js_name = initCollection)]
    pub fn init_collection() -> Box<[u8]> {
        vec![(CommandData::InitCollection as u8).to_be()].into_boxed_slice()
    }

    #[wasm_bindgen(js_name = initPoll)]
    pub fn init_poll(init_poll: InitPoll) -> Box<[u8]> {
        let mut bytes = init_poll.to_data().to_bytes();
        bytes.insert(0, (CommandData::InitPoll as u8).to_be());
        bytes.into_boxed_slice()
    }

    #[wasm_bindgen(js_name = submitClaim)]
    pub fn submit_claim() -> Box<[u8]> {
        vec![(CommandData::SubmitClaim as u8).to_be()].into_boxed_slice()
    }

    #[wasm_bindgen(js_name = submitVote)]
    pub fn submit_vote() -> Box<[u8]> {
        vec![(CommandData::SubmitVote as u8).to_be()].into_boxed_slice()
    }
}
