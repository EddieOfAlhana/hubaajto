#!/usr/bin/env python3
"""Második körös magyar javítás — szövegen belüli angol szavak."""
import re
from pathlib import Path

ROOT = Path("/Users/hu900676/repos/projects/hubaajto/Huba ajtó/website/src")

RULES = [
    # "heritage" — különböző szövegkörnyezetekben
    (re.compile(r"\bbudai heritage területek?\b"), "budai műemléki területek"),
    (re.compile(r"\bbudai heritage területein\b"), "budai műemléki területein"),
    (re.compile(r"\bbudai heritage negyedek\b"), "budai műemléki negyedek"),
    (re.compile(r"\bbudai heritage villanegyedben\b"), "budai műemléki villanegyedben"),
    (re.compile(r"\bBelváros \+ budai heritage\b"), "Belváros és budai műemléki környezet"),
    (re.compile(r"\bHeritage \+ modern\b"), "Műemléki + modern"),
    (re.compile(r"\bheritage \+ modern\b"), "műemléki + modern"),
    (re.compile(r"\bHeritage kerületek\b"), "Műemléki kerületek"),
    (re.compile(r"\bheritage budai oldal\b"), "műemléki budai oldal"),
    # "Modern range" eyebrow szövegekben
    (re.compile(r"\bModern range · Panel-lakás\b"), "Modern modellek · Panel-lakás"),
    (re.compile(r"\bModern range · Társasházi\b"), "Modern modellek · Társasházi"),
    (re.compile(r"\bModern range · Saját gyártás\b"), "Modern modellek · Saját gyártás"),
    # Komment cseréje
    (re.compile(r"// District anchor priority — heritage first \(per playbook §7\.3\), then modern volume\.", re.MULTILINE),
     "// District anchor priority — műemléki kerületek először, aztán a modern volumen."),
    (re.compile(r"// Budapest districts \(heritage \+ modern\)", re.MULTILINE),
     "// Budapesti kerületek (műemléki + modern)"),
]


def process_file(path: Path):
    text = path.read_text(encoding="utf-8")
    original = text
    changes = []
    for pattern, replacement in RULES:
        matches = pattern.findall(text)
        if matches:
            text = pattern.sub(replacement, text)
            changes.append(f"  – {pattern.pattern!r} → {replacement!r}  ({len(matches)}x)")
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
            print(f"\n{rel}  ({n} szabály alkalmazva)")
            for c in changes:
                print(c)

    print(f"\n=== ÖSSZESEN: {total_files} fájl, {total_changes} szabály-alkalmazás ===")


if __name__ == "__main__":
    main()
