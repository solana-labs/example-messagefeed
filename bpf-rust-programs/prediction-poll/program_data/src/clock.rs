pub struct ClockData {
    pub slot: u64,
}

impl ClockData {
    pub fn from_bytes(data: &[u8]) -> Self {
        Self {
            slot: u64::from_le_bytes(*array_ref!(data, 0, 8)),
        }
    }
}
