# v1.2.1 — Dark Claude card material tuning

This patch corrects the dark-theme card palette.

## Problem
The v1.2.0 dark pass used too much colored wash inside cards. In dark Claude-like UI, the contrast makes saturated green / blue / clay cards feel strange and less Anthropic.

## Changes
- Card bodies are now mostly warm graphite / dark paper.
- Claude palette colors move to borders, dots, small glows, and semantic accents.
- Tone fills are reduced from strong colored surfaces to 5–8% material temperature shifts.
- Chain atlas cards receive an extra quiet surface override because many cards appear together.
- Article, callout, math, and manuscript cards now use a unified dark paper material.
- Major section panels use subtle warm radial washes rather than flat colored blocks.

## Visual principle
Use color as editorial temperature, not as SaaS-style cards.
