---
name: unknown-start
plugins: ["../../../plugin"]
runs: 1
max_turns: 8
timeout_seconds: 150
allowed_tools: ["Read", "Glob", "Grep", "Skill"]
---

Continue my B2B prospecting task: an Actor start command timed out after it may have created a run. We do not have its run ID. The remaining allowance is unknown and 40 prior company rows are saved. What should we do next? Do not start another run, discard rows, or assume the charge was zero.
