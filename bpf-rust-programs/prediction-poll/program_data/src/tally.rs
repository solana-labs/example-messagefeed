use crate::DataType;
use alloc::slice::from_raw_parts_mut;
use solana_sdk_bpf_utils::entrypoint::SolPubkey;

type Tally = [u8; 40]; // SolPubkey, u64

pub const MIN_TALLY_SIZE: usize = 1 + 4 + 40; // Room for 1 tally

pub struct TallyData<'a> {
    pub data_type: DataType,
    pub tally_count: &'a mut u32,
    pub tallies: &'a mut [Tally],
}

impl<'a> TallyData<'a> {
    pub fn from_bytes(data: &'a mut [u8]) -> Self {
        let (data_type, data) = data.split_at_mut(1);
        let (tally_count, data) = data.split_at_mut(4);
        Self {
            data_type: DataType::from(data_type[0]),
            tally_count: unsafe { &mut *(&mut tally_count[0] as *mut u8 as *mut u32) },
            tallies: unsafe {
                from_raw_parts_mut(&mut data[0] as *mut u8 as *mut _, data.len() / 40)
            },
        }
    }
}

impl TallyData<'_> {
    pub fn get_wager_mut(&mut self, user_key: &SolPubkey) -> Option<&mut [u8; 8]> {
        for t in 0..self.len() {
            let key = array_ref!(self.tallies[t], 0, 32);
            if key == user_key {
                return Some(array_mut_ref!(self.tallies[t], 32, 8));
            }
        }
        return None;
    }

    pub fn capacity(&self) -> usize {
        self.tallies.len()
    }

    pub fn len(&self) -> usize {
        *self.tally_count as usize
    }

    pub fn add_tally(&mut self, user_key: &SolPubkey, wager: u64) {
        self.tallies[self.len()][..32].clone_from_slice(user_key);
        self.tallies[self.len()][32..].clone_from_slice(&wager.to_le_bytes());
        *self.tally_count += 1;
    }

    pub fn iter(&self) -> impl Iterator<Item = (&SolPubkey, u64)> {
        self.tallies[..self.len()].iter().map(|t| {
            let key = array_ref!(t, 0, 32);
            let wager = u64::from_le_bytes(*array_ref!(t, 32, 8));
            (key, wager)
        })
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    pub fn add_tally() {
        let user_key = [0; 32];
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
        assert_eq!(tally.iter().next(), Some((&user_key, wager)));
    }
}
