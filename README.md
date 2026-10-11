# LactateLab

Modern React + TypeScript dashboard for analyzing progressive running lactate tests.

## Features

- Editable lactate test table with automatic speed, pace, and duration conversion.
- LT1 from baseline, baseline + 0.4/0.5 mmol/L, fixed 2 mmol/L, or manual selection; LT2 from Dmax anchored at the selected LT1 or manual selection.
- Additional threshold comparisons: fixed 4 mmol/L, classic Dmax, tangent 51, and polynomial inflection.
- Dynamic training zones with HR support labels, validated interval edits, observed race anchors, estimated race paces, data quality warnings, and advice.
- Recharts visualizations for lactate, heart rate, combined response, and zone ranges.
- JSON, CSV, clipboard, and print export options.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run lint
```
