import crypto from 'crypto';

/**
 * Calculates SHA256 cryptographic hash for an audit log entry.
 * Hash formula: SHA256(previousHash + timestamp + entityType + entityId + action + payloadString)
 */
export function calculateAuditHash({ previousHash = 'GENESIS_BLOCK_COALGUARD_2026', timestamp, entityType, entityId, action, payload }) {
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  const dataString = `${previousHash}|${timestamp}|${entityType}|${entityId}|${action}|${payloadStr}`;
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Verifies the integrity of a list of audit records sequentially.
 * Returns { isValid: boolean, checkedCount: number, corruptedRecordId: null | string, message: string }
 */
export function verifyAuditChain(auditRecords = []) {
  if (!auditRecords || auditRecords.length === 0) {
    return {
      isValid: true,
      checkedCount: 0,
      corruptedRecordId: null,
      message: 'Audit trail is empty. Ready for initial block.',
      verificationTimestamp: new Date().toISOString()
    };
  }

  let expectedPrevHash = 'GENESIS_BLOCK_COALGUARD_2026';

  for (let i = 0; i < auditRecords.length; i++) {
    const record = auditRecords[i];

    // 1. Verify that the record references the expected previous hash
    if (record.previous_hash !== expectedPrevHash) {
      return {
        isValid: false,
        checkedCount: i,
        corruptedRecordId: record.id,
        tamperedField: 'previous_hash mismatch',
        message: `Tampering detected at block #${record.id}! Previous hash link broken.`,
        verificationTimestamp: new Date().toISOString()
      };
    }

    // 2. Recalculate hash of this record
    const computedCurrentHash = calculateAuditHash({
      previousHash: record.previous_hash,
      timestamp: record.timestamp,
      entityType: record.entity_type,
      entityId: record.entity_id,
      action: record.action,
      payload: record.payload
    });

    if (computedCurrentHash !== record.current_hash) {
      return {
        isValid: false,
        checkedCount: i,
        corruptedRecordId: record.id,
        tamperedField: 'current_hash mismatch (payload or metadata altered)',
        message: `Cryptographic corruption detected at block #${record.id}! Block content hash mismatch.`,
        verificationTimestamp: new Date().toISOString()
      };
    }

    expectedPrevHash = record.current_hash;
  }

  return {
    isValid: true,
    valid: true,
    checkedCount: auditRecords.length,
    totalLogs: auditRecords.length,
    lastBlockHash: expectedPrevHash,
    corruptedRecordId: null,
    message: `All ${auditRecords.length} blockchain-lite audit blocks verified cryptographically with zero tampering detected.`,
    verificationTimestamp: new Date().toISOString()
  };
}
