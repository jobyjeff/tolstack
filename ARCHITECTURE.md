# tolstack — architecture

> Stub. Describe tolstack's package layout and data flow here.

For the platform-wide design and the data contracts this repo builds on, see
forge's `DESIGN.md` and `CONVENTIONS.md`. This repo follows the forge standard
repo layout: events in `data/`, code at the top level, projections rebuilt from
the event log.

## Package layout

<describe your modules here.>

## Data flow

<inbox -> pipeline -> runs -> (forge ingests runs.jsonl) -> projections.>
