use alloc::vec::Vec;
use solana_sdk_bpf_utils::entrypoint::SolPubkey;

pub struct CollectionData<'a> {
    poll_count: &'a mut u32,
    polls: &'a mut [SolPubkey],
}

impl<'a> CollectionData<'a> {
    pub fn from_bytes(data: &'a mut [u8]) -> Self {
        let (_, data) = data.split_at_mut(1); // Ignore data type
        let (poll_count, polls) = data.split_at_mut(4);
        Self {
            poll_count: unsafe { &mut *(&mut poll_count[0] as *mut u8 as *mut u32) },
            polls: unsafe { core::mem::transmute::<&mut [u8], &mut [SolPubkey]>(polls) },
        }
    }
}

impl CollectionData<'_> {
    pub fn contains(&self, poll: &SolPubkey) -> bool {
        for i in 0..*self.poll_count {
            if self.polls[i as usize] == *poll {
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
        self.polls[*self.poll_count as usize].clone_from_slice(poll);
        *self.poll_count += 1;
    }

    pub fn to_vec(&self) -> Vec<SolPubkey> {
        self.polls[..self.len()].to_vec()
    }
}
