"""The self-hosted workspace must never start the hosted form worker."""
from pathlib import Path
import unittest

WEB = Path(__file__).resolve().parents[1] / "web"


class PublicDistributionTests(unittest.TestCase):
    def test_worker_cannot_be_configured_or_dispatched(self):
        paths = [
            WEB / ".env.example", WEB / "lib/env.server.ts",
            WEB / "lib/apify/runner.ts", WEB / "lib/tasks/registry.ts",
            WEB / "lib/strategies/catalog.ts", WEB / "lib/tasks/credit-calc.ts",
            WEB / "app/(app)/outreach/new/actions.ts",
        ]
        for path in paths:
            content = path.read_text().lower()
            for term in ("two_captcha", "twocaptcha", "outreach.captcha_solve",
                         "outreach_provider", "runnativeoutreach", "actor_contact_form_submit_id"):
                with self.subTest(path=path.name, term=term):
                    self.assertNotIn(term, content)
        self.assertFalse((WEB / "lib/outreach/run-native-outreach.ts").exists())
