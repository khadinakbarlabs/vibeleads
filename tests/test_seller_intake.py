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
    def test_included_buyer_posts_and_separately_approved_native_sources(self):
        method = next(m for m in planner.build("I am a video editor. Free sources only.")["methods"] if m["id"] == "public-request")
        self.assertEqual(method["action"]["mode"], "host_public_search")
        self.assertIn("included public search", method["requires"])
        self.assertIn("Paid native Reddit or X searches require their own quote and seller approval", method["requires"])
        self.assertNotIn("later wave", method["requires"])
    def test_seller_asking_for_a_list_and_employer_asking_for_a_worker(self):
        self.assertEqual(planner.build("I need a list of prospects for my design agency.")["intent"], "sell")
        self.assertEqual(planner.build("I need a video editor for my team.")["intent"], "hire")
        self.assertEqual(planner.build("I need a video editor for my clients.")["intent"], "hire")

    def test_generic_call_to_action_preserves_explicit_business_audience(self):
        plan = planner.build("We sell dental scheduling software to clinics. Find me clients.")
        self.assertEqual(plan["buyerHypotheses"], ["clinics"])
        self.assertIn("clinics", action(plan, "public-request")["query"])

    def test_commercial_offers_without_a_buyer_and_product_descriptions(self):
        for brief, kind, term in [
                ("I sell headphones.", "product", "headphones"),
                ("Our product is invoicing software for architects.", "software", "invoicing software"),
                ("I sell bookkeeping.", "service", "bookkeeping"),
                ("I make promotional videos for restaurants.", "service", "promotional videos")]:
            with self.subTest(brief=brief):
                plan = planner.build(brief)
                self.assertEqual(plan["saleType"], kind)
                self.assertIn(term, action(plan, "public-request")["query"])

    def test_named_source_limits_and_unknown_platform(self):
        for instruction, domain in [("TikTok only.", "tiktok.com"), ("Search only on Vimeo.", "vimeo.com")]:
            with self.subTest(instruction=instruction):
                plan = planner.build("I am a video editor. " + instruction)
                self.assertEqual([method["id"] for method in plan["methods"]], ["public-request"])
                self.assertIn("site:" + domain, action(plan, "public-request")["query"])
                self.assertIsNone(plan["methods"][0]["fallback"])
        self.assertEqual(planner.build("I am a video editor. Search only on VideoBazaar.")["methods"], [])
        excluded = action(planner.build("I am a video editor. No social media."), "public-request")["query"]
        for domain in ("reddit.com", "tiktok.com", "facebook.com"):
            self.assertIn("-site:" + domain, excluded)
        free = planner.build("I am a video editor. Free sources only.")
        self.assertEqual([m["action"]["mode"] for m in free["methods"]], ["host_public_search"])
        self.assertIsNone(free["methods"][0]["fallback"])

    def test_negative_specialty_preserves_occupation_and_audience(self):
        plan = planner.build("I am a podcast editor for dance studios. No video work.")
        self.assertEqual(plan["buyerHypotheses"], ["dance studios"])
        self.assertNotIn("video editor", action(plan, "public-request")["query"])

    def test_successive_explicit_limits_survive_actor_handoffs(self):
        brief = "I am a web designer. Find 8 clinics in Paris."
        plan = planner.build(brief)
        self.assertEqual(action(plan, "business-fit")["arguments"]["filters"]["count"], 8)
        for invalid in (0, 1001, 30000):
            plan = planner.build(f"I am a web designer. Find {invalid} clinics in Berlin.")
            self.assertEqual(plan["methods"], [])
            self.assertIn("count", plan["next"].lower())
        plan = planner.build("I am a video editor. YouTube only. Find 24 channels.", {
            "country": "CA", "language": "en", "channelTopic": "cooking"})
        self.assertEqual(action(plan, "channel-fit")["arguments"]["maxChannels"], 24)
        plan = planner.build("I am a web designer. Find 2 clinics in Berlin.", {"country": "DE", "language": "de"})
        self.assertEqual(action(plan, "organic-fit")["arguments"]["maxResults"], 2)

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
        self.assertIn("-site:reddit.com", action(plan, "public-request")["query"])
        self.assertIn("-site:linkedin.com", action(plan, "public-request")["query"])
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

    def test_explicit_youtube_region_and_language(self):
        plan = planner.build("I am a video editor. Find English-language YouTube podcasts in Canada.")
        self.assertEqual([m["id"] for m in plan["methods"]], ["channel-fit"])
        args = action(plan, "channel-fit")["arguments"]
        self.assertEqual((args["country"], args["language"]), ("CA", "en"))

    def test_source_restriction_survives_missing_region(self):
        plan = planner.build("I am a video editor. Use only YouTube.")
        self.assertEqual([m["id"] for m in plan["methods"]], ["channel-fit"])
        self.assertIn("site:youtube.com", action(plan, "channel-fit")["query"])
        plan = planner.build("I am a video editor. Skip Reddit.")
        self.assertIn("-site:reddit.com", action(plan, "public-request")["query"])
        self.assertNotIn("site:x.com", action(plan, "public-request")["query"])

    def test_raw_product_buyer_and_software_query(self):
        plan = planner.build("I sell inventory software to independent bicycle shops")
        self.assertEqual(plan["buyerHypotheses"], ["independent bicycle shops"])
        self.assertEqual(plan["saleType"], "software")
        self.assertEqual(plan["offer"], "inventory software")
        self.assertIn("inventory software", action(plan, "public-request")["query"])
        self.assertNotIn("freelance", action(plan, "public-request")["query"])
        self.assertEqual(action(plan, "business-fit")["arguments"]["filters"], {"keywords": "independent bicycle shops"})

    def test_raw_service_buyer_market_with_restricted_source(self):
        plan = planner.build("I design websites for independent dentists in Toronto, Canada. Skip Reddit.")
        self.assertEqual(plan["buyerHypotheses"], ["independent dentists"])
        self.assertEqual(action(plan, "maps-site")["arguments"]["locations"], ["Toronto, Canada"])
        self.assertEqual(action(plan, "business-fit")["arguments"]["filters"]["location"], "Toronto, Canada")
        self.assertIn("-site:reddit.com", action(plan, "public-request")["query"])
        self.assertNotIn("site:x.com", action(plan, "public-request")["query"])

    def test_supplier_and_service_preposition_holdouts(self):
        plan = planner.build("We supply refillable bottles to boutique hotels in Bristol.")
        self.assertEqual(plan["buyerHypotheses"], ["boutique hotels"])
        self.assertEqual(plan["saleType"], "product")
        self.assertIn("refillable bottles", action(plan, "public-request")["query"])
        plan = planner.build("I translate manuals for equipment exporters in Japan.")
        self.assertEqual(plan["buyerHypotheses"], ["equipment exporters"])
        self.assertEqual(action(plan, "business-fit")["arguments"]["filters"]["location"], "Japan")
