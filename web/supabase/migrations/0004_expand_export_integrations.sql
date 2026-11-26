-- Expand integration_kind + export_type to cover the popular cold-email
-- platforms users want to push leads into.
alter type integration_kind add value if not exists 'apollo';
alter type integration_kind add value if not exists 'lemlist';
alter type integration_kind add value if not exists 'reply';
alter type integration_kind add value if not exists 'mailshake';
alter type integration_kind add value if not exists 'snov';
alter type integration_kind add value if not exists 'gmass';

alter type export_type add value if not exists 'apollo';
alter type export_type add value if not exists 'lemlist';
alter type export_type add value if not exists 'reply';
alter type export_type add value if not exists 'mailshake';
alter type export_type add value if not exists 'snov';
alter type export_type add value if not exists 'gmass';
