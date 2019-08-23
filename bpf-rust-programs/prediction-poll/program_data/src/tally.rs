use crate::DataType;

type Tally = [u8; 40]; // SolPubkey, u64

pub const MIN_TALLY_SIZE: usize = 1 + 4 + 40; // Room for 1 tally

pub struct TallyData<'a> {
    pub data_type: DataType,
    pub len: &'a mut u32,
    pub tallies: &'a mut [Tally],
}

impl<'a> TallyData<'a> {
    pub fn from_bytes(data: &'a mut [u8]) -> Self {
        let (data_type, data) = data.split_at_mut(1);
        let (len, tallies) = data.split_at_mut(4);
        Self {
            data_type: DataType::from(data_type[0]),
            len: unsafe { &mut *(&mut len[0] as *mut u8 as *mut u32) },
            tallies: unsafe { core::mem::transmute::<&mut [u8], &mut [Tally]>(tallies) },
        }
    }
}
