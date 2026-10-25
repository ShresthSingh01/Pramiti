from datetime import datetime
import enum
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class ApplicationStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    AI_ANALYSIS = "ai_analysis"
    VERIFICATION = "verification"
    OFFICER_REVIEW = "officer_review"
    COMPLETED = "completed"

class VerifyStatus(str, enum.Enum):
    VERIFIED = "verified"
    MISMATCH_DETECTED = "mismatch_detected"
    EXPIRED = "expired"
    VERIFICATION_PENDING = "verification_pending"
    SOURCE_UNAVAILABLE = "source_unavailable"
    MANUAL_REVIEW_REQUIRED = "manual_review_required"

class Severity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class DocStatus(str, enum.Enum):
    VERIFIED = "verified"
    ISSUES_FOUND = "issues_found"
    MISSING = "missing"
    ANALYZING = "analyzing"
    NOT_REQUIRED = "not_required"

class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="Technical Institution")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    applications = relationship("Application", back_populates="institution")

class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    institution_id: Mapped[str] = mapped_column(String(50), ForeignKey("institutions.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="EoA Renewal")
    status: Mapped[ApplicationStatus] = mapped_column(Enum(ApplicationStatus), default=ApplicationStatus.SUBMITTED)
    version: Mapped[int] = mapped_column(Integer, default=1)
    risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    institution = relationship("Institution", back_populates="applications")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="application", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="application", cascade="all, delete-orphan")
    audit_entries = relationship("AuditEntry", back_populates="application", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    application_id: Mapped[str] = mapped_column(String(50), ForeignKey("applications.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[DocStatus] = mapped_column(Enum(DocStatus), default=DocStatus.MISSING)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    application = relationship("Application", back_populates="documents")
    facts = relationship("Fact", back_populates="document", cascade="all, delete-orphan")
    verifications = relationship("Verification", back_populates="document", cascade="all, delete-orphan")

class Fact(Base):
    __tablename__ = "facts"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(50), ForeignKey("documents.id"), nullable=False)
    field: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    page: Mapped[int] = mapped_column(Integer, default=1)
    bbox: Mapped[Optional[List[float]]] = mapped_column(JSON, nullable=True) # [ymin, xmin, ymax, xmax] normalized 0-1
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    extractor_version: Mapped[str] = mapped_column(String(50), default="v1.0")
    extractor_method: Mapped[str] = mapped_column(String(50), default="regex_heuristic")

    document = relationship("Document", back_populates="facts")

class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[str] = mapped_column(String(50), ForeignKey("applications.id"), nullable=False)
    fact_a_id: Mapped[str] = mapped_column(String(50), ForeignKey("facts.id"), nullable=False)
    fact_b_id: Mapped[str] = mapped_column(String(50), ForeignKey("facts.id"), nullable=False)
    relation: Mapped[str] = mapped_column(String(100), nullable=False) # same_entity, cross_doc_value, conflict, etc.
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    clause_ref: Mapped[str] = mapped_column(String(200), nullable=False)
    handbook_version: Mapped[str] = mapped_column(String(50), default="2025-26")
    version: Mapped[int] = mapped_column(Integer, default=1)
    yaml_content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active") # active, draft, archived
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    application_id: Mapped[str] = mapped_column(String(50), ForeignKey("applications.id"), nullable=False)
    doc_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("documents.id"), nullable=True)
    rule_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("rules.id"), nullable=True)
    clause_ref: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    handbook_version: Mapped[Optional[str]] = mapped_column(String(50), default="2025-26")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), default=Severity.MEDIUM)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    status: Mapped[str] = mapped_column(String(50), default="open") # open, acknowledged, resolved
    evidence: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    analysis: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    suggested_fix: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    application = relationship("Application", back_populates="findings")

class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(50), ForeignKey("documents.id"), nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[VerifyStatus] = mapped_column(Enum(VerifyStatus), default=VerifyStatus.VERIFICATION_PENDING)
    simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    response_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    fields: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)
    log: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list)

    document = relationship("Document", back_populates="verifications")

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    application_id: Mapped[str] = mapped_column(String(50), ForeignKey("applications.id"), nullable=False)
    trigger: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    recipient_role: Mapped[str] = mapped_column(String(50), default="scrutiny_officer")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    application = relationship("Application", back_populates="alerts")

class AuditEntry(Base):
    __tablename__ = "audit_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("applications.id"), nullable=True)
    actor: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    hash: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    application = relationship("Application", back_populates="audit_entries")

class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
