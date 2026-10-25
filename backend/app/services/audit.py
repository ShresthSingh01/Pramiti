import hashlib
import json
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.entities import AuditEntry

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

async def record_audit(
    db: AsyncSession,
    actor: str,
    action: str,
    payload: Dict[str, Any],
    application_id: Optional[str] = None
) -> AuditEntry:
    # Fetch latest entry to chain hash
    stmt = select(AuditEntry).order_by(desc(AuditEntry.id)).limit(1)
    result = await db.execute(stmt)
    latest = result.scalar_one_or_none()

    prev_hash = latest.hash if latest else GENESIS_HASH
    payload_str = json.dumps(payload, sort_keys=True, default=str)
    payload_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

    chain_input = f"{prev_hash}:{actor}:{action}:{payload_hash}"
    current_hash = hashlib.sha256(chain_input.encode("utf-8")).hexdigest()

    entry = AuditEntry(
        application_id=application_id,
        actor=actor,
        action=action,
        timestamp=datetime.utcnow(),
        payload_hash=payload_hash,
        prev_hash=prev_hash,
        hash=current_hash,
        details=payload
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry

async def verify_chain_integrity(db: AsyncSession) -> Dict[str, Any]:
    stmt = select(AuditEntry).order_by(AuditEntry.id.asc())
    result = await db.execute(stmt)
    entries = list(result.scalars().all())

    if not entries:
        return {"valid": True, "total_records": 0, "broken_at_id": None, "message": "Audit chain empty, pristine state"}

    expected_prev = GENESIS_HASH
    for entry in entries:
        if entry.prev_hash != expected_prev:
            return {
                "valid": False,
                "total_records": len(entries),
                "broken_at_id": entry.id,
                "message": f"Hash chain broken at entry #{entry.id}: previous hash mismatch"
            }
        
        # Verify current hash recomputation
        chain_input = f"{entry.prev_hash}:{entry.actor}:{entry.action}:{entry.payload_hash}"
        recalculated_hash = hashlib.sha256(chain_input.encode("utf-8")).hexdigest()
        if recalculated_hash != entry.hash:
            return {
                "valid": False,
                "total_records": len(entries),
                "broken_at_id": entry.id,
                "message": f"Tampering detected at entry #{entry.id}: hash signature mismatch"
            }
        expected_prev = entry.hash

    return {
        "valid": True,
        "total_records": len(entries),
        "broken_at_id": None,
        "message": f"Cryptographic integrity verified across all {len(entries)} audit records."
    }
