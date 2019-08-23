use crate::DataType;
use alloc::slice::from_raw_parts_mut;
use alloc::vec::Vec;
use solana_sdk_bpf_utils::entrypoint::SolPubkey;

pub const MIN_COLLECTION_SIZE: usize = 1 + 4 + 32; // Room for 1 poll

pub struct CollectionData<'a> {
    pub data_type: DataType,
    poll_count: &'a mut u32,
    polls: &'a mut [SolPubkey],
}

impl<'a> CollectionData<'a> {
    pub fn from_bytes(data: &'a mut [u8]) -> Self {
        let (data_type, data) = data.split_at_mut(1);
        let (poll_count, data) = data.split_at_mut(4);
        Self {
            data_type: DataType::from(data_type[0]),
            poll_count: unsafe { &mut *(&mut poll_count[0] as *mut u8 as *mut u32) },
            polls: unsafe {
                from_raw_parts_mut(&mut data[0] as *mut u8 as *mut _, data.len() / 32)
            },
        }
    }
}

impl CollectionData<'_> {
    pub fn contains(&self, poll: &SolPubkey) -> bool {
        for i in 0..self.len() {
            if self.polls[i] == *poll {
                return true;
            }
        }
        false
    }

    pub fn capacity(&self) -> usize {
        self.polls.len()
    }

    pub fn len(&self) -> usize {
        *self.poll_count as usize
    }

    pub fn add_poll(&mut self, poll: &SolPubkey) {
        self.polls[self.len()].clone_from_slice(poll);
        *self.poll_count += 1;
    }

    pub fn to_vec(&self) -> Vec<SolPubkey> {
        self.polls[..self.len()].to_vec()
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    pub fn add_poll() {
        let poll_key = [0; 32];
        let mut data = vec![0; MIN_COLLECTION_SIZE];
        let mut collection = CollectionData::from_bytes(&mut data[..]);

        assert_eq!(collection.len(), 0);
        assert_eq!(collection.capacity(), 1);
        assert!(!collection.contains(&poll_key));
        assert_eq!(collection.to_vec().len(), 0);

        collection.add_poll(&poll_key);

        assert_eq!(collection.len(), 1);
        assert_eq!(collection.capacity(), 1);
        assert!(collection.contains(&poll_key));
        assert_eq!(collection.to_vec()[0], poll_key);
    }
}
