#!/usr/bin/env python3
"""Globális magyar nyelvi javítások a teljes weboldal-projektben.

A korrektúra során ismétlődő, nem magyaros vagy elírt kifejezéseket javít.
"""
import os
import re
from pathlib import Path

ROOT = Path("/Users/hu900676/repos/projects/hubaajto/Huba ajtó/website/src")

# Szabályok: (regex_pattern, replacement). Regex-szel dolgozunk, hogy a
# nagybetűs és kötőjeles változatokat is elkapjuk.
RULES = [
    # 1. "mintaminta" elírás — mindenhol → "anyagminta"
    (re.compile(r"\bmintamintával\b"), "anyagmintákkal"),
    (re.compile(r"\bmintamintát\b"), "anyagmintákat"),
    (re.compile(r"\bmintaminta\b"), "anyagminta"),
    (re.compile(r"\bMintamintával\b"), "Anyagmintákkal"),
    (re.compile(r"\bMintamintát\b"), "Anyagmintákat"),
    (re.compile(r"\bMintaminta\b"), "Anyagminta"),

    # 2. "Buda heritage" — angol → magyar
    (re.compile(r"\bBuda heritage\b"), "budai műemléki környezet"),
    (re.compile(r"\bbuda heritage\b"), "budai műemléki környezet"),

    # 3. "NW Buda" → "budai" (az NW egy belső földrajzi rövidítés)
    (re.compile(r"\bNW Buda agglomeráció(s)?\b"), r"budai agglomeráció\1"),
    (re.compile(r"\bNW Buda ív(en|re)?\b"), r"budai ív\1"),
    (re.compile(r"\bNW Buda\b"), "budai"),

    # 4. "modern range" → "modern modellek" / "modern kategória"
    (re.compile(r"\bmodern range\b"), "modern modellek"),
    (re.compile(r"\bA modern range\b"), "A modern modellek"),
    (re.compile(r"\bprémium modern range\b"), "modern Prémium kategóriánk"),

    # 5. "Architect-grade" — angol → magyar
    (re.compile(r"\bArchitect-grade\b"), "építészeti minőségű"),
    (re.compile(r"\barchitect-grade\b"), "építészeti minőségű"),

    # 6. Ismétlődő AI-szófordulat: "Lehetőséget biztosít" → magyarosabb
    (re.compile(r"\blehetőséget biztosít\b"), "lehetőséget ad"),
    (re.compile(r"\bLehetőséget biztosít\b"), "Lehetőséget ad"),
]


def process_file(path: Path) -> tuple[int, list[str]]:
    """Egy fájlt javít, visszaadja a változások számát és a leírást."""
    text = path.read_text(encoding="utf-8")
    original = text
    changes: list[str] = []
    for pattern, replacement in RULES:
        matches = pattern.findall(text)
        if matches:
            text = pattern.sub(replacement, text)
            count = len(matches)
            sample = matches[0] if isinstance(matches[0], str) else "".join(matches[0])
            changes.append(f"  – {pattern.pattern!r} → {replacement!r}  ({count}x)")
    if text != original:
        path.write_text(text, encoding="utf-8")
        return len(changes), changes
    return 0, []


def main():
    targets = []
    for ext in (".astro", ".ts", ".md", ".mdx"):
        targets.extend(ROOT.rglob(f"*{ext}"))

    total_files = 0
    total_changes = 0
    for path in sorted(targets):
        n, changes = process_file(path)
        if n:
            total_files += 1
            total_changes += n
            rel = path.relative_to(ROOT)
            print(f"\n{rel}  ({n} rule(s) applied)")
            for c in changes:
                print(c)

    print(f"\n=== ÖSSZESEN: {total_files} fájl, {total_changes} szabály-alkalmazás ===")


if __name__ == "__main__":
    main()
