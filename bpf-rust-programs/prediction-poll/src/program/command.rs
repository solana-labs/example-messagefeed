use crate::simple_serde::SimpleSerde;
use serde::{Deserialize, Serialize};

#[repr(C)]
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[allow(dead_code)]
pub enum Command {
    InitCollection,
    InitPoll,
}
impl SimpleSerde for Command {}
