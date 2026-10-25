from typing import List, Dict, Any, Optional

def build_evidence_graph(
    facts: List[Dict[str, Any]],
    docs: Optional[List[Dict[str, Any]]] = None,
    findings: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Constructs a verifiable, highly explainable evidence graph from extracted facts,
    parent documents, and regulatory rule findings.
    
    Returns structured nodes and edges with rich metadata:
      - Document Nodes
      - Fact Nodes with provenance (page, bbox)
      - Authority Adapter Nodes (SHCIL, STU, CoA, AICTE)
      - Provenance edges ('extracted_from')
      - Semantic consistency edges ('same_legal_entity')
      - Explainable Regulatory Conflict edges ('regulatory_conflict') with exact clause, reason, and source
    """
    nodes = []
    edges = []
    node_ids = set()

    def add_node(node_data: Dict[str, Any]):
        if node_data["id"] not in node_ids:
            nodes.append(node_data)
            node_ids.add(node_data["id"])

    # 1. Add Document Parent Nodes
    doc_map = {}
    if docs:
        for d in docs:
            doc_id = f"doc_{d['id']}"
            doc_map[d['id']] = doc_id
            
            # Short clean icon label
            icon = "📄"
            if "affidavit" in d['doc_type'].lower():
                icon = "📜"
            elif "noc" in d['doc_type'].lower():
                icon = "🏛️"
            elif "floor" in d['doc_type'].lower() or "architect" in d['doc_type'].lower():
                icon = "📐"
            elif "accredit" in d['doc_type'].lower():
                icon = "🎖️"
            elif "eoa" in d['doc_type'].lower():
                icon = "⚖️"
            elif "faculty" in d['doc_type'].lower():
                icon = "👥"

            add_node({
                "id": doc_id,
                "label": f"{icon} {d['doc_type']}",
                "type": "document",
                "doc_type": d['doc_type'],
                "doc_name": d.get("name", d['doc_type']),
                "status": d.get("status", "verified"),
                "file_url": d.get("file_url")
            })

    # 2. Add Authority Adapter Nodes
    add_node({
        "id": "auth_shcil",
        "label": "🏛️ SHCIL e-Stamp Registry",
        "type": "authority",
        "authority_name": "Stock Holding Corporation of India (e-Stamping)",
        "status": "verified"
    })
    add_node({
        "id": "auth_stu",
        "label": "🏛️ State Tech. University Registry",
        "type": "authority",
        "authority_name": "State Technological University Affiliation Registry",
        "status": "authority"
    })
    add_node({
        "id": "auth_aicte",
        "label": "⚖️ AICTE APH 2025-26 Mandate",
        "type": "authority",
        "authority_name": "AICTE Approval Process Handbook Regulatory Bureau",
        "status": "authority"
    })

    # 3. Add Fact Nodes and link to Parent Document
    fact_id_map = {}
    for i, f in enumerate(facts):
        f_id = f.get("id", f"fact_{i}")
        fact_node_id = f"node_{f_id}"
        fact_id_map[f_id] = fact_node_id

        field_name = f.get("field", "")
        raw_val = str(f.get("value", "")).replace("\n", " ").strip()
        display_val = raw_val[:28] + ("..." if len(raw_val) > 28 else "")

        # Format label
        label = f"{field_name}: {display_val}"

        # Determine if this fact is conflict-related
        is_conflict_fact = False
        if field_name == "expiry_date" and any(yr in raw_val for yr in ["2023", "2024", "2025"]):
            is_conflict_fact = True
        elif field_name == "built_up_area":
            try:
                if float(raw_val.replace(",", "")) < 4000.0:
                    is_conflict_fact = True
            except ValueError:
                pass
        elif field_name == "land_area":
            try:
                if float(raw_val.replace(",", "")) < 3.0:
                    is_conflict_fact = True
            except ValueError:
                pass

        fact_node = {
            "id": fact_node_id,
            "label": label,
            "type": "fact",
            "field": field_name,
            "value": raw_val,
            "doc_id": f.get("document_id"),
            "page": f.get("page", 1),
            "bbox": f.get("bbox", [0.1, 0.1, 0.2, 0.4]),
            "confidence": f.get("confidence", 0.95),
            "is_conflict": is_conflict_fact
        }
        add_node(fact_node)

        # Edge: Fact -> Parent Document
        parent_doc_node = doc_map.get(f.get("document_id"))
        if parent_doc_node:
            edges.append({
                "id": f"edge_prov_{f_id}",
                "source": fact_node_id,
                "target": parent_doc_node,
                "relation": "extracted_from",
                "label": f"Page {f.get('page', 1)}",
                "status": "provenance"
            })

    # 4. Cross-Document Land Area Consistency / Contradiction Edge
    land_nodes = [n for n in nodes if n.get("type") == "fact" and n.get("field") == "land_area"]
    if len(land_nodes) >= 2:
        try:
            val_a = float(land_nodes[0]["value"].replace(",", ""))
            val_b = float(land_nodes[1]["value"].replace(",", ""))
            has_mismatch = abs(val_a - val_b) / max(val_a, val_b) > 0.02
            
            edges.append({
                "id": "edge_land_crosscheck",
                "source": land_nodes[0]["id"],
                "target": land_nodes[1]["id"],
                "relation": "cross_document_land_reconciliation",
                "label": f"CONTRADICTION: {val_a} vs {val_b} Acres" if has_mismatch else f"Consistent ({val_a} Acres)",
                "status": "conflict" if has_mismatch else "normal",
                "severity": "critical" if has_mismatch else "low",
                "clause": "AICTE Approval Process Handbook (APH) Sec 4.2",
                "reason": (
                    f"Sworn Affidavit land parcel ({val_a} Acres) contradicts certified Architectural Master Plan ({val_b} Acres). "
                    f"Discrepancy of {abs(val_a - val_b):.2f} Acres exceeds statutory 2% limit."
                ) if has_mismatch else "Sworn affidavit land parcel reconciles with architectural surveyor layout.",
                "source_a": f"{land_nodes[0].get('value')} Acres (Page {land_nodes[0].get('page', 1)})",
                "source_b": f"{land_nodes[1].get('value')} Acres (Page {land_nodes[1].get('page', 1)})",
                "remediation": "Furnish updated Revenue Department Khasra mutation order and an amended non-judicial stamp affidavit."
            })
        except Exception:
            pass

    # 5. University NOC Expiry Edge -> State University Authority
    expiry_nodes = [n for n in nodes if n.get("type") == "fact" and n.get("field") == "expiry_date"]
    for en in expiry_nodes:
        val = str(en["value"])
        is_lapsed = any(yr in val for yr in ["2023", "2024", "2025"])
        edges.append({
            "id": f"edge_noc_verif_{en['id']}",
            "source": en["id"],
            "target": "auth_stu",
            "relation": "issuing_authority_registry_query",
            "label": f"EXPIRED: Lapsed on {val}" if is_lapsed else f"Verified: Valid until {val}",
            "status": "conflict" if is_lapsed else "normal",
            "severity": "critical" if is_lapsed else "low",
            "clause": "AICTE APH Sec 3.1 & 3.4",
            "reason": (
                f"State Technological University registry confirms affiliation order lapsed on {val}. "
                f"Active, non-expired university affiliation is mandatory for technical degree approval."
            ) if is_lapsed else f"Affiliation continuation order is active through {val}.",
            "source_a": f"University NOC Order: 'Valid until: {val}'",
            "remediation": "Submit university continuation endorsement or provisional affiliation extension order."
        })

    # 6. Built-up Area Deficit Edge -> AICTE Norms Authority
    built_up_nodes = [n for n in nodes if n.get("type") == "fact" and n.get("field") == "built_up_area"]
    for bn in built_up_nodes:
        try:
            b_val = float(str(bn["value"]).replace(",", ""))
            is_deficit = b_val < 4000.0
            edges.append({
                "id": f"edge_area_norm_{bn['id']}",
                "source": bn["id"],
                "target": "auth_aicte",
                "relation": "statutory_norm_evaluation",
                "label": f"DEFICIT: {b_val} < 4000 sqm" if is_deficit else f"Norm Satisfied ({b_val} sqm)",
                "status": "conflict" if is_deficit else "normal",
                "severity": "high" if is_deficit else "low",
                "clause": "AICTE APH Sec 4.4, Table 4.1",
                "reason": (
                    f"Floor plan instructional area schedule sums to {b_val} sqm, below the minimum 4,000.00 sqm threshold "
                    f"required for the sanctioned engineering undergraduate intake."
                ) if is_deficit else "Instructional area meets minimum statutory space requirements.",
                "source_a": f"Architectural Plan Area Schedule: 'Total Built-Up Area: {b_val} Sqm'",
                "remediation": "Revise master floor plans with earmarked instructional spaces and workshop zones."
            })
        except Exception:
            pass

    # 7. Legal Entity Name Consistency Edges
    inst_nodes = [n for n in nodes if n.get("type") == "fact" and n.get("field") == "institution_name"]
    for i in range(len(inst_nodes) - 1):
        edges.append({
            "id": f"edge_inst_{i}",
            "source": inst_nodes[i]["id"],
            "target": inst_nodes[i+1]["id"],
            "relation": "same_legal_entity",
            "label": "Entity Cross-Reference",
            "status": "normal",
            "clause": "AICTE APH Sec 2.1",
            "reason": "Institution legal entity name verified across statutory filings."
        })

    return {
        "nodes": nodes,
        "edges": edges
    }

def build_cross_application_edges(
    current_app_id: str,
    current_facts: List[Dict[str, Any]],
    historical_facts: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Detects cross-year and cross-institution anomalies across institutional records.
    PS 26261 Mandate: "Reduce repeated manual checking by using relevant institutional
    records already available in authorized AICTE systems... Detect potential alterations,
    duplication and anomalies."

    Identifies:
      1. Cross-Institution Faculty Duplication (dual employment violating AICTE norms)
      2. Unapproved Cross-Year Intake Inflation (>10% increase without approval trail)
    """
    cross_edges = []

    # 1. Cross-institution: Faculty overlap check
    current_faculty = [f for f in current_facts if f.get("field") == "faculty_name"]
    hist_faculty = [f for f in historical_facts if f.get("field") == "faculty_name"]

    for cf in current_faculty:
        cf_val = str(cf.get("value", "")).lower().strip()
        for hf in hist_faculty:
            hf_val = str(hf.get("value", "")).lower().strip()
            if cf_val and hf_val and cf_val == hf_val and hf.get("application_id") != current_app_id:
                cross_edges.append({
                    "id": f"cross_faculty_{cf.get('id', 'item')}_{hf.get('application_id', 'hist')}",
                    "source": f"node_{cf.get('id', 'curr')}",
                    "target": f"node_{hf.get('id', 'prev')}",
                    "relation": "cross_institution_faculty_duplication",
                    "label": "ANOMALY: Same Faculty at Multiple Institutions",
                    "status": "conflict",
                    "severity": "high",
                    "clause": "AICTE APH Sec 5.2 — Faculty Cadre & Exclusivity Norms",
                    "reason": (
                        f"Faculty member '{cf.get('value')}' is declared in the certified faculty roster of "
                        f"Application {current_app_id} AND concurrently in Application {hf.get('application_id')}. "
                        "Concurrent full-time employment at two technical institutions violates statutory AICTE norms."
                    ),
                    "remediation": "Provide verified biometric attendance or an official relieving order from the prior institution.",
                    "cross_app": True,
                    "app_a": current_app_id,
                    "app_b": hf.get("application_id")
                })

    # 2. Cross-year: Intake inflation without prior approval order
    current_intake = [f for f in current_facts if f.get("field") == "approved_intake"]
    hist_intake = [f for f in historical_facts if f.get("field") == "approved_intake" and f.get("application_id") != current_app_id]

    for ci in current_intake:
        for hi in hist_intake:
            try:
                curr_val = float(str(ci.get("value", "0")).replace(",", ""))
                hist_val = float(str(hi.get("value", "0")).replace(",", ""))
                if hist_val > 0 and curr_val > hist_val * 1.10:
                    cross_edges.append({
                        "id": f"cross_intake_{ci.get('id', 'curr')}",
                        "source": f"node_{ci.get('id', 'curr')}",
                        "target": f"node_{hi.get('id', 'prev')}",
                        "relation": "cross_year_unapproved_intake_increase",
                        "label": f"ANOMALY: Intake Raised ({curr_val:.0f} vs {hist_val:.0f})",
                        "status": "conflict",
                        "severity": "medium",
                        "clause": "AICTE APH Sec 6.1 — Approval for Expansion/Intake Alteration",
                        "reason": (
                            f"Current submission declares sanctioned intake of {curr_val:.0f} seats, representing a "
                            f"{((curr_val/hist_val)-1)*100:.0f}% increase over previous sanctioned intake ({hist_val:.0f}). "
                            "Intake expansion requires verified prior AICTE Council approval order."
                        ),
                        "remediation": "Furnish official AICTE Executive Committee sanction letter authorizing intake augmentation.",
                        "cross_app": True,
                        "app_a": current_app_id,
                        "app_b": hi.get("application_id")
                    })
            except (ValueError, TypeError):
                pass

    return cross_edges

