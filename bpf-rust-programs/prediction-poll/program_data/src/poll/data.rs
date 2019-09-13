use super::InitPollData;
use crate::DataType;
#[cfg(test)]
use alloc::vec::Vec;
use solana_sdk::pubkey::Pubkey;

#[cfg_attr(test, derive(PartialEq, Debug))]
pub struct PollData<'a> {
    pub data_type: DataType,
    pub creator_key: Pubkey,
    pub last_block: u64,
    pub header_len: u32,
    pub header: &'a [u8],
    pub option_a: PollOptionData<'a>,
    pub option_b: PollOptionData<'a>,
}

impl<'a> PollData<'a> {
    #[cfg(test)]
    pub fn length(&self) -> usize {
        (1 + 32 + 8 + 4 + self.header_len) as usize
            + self.option_a.length()
            + self.option_b.length()
    }

    #[cfg(test)]
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.length());
        bytes.push(self.data_type as u8);
        bytes.extend_from_slice(self.creator_key.as_ref());
        bytes.extend_from_slice(&self.last_block.to_le_bytes());
        bytes.extend_from_slice(&self.header_len.to_le_bytes());
        bytes.extend_from_slice(self.header);
        bytes.extend(self.option_a.to_bytes().into_iter());
        bytes.extend(self.option_b.to_bytes().into_iter());
        bytes
    }

    pub fn copy_to_bytes(
        dst: &'a mut [u8],
        init: InitPollData<'a>,
        creator_key: &'a Pubkey,
        tally_a_key: &'a Pubkey,
        tally_b_key: &'a Pubkey,
        slot: u64,
    ) {
        let (data_type, dst) = dst.split_at_mut(1);
        data_type[0] = DataType::Poll as u8;

        let (dst_creator_key, dst) = dst.split_at_mut(32);
        dst_creator_key.copy_from_slice(creator_key.as_ref());

        let last_block = slot + u64::from(init.timeout);
        let (dst_last_block, dst) = dst.split_at_mut(8);
        dst_last_block.copy_from_slice(&last_block.to_le_bytes());

        let (header_len, dst) = dst.split_at_mut(4);
        header_len.copy_from_slice(&init.header_len.to_le_bytes());
        let (header, dst) = dst.split_at_mut(init.header_len as usize);
        header.copy_from_slice(&init.header);

        let dst = PollOptionData::copy_to_bytes(dst, init.option_a, tally_a_key, 0);
        PollOptionData::copy_to_bytes(dst, init.option_b, tally_b_key, 0);
    }

    pub fn from_bytes(data: &'a mut [u8]) -> Self {
        let (data_type, data) = data.split_at_mut(1);
        let data_type = DataType::from(data_type[0]);

        let (creator_key, data) = data.split_at_mut(32);
        let creator_key = Pubkey::new(creator_key);

        let (last_block, data) = data.split_at_mut(8);
        let last_block = u64::from_le_bytes(*array_ref!(last_block, 0, 8));

        let (header_len, data) = data.split_at_mut(4);
        let header_len = u32::from_le_bytes(*array_ref!(header_len, 0, 4));
        let (header, data) = data.split_at_mut(header_len as usize);

        let (option_a, data) = PollOptionData::from_bytes(data);
        let (option_b, _) = PollOptionData::from_bytes(data);

        Self {
            data_type,
            creator_key,
            last_block,
            header_len,
            header,
            option_a,
            option_b,
        }
    }
}

#[cfg_attr(test, derive(PartialEq, Debug))]
pub struct PollOptionData<'a> {
    pub text_len: u32,
    pub text: &'a [u8],
    pub tally_key: Pubkey,
    pub quantity: &'a mut u64,
}

impl<'a> PollOptionData<'a> {
    #[cfg(test)]
    pub fn length(&self) -> usize {
        (4 + self.text_len + 32 + 8) as usize
    }

    #[cfg(test)]
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.length());
        bytes.extend_from_slice(&self.text_len.to_le_bytes());
        bytes.extend_from_slice(self.text);
        bytes.extend_from_slice(self.tally_key.as_ref());
        bytes.extend_from_slice(&self.quantity.to_le_bytes());
        bytes
    }

    pub fn copy_to_bytes(
        dst: &'a mut [u8],
        text: &'a [u8],
        tally_key: &'a Pubkey,
        quantity: u64,
    ) -> &'a mut [u8] {
        let text_len = text.len() as u32;
        let (dst_text_len, dst) = dst.split_at_mut(4);
        dst_text_len.copy_from_slice(&text_len.to_le_bytes());

        let (dst_text, dst) = dst.split_at_mut(text.len());
        dst_text.copy_from_slice(text);

        let (dst_tally_key, dst) = dst.split_at_mut(32);
        dst_tally_key.copy_from_slice(tally_key.as_ref());

        let (dst_quantity, dst) = dst.split_at_mut(8);
        dst_quantity.copy_from_slice(&quantity.to_le_bytes());
        dst
    }

    pub fn from_bytes(data: &'a mut [u8]) -> (Self, &'a mut [u8]) {
        let (text_len, data) = data.split_at_mut(4);
        let text_len = u32::from_le_bytes(*array_ref!(text_len, 0, 4));
        let (text, data) = data.split_at_mut(text_len as usize);

        let (tally_key, data) = data.split_at_mut(32);
        let tally_key = Pubkey::new(tally_key);

        let (quantity, data) = data.split_at_mut(8);
        #[allow(clippy::cast_ptr_alignment)]
        let quantity = unsafe { &mut *(&mut quantity[0] as *mut u8 as *mut u64) };

        (
            Self {
                text_len,
                text,
                tally_key,
                quantity,
            },
            data,
        )
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    pub fn poll_serialization() {
        let creator_key = Pubkey::new(&[0; 32]);
        let header = "poll".as_bytes();
        let option_a = "first option".as_bytes();
        let option_a_key = Pubkey::new(&[1; 32]);
        let mut quantity_a = 100;
        let option_b = "second option".as_bytes();
        let option_b_key = Pubkey::new(&[2; 32]);
        let mut quantity_b = 101;

        let data = PollData {
            data_type: DataType::Poll,
            creator_key,
            last_block: 999,
            header_len: header.len() as u32,
            header,
            option_a: PollOptionData {
                text_len: option_a.len() as u32,
                text: option_a,
                tally_key: option_a_key,
                quantity: &mut quantity_a,
            },
            option_b: PollOptionData {
                text_len: option_b.len() as u32,
                text: option_b,
                tally_key: option_b_key,
                quantity: &mut quantity_b,
            },
        };

        let mut bytes = data.to_bytes();
        let data_copy = PollData::from_bytes(&mut bytes[..]);

        assert_eq!(data, data_copy);
        assert_eq!(data.length(), bytes.len());
    }

    #[test]
    pub fn option_serialization() {
        let key = Pubkey::new(&[0; 32]);
        let text = "option text".as_bytes();
        let mut quantity = 100;
        let data = PollOptionData {
            text_len: text.len() as u32,
            text,
            tally_key: key,
            quantity: &mut quantity,
        };

        let mut bytes = data.to_bytes();
        let (data_copy, _) = PollOptionData::from_bytes(&mut bytes[..]);

        assert_eq!(data, data_copy);
        assert_eq!(data.length(), bytes.len());
    }
}
