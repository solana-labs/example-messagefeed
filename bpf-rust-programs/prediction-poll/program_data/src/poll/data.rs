use super::InitPollData;
use crate::DataType;
use alloc::vec::Vec;
use solana_sdk_bpf_utils::entrypoint::SolPubkey;

#[cfg_attr(test, derive(PartialEq, Debug))]
pub struct PollData<'a> {
    pub data_type: DataType,
    pub creator_key: &'a SolPubkey,
    pub last_block: u64,
    pub header_len: u32,
    pub header: &'a [u8],
    pub option_a: PollOptionData<'a>,
    pub option_b: PollOptionData<'a>,
}

impl<'a> PollData<'a> {
    pub fn length(&self) -> usize {
        (1 + 32 + 8 + 4 + self.header_len) as usize
            + self.option_a.length()
            + self.option_b.length()
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.length());
        bytes.push(self.data_type.clone() as u8);
        bytes.extend_from_slice(self.creator_key);
        bytes.extend_from_slice(&self.last_block.to_le_bytes());
        bytes.extend_from_slice(&self.header_len.to_le_bytes());
        bytes.extend_from_slice(self.header);
        bytes.extend(self.option_a.to_bytes().into_iter());
        bytes.extend(self.option_b.to_bytes().into_iter());
        bytes
    }

    pub fn init(
        init: InitPollData<'a>,
        creator_key: &'a SolPubkey,
        tally_a_key: &'a SolPubkey,
        tally_b_key: &'a SolPubkey,
        slot: u64,
    ) -> Self {
        Self {
            data_type: DataType::Poll,
            creator_key,
            last_block: slot + init.timeout as u64,
            header_len: init.header_len,
            header: init.header,
            option_a: PollOptionData {
                text_len: init.option_a_len,
                text: init.option_a,
                tally_key: tally_a_key,
                quantity: 0,
            },
            option_b: PollOptionData {
                text_len: init.option_b_len,
                text: init.option_b,
                tally_key: tally_b_key,
                quantity: 0,
            },
        }
    }

    pub fn from_bytes(data: &'a [u8]) -> Self {
        let (data_type, data) = data.split_at(1);
        let data_type = DataType::from(data_type[0]);

        let (creator_key, data) = data.split_at(32);
        let creator_key = array_ref!(creator_key, 0, 32);

        let (last_block, data) = data.split_at(8);
        let last_block = u64::from_le_bytes(*array_ref!(last_block, 0, 8));

        let (header_len, data) = data.split_at(4);
        let header_len = u32::from_le_bytes(*array_ref!(header_len, 0, 4));
        let (header, data) = data.split_at(header_len as usize);

        let option_a = PollOptionData::from_bytes(data);
        let (_, data) = data.split_at(option_a.length());
        let option_b = PollOptionData::from_bytes(data);

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
    pub tally_key: &'a SolPubkey,
    pub quantity: u64,
}

impl<'a> PollOptionData<'a> {
    pub fn length(&self) -> usize {
        (4 + self.text_len + 32 + 8) as usize
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.length());
        bytes.extend_from_slice(&self.text_len.to_le_bytes());
        bytes.extend_from_slice(self.text);
        bytes.extend_from_slice(self.tally_key);
        bytes.extend_from_slice(&self.quantity.to_le_bytes());
        bytes
    }

    pub fn from_bytes(data: &'a [u8]) -> Self {
        let (text_len, data) = data.split_at(4);
        let text_len = u32::from_le_bytes(*array_ref!(text_len, 0, 4));
        let (text, data) = data.split_at(text_len as usize);

        let (tally_key, data) = data.split_at(32);
        let tally_key = array_ref!(tally_key, 0, 32);

        let (quantity, _) = data.split_at(8);
        let quantity = u64::from_le_bytes(*array_ref!(quantity, 0, 8));

        Self {
            text_len,
            text,
            tally_key,
            quantity,
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    pub fn poll_serialization() {
        let creator_key = [0; 32];
        let header = "poll".as_bytes();
        let option_a = "first option".as_bytes();
        let option_a_key = [1; 32];
        let option_b = "second option".as_bytes();
        let option_b_key = [2; 32];

        let data = PollData {
            data_type: DataType::Poll,
            creator_key: &creator_key,
            last_block: 999,
            header_len: header.len() as u32,
            header,
            option_a: PollOptionData {
                text_len: option_a.len() as u32,
                text: option_a,
                tally_key: &option_a_key,
                quantity: 100,
            },
            option_b: PollOptionData {
                text_len: option_b.len() as u32,
                text: option_b,
                tally_key: &option_b_key,
                quantity: 101,
            },
        };

        let bytes = data.to_bytes();
        let data_copy = PollData::from_bytes(&bytes[..]);

        assert_eq!(data, data_copy);
        assert_eq!(data.length(), bytes.len());
    }

    #[test]
    pub fn option_serialization() {
        let key = [0; 32];
        let text = "option text".as_bytes();
        let data = PollOptionData {
            text_len: text.len() as u32,
            text,
            tally_key: &key,
            quantity: 100,
        };

        let bytes = data.to_bytes();
        let data_copy = PollOptionData::from_bytes(&bytes[..]);

        assert_eq!(data, data_copy);
        assert_eq!(data.length(), bytes.len());
    }
}
