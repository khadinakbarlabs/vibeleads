#!/usr/bin/env python3
"""Prepare traceable private lead reports or resume reads of an existing run."""
import argparse
import csv
from datetime import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

from run_reader import (VERSION, SECRET_KEY, TaskError, CliTransport, identifier,
                        bounded_int, scrub, new_checkpoint, read_run)

ROOT = Path(__file__).resolve().parents[3]
_spec = importlib.util.spec_from_file_location('vibeleads_report_io', ROOT / 'skills/lead-reporting/scripts/lead_report.py')
reporter = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(reporter)
quality = reporter.quality
MAX_BYTES = 20 * 1024 * 1024


def pointer(row, path):
    if not isinstance(path, str) or not path.startswith('/') or len(path) > 512:
        raise TaskError('INVALID_INPUT')
    value = row
    for part in path[1:].split('/'):
        key = part.replace('~1', '/').replace('~0', '~')
        if isinstance(value, dict): value = value.get(key)
        elif isinstance(value, list) and key.isdecimal():
            index = int(key); value = value[index] if index < len(value) else None
        else: return None
    return value


def load_json(path):
    if path.stat().st_size > MAX_BYTES: raise TaskError('INPUT_TOO_LARGE')
    try: return json.loads(path.read_text(encoding='utf-8-sig'))
    except (ValueError, UnicodeError, RecursionError): raise TaskError('INVALID_INPUT') from None


def load_records(path):
    if path.suffix.lower() != '.csv': return load_json(path)
    if path.stat().st_size > MAX_BYTES: raise TaskError('INPUT_TOO_LARGE')
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames or len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise TaskError('INVALID_INPUT')
        rows = []
        for row in reader:
            if None in row or len(rows) >= 10000: raise TaskError('INVALID_INPUT')
            rows.append(row)
        return rows


def normalize(records, mapping, task_id, suppression=None, coverage='NOT_REPORTED'):
    identifier(task_id)
    if not isinstance(records, list) or len(records) > 10000 or any(not isinstance(x, dict) for x in records):
        raise TaskError('INVALID_INPUT')
    allowed = {'source_id', 'grain', 'fields', 'provider_id', 'details', 'opt_out', 'observed_at'}
    if not isinstance(mapping, dict) or set(mapping) - allowed:
        raise TaskError('INVALID_INPUT')
    source = identifier(mapping.get('source_id')); grain = mapping.get('grain', 'account')
    if mapping.get('observed_at') is not None:
        try:
            observed = datetime.fromisoformat(mapping['observed_at'].replace('Z', '+00:00'))
            if observed.tzinfo is None: raise ValueError()
        except (ValueError, TypeError, AttributeError): raise TaskError('INVALID_INPUT') from None
    if grain not in {'account', 'contact', 'branch'}: raise TaskError('INVALID_INPUT')
    fields, details = mapping.get('fields'), mapping.get('details', {})
    valid_fields = set(quality.FIELDS) | {'fit', 'problem', 'timing', 'disqualifiers', 'evidence'}
    if not isinstance(fields, dict) or not fields or set(fields) - valid_fields or not isinstance(details, dict) or len(details) > 50:
        raise TaskError('INVALID_INPUT')
    if any(not isinstance(k, str) or len(k) > 80 or SECRET_KEY.search(k) for k in details):
        raise TaskError('INVALID_INPUT')
    for path in list(fields.values()) + list(details.values()) + [mapping[k] for k in ('provider_id', 'opt_out') if k in mapping]:
        pointer({}, path)  # Validate paths before processing rows, including empty imports.
    suppressed_domains, suppressed_emails = quality.suppression_sets(suppression)
    canonical, companion, diagnostics = [], {}, 0
    for position, original in enumerate(records):
        row = scrub(original)
        kind = str(row.get('recordType', row.get('_type', row.get('type', '')))).upper()
        if kind in {'ERROR', 'SUMMARY', 'RUN_SUMMARY', 'DIAGNOSTIC'} or row.get('errorInfo') or row.get('error'):
            diagnostics += 1; continue
        selected = {k: pointer(row, path) for k, path in fields.items()}
        record_id = 'vl_' + hashlib.sha256(json.dumps([task_id, source, position, row], sort_keys=True,
                                                       ensure_ascii=False).encode()).hexdigest()[:32]
        lead = {k: quality.text(selected.get(k)) for k in quality.FIELDS}
        lead['record_id'] = record_id
        lead['domain'] = quality.domain(lead['domain']); lead['email'] = lead['email'].lower()
        for key in ('fit', 'problem', 'timing'): lead[key] = selected.get(key) is True
        lead['evidence'] = quality.evidence_items(selected.get('evidence'))
        disqualifiers = selected.get('disqualifiers')
        if disqualifiers is not None and (not isinstance(disqualifiers, list) or any(not isinstance(x, str) for x in disqualifiers)):
            raise TaskError('INVALID_INPUT')
        lead['disqualifiers'] = list(disqualifiers or [])
        opted_out = pointer(row, mapping['opt_out']) if 'opt_out' in mapping else None
        if opted_out is True:
            lead['disqualifiers'].append('explicit_opt_out')
            if grain == 'account' and lead['domain']: suppressed_domains.add(lead['domain'])
            elif lead['email']: suppressed_emails.add(lead['email'])
        elif opted_out is not None and opted_out is not False:
            lead['disqualifiers'].append('opt_out_state_needs_review')
        canonical.append(lead)
        key = quality.identity(lead, grain)
        companion[record_id] = {'source_id': source,
            'provider_record_id': pointer(row, mapping['provider_id']) if 'provider_id' in mapping else None,
            'source_record_locator': position, 'identity': list(key) if key else None,
            'identity_state': 'exact_key_requires_entity_review' if key else 'ambiguous',
            'observed_at': mapping.get('observed_at'), 'opt_out': opted_out,
            'details': {k: pointer(row, path) for k, path in details.items()},
            'field_sources': {k: {'pointer': path, 'source_id': source,
                                  'observed_at': mapping.get('observed_at')} for k, path in fields.items()},
            'missing_fields': [k for k, value in selected.items() if value is None],
            'conflict_review': 'Duplicate facts are retained separately, never merged automatically.'}
    policy = {'domains': sorted(suppressed_domains), 'emails': sorted(suppressed_emails)}
    groups = {}
    for lead in canonical:
        key = quality.identity(lead, grain)
        if key: groups.setdefault(key, []).append(lead)
    for group in groups.values():
        if len(group) < 2: continue
        different = [field for field in quality.FIELDS if len({row[field] for row in group}) > 1]
        if not different: continue
        conflict = {'records': [row['record_id'] for row in group], 'fields': different}
        for row in group: companion[row['record_id']]['conflicts'] = [conflict]
    for value in companion.values(): value.setdefault('conflicts', [])
    return {'canonical': canonical, 'companion': {'task_id': task_id, 'grain': grain, 'records': companion,
            'join': 'record_id; source_record_locator is attribution, never an output-row join',
            'use_note': 'Missing contact-use/consent state remains unknown. Quality is not permission to message.'},
            'suppression': policy, 'quality': quality.assess(canonical, grain, policy),
            'diagnostic_count': diagnostics, 'coverage': 'PARTIAL' if diagnostics else coverage}


def destination(path):
    if path.resolve().is_relative_to(ROOT) or path.is_symlink():
        raise TaskError('INVALID_PATH', 'blocked', 'Choose a private output outside the installed plugin.')
    if not path.parent.is_dir(): raise TaskError('PROJECT_MISSING', 'blocked', 'Create the chosen private workspace first.')


def atomic_json(path, value):
    destination(path)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as stream:
        tmp = Path(stream.name)
        try:
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write('\n'); stream.flush(); os.fsync(stream.fileno())
            tmp.replace(path)
        finally: tmp.unlink(missing_ok=True)


def prepare(args):
    destination(args.output)
    if args.output.exists(): raise TaskError('STATE_CONFLICT', 'blocked', 'Choose a new report directory; original artifacts are preserved.')
    data = load_records(args.input); mapping = load_json(args.mapping)
    coverage = 'NOT_REPORTED'
    execution = None
    if args.from_checkpoint:
        if not isinstance(data, dict) or data.get('helper_version') != VERSION:
            raise TaskError('UNSUPPORTED_CHECKPOINT')
        if args.task_id != data.get('task_id'): raise TaskError('STATE_CONFLICT')
        limit = bounded_int(data.get('record_limit'), 1, 10000)
        cursor = bounded_int(data.get('cursor'), 0, limit)
        if not isinstance(data.get('items'), list) or len(data['items']) != cursor:
            raise TaskError('STATE_CONFLICT', 'blocked', 'Review the checkpoint cursor and retained rows before reporting.')
        execution = {k: data.get(k) for k in ('run_id', 'actor_id', 'build_id', 'dataset_id', 'run_status',
                                             'cursor', 'snapshot_item_count', 'observed_at', 'platform_usage_usd', 'usage_note')}
        coverage = 'PARTIAL'
        if (data.get('run_status') == 'SUCCEEDED' and data.get('state') == 'completed'
                and data.get('truncated') is False and not isinstance(data.get('snapshot_item_count'), bool)
                and isinstance(data.get('snapshot_item_count'), int) and cursor == data['snapshot_item_count']
                and all(data.get(k) for k in ('run_id', 'actor_id', 'build_id', 'dataset_id'))):
            coverage = 'COMPLETE' if cursor else 'VALID_EMPTY'
        data = data['items']
    result = normalize(data, mapping, args.task_id,
                       load_json(args.suppression) if args.suppression else None, coverage)
    if execution is not None: result['companion']['execution'] = scrub(execution)
    summary = {'title': 'Your lead research brief', 'coverage_state': result['coverage'],
               'next_actions': ['Review unresolved evidence and contact-use state in companion.json before the next stage.']}
    brief = reporter.build_report(result['canonical'], mapping.get('grain', 'account'), result['suppression'], summary)
    stage = Path(tempfile.mkdtemp(prefix='.vibeleads-report-', dir=args.output.parent))
    try:
        for key in ('canonical', 'companion', 'suppression', 'quality'):
            atomic_json(stage / (key + '.json'), result[key])
        for name, content in [('brief.html', reporter.render_html(brief)), ('brief.md', reporter.render_markdown(brief)),
                              ('brief.json', json.dumps(brief, ensure_ascii=False, indent=2))]:
            (stage/name).write_text(content, encoding='utf-8'); (stage/name).chmod(0o600)
        # mkdir is exclusive: never replace another process's report directory.
        args.output.mkdir(mode=0o700)
        for path in stage.iterdir(): path.replace(args.output / path.name)
    finally: shutil.rmtree(stage)
    return {'state': 'completed', 'stage': 'import_report', 'counts': result['quality']['counts'],
            'coverage': result['coverage'], 'diagnostic_count': result['diagnostic_count'],
            'artifacts': {k: str(args.output/(k+'.json')) for k in ('canonical', 'companion', 'quality', 'suppression')},
            'report': str(args.output/'brief.html'), 'verification': 'local_mapping_and_quality_checks',
            'next_action': summary['next_actions'][0]}


def read_existing(args):
    path = args.checkpoint; destination(path)
    lock = path.with_name(path.name + '.lock')
    try: fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError: raise TaskError('STATE_CONFLICT', 'blocked', 'A reader owns the lock; verify it has stopped before removing a stale lock.') from None
    os.close(fd)
    try:
        saved = scrub(load_json(path)) if path.exists() else new_checkpoint(args.task_id, args.run_id, args.actor_id,
                                                                   args.build_id, 1000 if args.record_limit is None else args.record_limit)
        if not isinstance(saved, dict) or saved.get('helper_version') != VERSION:
            raise TaskError('UNSUPPORTED_CHECKPOINT', 'blocked', 'Use the matching helper and review the saved checkpoint format.')
        adopting = args.adopt_run and saved.get('run_id') is None and args.run_id is not None
        if args.adopt_run and not adopting: raise TaskError('STATE_CONFLICT')
        for key in ('task_id', 'run_id', 'actor_id', 'build_id', 'record_limit'):
            incoming = getattr(args, key)
            if key == 'run_id' and adopting: continue
            if incoming is not None and incoming != saved.get(key): raise TaskError('STATE_CONFLICT')
        if adopting:
            saved = dict(saved, run_id=identifier(args.run_id))
        elif not path.exists(): atomic_json(path, saved)
        if args.outcome_unknown:
            if saved.get('run_id'): raise TaskError('STATE_CONFLICT')
            return {'state': 'unknown', 'stage': 'start_reconciliation', 'artifact': str(path),
                    'task_id': saved['task_id'],
                    'next_action': 'Obtain the exact run ID through permitted readback; never automatically replay the start.'}
        def commit(value):
            # An unknown start is associated only after matching run/Actor/build readback.
            if not adopting or value.get('dataset_id'): atomic_json(path, value)
        saved = read_run(saved, CliTransport(), args.max_pages, args.page_size, commit)
        return {'state': saved['state'], 'stage': 'dataset_read', 'coverage': saved['coverage'],
                'task_id': saved['task_id'],
                'run_id': saved['run_id'], 'cursor': saved['cursor'], 'truncated': saved['truncated'],
                'artifact': str(path), 'verification': 'existing_run_readback', 'next_action': saved['next_action']}
    finally: lock.unlink(missing_ok=True)


class Parser(argparse.ArgumentParser):
    def error(self, message): raise TaskError('INVALID_INPUT')


def main():
    parser = Parser(description=__doc__)
    sub = parser.add_subparsers(dest='operation', required=True)
    sub.add_parser('doctor', help='Inspect local runtime only; no account/network check.')
    p = sub.add_parser('prepare', help='Map an import and create provenance, quality and visual artifacts offline.')
    p.add_argument('--input', type=Path, required=True); p.add_argument('--mapping', type=Path, required=True)
    p.add_argument('--task-id', required=True); p.add_argument('--output', type=Path, required=True)
    p.add_argument('--suppression', type=Path); p.add_argument('--from-checkpoint', action='store_true')
    p = sub.add_parser('read', help='Read/resume a known existing run; never starts collection.')
    p.add_argument('--checkpoint', type=Path, required=True)
    for key in ('task-id', 'run-id', 'actor-id', 'build-id'): p.add_argument('--'+key)
    p.add_argument('--record-limit', type=int); p.add_argument('--page-size', type=int, default=100)
    p.add_argument('--max-pages', type=int, default=5); p.add_argument('--outcome-unknown', action='store_true')
    p.add_argument('--adopt-run', action='store_true', help='Associate a reconciled exact run ID with an unknown-start checkpoint; no replay.')
    args = None
    try:
        args = parser.parse_args()
        if args.operation == 'doctor':
            result = {'state': 'completed', 'stage': 'runtime_check', 'python': sys.version.split()[0],
                      'local_import': True, 'run_reader_available': shutil.which('apify') is not None,
                      'authentication': 'not_checked', 'verification': 'executable_presence_only',
                      'next_action': 'Use prepare for an import; check current CLI help and secure login before run readback.'}
        elif args.operation == 'prepare': result = prepare(args)
        else: result = read_existing(args)
        result.update(product='VibeLeads', helper_version=VERSION)
        result.setdefault('task_id', getattr(args, 'task_id', None))
        print(json.dumps(result, ensure_ascii=False)); return 0
    except (TaskError, OSError, ValueError, TypeError, csv.Error, RecursionError) as error:
        if not isinstance(error, TaskError):
            code = ('INPUT_MISSING' if isinstance(error, FileNotFoundError) else 'ACCESS_DENIED' if isinstance(error, PermissionError)
                    else 'STATE_CONFLICT' if isinstance(error, FileExistsError) else 'INVALID_INPUT')
            error = TaskError(code)
        result = {'product': 'VibeLeads', 'helper_version': VERSION, 'state': error.state,
                  'stage': getattr(args, 'operation', 'input'),
                  'error': {'code': error.code}, 'next_action': error.next_action}
        checkpoint = getattr(args, 'checkpoint', None)
        if checkpoint is not None and checkpoint.is_file():
            result['artifact'] = str(checkpoint)
            try:
                saved = load_json(checkpoint)
                if not isinstance(saved, dict): raise TaskError('UNSUPPORTED_CHECKPOINT')
                result['task_id'] = identifier(saved.get('task_id'))
                result['cursor'] = saved.get('cursor') if isinstance(saved.get('cursor'), int) else None
                result['coverage'] = 'PARTIAL'
            except (TaskError, OSError, ValueError, TypeError):
                result['checkpoint_review_required'] = True
        print(json.dumps(result))
        print('VibeLeads operation stopped: ' + error.code, file=sys.stderr); return 2


if __name__ == '__main__': sys.exit(main())
