"""Task-level import, provenance and bounded run-reader behavior."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'plugin/skills/lead-engine/scripts/lead_io.py'
sys.path.insert(0, str(SCRIPT.parent))
spec = importlib.util.spec_from_file_location('lead_io', SCRIPT)
io = importlib.util.module_from_spec(spec)
spec.loader.exec_module(io)


def mapping(**changes):
    result = {'source_id': 'fictional-import', 'grain': 'contact',
              'fields': {'company': '/name', 'domain': '/website', 'email': '/email',
                         'email_status': '/status', 'fit': '/fit', 'evidence': '/evidence'},
              'provider_id': '/id', 'details': {'crm_id': '/crm/id', 'use_basis': '/use_basis'},
              'opt_out': '/opt_out'}
    result.update(changes)
    return result


class FakeTransport:
    def __init__(self, status='SUCCEEDED', count=3, fail_offset=None):
        self.status, self.count, self.fail_offset = status, count, fail_offset
        self.calls = []

    def get(self, endpoint, params=None):
        self.calls.append((endpoint, params))
        if endpoint == 'actor-runs/run123':
            return {'data': {'id': 'run123', 'actId': 'actor123', 'buildId': 'build123',
                             'status': self.status, 'defaultDatasetId': 'dataset123'}}
        if endpoint == 'datasets/dataset123':
            return {'data': {'id': 'dataset123', 'itemCount': self.count}}
        if endpoint == 'datasets/dataset123/items':
            if params['offset'] == self.fail_offset:
                raise io.TaskError('ACCESS_DENIED', 'blocked', 'Restore permitted access.')
            return [{'id': str(n), 'name': 'Example ' + str(n)}
                    for n in range(params['offset'], min(self.count, params['offset'] + params['limit']))]
        raise AssertionError(endpoint)


def state():
    return io.new_checkpoint('task123', 'run123', 'actor123', 'build123', 10)


class LeadIOTests(unittest.TestCase):
    def test_report_rejects_inconsistent_checkpoint_cursor(self):
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory() as scratch:
            p = Path(scratch)
            saved = io.read_run(state(), FakeTransport())
            saved['cursor'] = 0
            (p/'run.json').write_text(json.dumps(saved))
            (p/'map.json').write_text(json.dumps(mapping()))
            args = SimpleNamespace(input=p/'run.json', mapping=p/'map.json', output=p/'report',
                                   task_id='task123', from_checkpoint=True, suppression=None)
            with self.assertRaises(io.TaskError) as caught:
                io.prepare(args)
            self.assertEqual(caught.exception.code, 'STATE_CONFLICT')
            self.assertFalse((p/'report').exists())

    def test_report_downgrades_failed_checkpoint_claiming_complete(self):
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory() as scratch:
            p = Path(scratch)
            saved = io.read_run(state(), FakeTransport(status='FAILED'))
            saved['coverage'] = 'COMPLETE'
            (p/'run.json').write_text(json.dumps(saved))
            (p/'map.json').write_text(json.dumps(mapping()))
            args = SimpleNamespace(input=p/'run.json', mapping=p/'map.json', output=p/'report',
                                   task_id='task123', from_checkpoint=True, suppression=None)
            self.assertEqual(io.prepare(args)['coverage'], 'PARTIAL')

    def test_import_preserves_ids_and_use_basis_after_quality_sort_and_dedup(self):
        rows = [{'id': 'crm-a', 'name': 'One', 'website': 'one.example', 'email': 'a@one.example',
                 'crm': {'id': '100'}, 'use_basis': 'unknown'},
                {'id': 'crm-b', 'name': 'One again', 'website': 'one.example', 'email': 'a@one.example'},
                {'id': 'crm-c', 'name': 'One other contact', 'website': 'one.example', 'email': 'b@one.example'}]
        result = io.normalize(rows, mapping(), 'task123')
        self.assertEqual(result['quality']['counts'], {'qualified': 0, 'review': 2, 'excluded': 1, 'total': 3})
        sidecar = result['companion']['records']
        for bucket in ('qualified', 'review', 'excluded'):
            for row in result['quality'][bucket]:
                self.assertIn(row['record_id'], sidecar)
        first = sidecar[result['canonical'][0]['record_id']]
        self.assertEqual(first['provider_record_id'], 'crm-a')
        self.assertEqual(first['details']['crm_id'], '100')
        self.assertEqual(first['details']['use_basis'], 'unknown')
        self.assertIn('company', first['conflicts'][0]['fields'])

    def test_no_fabricated_fit_or_validity(self):
        result = io.normalize([{'name': 'One', 'website': 'one.example', 'fit': 'yes',
                                'email': 'a@one.example', 'status': 'valid'}], mapping(), 'task123')
        row = result['quality']['review'][0]
        self.assertFalse(row['criteria']['fit'])
        self.assertEqual(row['email_status'], 'unknown')

    def test_opt_out_excludes_without_requiring_domain(self):
        result = io.normalize([{'name': 'One', 'opt_out': True}], mapping(), 'task123')
        self.assertEqual(result['quality']['counts']['excluded'], 1)
        self.assertIn('explicit_opt_out', result['canonical'][0]['disqualifiers'])

    def test_diagnostics_cannot_be_valid_empty(self):
        result = io.normalize([{'recordType': 'ERROR', 'error': 'Source unavailable'}], mapping(), 'task123')
        self.assertEqual(result['canonical'], [])
        self.assertEqual(result['coverage'], 'PARTIAL')
        self.assertEqual(result['diagnostic_count'], 1)

    def test_unknown_columns_require_intentional_mapping(self):
        with self.assertRaises(io.TaskError):
            io.normalize([{}], mapping(fields={'company': '/name', 'api_key': '/key'}), 'task123')

    def test_secret_values_are_not_saved_or_echoed(self):
        result = io.normalize([{'name': 'One', 'website': 'one.example', 'crm': {'id': '100'},
                                'use_basis': {'apiKey': 'TOPSECRET'},
                                'email': 'https://user:TOPSECRET@one.example'}], mapping(), 'task123')
        self.assertNotIn('TOPSECRET', json.dumps(result))

    def test_json_pointer_supports_nested_and_escaped_fields(self):
        self.assertEqual(io.pointer({'a/b': {'~key': ['yes']}}, '/a~1b/~0key/0'), 'yes')
        self.assertIsNone(io.pointer({}, '/missing'))

    def test_bounded_pages_and_resume_keep_exact_cursor(self):
        first = io.read_run(state(), FakeTransport(), max_pages=1, page_size=2)
        self.assertEqual(first['cursor'], 2)
        self.assertEqual(first['state'], 'partial')
        transport = FakeTransport()
        final = io.read_run(first, transport, max_pages=2, page_size=2)
        self.assertEqual(final['cursor'], 3)
        self.assertEqual(final['state'], 'completed')
        self.assertEqual([x['id'] for x in final['items']], ['0', '1', '2'])
        self.assertEqual(transport.calls[-1][1]['offset'], 2)

    def test_partial_read_preserved_on_denied_second_page(self):
        commits = []
        with self.assertRaises(io.TaskError) as caught:
            io.read_run(state(), FakeTransport(fail_offset=2), max_pages=3, page_size=2,
                        commit=lambda saved: commits.append(json.loads(json.dumps(saved))))
        self.assertEqual(caught.exception.code, 'ACCESS_DENIED')
        self.assertEqual(commits[-1]['cursor'], 2)
        self.assertEqual(len(commits[-1]['items']), 2)

    def test_running_and_failed_runs_remain_partial(self):
        for status in ('RUNNING', 'FAILED', 'ABORTED', 'TIMED-OUT'):
            result = io.read_run(state(), FakeTransport(status=status), max_pages=3, page_size=2)
            self.assertEqual(result['state'], 'partial')
            self.assertNotEqual(result['coverage'], 'COMPLETE')

    def test_unknown_start_cannot_start_or_guess_run(self):
        saved = state(); saved['run_id'] = None; saved['state'] = 'unknown'
        transport = FakeTransport()
        with self.assertRaises(io.TaskError) as caught:
            io.read_run(saved, transport)
        self.assertEqual(caught.exception.code, 'OUTCOME_UNKNOWN')
        self.assertEqual(transport.calls, [])

    def test_identity_mismatch_stops_before_dataset_read(self):
        saved = state(); saved['actor_id'] = 'different'
        transport = FakeTransport()
        with self.assertRaises(io.TaskError): io.read_run(saved, transport)
        self.assertEqual(len(transport.calls), 1)

    def test_output_limit_is_partial_not_complete(self):
        saved = io.new_checkpoint('task123', 'run123', 'actor123', 'build123', 2)
        result = io.read_run(saved, FakeTransport(), page_size=2)
        self.assertEqual(result['state'], 'partial')
        self.assertTrue(result['truncated'])

    def test_checkpoint_conflict_and_shrinking_dataset_rejected(self):
        saved = state(); saved['cursor'] = 1
        with self.assertRaises(io.TaskError): io.read_run(saved, FakeTransport())
        saved['items'] = [{'id': '0'}]
        with self.assertRaises(io.TaskError): io.read_run(saved, FakeTransport(count=0))

    def test_cli_import_creates_traceable_report_without_account(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp); (p/'rows.json').write_text('[{"name":"Example","website":"example.test"}]')
            (p/'map.json').write_text(json.dumps(mapping()))
            run = subprocess.run([sys.executable, str(SCRIPT), 'prepare', '--input', str(p/'rows.json'),
                                  '--mapping', str(p/'map.json'), '--task-id', 'task123', '--output', str(p/'result')],
                                 capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            contract = json.loads(run.stdout)
            self.assertEqual(contract['state'], 'completed')
            for name in ('canonical.json', 'companion.json', 'suppression.json', 'quality.json', 'brief.html', 'brief.md', 'brief.json'):
                self.assertTrue((p/'result'/name).exists(), name)
            retry = subprocess.run(run.args, capture_output=True, text=True)
            self.assertEqual(json.loads(retry.stdout)['error']['code'], 'STATE_CONFLICT')

    def test_whole_run_reaches_report_with_attribution_and_partial_status(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            saved = io.read_run(state(), FakeTransport(status='FAILED'), page_size=2)
            (p/'run.json').write_text(json.dumps(saved))
            (p/'map.json').write_text(json.dumps(mapping()))
            run = subprocess.run([sys.executable, str(SCRIPT), 'prepare', '--input', str(p/'run.json'),
                                  '--from-checkpoint', '--mapping', str(p/'map.json'), '--task-id', 'task123',
                                  '--output', str(p/'result')], capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertEqual(json.loads(run.stdout)['coverage'], 'PARTIAL')
            companion = json.loads((p/'result/companion.json').read_text())
            self.assertEqual(companion['execution']['run_id'], 'run123')
            self.assertEqual(companion['execution']['dataset_id'], 'dataset123')
            self.assertEqual(companion['execution']['build_id'], 'build123')

    def test_pure_token_fields_are_redacted(self):
        self.assertNotIn('PRIVATE', json.dumps(io.scrub({'token': 'PRIVATE', 'APIFY_TOKEN': 'PRIVATE',
                                                       'url': 'https://example.test/data?key=PRIVATE'})))

    def test_opaque_mapping_id_is_retained_in_export(self):
        import io as streams
        result = io.normalize([{'id': 'provider123', 'name': 'One', 'website': 'one.example'}], mapping(), 'task123')
        output = streams.StringIO(); io.quality.write_csv(result['quality'], output)
        self.assertIn(result['canonical'][0]['record_id'], output.getvalue())

    def test_record_id_change_does_not_count_as_business_fact_change(self):
        before = io.normalize([{'name': 'One', 'website': 'one.example'}], mapping(grain='account'), 'task123')['canonical']
        after = io.normalize([{'name': 'One', 'website': 'one.example'}], mapping(grain='account'), 'task456')['canonical']
        report = io.reporter.build_report(after, grain='account', previous=before)
        self.assertEqual(report['delta']['retained'], 1)
        self.assertEqual(report['delta']['changed'], 0)

    def test_csv_import_needs_no_improvised_conversion(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp); (p/'rows.csv').write_text('id,name,website,email\n123,One,one.example,a@one.example\n')
            (p/'map.json').write_text(json.dumps(mapping()))
            run = subprocess.run([sys.executable, str(SCRIPT), 'prepare', '--input', str(p/'rows.csv'),
                                  '--mapping', str(p/'map.json'), '--task-id', 'csv123', '--output', str(p/'result')],
                                 capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertEqual(json.loads(run.stdout)['counts']['review'], 1)

    def test_reconciled_run_can_be_adopted_without_replay(self):
        from types import SimpleNamespace
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)/'run.json'
            io.atomic_json(p, io.new_checkpoint('task123', None, 'actor123', 'build123', 10))
            args = SimpleNamespace(checkpoint=p, task_id=None, run_id='run123', actor_id=None,
                                   build_id=None, record_limit=None, adopt_run=True, outcome_unknown=False,
                                   max_pages=2, page_size=2)
            transport = FakeTransport()
            with patch.object(io, 'CliTransport', return_value=transport): result = io.read_existing(args)
            self.assertEqual(result['task_id'], 'task123')
            self.assertEqual(result['state'], 'completed')
            self.assertEqual(io.load_json(p)['run_id'], 'run123')
            self.assertTrue(all(endpoint.startswith(('actor-runs/', 'datasets/')) for endpoint, _ in transport.calls))

    def test_failed_adoption_keeps_unknown_start_unassigned(self):
        from types import SimpleNamespace
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)/'run.json'
            io.atomic_json(p, io.new_checkpoint('task123', None, 'wrongactor', 'build123', 10))
            args = SimpleNamespace(checkpoint=p, task_id=None, run_id='run123', actor_id=None,
                                   build_id=None, record_limit=None, adopt_run=True, outcome_unknown=False,
                                   max_pages=2, page_size=2)
            with patch.object(io, 'CliTransport', return_value=FakeTransport()):
                with self.assertRaises(io.TaskError): io.read_existing(args)
            self.assertIsNone(io.load_json(p)['run_id'])

    def test_new_checkpoint_cannot_replace_existing_or_invalid_limit(self):
        with self.assertRaises(io.TaskError): io.new_checkpoint('task123', 'run123', 'actor123', record_limit=0)

    def test_malformed_checkpoint_is_safe_structured_error(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)/'run.json'; p.write_text('[]')
            result = subprocess.run([sys.executable, str(SCRIPT), 'read', '--checkpoint', str(p)],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(result.stdout)['error']['code'], 'UNSUPPORTED_CHECKPOINT')
            self.assertNotIn('Traceback', result.stderr)
            self.assertEqual(p.read_text(), '[]')

    def test_partial_error_contract_names_retained_artifact(self):
        from types import SimpleNamespace
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)/'run.json'
            io.atomic_json(p, state())
            args = SimpleNamespace(checkpoint=p, task_id=None, run_id=None, actor_id=None,
                                   build_id=None, record_limit=None, adopt_run=False, outcome_unknown=False,
                                   max_pages=3, page_size=2)
            with patch.object(io, 'CliTransport', return_value=FakeTransport(fail_offset=2)):
                with self.assertRaises(io.TaskError): io.read_existing(args)
            self.assertEqual(io.load_json(p)['cursor'], 2)
            self.assertEqual(io.load_json(p)['error']['code'], 'ACCESS_DENIED')

    def test_transport_rejects_arbitrary_url_and_mutation_endpoint(self):
        from unittest.mock import patch
        with patch.object(io.CliTransport.__init__.__globals__['shutil'], 'which', return_value='/official/apify'):
            transport = io.CliTransport()
        for endpoint in ('https://example.test/api', 'actors/actor123/runs', 'datasets/id/items?token=PRIVATE'):
            with self.assertRaises(io.TaskError): transport.get(endpoint)

    def test_invalid_opaque_id_cannot_echo_custom_private_id(self):
        with self.assertRaises(ValueError): io.quality.assess([{'record_id':'PRIVATE', 'company':'One'}])

    def test_checkpoint_size_bound_preserves_previous_cursor(self):
        from unittest.mock import patch
        commits = []
        with patch.dict(io.read_run.__globals__, {'MAX_CHECKPOINT_BYTES': 4200}):
            with self.assertRaises(io.TaskError) as caught:
                io.read_run(state(), FakeTransport(), commit=lambda saved: commits.append(saved.copy()))
        self.assertEqual(caught.exception.code, 'CHECKPOINT_TOO_LARGE')
        self.assertEqual(commits[-1]['cursor'], 0)


if __name__ == '__main__': unittest.main()
