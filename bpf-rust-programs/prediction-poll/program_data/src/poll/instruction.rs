#[cfg(any(test, feature = "wasm"))]
use alloc::vec::Vec;

#[cfg_attr(test, derive(PartialEq, Debug))]
pub struct InitPollData<'a> {
    pub timeout: u32, // block height
    pub header_len: u32,
    pub header: &'a [u8],
    pub option_a_len: u32,
    pub option_a: &'a [u8],
    pub option_b_len: u32,
    pub option_b: &'a [u8],
}

impl<'a> InitPollData<'a> {
    #[cfg(any(test, feature = "wasm"))]
    pub fn length(&self) -> usize {
        (4 + 4 + self.header_len + 4 + self.option_a_len + 4 + self.option_b_len) as usize
    }

    #[cfg(any(test, feature = "wasm"))]
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.length());
        bytes.extend_from_slice(&self.timeout.to_le_bytes());
        bytes.extend_from_slice(&self.header_len.to_le_bytes());
        bytes.extend_from_slice(self.header);
        bytes.extend_from_slice(&self.option_a_len.to_le_bytes());
        bytes.extend_from_slice(self.option_a);
        bytes.extend_from_slice(&self.option_b_len.to_le_bytes());
        bytes.extend_from_slice(self.option_b);
        bytes
    }

    pub fn from_bytes(data: &'a [u8]) -> Self {
        let (timeout, data) = data.split_at(4);
        let timeout = u32::from_le_bytes(*array_ref!(timeout, 0, 4));

        let (header_len, data) = data.split_at(4);
        let header_len = u32::from_le_bytes(*array_ref!(header_len, 0, 4));
        let (header, data) = data.split_at(header_len as usize);

        let (option_a_len, data) = data.split_at(4);
        let option_a_len = u32::from_le_bytes(*array_ref!(option_a_len, 0, 4));
        let (option_a, data) = data.split_at(option_a_len as usize);

        let (option_b_len, data) = data.split_at(4);
        let option_b_len = u32::from_le_bytes(*array_ref!(option_b_len, 0, 4));
        let (option_b, _data) = data.split_at(option_b_len as usize);

        InitPollData {
            timeout,
            header_len,
            header,
            option_a_len,
            option_a,
            option_b_len,
            option_b,
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    pub fn serialization() {
        let header = "poll".as_bytes();
        let option_a = "first option".as_bytes();
        let option_b = "second option".as_bytes();
        let data = InitPollData {
            timeout: 100,
            header_len: header.len() as u32,
            header,
            option_a_len: option_a.len() as u32,
            option_a,
            option_b_len: option_b.len() as u32,
            option_b,
        };

        let bytes = data.to_bytes();
        let data_copy = InitPollData::from_bytes(&bytes[..]);

        assert_eq!(data, data_copy);
        assert_eq!(data.length(), bytes.len());
    }
}
