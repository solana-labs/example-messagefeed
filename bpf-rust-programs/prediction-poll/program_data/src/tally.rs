type Tally = [u8; 40]; // SolPubkey, u64

pub struct TallyData<'a> {
    pub len: &'a mut u32,
    pub tallies: &'a mut [Tally],
}

impl<'a> TallyData<'a> {
    pub fn length(&self) -> usize {
        (4 + *self.len * 40) as usize
    }

    pub fn from_bytes(data: &'a mut [u8]) -> Self {
        let (len, tallies) = data.split_at_mut(4);
        Self {
            len: unsafe { &mut *(&mut len[0] as *mut u8 as *mut u32) },
            tallies: unsafe { core::mem::transmute::<&mut [u8], &mut [Tally]>(tallies) },
        }
    }
}
