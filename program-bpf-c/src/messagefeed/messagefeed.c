#include <solana_sdk.h>

typedef struct {
  SolPubkey next_message;
  SolPubkey from;
  uint8_t text[0];
} AccountData;

SOL_FN_PREFIX bool deserialize_account_data(SolKeyedAccount *ka, AccountData **data) {
  if (ka->userdata_len < sizeof(AccountData)) {
    sol_log("Error: invalid userdata_len");
    sol_log_64(ka->userdata_len, sizeof(AccountData), 0, 0, 0);
    return false;
  }
  *data = (AccountData *) ka->userdata;
  return true;
}

SOL_FN_PREFIX bool SolPubkey_default(const SolPubkey *pubkey) {
  for (int i = 0; i < sizeof(*pubkey); i++) {
    if (pubkey->x[i]) {
      return false;
    }
  }
  return true;
}

extern bool entrypoint(const uint8_t *input) {
  SolKeyedAccount ka[3];
  SolParameters params = (SolParameters) { .ka = ka };

  sol_log("message feed entrypoint");

  if (!sol_deserialize(input, &params, SOL_ARRAY_SIZE(ka))) {
    sol_log("Error: deserialize failed");
    return false;
  }

  if (!params.ka[0].is_signer) {
    sol_log("Error: not signed by key 0");
    return false;
  }
  if (!params.ka[1].is_signer) {
    sol_log("Error: not signed by key 1");
    return false;
  }


  AccountData *new_message_data = NULL;

  if (!deserialize_account_data(&params.ka[1], &new_message_data)) {
    sol_log("Error: unable to deserialize account 0 state");
    return false;
  }

  // Write the message text into new_message_data
  sol_memcpy(new_message_data->text, params.data, params.data_len);

  // Save the pubkey of who posted the message
  sol_memcpy(&new_message_data->from, params.ka[0].key, sizeof(SolPubkey));

  if (params.ka_num > 2) {
    AccountData *existing_message_data = NULL;
    if (!deserialize_account_data(&params.ka[2], &existing_message_data)) {
      sol_log("Error: unable to deserialize account 1 state");
      return false;
    }

    if (!SolPubkey_default(&existing_message_data->next_message)) {
      sol_log("Error: account 1 already has a next_message");
      return false;
    }

    // Link the new_message to the existing_message
    sol_memcpy(&existing_message_data->next_message,
      params.ka[1].key,
      sizeof(SolPubkey)
    );
  }

  return true;
}
