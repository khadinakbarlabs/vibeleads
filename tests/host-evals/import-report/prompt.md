---
name: import-report
plugins: ["../../../plugin"]
runs: 1
max_turns: 8
timeout_seconds: 150
allowed_tools: ["Read", "Glob", "Grep", "Skill", "Bash", "Write", "Edit"]
---

Clean this fictional lead import and create result/canonical.json, result/companion.json, result/quality.json and result/brief.html in your workspace. Keep separate contacts and source/CRM attribution through deduplication. Explicit opt-outs must stay excluded. Missing evidence or a public email does not establish fit, deliverability or consent. No network, account setup or questions are needed. Rows: [{"id":"source-a","name":"One","website":"one.example","email":"a@one.example","status":"valid","crm":{"id":"crm-a"}},{"id":"source-b","name":"Two","website":"two.example","email":"b@two.example","opt_out":true,"crm":{"id":"crm-b"}},{"id":"source-c","name":"Three","website":"three.example","email":"c@three.example","crm":{"id":"crm-c"}}].
