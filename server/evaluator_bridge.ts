import { execFile } from "child_process";
import path from "path";
import fs from "fs";

export interface EvaluationInput {
  bidder_profile: any;
  documents: any[];
  portal_records: any[];
  tender_rules?: any[];
  rag_thresholds?: any;
}

export async function runPythonRuleEngine(input: EvaluationInput): Promise<{ check_results: any[]; report: any }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), "server/rule_engine.py");
    const inputJson = JSON.stringify(input);

    const pyCode = `
import sys
import json
import os
sys.path.append(os.path.dirname(r'${scriptPath}'))
from rule_engine import evaluate_compliance

data = json.loads(sys.stdin.read())
checks, report = evaluate_compliance(
    data.get('bidder_profile', {}),
    data.get('documents', []),
    data.get('portal_records', []),
    data.get('tender_rules', None),
    data.get('rag_thresholds', None)
)
print(json.dumps({'check_results': checks, 'report': report}))
`;

    const child = execFile("python3", ["-c", pyCode], { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      if (error) {
        console.error("Python rule engine error:", stderr || error.message);
        reject(error);
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseErr) {
        console.error("Failed to parse Python rule engine output:", stdout);
        reject(parseErr);
      }
    });

    child.stdin?.write(inputJson);
    child.stdin?.end();
  });
}

export async function runPythonRAG(queryText: string, triggeredBy: string = "officer_chat", relatedCheckId?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), "server/rag_engine.py");
    const pyCode = `
import sys
import json
import os
sys.path.append(os.path.dirname(r'${scriptPath}'))
from rag_engine import RegulatoryRAG

rag = RegulatoryRAG()
query = sys.argv[1]
triggered_by = sys.argv[2]
check_id = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "null" else None

res = rag.query(query, triggered_by=triggered_by, related_check_id=check_id)
print(json.dumps(res))
`;

    execFile("python3", ["-c", pyCode, queryText, triggeredBy, relatedCheckId || "null"], (error, stdout, stderr) => {
      if (error) {
        console.error("Python RAG error:", stderr || error.message);
        reject(error);
        return;
      }
      try {
        const res = JSON.parse(stdout.trim());
        resolve(res);
      } catch (parseErr) {
        console.error("Failed to parse Python RAG output:", stdout);
        reject(parseErr);
      }
    });
  });
}
