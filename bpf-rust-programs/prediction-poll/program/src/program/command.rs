use serde::{Deserialize, Serialize};
use crate::simple_serde::SimpleSerde;

#[repr(C)]
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Command {
    InitCollection,
    InitPoll,
}
impl SimpleSerde for Command {}
