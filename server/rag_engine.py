#!/usr/bin/env python3
"""
GeM Bid Compliance Verification Platform - Regulatory Knowledge Base & Hybrid RAG Engine
Implements Section 6:
- Corpus of Indian procurement & statutory regulations
- Dense semantic approximation & Sparse BM25 keyword representation
- Reciprocal Rank Fusion (RRF) combining dense + sparse search
- Grounded prompt construction and source citation extraction
- Schema 6 (Regulatory Chunk Record) & Schema 7 (RAG Query Record)
"""

import math
import re
import datetime
from collections import Counter

# Regulatory Corpus Chunks (Schema 6)
REGULATORY_CORPUS = [
    {
        "chunk_id": "REG-EPFO-SEC1-3",
        "source_document": "Employees' Provident Funds and Miscellaneous Provisions Act, 1952",
        "source_type": "act",
        "clause_reference": "Section 1(3)(b) & EPFO Applicability Circular",
        "effective_date": "1952-11-01 (Amended)",
        "category_tags": ["EPFO", "employee_threshold", "statutory_compliance", "social_security"],
        "chunk_text": "Applicability of Employees' Provident Fund (EPF): Every establishment which is a factory engaged in any industry specified in Schedule I and in which twenty or more persons are employed (or any other establishment employing twenty or more persons or class of such establishments which the Central Government may notify) must mandatorily register with EPFO and remit monthly contributions. Establishments employing fewer than 20 persons are not statutorily required to register unless they opt for voluntary coverage under Section 1(4) upon mutual agreement between employer and majority of employees."
    },
    {
        "chunk_id": "REG-ESIC-SEC2-12",
        "source_document": "Employees' State Insurance Act, 1948",
        "source_type": "act",
        "clause_reference": "Section 2(12) & Ministry of Labour Notification",
        "effective_date": "1948-04-19 (Amended)",
        "category_tags": ["ESIC", "employee_threshold", "wage_ceiling", "health_insurance"],
        "chunk_text": "Employees' State Insurance (ESI) Coverage Threshold: Under Section 2(12), the Act applies to non-seasonal factories employing 10 or more persons. In implemented areas, shops, hotels, restaurants, road motor transport undertakings, and healthcare/educational institutions employing 10 or more persons (20 persons in Maharashtra and certain states) are covered. Statutory wage ceiling for coverage is Rs. 21,000 per month (Rs. 25,000 for employees with disabilities). Entities below the employee threshold of 10 are exempt from compulsory ESIC registration."
    },
    {
        "chunk_id": "REG-MSME-SO2119E",
        "source_document": "Ministry of MSME Notification S.O. 2119(E)",
        "source_type": "notification",
        "clause_reference": "Clause 1 & 2 - Composite Classification Criteria",
        "effective_date": "2020-06-26",
        "category_tags": ["MSME", "udyam", "classification", "turnover_threshold"],
        "chunk_text": "Composite Criteria for MSME Classification: (i) Micro enterprise: Investment in plant and machinery or equipment does not exceed 1 crore rupees and turnover does not exceed 5 crore rupees; (ii) Small enterprise: Investment in plant and machinery or equipment does not exceed 10 crore rupees and turnover does not exceed 50 crore rupees; (iii) Medium enterprise: Investment in plant and machinery or equipment does not exceed 50 crore rupees and turnover does not exceed 250 crore rupees. All enterprises must register on the Udyam Registration portal. Any enterprise exceeding both criteria moves to the next category. Exports of goods or services are excluded from turnover calculation."
    },
    {
        "chunk_id": "REG-MII-PPP-2020",
        "source_document": "Public Procurement (Preference to Make in India) Order 2017 (Revised)",
        "source_type": "order",
        "clause_reference": "Order No. P-45021/2/2017-PP (BE-II) Clause 3A & 3B",
        "effective_date": "2020-09-16",
        "category_tags": ["LOCAL_CONTENT", "make_in_india", "purchase_preference", "gem_mandate"],
        "chunk_text": "Classification of Local Suppliers under Make in India Order: 'Class-I local supplier' means a supplier or service provider whose goods, services or works offered for procurement has local content equal to or more than 50%. 'Class-II local supplier' means a supplier whose local content is more than 20% but less than 50%. 'Non-local supplier' means a supplier whose local content is less than or equal to 20%. In government and GeM procurements where purchase preference is specified, only Class-I local suppliers are eligible for purchase preference (within margin of 20% over L1). For tenders estimated below Rs 200 Crore, global tender inquiries (GTI) shall not be issued without prior approval."
    },
    {
        "chunk_id": "REG-DPIIT-STARTUP-127E",
        "source_document": "Department for Promotion of Industry and Internal Trade (DPIIT) Notification",
        "source_type": "notification",
        "clause_reference": "G.S.R. 127(E) & Rule 173(i) General Financial Rules (GFR) 2017",
        "effective_date": "2019-02-19",
        "category_tags": ["STARTUP_NSIC", "dpiit", "emd_waiver", "prior_experience_exemption"],
        "chunk_text": "Startup Recognition and Procurement Exemptions: An entity shall be considered as a Startup up to 10 years from the date of incorporation/registration, with turnover not exceeding 100 crore rupees for any financial year, working towards innovation or commercialization. Under Rule 173(i) of GFR 2017 and GeM policy, DPIIT-recognized startups and NSIC-registered units are exempt from requirements of prior turnover and prior experience, subject to meeting technical specifications and quality standards. Startups are also fully exempt from payment of Earnest Money Deposit (EMD) upon submitting valid DPIIT certificate."
    },
    {
        "chunk_id": "REG-GEM-DEBARMENT-GTC",
        "source_document": "Government e-Marketplace (GeM) General Terms and Conditions (GTC)",
        "source_type": "guideline",
        "clause_reference": "Clause 4(xii) & GeM Incident Management Policy",
        "effective_date": "2023-11-01 (Version 4.0)",
        "category_tags": ["BLACKLIST", "debarment", "hard_gatekeeper", "incident_management"],
        "chunk_text": "Debarment and Ineligibility of Bidders: Bidders debarred, banned, or blacklisted by GeM, the Central Government, any State Government, or any Central Public Sector Undertaking (CPSU) are strictly disqualified from participating in bids during the currency of debarment period. If an entity is undergoing active debarment or has been placed on the Central Debarment List maintained by Ministry of Finance (DoE), its bid must be rejected immediately at the technical gatekeeper stage without consideration of commercial offers."
    },
    {
        "chunk_id": "REG-ITD-SEC206AB",
        "source_document": "Income Tax Act, 1961",
        "source_type": "act",
        "clause_reference": "Section 206AB & CBDT Circular No. 11/2021",
        "effective_date": "2021-07-01",
        "category_tags": ["PAN_IT", "income_tax", "itr_compliance", "withholding_tax"],
        "chunk_text": "Special Provision for TDS/TCS for Non-Filers of Income-Tax Return: Section 206AB imposes higher rates of TDS (at least 5% or twice the normal rate) on payments made to a 'specified person'. A specified person is a person who has not furnished returns of income for the relevant assessment year immediately preceding the financial year, for which the time limit to file return under Section 139(1) has expired, and aggregate TDS/TCS exceeds Rs. 50,000. In government procurement, bidders must demonstrate regular ITR filings for the preceding two assessment years to certify non-defaulter status."
    },
    {
        "chunk_id": "REG-GSTN-CGST-RULE138E",
        "source_document": "Central Goods and Services Tax Rules, 2017",
        "source_type": "circular",
        "clause_reference": "Rule 138E & Section 29 / 39 of CGST Act",
        "effective_date": "2019-11-21 (Amended)",
        "category_tags": ["GST", "gstin_validity", "return_filing", "e_way_bill"],
        "chunk_text": "GST Return Default & Registration Suspension: Under Rule 138E of CGST Rules, generation of E-Way Bills is automatically blocked if a registered person fails to furnish GSTR-3B returns for two or more consecutive tax periods. Furthermore, under Section 29(2) read with Rule 21A, non-furnishing of returns for a continuous period of six months makes the GSTIN liable for suo-motu cancellation and provisional suspension. A bidder with a suspended or cancelled GSTIN is deemed ineligible as a compliant registered supplier under GeM seller norms."
    },
    {
        "chunk_id": "REG-MCA-COMPANIES-SEC248",
        "source_document": "Companies Act, 2013",
        "source_type": "act",
        "clause_reference": "Section 248 & Section 455 (Strike Off and Dormant Status)",
        "effective_date": "2014-04-01",
        "category_tags": ["MCA21", "roc_status", "company_incorporation", "strike_off"],
        "chunk_text": "Registrar of Companies (ROC) Standing: Under Section 248 of the Companies Act 2013, the Registrar has power to remove the name of a company from the register of companies if it fails to commence business within one year or has not carried on business for two immediately preceding financial years without obtaining dormant status. In GeM bids submitted by corporate bodies (Private Limited, Public Limited, or LLP), the corporate entity must hold an 'ACTIVE' ROC status. Entities marked 'Struck Off', 'Under Liquidation', or 'Dissolved' have lost corporate existence and cannot contract."
    },
    {
        "chunk_id": "REG-GEM-ATC-OEM-AUTH",
        "source_document": "GeM Specific Additional Terms & Conditions (ATC) Guidelines",
        "source_type": "guideline",
        "clause_reference": "Clause 2.1 - Manufacturer's Authorization Form (MAF)",
        "effective_date": "2024-01-15",
        "category_tags": ["OEM_AUTH", "reseller_compliance", "maf", "tender_specific"],
        "chunk_text": "Requirement of OEM Authorization: If the bidder is not the Original Equipment Manufacturer (OEM) of the tendered equipment/software, the bidder must upload a Manufacturer's Authorization Form (MAF) or OEM Authorization Certificate issued specifically for the instant GeM Bid / Tender Number. The authorization must confirm that the OEM guarantees supply, warranty back-to-back support, and spare parts for the designated contract duration. Generic authorization letters without specific bid reference or expired validity dates shall lead to technical disqualification."
    }
]

def tokenize(text):
    return re.findall(r'\b[a-zA-Z0-9_\-\.]{2,}\b', text.lower())

class RegulatoryRAG:
    def __init__(self, corpus=REGULATORY_CORPUS):
        self.corpus = corpus
        self.doc_count = len(corpus)
        self.doc_tokens = [tokenize(c["chunk_text"] + " " + " ".join(c["category_tags"]) + " " + c["source_document"]) for c in corpus]
        self.doc_lengths = [len(dt) for dt in self.doc_tokens]
        self.avg_doc_len = sum(self.doc_lengths) / max(1, self.doc_count)

        # Build vocabulary & inverted index for BM25
        self.df = Counter()
        for dt in self.doc_tokens:
            unique_terms = set(dt)
            for t in unique_terms:
                self.df[t] += 1

    def compute_bm25_sparse_scores(self, query):
        q_tokens = tokenize(query)
        scores = [0.0] * self.doc_count
        k1 = 1.5
        b = 0.75

        for i, dt in enumerate(self.doc_tokens):
            tf = Counter(dt)
            doc_len = self.doc_lengths[i]
            score = 0.0
            for qt in q_tokens:
                if qt in tf:
                    doc_freq = self.df.get(qt, 0)
                    idf = math.log(1 + (self.doc_count - doc_freq + 0.5) / (doc_freq + 0.5))
                    term_tf = tf[qt]
                    denom = term_tf + k1 * (1 - b + b * (doc_len / self.avg_doc_len))
                    score += idf * (term_tf * (k1 + 1)) / max(1e-6, denom)
            scores[i] = score
        return scores

    def compute_dense_semantic_scores(self, query):
        """
        Calculates semantic term-weight embedding approximation for regulatory text.
        In full production, this maps to sentence-transformers dense vector similarity.
        """
        q_tokens = set(tokenize(query))
        scores = [0.0] * self.doc_count

        for i, chunk in enumerate(self.corpus):
            tags = set(tokenize(" ".join(chunk["category_tags"])))
            doc_words = set(self.doc_tokens[i])
            doc_source = set(tokenize(chunk["source_document"]))

            # Semantic match weights
            tag_overlap = len(q_tokens.intersection(tags)) * 3.5
            source_overlap = len(q_tokens.intersection(doc_source)) * 2.0
            content_overlap = len(q_tokens.intersection(doc_words)) * 1.0

            # Boost for exact numeric terms (e.g. 20, 50, 10)
            numeric_queries = [t for t in q_tokens if t.isdigit()]
            numeric_boost = sum(2.5 for n in numeric_queries if n in doc_words)

            total_sim = (tag_overlap + source_overlap + content_overlap + numeric_boost) / (math.sqrt(len(q_tokens) + 1) * math.sqrt(len(doc_words) + 1) * 0.05 + 1.0)
            scores[i] = total_sim
        return scores

    def hybrid_search_with_rrf(self, query, top_k=3, rrf_k=60):
        """
        Reciprocal Rank Fusion (RRF):
        RRF_score(d) = 1 / (k + rank_dense(d)) + 1 / (k + rank_sparse(d))
        Where k is typically 60.
        """
        dense_scores = self.compute_dense_semantic_scores(query)
        sparse_scores = self.compute_bm25_sparse_scores(query)

        # Rank documents descending
        dense_ranked_indices = sorted(range(self.doc_count), key=lambda i: dense_scores[i], reverse=True)
        sparse_ranked_indices = sorted(range(self.doc_count), key=lambda i: sparse_scores[i], reverse=True)

        dense_rank_map = {idx: rank + 1 for rank, idx in enumerate(dense_ranked_indices)}
        sparse_rank_map = {idx: rank + 1 for rank, idx in enumerate(sparse_ranked_indices)}

        fused_results = []
        for i in range(self.doc_count):
            r_dense = dense_rank_map[i]
            r_sparse = sparse_rank_map[i]
            rrf_score = (1.0 / (rrf_k + r_dense)) + (1.0 / (rrf_k + r_sparse))

            fused_results.append({
                "chunk": self.corpus[i],
                "rrf_score": round(rrf_score, 5),
                "dense_rank": r_dense,
                "sparse_rank": r_sparse,
                "dense_score": round(dense_scores[i], 3),
                "sparse_score": round(sparse_scores[i], 3)
            })

        fused_results.sort(key=lambda x: x["rrf_score"], reverse=True)
        return fused_results[:top_k]

    def query(self, query_text, triggered_by="officer_chat", related_check_id=None):
        """
        Full RAG pipeline (Section 6.2):
        1. Hybrid search (dense + sparse)
        2. RRF fusion
        3. Grounded context extraction
        4. Citations list
        5. Grounded answer synthesis
        6. Generates Schema 7 (RAG Query Record)
        """
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"
        query_id = f"RAG-Q-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]}"

        top_chunks = self.hybrid_search_with_rrf(query_text, top_k=3)

        # Check if context is sufficiently relevant
        is_relevant = any(c["rrf_score"] > 0.025 for c in top_chunks)

        cited_sources = []
        retrieved_for_log = []

        for item in top_chunks:
            c = item["chunk"]
            citation = f"{c['source_document']} ({c.get('clause_reference', 'General')})"
            cited_sources.append(citation)
            retrieved_for_log.append({
                "chunk_id": c["chunk_id"],
                "source_document": c["source_document"],
                "clause_reference": c["clause_reference"],
                "rrf_score": item["rrf_score"],
                "dense_rank": item["dense_rank"],
                "sparse_rank": item["sparse_rank"],
                "effective_date": c["effective_date"],
                "snippet": c["chunk_text"][:140] + "..."
            })

        if not is_relevant:
            confidence_flag = "insufficient_context"
            llm_answer = f"Not found in available regulatory corpus. The query '{query_text}' did not match any statutory thresholds or provisions in the indexed GeM, EPFO, ESIC, MSME, or Public Procurement orders."
        else:
            confidence_flag = "grounded"
            # Deterministic grounded synthesis fallback based strictly on top chunk
            best_chunk = top_chunks[0]["chunk"]
            llm_answer = (
                f"According to {best_chunk['source_document']} ({best_chunk.get('clause_reference', '')}):\n\n"
                f"{best_chunk['chunk_text']}\n\n"
                f"Source Citation: {best_chunk['source_document']} [Effective: {best_chunk['effective_date']}]."
            )

        rag_record = {
            "query_id": query_id,
            "query_text": query_text,
            "triggered_by": triggered_by,
            "related_check_id": related_check_id,
            "retrieved_chunks": retrieved_for_log,
            "llm_answer": llm_answer,
            "cited_sources": list(dict.fromkeys(cited_sources)),
            "confidence_flag": confidence_flag,
            "created_at": now_iso
        }

        return rag_record

if __name__ == "__main__":
    rag = RegulatoryRAG()
    test_queries = [
        "EPFO applicability employee count threshold",
        "Make in India Class 1 local content percentage minimum requirement",
        "What is the threshold for Micro Enterprise under MSME Udyam"
    ]
    import json
    for q in test_queries:
        res = rag.query(q)
        print(f"Query: {q}")
        print(f"Answer: {res['llm_answer'][:150]}...")
        print(f"Citations: {res['cited_sources']}\n")
