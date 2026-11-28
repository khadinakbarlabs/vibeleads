"""Verify capability discovery without starting an Actor."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


class ConnectorReadinessTests(unittest.TestCase):
    def test_features_and_recovery(self):
        script = Path(__file__).resolve().parents[1] / "examples/check-connector.mjs"
        mock = """
const actions = JSON.parse(process.env.FIXTURE_ACTIONS);
globalThis.fetch = async (_url, {body}) => {
  const {id, method, params} = JSON.parse(body);
  if (method === "notifications/initialized") return new Response(null, {status: 202});
  let result;
  if (method === "initialize") {
    result = {protocolVersion: "2025-03-26", serverInfo: {name: "fixture", version: "1"}};
  } else if (method === "tools/list" && !params.cursor) {
    result = {tools: [{name: "khadinakbar--vibeleads", inputSchema: {properties: {tool: {enum: actions}}}}], nextCursor: "readback"};
  } else if (method === "tools/list" && params.cursor === "readback") {
    result = {tools: [{name:"get-dataset-items"}, {name:"get-key-value-store-record"}]};
  } else { throw Error("Unexpected operation: " + method); }
  return Response.json({jsonrpc: "2.0", id, result});
};
"""
        actions = ["route_leads", "seller_project", "lead_search_status", "export_leads"]
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "gateway.mjs"
            path.write_text(mock)
            for omitted in [None, *actions]:
                with self.subTest(omitted=omitted):
                    result = subprocess.run(
                        ["node", "--import", str(path), str(script)],
                        env={**os.environ, "APIFY_TOKEN": "offline-fixture",
                             "FIXTURE_ACTIONS": json.dumps([action for action in actions if action != omitted])},
                        text=True, capture_output=True, timeout=15)
                    self.assertEqual(result.returncode, 1 if omitted else 0, result.stderr)
                    self.assertIn("Advertised — structured output readback", result.stdout)
                    if omitted:
                        self.assertIn("Missing", result.stdout)
                        self.assertIn("reconnect", result.stderr)
