import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CONNECTED = ROOT / "connector/skills/vibeleads-core"
B2B = ROOT / "plugin/skills/lead-engine"
spec = importlib.util.spec_from_file_location("seller_plan", CONNECTED / "scripts/seller_plan.py")
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)


def action(plan, key):
    return next(method["action"] for method in plan["methods"] if method["id"] == key)


class SellerIntakeTests(unittest.TestCase):
    def test_installed_method_contract(self):
        for name in ("scripts/seller_plan.py", "references/seller-methods.json", "references/seller-intake.md"):
            self.assertEqual((CONNECTED / name).read_bytes(), (B2B / name).read_bytes())
        for path in (CONNECTED / "SKILL.md", B2B / "SKILL.md", ROOT / "connector/commands/find-leads.md"):
            self.assertIn("seller-intake.md", path.read_text())
        for method in json.loads(planner.MAP.read_text())["methods"]:
            self.assertTrue(all(source["url"].startswith("https://") for source in method["provenance"]))

    def test_bare_identity_and_concrete_alternatives(self):
        for brief in ("I am a video editor", "I am a web designer", "I am a food photographer",
                      "I am a technical translator", "I sell reusable cups"):
            with self.subTest(brief=brief):
                plan = planner.build(brief)
                self.assertGreaterEqual(len(plan["buyerHypotheses"]), 2)
                self.assertIsNotNone(action(plan, "business-fit"))
                self.assertIn("host_public_search", action(plan, "public-request").values())
        self.assertIsNone(action(planner.build("I am a video editor"), "channel-fit"))

    def test_open_ended_host_inference(self):
        brief = "I calibrate laboratory balances"
        initial = planner.build(brief)
        self.assertTrue(initial["assistantInference"])
        self.assertTrue(action(initial, "public-request"))
        enriched = planner.build(brief, {"segments": ["analytical testing laboratories", "pharmaceutical manufacturers"],
                                         "role": "laboratory operations manager", "serviceTerm": "balance calibration"})
        self.assertEqual(action(enriched, "business-fit")["arguments"]["filters"], {"keywords": "analytical testing laboratories"})
        self.assertEqual(len(enriched["buyerHypotheses"]), 2)

    def test_user_target_and_qualification_never_pollute_discovery(self):
        plan = planner.build("I am a web designer. I only pitch independent dental practices in Toronto. No social media. Budget $0.10")
        self.assertEqual(action(plan, "business-fit")["arguments"]["filters"],
                         {"keywords": "independent dental practices", "location": "Toronto"})
        self.assertFalse(any(m["id"] == "public-request" for m in plan["methods"]))
        self.assertIn("$0.10", plan["explicitConstraints"])
        plan = planner.build("I am a video editor. Freelance roles only.", {"market": "Toronto"})
        self.assertEqual(action(plan, "hiring-signal")["arguments"]["filters"],
                         {"jobTitles": ["video editor"], "keywords": "video editor", "location": "Toronto"})
        self.assertNotIn("freelance", action(plan, "hiring-signal")["arguments"]["request"])

    def test_product_and_software_buying_words(self):
        for brief, answers, word in [("I sell reusable cups", {}, "supplier"),
                                    ("I sell B2B SaaS", {"serviceTerm": "warehouse operations"}, "software")]:
            query = action(planner.build(brief, answers), "public-request")["query"]
            self.assertIn(word, query)
            self.assertNotIn("freelance", query)

    def test_hire_enrich_opaque_and_ambiguous(self):
        for brief, intent in [("I am XYZ", "clarify_offer"), ("We are hiring a video editor", "hire"),
                             ("Enrich my CSV of contacts", "enrich"), ("Find me video editors", "ambiguous")]:
            plan = planner.build(brief)
            self.assertEqual(plan["intent"], intent)
            self.assertEqual(plan["methods"], [])
