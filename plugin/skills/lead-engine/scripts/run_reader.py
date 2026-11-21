"""Read-only run reconciliation and raw-offset paging through the official CLI."""
import copy
from datetime import datetime, timezone
import json
import math
import re
import shutil
import subprocess
import tempfile
from urllib.parse import parse_qsl, urlsplit

VERSION = '0.3.1'
MAX_CHECKPOINT_BYTES = 20 * 1024 * 1024
IDENTIFIER = re.compile(r'^[A-Za-z0-9_-]{1,80}$')
SECRET_KEY = re.compile(r'api.?key|access.?token|auth.?token|refresh.?token|password|secret|cookie|authorization|credential|(?:^|[_-])(?:token|bearer)(?:$|[_-])', re.I)


class TaskError(Exception):
    def __init__(self, code, state='failed', next_action='Check the selected input and try again.'):
        super().__init__(code)
        self.code, self.state, self.next_action = code, state, next_action


def identifier(value):
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value):
        raise TaskError('INVALID_INPUT')
    return value


def bounded_int(value, low, high):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise TaskError('INVALID_INPUT')
    return value


def scrub(value, depth=0):
    """Remove credential fields/typed credential URLs, retaining selected business data."""
    if depth > 40: raise TaskError('INVALID_INPUT')
    if isinstance(value, dict):
        return {k: scrub(v, depth + 1) for k, v in value.items() if not SECRET_KEY.search(k)}
    if isinstance(value, list):
        return [scrub(v, depth + 1) for v in value]
    if isinstance(value, str):
        for candidate in re.findall(r'https?://[^\s<>"\']+', value):
            try:
                url = urlsplit(candidate)
                if url.username or url.password or any(SECRET_KEY.search(k) or k.lower() in {'token', 'key', 'signature', 'sig', 'auth'}
                                                      for k, _ in parse_qsl(url.query)):
                    return '[credential URL removed]'
            except ValueError:
                return '[invalid URL removed]'
    return value


class CliTransport:
    """No generic shell, arbitrary endpoints, POST, start, retry or secret storage."""
    def __init__(self):
        self.executable = shutil.which('apify')
        if not self.executable:
            raise TaskError('RUNTIME_MISSING', 'blocked', 'Use an import or configure the official CLI.')

    def get(self, endpoint, params=None):
        if not re.fullmatch(r'(?:actor-runs/[A-Za-z0-9_-]+|datasets/[A-Za-z0-9_-]+(?:/items)?)', endpoint):
            raise TaskError('INVALID_INPUT')
        args = [self.executable, 'api', 'GET', endpoint]
        if params is not None:
            args += ['--params', json.dumps(params)]
        # Spool output instead of loading a potentially oversized provider response in RAM.
        with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
            try:
                done = subprocess.run(args, stdout=stdout, stderr=stderr, timeout=25, check=False)
            except subprocess.TimeoutExpired:
                raise TaskError('READ_TIMEOUT', 'partial', 'Resume this existing run; never start another one.') from None
            except OSError:
                raise TaskError('RUNTIME_MISSING', 'blocked', 'Restore the official CLI or use the retained import.') from None
            stderr.seek(0); diagnostic = stderr.read(16384).decode('utf-8', errors='replace')
            if done.returncode:
                code = ('AUTH_REQUIRED' if re.search(r'\b401\b|not logged|not authenticated', diagnostic, re.I)
                        else 'ACCESS_DENIED' if re.search(r'\b403\b', diagnostic)
                        else 'RATE_LIMITED' if re.search(r'\b429\b', diagnostic)
                        else 'REMOTE_READ_FAILED')
                raise TaskError(code, 'blocked', 'Restore permitted access, then resume this run.')
            if stdout.tell() > 16 * 1024 * 1024:
                raise TaskError('RESPONSE_TOO_LARGE', 'partial', 'Resume with a smaller page size.')
            stdout.seek(0)
            try:
                return json.loads(stdout.read())
            except (ValueError, UnicodeError, RecursionError):
                raise TaskError('INVALID_RESPONSE', 'partial', 'Check CLI compatibility; preserve this checkpoint.') from None


def new_checkpoint(task_id, run_id, actor_id, build_id=None, record_limit=1000):
    return {'helper_version': VERSION, 'task_id': identifier(task_id),
            'run_id': identifier(run_id) if run_id else None, 'actor_id': identifier(actor_id),
            'build_id': identifier(build_id) if build_id else None,
            'record_limit': bounded_int(record_limit, 1, 10000), 'dataset_id': None,
            'cursor': 0, 'items': [], 'state': 'planned' if run_id else 'unknown',
            'coverage': 'NOT_REPORTED', 'truncated': False}


def data_object(response):
    if not isinstance(response, dict) or not isinstance(response.get('data'), dict):
        raise TaskError('INVALID_RESPONSE', 'partial', 'Check the provider response and preserve partial rows.')
    return response['data']


def read_run(checkpoint, transport, max_pages=5, page_size=100, commit=None):
    """Advance by unfiltered raw rows; checkpoint each page before another request."""
    max_pages = bounded_int(max_pages, 1, 25); page_size = bounded_int(page_size, 1, 500)
    if not isinstance(checkpoint, dict) or checkpoint.get('helper_version') != VERSION:
        raise TaskError('UNSUPPORTED_CHECKPOINT', 'blocked', 'Use the matching helper version or review a migration.')
    saved = scrub(copy.deepcopy(checkpoint))
    if not saved.get('run_id'):
        raise TaskError('OUTCOME_UNKNOWN', 'unknown', 'Reconcile the attempted start and obtain its exact run ID; do not replay it.')
    for key in ('task_id', 'run_id', 'actor_id'):
        identifier(saved.get(key))
    if saved.get('build_id'): identifier(saved['build_id'])
    limit = bounded_int(saved.get('record_limit'), 1, 10000)
    cursor = bounded_int(saved.get('cursor'), 0, limit)
    if not isinstance(saved.get('items'), list) or len(saved['items']) != cursor or any(not isinstance(x, dict) for x in saved['items']):
        raise TaskError('STATE_CONFLICT', 'blocked', 'Review the checkpoint cursor and retained data; do not reset it.')
    saved['items'] = scrub(saved['items'])
    try:
        run = data_object(transport.get('actor-runs/' + saved['run_id']))
        if run.get('id') != saved['run_id'] or run.get('actId') != saved['actor_id'] or (
                saved.get('build_id') and run.get('buildId') != saved['build_id']):
            raise TaskError('STATE_CONFLICT', 'blocked', 'Confirm the exact run, Actor and build before reading data.')
        dataset_id = identifier(run.get('defaultDatasetId'))
        if saved.get('dataset_id') and saved['dataset_id'] != dataset_id:
            raise TaskError('STATE_CONFLICT', 'blocked', 'The dataset identity changed; review the existing checkpoint.')
        status = run.get('status')
        if status not in {'READY', 'RUNNING', 'SUCCEEDED', 'FAILED', 'TIMING-OUT', 'TIMED-OUT', 'ABORTING', 'ABORTED'}:
            raise TaskError('INVALID_RESPONSE', 'partial', 'Verify the current provider run status.')
        dataset = data_object(transport.get('datasets/' + dataset_id))
        if dataset.get('id') != dataset_id:
            raise TaskError('STATE_CONFLICT', 'blocked', 'Confirm the returned dataset identity before advancing.')
        total = dataset.get('itemCount')
        if isinstance(total, bool) or not isinstance(total, int) or total < cursor:
            raise TaskError('STATE_CONFLICT', 'blocked', 'The dataset count is missing or smaller than the retained cursor.')
        saved.update(dataset_id=dataset_id, build_id=identifier(run.get('buildId')), run_status=status, snapshot_item_count=total,
                     observed_at=datetime.now(timezone.utc).isoformat(), state='partial', coverage='PARTIAL')
        usage = run.get('usageTotalUsd')
        saved['platform_usage_usd'] = usage if isinstance(usage, (int, float)) and not isinstance(usage, bool) and math.isfinite(usage) and usage >= 0 else None
        saved['usage_note'] = 'Platform usage only; not total Actor/event charges or renewed spend authorization.'
        if commit: commit(saved)
        for _ in range(max_pages):
            remaining = min(total - saved['cursor'], limit - saved['cursor'])
            if remaining <= 0: break
            take = min(page_size, remaining)
            page = transport.get('datasets/' + dataset_id + '/items',
                                 {'format': 'json', 'offset': saved['cursor'], 'limit': take,
                                  'desc': False, 'clean': False, 'skipHidden': False, 'skipEmpty': False})
            if not isinstance(page, list) or len(page) > take or any(not isinstance(x, dict) for x in page):
                raise TaskError('INVALID_RESPONSE', 'partial', 'Review this page without advancing the retained cursor.')
            if not page:
                raise TaskError('COVERAGE_GAP', 'partial', 'The observed dataset count exceeds returned rows; reconcile before continuing.')
            candidate = dict(saved, items=saved['items'] + scrub(page), cursor=saved['cursor'] + len(page))
            if len(json.dumps(candidate, ensure_ascii=False, indent=2, allow_nan=False).encode()) > MAX_CHECKPOINT_BYTES - 4096:
                raise TaskError('CHECKPOINT_TOO_LARGE', 'partial', 'Analyze retained rows; choose a smaller bounded read in a new workspace without restarting collection.')
            saved = candidate
            if commit: commit(saved)
        saved['truncated'] = saved['cursor'] < total
        complete = status == 'SUCCEEDED' and not saved['truncated']
        saved['state'] = 'completed' if complete else 'partial'
        saved['coverage'] = ('COMPLETE' if total else 'VALID_EMPTY') if complete else 'PARTIAL'
        saved['next_action'] = ('Map the retained rows and inspect source diagnostics.' if complete else
                                'Reconcile failed source coverage; preserve rows and charges.' if status in {'FAILED', 'ABORTED', 'TIMED-OUT'} else
                                'Resume this existing run; keep the original output limit and spending authority.')
        saved.pop('error', None)
        if commit: commit(saved)
        return saved
    except TaskError as error:
        saved.update(state=error.state, coverage='PARTIAL', error={'code': error.code}, next_action=error.next_action)
        if commit: commit(saved)
        raise
