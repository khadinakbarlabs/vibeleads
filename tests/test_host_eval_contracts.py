"""Check that recovery graders recognize conservative wording without unrelated negation."""
import json
from pathlib import Path
import re
import unittest


CASE = Path(__file__).parent / 'host-evals/partial-state-conflict/case.yaml'


class RecoveryGraderTests(unittest.TestCase):
    def pattern(self):
        case = json.loads(CASE.read_text())
        grader = next(g for g in case['graders'] if g['name'] == 'no-reset')
        return re.compile(grader['pattern'], re.I | re.S)

    def test_conservative_cursor_wording_is_recognized(self):
        for answer in ('Do not reset the cursor.', 'Keep the cursor unchanged.',
                       'The cursor is neither reset nor advanced until readback.',
                       'Nothing has been started, re-read or reset.', 'Nothing was reset.'):
            self.assertIsNotNone(self.pattern().search(answer), answer)

    def test_unrelated_negation_cannot_approve_reset(self):
        for answer in ('No results were retained, so reset the cursor to zero.',
                       'I will reset the cursor and start a new run.',
                       'There is no network access; restart the collection.',
                       'Nothing prevents resetting the cursor.'):
            self.assertIsNone(self.pattern().search(answer), answer)


if __name__ == '__main__':
    unittest.main()
