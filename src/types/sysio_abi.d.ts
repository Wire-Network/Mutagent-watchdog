// import { BlockTimestamp, Checksum256Type, Int64Type, Name, Signature, TimePoint, TimePointSec, UInt32Type, UInt64Type, UInt8Type, VarUIntType } from "@wireio/core";

// export interface GetStatusRequestV0 {}

export interface BlockPosition {
    block_num: UInt32Type;
    block_id: Checksum256Type;
}

export interface MessageResult<T> {
    [SysioAbiStructTypes, T];
}

export interface GetStatusResultV0 {
    head: BlockPosition;
    last_irreversible: BlockPosition;
    trace_begin_block: UInt32Type;
    trace_end_block: UInt32Type;
    chain_state_begin_block: UInt32Type;
    chain_state_end_block: UInt32Type;
    chain_id: Checksum256Type;
}

export interface GetBlocksRequestV0 {
    start_block_num: UInt32Type;
    end_block_num: UInt32Type;
    max_messages_in_flight: UInt32Type;
    have_positions: BlockPosition[];
    irreversible_only: boolean;
    fetch_block: boolean;
    fetch_traces: boolean;
    fetch_deltas: boolean;
}

// export interface GetBlocksAckRequestV0 {
//     num_messages: UInt32Type;
// }

// export interface GetBlocksResultV0 {
//     head: BlockPosition;
//     last_irreversible: BlockPosition;
//     this_block?: BlockPosition;
//     prev_block?: BlockPosition;
//     block?: Uint8Array;
//     traces?: Uint8Array;
//     deltas?: Uint8Array;
// }

// export interface Row {
//     present: boolean;
//     data: Uint8Array;
// }

// export interface TableDeltaV0 {
//     name: string;
//     rows: Row[];
// }

// export interface Action {
//     account: Name;
//     name: Name;
//     authorization: PermissionLevel[];
//     data: Uint8Array;
// }

// export interface AccountAuthSequence {
//     account: Name;
//     sequence: UInt64Type;
// }

// export interface ActionReceiptV0 {
//     receiver: Name;
//     act_digest: Checksum256Type;
//     global_sequence: UInt64Type;
//     recv_sequence: UInt64Type;
//     auth_sequence: AccountAuthSequence[];
//     code_sequence: VarUIntType; // varuint32
//     abi_sequence: VarUIntType; // varuint32
// }

// export interface AccountDelta {
//     account: Name;
//     delta: Int64Type;
// }

// export interface ActionTraceV0 {
//     action_ordinal: VarUIntType; // varuint32
//     creator_action_ordinal: VarUIntType; // varuint32
//     receipt?: ActionReceiptV0;
//     receiver: Name;
//     act: Action;
//     context_free: boolean;
//     elapsed: Int64Type;
//     console: string;
//     account_ram_deltas: AccountDelta[];
//     except?: string;
//     error_code?: UInt64Type;
// }

// export interface ActionTraceV1 extends ActionTraceV0 {
//     return_value: Uint8Array;
// }

// export interface PartialTransactionV0 {
//     expiration: TimePointSec;
//     ref_block_num: UInt64Type;
//     ref_block_prefix: UInt32Type;
//     max_net_usage_words: VarUIntType; // varuint32
//     max_cpu_usage_ms: UInt8Type;
//     delay_sec: VarUIntType; // varuint32
//     transaction_extensions: Extension[];
//     signatures: Signature[];
//     context_free_data: Uint8Array[];
// }

export interface TransactionTraceV0 {
    id: Checksum256Type;
    status: UInt8Type;
    cpu_usage_us: UInt32Type;
    net_usage_words: VarUIntType; // varuint32
    elapsed: Int64Type;
    net_usage: UInt64Type;
    scheduled: boolean;
    action_traces: ActionTrace[];
    account_ram_delta?: AccountDelta;
    except?: string;
    error_code?: UInt64Type;
    failed_dtrx_trace?: TransactionTraceV0;
    partial?: PartialTransactionV0;
}

// export interface PackedTransaction {
//     signatures: Signature[];
//     compression: UInt8Type;
//     packed_context_free_data: Uint8Array;
//     packed_trx: Uint8Array;
// }

// export interface TransactionReceiptHeader {
//     status: UInt8Type;
//     cpu_usage_us: UInt32Type;
//     net_usage_words: VarUIntType; // varuint32
// }

// export interface TransactionReceipt extends TransactionReceiptHeader {
//     trx: TransactionVariant;
// }

// export interface Extension {
//     type: UInt64Type;
//     data: Uint8Array;
// }

// export interface BlockHeader {
//     timestamp: BlockTimestamp;
//     producer: Name;
//     confirmed: UInt64Type;
//     previous: Checksum256Type;
//     transaction_mroot: Checksum256Type;
//     action_mroot: Checksum256Type;
//     schedule_version: UInt32Type;
//     new_producers?: ProducerSchedule;
//     header_extensions: Extension[];
// }

// export interface SignedBlockHeader extends BlockHeader {
//     producer_signature: Signature;
// }

// export interface SignedBlock extends SignedBlockHeader {
//     transactions: TransactionReceipt[];
//     block_extensions: Extension[];
// }

// export interface TransactionHeader {
//     expiration: TimePointSec;
//     ref_block_num: UInt64Type;
//     ref_block_prefix: UInt32Type;
//     max_net_usage_words: VarUIntType;
//     max_cpu_usage_ms: UInt8Type;
//     delay_sec: VarUIntType;
// }

// export interface Transaction extends TransactionHeader {
//     context_free_actions: Action[];
//     actions: Action[];
//     transaction_extensions: Extension[];
// }

// export interface CodeId {
//     vm_type: UInt8Type;
//     vm_version: UInt8Type;
//     code_hash: Checksum256Type;
// }

// export interface AccountV0 {
//     name: Name;
//     creation_date: BlockTimestamp;
//     abi: Uint8Array;
// }

// export interface AccountMetadataV0 {
//     name: Name;
//     privileged: boolean;
//     last_code_update: TimePoint;
//     code?: CodeId;
// }

// export interface CodeV0 {
//     vm_type: UInt8Type;
//     vm_version: UInt8Type;
//     code_hash: Checksum256Type;
//     code: Uint8Array;
// }

export type SysioAbiStructTypes =
    "result" |
    "get_status_request_v0" |
    "block_position" |
    "get_status_result_v0" |
    "get_blocks_request_v0" |
    "get_blocks_ack_request_v0" |
    "get_blocks_result_v0" |
    "row" |
    "table_delta_v0" |
    "action" |
    "account_auth_sequence" |
    "action_receipt_v0" |
    "account_delta" |
    "action_trace_v0" |
    "action_trace_v1" |
    "partial_transaction_v0" |
    "transaction_trace_v0" |
    "packed_transaction" |
    "transaction_receipt_header" |
    "transaction_receipt" |
    "extension" |
    "block_header" |
    "signed_block_header" |
    "signed_block" |
    "code_id" |
    "account_v0" |
    "account_metadata_v0" |
    "code_v0" |
    "contract_table_v0" |
    "contract_row_v0" |
    "contract_index64_v0" |
    "contract_index128_v0" |
    "contract_index256_v0" |
    "contract_index_double_v0" |
    "contract_index_long_double_v0" |
    "producer_key" |
    "producer_schedule" |
    "block_signing_authority_v0" |
    "producer_authority" |
    "producer_authority_schedule" |
    "chain_config_v0" |
    "chain_config_v1" |
    "wasm_config_v0" |
    "global_property_v0" |
    "global_property_v1" |
    "generated_transaction_v0" |
    "activated_protocol_feature_v0" |
    "protocol_state_v0" |
    "key_weight" |
    "permission_level" |
    "permission_level_weight" |
    "wait_weight" |
    "authority" |
    "permission_v0" |
    "permission_link_v0" |
    "resource_limits_v0" |
    "usage_accumulator_v0" |
    "resource_usage_v0" |
    "resource_limits_state_v0" |
    "resource_limits_ratio_v0" |
    "elastic_limit_parameters_v0" |
    "resource_limits_config_v0"