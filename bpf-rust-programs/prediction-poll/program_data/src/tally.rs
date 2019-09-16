use crate::DataType;
use alloc::slice::from_raw_parts_mut;
use solana_sdk::pubkey::Pubkey;

type Tally = [u8; 40]; // Pubkey, u64

/// Min data size for a tally
/// Breakdown: data_type (1) + tally_count (4) + one tally (40)
pub const MIN_TALLY_SIZE: usize = 1 + 4 + 40;

pub struct TallyData<'a> {
    pub data_type: DataType,
    pub tally_count: &'a mut u32,
    pub tallies: &'a mut [Tally],
}

impl<'a> TallyData<'a> {
    pub fn from_bytes(data: &'a mut [u8]) -> Self {
        let (data_type, data) = data.split_at_mut(1);
        let (tally_count, data) = data.split_at_mut(4);
        #[allow(clippy::cast_ptr_alignment)]
        let tally_count = unsafe { &mut *(&mut tally_count[0] as *mut u8 as *mut u32) };
        Self {
            data_type: DataType::from(data_type[0]),
            tally_count,
            tallies: unsafe {
                from_raw_parts_mut(&mut data[0] as *mut u8 as *mut _, data.len() / 40)
            },
        }
    }
}

impl TallyData<'_> {
    pub fn get_wager_mut(&mut self, user_key: &Pubkey) -> Option<&mut [u8; 8]> {
        for t in 0..self.len() {
            let key = Pubkey::new(array_ref!(self.tallies[t], 0, 32));
            if key == *user_key {
                return Some(array_mut_ref!(self.tallies[t], 32, 8));
            }
        }
        None
    }

    pub fn capacity(&self) -> usize {
        self.tallies.len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn len(&self) -> usize {
        *self.tally_count as usize
    }

    pub fn add_tally(&mut self, user_key: &Pubkey, wager: u64) {
        let next_tally = self.len();
        self.tallies[next_tally][..32].copy_from_slice(user_key.as_ref());
        self.tallies[next_tally][32..].copy_from_slice(&wager.to_le_bytes());
        *self.tally_count += 1;
    }

    pub fn iter(&self) -> impl Iterator<Item = (Pubkey, u64)> + '_ {
        self.tallies[..self.len()].iter().map(|tally| {
            let key = Pubkey::new(&tally[..32]);
            let wager = u64::from_le_bytes(*array_ref!(tally, 32, 8));
            (key, wager)
        })
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    pub fn add_tally() {
        let user_key = Pubkey::new(&[0; 32]);
        let wager = 100;
        let mut data = vec![0; MIN_TALLY_SIZE];
        let mut tally = TallyData::from_bytes(&mut data[..]);

        assert_eq!(tally.len(), 0);
        assert_eq!(tally.capacity(), 1);
        assert_eq!(tally.get_wager_mut(&user_key), None);
        assert_eq!(tally.iter().next(), None);

        tally.add_tally(&user_key, wager);

        assert_eq!(tally.len(), 1);
        assert_eq!(tally.capacity(), 1);
        assert_eq!(
            tally.get_wager_mut(&user_key).copied(),
            Some(wager.to_le_bytes())
        );

        let mut tally_iter = tally.iter();
        assert_eq!(tally_iter.next(), Some((user_key, wager)));
        assert_eq!(tally_iter.next(), None);
    }
}
