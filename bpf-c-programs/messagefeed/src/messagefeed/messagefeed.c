#include <solana_sdk.h>

#define FAILURE 1

typedef struct {
  uint8_t banned;
  SolPubkey creator; // Who created this account
} UserAccountData;

typedef struct {
  SolPubkey next_message; // Next message in the feed
  SolPubkey from; // The UserAccountData that posted this message
  SolPubkey creator; // Who created this feed
  uint8_t text[0];
} MessageAccountData;

SOL_FN_PREFIX bool deserialize_user_account_data(SolAccountInfo *ka, UserAccountData **data) {
  if (ka->data_len != sizeof(UserAccountData)) {
    sol_log("Error: invalid user account data_len");
    sol_log_64(ka->data_len, sizeof(UserAccountData), 0, 0, 0);
    return false;
  }
  *data = (UserAccountData *) ka->data;
  return true;
}

SOL_FN_PREFIX bool deserialize_message_account_data(SolAccountInfo *ka, MessageAccountData **data) {
  if (ka->data_len < sizeof(MessageAccountData)) {
    sol_log("Error: invalid message account data_len");
    sol_log_64(ka->data_len, sizeof(MessageAccountData), 0, 0, 0);
    return false;
  }
  *data = (MessageAccountData *) ka->data;
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

extern uint64_t entrypoint(const uint8_t *input) {
  SolAccountInfo ka[5];
  SolParameters params = (SolParameters) { .ka = ka };

  sol_log("message feed entrypoint");

  if (!sol_deserialize(input, &params, SOL_ARRAY_SIZE(ka))) {
    sol_log("Error: deserialize failed");
    return FAILURE;
  }

  if (!params.ka[0].is_signer) {
    sol_log("Error: not signed by key 0");
    return FAILURE;
  }
  if (!params.ka[1].is_signer) {
    sol_log("Error: not signed by key 1");
    return FAILURE;
  }

  UserAccountData *user_data = NULL;
  if (!deserialize_user_account_data(&params.ka[0], &user_data)) {
    sol_log("Error: unable to deserialize account 0 state");
    return FAILURE;
  }

  if (user_data->banned) {
    sol_log("Error: user is banned");
    return FAILURE;
  }

  MessageAccountData *new_message_data = NULL;
  if (!deserialize_message_account_data(&params.ka[1], &new_message_data)) {
    sol_log("Error: unable to deserialize account 1 state");
    return FAILURE;
  }

  // No instruction data means that a new user account should be initialized
  if (params.data_len == 0) {
    sol_memcpy(&user_data->creator, params.ka[1].key, sizeof(SolPubkey));
    return SUCCESS;
  }

  // Write the message text into new_message_data
  sol_memcpy(new_message_data->text, params.data, params.data_len);

  // Save the pubkey of who posted the message
  sol_memcpy(&new_message_data->from, params.ka[0].key, sizeof(SolPubkey));

  if (params.ka_num > 2) {
    MessageAccountData *existing_message_data = NULL;
    if (!deserialize_message_account_data(&params.ka[2], &existing_message_data)) {
      sol_log("Error: unable to deserialize account 1 state");
      return FAILURE;
    }

    if (!SolPubkey_default(&existing_message_data->next_message)) {
      sol_log("Error: account 1 already has a next_message");
      return FAILURE;
    }

    // Link the new_message to the existing_message
    sol_memcpy(&existing_message_data->next_message,
      params.ka[1].key,
      sizeof(SolPubkey)
    );

    // Propagate the chain creator to the new message
    sol_memcpy(&new_message_data->creator, &existing_message_data->creator, sizeof(SolPubkey));
  } else {
    // This is the first message in the chain, it is the "creator"
    sol_memcpy(&new_message_data->creator, params.ka[1].key, sizeof(SolPubkey));
  }

  if (!SolPubkey_same(&user_data->creator, &new_message_data->creator)) {
    sol_log("user_data/new_message_data creator mismatch");
    return FAILURE;
  }

  // Check if a user should be banned
  if (params.ka_num > 3) {
    UserAccountData *ban_user_data = NULL;
    if (!deserialize_user_account_data(&params.ka[3], &ban_user_data)) {
      sol_log("Error: unable to deserialize account 3 state");
      return FAILURE;
    }

    ban_user_data->banned = true;
  }

  return SUCCESS;
}
