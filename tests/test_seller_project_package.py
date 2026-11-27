"""The normal seller command must be able to open its project guide after installation."""
from pathlib import Path
import sys
import tempfile
import unittest
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from package_distribution import write_connector


class SellerProjectPackageTest(unittest.TestCase):
    def test_connected_archives_include_the_ordinary_entry_and_its_guide(self):
        with tempfile.TemporaryDirectory() as folder:
            archives = write_connector(Path(folder))
            self.assertEqual(len(archives), 2)
            for path in archives:
                with ZipFile(path) as archive:
                    skill = next(name for name in archive.namelist()
                                 if name.endswith("skills/vibeleads-core/SKILL.md"))
                    reference = skill.rsplit("/", 1)[0] + "/references/seller-projects.md"
                    self.assertIn(b"references/seller-projects.md", archive.read(skill))
                    guide = archive.read(reference)
                    for term in (b"decide", b"sellerTracking", b"record_search", b"record_cost", b"costs", b"check_existing", b"resume_activity", b"attach_list", b"buyerRequirements"):
                        self.assertIn(term, guide)
                    skills_guide = Path(__file__).resolve().parents[1] / "plugin/skills/lead-engine/references/seller-projects.md"
                    self.assertEqual(guide, skills_guide.read_bytes())
