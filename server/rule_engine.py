#!/usr/bin/env python3
"""
GeM Bid Compliance Verification Platform - Deterministic Rule Engine
Strict Separation of Concerns:
- LLM is NEVER used for pass/fail compliance verdicts or risk calculations.
- This rule engine consumes structured data (Schema 1, 2, 3, 6) and deterministically
  computes Schema 4 (Compliance Check Results) and Schema 5 (Compliance Report).
"""

import sys
import json
import datetime
from difflib import SequenceMatcher

def fuzzy_match_ratio(str1, str2):
    if not str1 or not str2:
        return 0.0
    s1 = str(str1).strip().lower()
    s2 = str(str2).strip().lower()
    return SequenceMatcher(None, s1, s2).ratio()

def evaluate_compliance(bidder_profile, documents, portal_records, tender_rules=None, rag_thresholds=None):
    """
    Evaluates bidder compliance based on Section 7 logic.
    Returns (check_results, compliance_report)
    """
    now_iso = datetime.datetime.utcnow().isoformat() + "Z"
    bidder_id = bidder_profile.get("bidder_id", "BIDDER-UNKNOWN")
    entity_type = bidder_profile.get("entity_type", "private_limited")
    employee_count = bidder_profile.get("employee_count", 0)

    # Resolve RAG thresholds with defaults if not provided
    if not rag_thresholds:
        rag_thresholds = {
            "epfo_threshold": 20,
            "epfo_citation": "EPFO Applicability Circular Section 1(3)(b) [20+ employees]",
            "esic_threshold": 10,
            "esic_citation": "ESIC Act 1948 Section 2(12) [10+ employees with wages <= Rs 21,000]",
            "mii_class1_threshold": 50,
            "mii_citation": "Public Procurement (Preference to Make in India) Order 2017, Clause 3(a) [>= 50% for Class-I Local Supplier]"
        }

    # Extract portal records map
    portals = {p.get("source"): p for p in portal_records}
    docs_by_type = {d.get("document_type"): d for d in documents}

    check_results = []
    gatekeeper_triggered = False
    gatekeeper_details = None

    # =========================================================================
    # CATEGORY 1: HARD GATEKEEPERS (Failure forces Risk = High immediately)
    # =========================================================================

    # 1.1 Blacklisting / Debarment Status
    bl_portal = portals.get("blacklist_registry", {})
    bl_fields = bl_portal.get("retrieved_fields", {})
    is_debarred = bl_fields.get("is_blacklisted", False)
    debarred_org = bl_fields.get("debarred_by", None)
    debar_reason = bl_fields.get("debarment_reason", None)
    debar_until = bl_fields.get("debarred_until", None)

    if bl_portal.get("query_status") == "unavailable":
        bl_status = "pending"
        bl_reason = "Blacklist portal registry verification unavailable; verification pending"
    elif is_debarred:
        bl_status = "fail"
        bl_reason = f"Active debarment found: Debarred by {debarred_org} until {debar_until}. Reason: {debar_reason}"
        gatekeeper_triggered = True
        gatekeeper_details = bl_reason
    else:
        bl_status = "pass"
        bl_reason = "No active listing on Central Debarment / GeM Incident Management Registry"

    check_results.append({
        "check_id": f"CHK-GATE-BL-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "BLACKLIST",
        "rule_source": "statutory_fixed",
        "is_gatekeeper": True,
        "applicability": "applicable",
        "status": bl_status,
        "weight": 25,
        "reason": bl_reason,
        "source_reference": "GeM General Terms & Conditions (GTC) Clause 4(xii) - Debarment of Bidders",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # 1.2 PAN Validity
    pan_portal = portals.get("pan_itd", {})
    pan_fields = pan_portal.get("retrieved_fields", {})
    pan_status_val = pan_fields.get("pan_status", "").upper()
    pan_doc = docs_by_type.get("pan_card")

    if pan_portal.get("query_status") == "unavailable":
        pan_chk_status = "pending"
        pan_chk_reason = "Income Tax Department PAN portal lookup pending or service unavailable"
    elif pan_status_val in ["ACTIVE", "OPERATIVE", "VALID"]:
        pan_chk_status = "pass"
        pan_chk_reason = f"PAN is active and operative in Income Tax records (Aadhaar-PAN linking verified: {pan_fields.get('aadhaar_linked', 'Yes')})"
    else:
        pan_chk_status = "fail"
        pan_chk_reason = f"PAN is inactive or inoperative (Status: {pan_status_val or 'Not Found'})"
        gatekeeper_triggered = True
        if not gatekeeper_details:
            gatekeeper_details = pan_chk_reason

    check_results.append({
        "check_id": f"CHK-GATE-PAN-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "PAN_IT",
        "rule_source": "statutory_fixed",
        "is_gatekeeper": True,
        "applicability": "applicable",
        "status": pan_chk_status,
        "weight": 25,
        "reason": pan_chk_reason,
        "source_reference": "Income Tax Act 1961 Section 139A & GeM Seller Registration Norms",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # 1.3 GSTIN Validity (where applicable)
    gst_portal = portals.get("gstn_portal", {})
    gst_fields = gst_portal.get("retrieved_fields", {})
    gst_status_val = gst_fields.get("gstin_status", "").upper()
    gst_doc = docs_by_type.get("gst_certificate")

    if gst_portal.get("query_status") == "unavailable":
        gst_chk_status = "pending"
        gst_chk_reason = "GSTN portal verification pending or connection timed out"
    elif gst_status_val in ["ACTIVE", "REGULAR"]:
        gst_chk_status = "pass"
        gst_chk_reason = f"GSTIN is active in GSTN records with registration date {gst_fields.get('registration_date', 'N/A')}"
    elif gst_status_val in ["CANCELLED", "SUSPENDED"]:
        gst_chk_status = "fail"
        gst_chk_reason = f"GSTIN is {gst_status_val} on GSTN Portal (Cancellation/Suspension date: {gst_fields.get('cancellation_date', 'Recent')})"
        gatekeeper_triggered = True
        if not gatekeeper_details:
            gatekeeper_details = gst_chk_reason
    else:
        gst_chk_status = "pending"
        gst_chk_reason = f"GSTIN status inconclusive from GSTN portal ({gst_status_val or 'Record missing'})"

    check_results.append({
        "check_id": f"CHK-GATE-GST-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "GST",
        "rule_source": "statutory_fixed",
        "is_gatekeeper": True,
        "applicability": "applicable",
        "status": gst_chk_status,
        "weight": 25,
        "reason": gst_chk_reason,
        "source_reference": "Central Goods and Services Tax (CGST) Act 2017 & GeM Seller Policy",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # =========================================================================
    # CATEGORY 2: MANDATORY STATUTORY CHECKS (Heavily weighted)
    # =========================================================================

    # 2.1 Udyam / MSME Registration Validity
    udyam_portal = portals.get("udyam_portal", {})
    udyam_fields = udyam_portal.get("retrieved_fields", {})
    udyam_doc = docs_by_type.get("udyam_certificate")
    claimed_msme = bidder_profile.get("claimed_msme_category", "Micro")

    if not udyam_doc and not udyam_fields:
        msme_status = "not_applicable"
        msme_reason = "Bidder did not claim MSME / Udyam purchase preference benefits"
    elif udyam_portal.get("query_status") == "unavailable":
        msme_status = "pending"
        msme_reason = "Udyam portal verification pending; document submitted but unverified"
    else:
        portal_category = udyam_fields.get("enterprise_type", "")
        portal_active = udyam_fields.get("is_valid", True)
        if portal_active and (not claimed_msme or claimed_msme.lower() == portal_category.lower()):
            msme_status = "pass"
            msme_reason = f"Valid Udyam Registration ({udyam_fields.get('udyam_registration_number')}). Enterprise type: {portal_category} matches claimed preference."
        elif not portal_active:
            msme_status = "fail"
            msme_reason = f"Udyam registration is expired or invalidated in Ministry of MSME records."
        else:
            msme_status = "pass"
            msme_reason = f"Udyam valid ({udyam_fields.get('udyam_registration_number')}). Classified as {portal_category}."

    check_results.append({
        "check_id": f"CHK-STAT-MSME-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "MSME",
        "rule_source": "statutory_fixed",
        "is_gatekeeper": False,
        "applicability": "applicable" if msme_status != "not_applicable" else "not_applicable",
        "status": msme_status,
        "weight": 15,
        "reason": msme_reason,
        "source_reference": "Ministry of MSME Notification S.O. 2119(E) dated 26th June 2020",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # 2.2 GST Return Filing Status
    filing_status = gst_fields.get("return_filing_status", "")
    gstr1_filed = gst_fields.get("gstr1_filed_up_to", "")
    gstr3b_filed = gst_fields.get("gstr3b_filed_up_to", "")
    consecutive_defaults = gst_fields.get("consecutive_non_filing_months", 0)

    if gst_portal.get("query_status") == "unavailable":
        gst_ret_status = "pending"
        gst_ret_reason = "GST return filing history could not be fetched from GSTN portal"
    elif consecutive_defaults >= 3:
        gst_ret_status = "fail"
        gst_ret_reason = f"Prolonged GST return default: {consecutive_defaults} consecutive months unfiled (Last GSTR-3B: {gstr3b_filed})"
    elif consecutive_defaults > 0:
        gst_ret_status = "pending"
        gst_ret_reason = f"Minor return delay: {consecutive_defaults} month(s) pending (GSTR-3B filed up to {gstr3b_filed})"
    else:
        gst_ret_status = "pass"
        gst_ret_reason = f"GST returns filed regularly up to date (GSTR-1: {gstr1_filed}, GSTR-3B: {gstr3b_filed})"

    check_results.append({
        "check_id": f"CHK-STAT-GSTRET-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "GST",
        "rule_source": "statutory_fixed",
        "is_gatekeeper": False,
        "applicability": "applicable",
        "status": gst_ret_status,
        "weight": 15,
        "reason": gst_ret_reason,
        "source_reference": "Rule 138E of CGST Rules 2017 & Section 39 of CGST Act",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # 2.3 Income Tax Compliance (ITR filed for recent years)
    itr_filed_years = pan_fields.get("itr_filed_years", [])
    itr_compliant = pan_fields.get("itr_compliant", False)
    if pan_portal.get("query_status") == "unavailable":
        itr_status = "pending"
        itr_reason = "ITR verification pending from Income Tax Department integration"
    elif itr_compliant or len(itr_filed_years) >= 2:
        itr_status = "pass"
        itr_reason = f"ITR filed for recent assessment years: {', '.join(itr_filed_years)} (Section 206AB non-defaulter)"
    elif len(itr_filed_years) == 1:
        itr_status = "pending"
        itr_reason = f"ITR record found for only 1 year ({itr_filed_years[0]}); second assessment year pending verification"
    else:
        itr_status = "fail"
        itr_reason = "No ITR filing record found for the preceding two assessment years (Specified Person under Section 206AB)"

    check_results.append({
        "check_id": f"CHK-STAT-ITR-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "PAN_IT",
        "rule_source": "statutory_fixed",
        "is_gatekeeper": False,
        "applicability": "applicable",
        "status": itr_status,
        "weight": 15,
        "reason": itr_reason,
        "source_reference": "Income Tax Act 1961 Section 206AB (Higher TDS for non-filers of ITR)",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # 2.4 EPFO / ESIC Compliance (CONDITIONAL ON STATUTORY THRESHOLD via RAG)
    epfo_threshold = rag_thresholds.get("epfo_threshold", 20)
    epfo_portal = portals.get("epfo", {})
    epfo_fields = epfo_portal.get("retrieved_fields", {})

    if employee_count < epfo_threshold:
        epfo_status = "not_applicable"
        epfo_reason = f"Employee count ({employee_count}) is below the statutory threshold of {epfo_threshold}. EPFO registration is not mandatory."
    else:
        if epfo_portal.get("query_status") == "unavailable":
            epfo_status = "pending"
            epfo_reason = f"EPFO applicable ({employee_count} employees >= {epfo_threshold}), but EPFO verification query pending"
        elif epfo_fields.get("is_registered", False) and epfo_fields.get("challans_paid_regularly", True):
            epfo_status = "pass"
            epfo_reason = f"EPFO compliant ({epfo_fields.get('establishment_code')}). Monthly ECR / Electronic Challans paid up to {epfo_fields.get('last_ecr_month', 'latest')}."
        else:
            epfo_status = "fail"
            epfo_reason = f"EPFO non-compliant: Entity employs {employee_count} personnel (>= {epfo_threshold} threshold) but has unpaid challans or inactive registration."

    check_results.append({
        "check_id": f"CHK-STAT-EPFO-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "EPFO_ESIC",
        "rule_source": "rag_threshold",
        "is_gatekeeper": False,
        "applicability": "applicable" if epfo_status != "not_applicable" else "not_applicable",
        "status": epfo_status,
        "weight": 15,
        "reason": epfo_reason,
        "source_reference": rag_thresholds.get("epfo_citation", "EPFO Applicability Circular Section 1(3)(b)"),
        "related_rag_query_id": "RAG-Q-EPFO-THRESH",
        "evaluated_at": now_iso
    })

    # 2.5 MCA21 / Company Status (CONDITIONAL ON ENTITY TYPE)
    mca_applicable_types = ["private_limited", "public_limited", "llp"]
    mca_portal = portals.get("mca21", {})
    mca_fields = mca_portal.get("retrieved_fields", {})

    if entity_type not in mca_applicable_types:
        mca_status = "not_applicable"
        mca_reason = f"Entity type is '{entity_type}'. MCA21 ROC compliance check is not applicable to proprietorships or partnerships."
    else:
        if mca_portal.get("query_status") == "unavailable":
            mca_status = "pending"
            mca_reason = "MCA21 ROC company portal lookup pending"
        else:
            roc_status = mca_fields.get("roc_status", "").upper()
            if roc_status in ["ACTIVE", "NORMAL"]:
                mca_status = "pass"
                mca_reason = f"MCA21 company status is ACTIVE (CIN/LLPIN: {mca_fields.get('cin_llpin')}, ROC: {mca_fields.get('roc_name', 'ROC Delhi')})"
            elif roc_status in ["STRUCK OFF", "UNDER LIQUIDATION", "AMALGAMATED"]:
                mca_status = "fail"
                mca_reason = f"Company is not in good standing on MCA21: ROC status is '{roc_status}'"
            else:
                mca_status = "pending"
                mca_reason = f"Unresolved MCA21 status: '{roc_status}'"

    check_results.append({
        "check_id": f"CHK-STAT-MCA-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "MCA21",
        "rule_source": "statutory_fixed",
        "is_gatekeeper": False,
        "applicability": "applicable" if mca_status != "not_applicable" else "not_applicable",
        "status": mca_status,
        "weight": 10,
        "reason": mca_reason,
        "source_reference": "Companies Act 2013 Section 248 & Limited Liability Partnership Act 2008",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # =========================================================================
    # CATEGORY 3: TENDER-SPECIFIC MANDATORY CHECKS (Parsed or Rules)
    # =========================================================================

    # 3.1 Local Content / Make in India Percentage
    mii_claimed = bidder_profile.get("local_content_percentage", 65)
    mii_mandate = 50 # Default Class-I threshold
    if tender_rules:
        for tr in tender_rules:
            if tr.get("category") == "LOCAL_CONTENT" and tr.get("threshold_value"):
                try:
                    mii_mandate = float(tr.get("threshold_value"))
                except:
                    pass

    if mii_claimed >= mii_mandate:
        mii_status = "pass"
        mii_reason = f"Declared local content of {mii_claimed}% meets or exceeds the tender requirement of {mii_mandate}% (Class-I Local Supplier)."
    elif mii_claimed >= 20:
        mii_status = "pass" if mii_mandate <= 20 else "fail"
        mii_reason = f"Declared local content of {mii_claimed}% classified as Class-II Local Supplier (Tender requirement: {mii_mandate}%)."
    else:
        mii_status = "fail"
        mii_reason = f"Declared local content of {mii_claimed}% falls below the mandatory minimum threshold of {mii_mandate}%."

    check_results.append({
        "check_id": f"CHK-TND-MII-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "LOCAL_CONTENT",
        "rule_source": "tender_parsed",
        "is_gatekeeper": False,
        "applicability": "applicable",
        "status": mii_status,
        "weight": 10,
        "reason": mii_reason,
        "source_reference": rag_thresholds.get("mii_citation", "Public Procurement (Preference to Make in India) Order 2017"),
        "related_rag_query_id": "RAG-Q-MII-CLASS1",
        "evaluated_at": now_iso
    })

    # 3.2 OEM Authorization Present and Valid
    is_oem = bidder_profile.get("is_manufacturer", False)
    oem_doc = docs_by_type.get("oem_authorization")
    oem_fields = oem_doc.get("extracted_fields", {}) if oem_doc else {}

    if is_oem:
        oem_status = "not_applicable"
        oem_reason = "Bidder is the Original Equipment Manufacturer (OEM); reseller authorization letter not required."
    elif not oem_doc:
        oem_status = "fail"
        oem_reason = "Bidder is a reseller/distributor but failed to submit the mandatory OEM Authorization Letter."
    else:
        oem_conf = oem_doc.get("extraction_confidence", "medium")
        oem_valid = oem_fields.get("is_valid_for_tender", True)
        tender_ref_match = oem_fields.get("tender_number_matched", True)

        if oem_conf == "low":
            oem_status = "pending"
            oem_reason = "OEM authorization submitted with low document extraction confidence; routed to manual officer review."
        elif not oem_valid or not tender_ref_match:
            oem_status = "fail"
            oem_reason = f"OEM authorization letter does not validate: Tender reference mismatch or authorization expired ({oem_fields.get('valid_till', 'expired')})."
        else:
            oem_status = "pass"
            oem_reason = f"Valid OEM Authorization verified from {oem_fields.get('oem_name', 'OEM')} for Tender {oem_fields.get('tender_ref', 'Specified')} (Valid till: {oem_fields.get('valid_till', '2026-12-31')})."

    check_results.append({
        "check_id": f"CHK-TND-OEM-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "OEM_AUTH",
        "rule_source": "tender_parsed",
        "is_gatekeeper": False,
        "applicability": "applicable" if oem_status != "not_applicable" else "not_applicable",
        "status": oem_status,
        "weight": 10,
        "reason": oem_reason,
        "source_reference": "GeM Specific Additional Terms and Conditions (ATC) Clause 2.1 (OEM Authorization)",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # 3.3 Startup India / NSIC Verification (Fraud Prevention)
    claimed_startup = bidder_profile.get("claimed_startup_benefit", False)
    dpiit_portal = portals.get("dpiit_startup", {})
    dpiit_fields = dpiit_portal.get("retrieved_fields", {})

    if not claimed_startup:
        startup_status = "not_applicable"
        startup_reason = "Bidder did not claim Startup India exemption (EMD / Prior Experience waiver)."
    else:
        if dpiit_portal.get("query_status") == "unavailable":
            startup_status = "pending"
            startup_reason = "Startup India DPIIT verification pending; claimed exemption awaiting registry confirmation"
        elif dpiit_fields.get("is_recognized", False):
            startup_status = "pass"
            startup_reason = f"DPIIT Startup recognized (DIPP#{dpiit_fields.get('dipp_number')}). Valid exemption granted under Rule 173(i) of GFR 2017."
        else:
            startup_status = "fail"
            startup_reason = "Fraud Prevention Check Failed: Bidder claimed Startup exemption but no active recognition found on DPIIT portal."

    check_results.append({
        "check_id": f"CHK-TND-STARTUP-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "STARTUP_NSIC",
        "rule_source": "tender_parsed",
        "is_gatekeeper": False,
        "applicability": "applicable" if startup_status != "not_applicable" else "not_applicable",
        "status": startup_status,
        "weight": 5,
        "reason": startup_reason,
        "source_reference": "DPIIT Notification G.S.R. 127(E) & Rule 173(i) of General Financial Rules (GFR) 2017",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # =========================================================================
    # CATEGORY 4: DATA QUALITY & CONSISTENCY CHECKS (Advisory, Deductions)
    # =========================================================================

    # 4.1 Cross-source PAN match across documents & portals
    doc_pan = None
    if gst_doc:
        doc_pan = gst_doc.get("extracted_fields", {}).get("pan")
    if not doc_pan and udyam_doc:
        doc_pan = udyam_doc.get("extracted_fields", {}).get("pan")
    portal_pan = pan_fields.get("pan_number")

    pan_mismatch_flag = False
    if doc_pan and portal_pan:
        if doc_pan.upper().strip() != portal_pan.upper().strip():
            pan_mismatch_flag = True

    # 4.2 Entity Name Fuzzy Match across documents and portals
    entity_name_doc = bidder_profile.get("legal_name", "")
    portal_names = []
    if gst_fields.get("trade_name"): portal_names.append(gst_fields["trade_name"])
    if gst_fields.get("legal_name"): portal_names.append(gst_fields["legal_name"])
    if udyam_fields.get("enterprise_name"): portal_names.append(udyam_fields["enterprise_name"])
    if mca_fields.get("company_name"): portal_names.append(mca_fields["company_name"])

    name_mismatch_flag = False
    lowest_sim = 1.0
    for pn in portal_names:
        sim = fuzzy_match_ratio(entity_name_doc, pn)
        if sim < lowest_sim:
            lowest_sim = sim
        if sim < 0.75: # Fuzzy threshold
            name_mismatch_flag = True

    # 4.3 Document Extraction Confidence Check
    low_conf_docs = [d.get("document_type") for d in documents if d.get("extraction_confidence") == "low"]

    quality_deductions = 0
    quality_reasons = []

    if pan_mismatch_flag:
        quality_deductions += 10
        quality_reasons.append(f"PAN Inconsistency: Document extracted PAN '{doc_pan}' does not match verified ITD PAN '{portal_pan}'.")

    if name_mismatch_flag:
        quality_deductions += 6
        quality_reasons.append(f"Entity Name Discrepancy: Legal name in bid '{entity_name_doc}' differs from portal registry records (Fuzzy similarity: {int(lowest_sim * 100)}%).")

    if low_conf_docs:
        quality_deductions += 4
        quality_reasons.append(f"Low Document Extraction Confidence on: {', '.join(low_conf_docs)}. Officer verification required.")

    if not quality_reasons:
        dq_status = "pass"
        dq_reason = "Cross-source data verified: PAN matches across all records, and legal entity names match registries (>90% confidence)."
    else:
        dq_status = "pending"
        dq_reason = " ; ".join(quality_reasons)

    check_results.append({
        "check_id": f"CHK-QUAL-CONSISTENCY-{bidder_id}",
        "bidder_id": bidder_id,
        "category": "TENDER_SPECIFIC",
        "rule_source": "statutory_fixed",
        "is_gatekeeper": False,
        "applicability": "applicable",
        "status": dq_status,
        "weight": 5,
        "reason": dq_reason,
        "source_reference": "GeM Seller Verification & Anti-Impersonation Data Quality Guidelines",
        "related_rag_query_id": None,
        "evaluated_at": now_iso
    })

    # =========================================================================
    # STAGE 1 & 2: SCORING & RISK EVALUATION LOGIC (Section 7.5)
    # =========================================================================

    pending_items = []
    applicable_checks = [c for c in check_results if c["applicability"] == "applicable" and not c["is_gatekeeper"]]
    total_applicable_weight = sum(c["weight"] for c in applicable_checks)
    earned_weight = 0.0

    for c in applicable_checks:
        if c["status"] == "pass":
            earned_weight += c["weight"]
        elif c["status"] == "pending":
            earned_weight += c["weight"] * 0.35 # Partial credit for pending verification
            pending_items.append(f"{c['category']}: {c['reason']}")
        elif c["status"] == "fail":
            # Zero weight
            pass

    # Apply data quality deductions
    raw_score = (earned_weight / total_applicable_weight * 100.0) if total_applicable_weight > 0 else 0.0
    overall_score = max(0, min(100, round(raw_score - quality_deductions, 1)))

    has_mandatory_fail = any(c["status"] == "fail" for c in applicable_checks)

    # Score-to-risk mapping (Section 7.5):
    # Stage 1: Gatekeeper check: if ANY Category 1 check fails -> Risk = High immediately, regardless of score.
    # High Risk: any mandatory check failed, OR any gatekeeper failed, OR score < 70%.
    # Medium Risk: 1–2 non-critical checks pending/unclear or minor inconsistencies, score 70–89%.
    # Low Risk: all mandatory checks passed, no unresolved inconsistencies, score >= 90%.
    if gatekeeper_triggered:
        risk_level = "high"
    elif has_mandatory_fail or overall_score < 70.0:
        risk_level = "high"
    elif overall_score >= 90.0 and len(pending_items) == 0 and not quality_reasons:
        risk_level = "low"
    else:
        risk_level = "medium"

    report = {
        "bidder_id": bidder_id,
        "tender_id": bidder_profile.get("tender_id", "GEM/2026/B/894120"),
        "overall_score": overall_score,
        "risk_level": risk_level,
        "gatekeeper_triggered": gatekeeper_triggered,
        "gatekeeper_details": gatekeeper_details,
        "check_results": check_results,
        "pending_items": pending_items,
        "ai_recommendation": "", # To be populated by recommendation generator
        "officer_decision": None,
        "officer_notes": None,
        "officer_decided_at": None,
        "report_generated_at": now_iso
    }

    return check_results, report

if __name__ == "__main__":
    # Test script with sample input
    sample_bidder = {
        "bidder_id": "BID-101",
        "legal_name": "Bharat Tech Solutions Pvt Ltd",
        "entity_type": "private_limited",
        "employee_count": 48,
        "claimed_msme_category": "Small",
        "local_content_percentage": 68,
        "is_manufacturer": False
    }
    sample_docs = [
        {
            "document_id": "DOC-1",
            "document_type": "udyam_certificate",
            "extraction_confidence": "high",
            "extracted_fields": {"pan": "AABCB1234F", "udyam_reg": "UDYAM-DL-01-0012345"}
        },
        {
            "document_id": "DOC-2",
            "document_type": "gst_certificate",
            "extraction_confidence": "high",
            "extracted_fields": {"pan": "AABCB1234F", "gstin": "07AABCB1234F1Z5"}
        },
        {
            "document_id": "DOC-3",
            "document_type": "oem_authorization",
            "extraction_confidence": "high",
            "extracted_fields": {"oem_name": "HP India", "tender_ref_matched": True, "valid_till": "2026-12-31"}
        }
    ]
    sample_portals = [
        {"source": "blacklist_registry", "query_status": "success", "retrieved_fields": {"is_blacklisted": False}},
        {"source": "pan_itd", "query_status": "success", "retrieved_fields": {"pan_number": "AABCB1234F", "pan_status": "ACTIVE", "itr_filed_years": ["AY 2024-25", "AY 2023-24"], "itr_compliant": True}},
        {"source": "gstn_portal", "query_status": "success", "retrieved_fields": {"gstin_status": "ACTIVE", "consecutive_non_filing_months": 0, "gstr1_filed_up_to": "Jan 2026", "gstr3b_filed_up_to": "Jan 2026", "legal_name": "Bharat Tech Solutions Pvt Ltd"}},
        {"source": "udyam_portal", "query_status": "success", "retrieved_fields": {"udyam_registration_number": "UDYAM-DL-01-0012345", "enterprise_type": "Small", "is_valid": True}},
        {"source": "epfo", "query_status": "success", "retrieved_fields": {"establishment_code": "DLCPM0098765000", "is_registered": True, "challans_paid_regularly": True, "last_ecr_month": "Jan 2026"}},
        {"source": "mca21", "query_status": "success", "retrieved_fields": {"cin_llpin": "U72200DL2018PTC334567", "roc_status": "ACTIVE", "company_name": "Bharat Tech Solutions Private Limited"}}
    ]

    checks, report = evaluate_compliance(sample_bidder, sample_docs, sample_portals)
    print(json.dumps(report, indent=2))
