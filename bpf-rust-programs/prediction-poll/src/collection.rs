use crate::result::Result;
use crate::simple_serde::SimpleSerde;
use serde::{Deserialize, Serialize};
use solana_sdk_bpf_utils::entrypoint::*;

#[repr(C)]
#[derive(Debug, Default, Clone, Serialize, Deserialize, PartialEq)]
pub struct Collection {}

impl SimpleSerde for Collection {}
