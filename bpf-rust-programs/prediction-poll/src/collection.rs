use crate::simple_serde::SimpleSerde;
use serde::{Deserialize, Serialize};

#[repr(C)]
#[derive(Debug, Default, Clone, Serialize, Deserialize, PartialEq)]
pub struct Collection {}

impl SimpleSerde for Collection {}
