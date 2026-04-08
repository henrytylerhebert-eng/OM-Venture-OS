#!/usr/bin/env python3
"""Profile Airtable CSV exports for OM Venture OS migration work.

This script is intentionally stdlib-only so it can run on a clean machine.
It prints row/column counts, key headers, and a few overlap signals that help
decide how Airtable tables should map into the Venture OS schema.
"""

from __future__ import annotations

import argparse
import csv
import os
import re
from collections import Counter
from dataclasses import dataclass
from typing import Iterable


COMPANY_FIELDS = (
    "Company Name",
    "Company",
    "Member Company",
    "Mentee Company",
)

APPLICATION_LINK_FIELDS = (
    "Link to Application",
    "Members Link",
)


@dataclass
class CsvProfile:
    name: str
    row_count: int
    headers: list[str]
    company_values: set[str]
    application_links: set[str]


def normalize(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", value.strip().lower())


def load_csv(path: str) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def pick_values(rows: Iterable[dict[str, str]], candidates: tuple[str, ...]) -> set[str]:
    values: set[str] = set()
    for row in rows:
        for candidate in candidates:
            raw = row.get(candidate)
            if raw:
                values.add(normalize(raw))
    return values


def profile_csv(path: str) -> CsvProfile:
    rows = load_csv(path)
    headers = list(rows[0].keys()) if rows else []
    return CsvProfile(
        name=os.path.basename(path),
        row_count=len(rows),
        headers=headers,
        company_values=pick_values(rows, COMPANY_FIELDS),
        application_links=pick_values(rows, APPLICATION_LINK_FIELDS),
    )


def print_profile(profile: CsvProfile) -> None:
    print(f"FILE: {profile.name}")
    print(f"ROWS: {profile.row_count}")
    print(f"COLUMNS: {len(profile.headers)}")
    print("HEADERS:", " | ".join(profile.headers[:40]))
    if len(profile.headers) > 40:
        print("HEADERS_CONT:", " | ".join(profile.headers[40:80]))
    print("---")


def print_overlap(anchor: CsvProfile, profiles: list[CsvProfile]) -> None:
    print(f"COMPANY OVERLAP AGAINST {anchor.name}")
    for profile in profiles:
        if not anchor.company_values or not profile.company_values:
            continue
        overlap = len(anchor.company_values & profile.company_values)
        print(
            f"{profile.name}: {overlap} overlapping companies "
            f"of {len(anchor.company_values)} anchor / {len(profile.company_values)} in table",
        )
    print("---")

    if anchor.application_links:
        print(f"APPLICATION LINK OVERLAP AGAINST {anchor.name}")
        for profile in profiles:
            if not profile.application_links:
                continue
            overlap = len(anchor.application_links & profile.application_links)
            print(
                f"{profile.name}: {overlap} overlapping application links "
                f"of {len(anchor.application_links)} anchor / {len(profile.application_links)} in table",
            )
        print("---")


def print_status_counts(path: str) -> None:
    rows = load_csv(path)
    interesting_fields = [
        "Membership Status",
        "Membership Status (from Application Link)",
        "Meeting Status",
        "Program",
        "Role",
    ]
    for field in interesting_fields:
        if field not in (rows[0].keys() if rows else []):
            continue
        counter = Counter(normalize(row.get(field, "")) for row in rows if row.get(field))
        print(f"{os.path.basename(path)} :: {field}")
        for key, count in counter.most_common(12):
            print(f"  {key!r}: {count}")
        print("---")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "folder",
        help="Folder containing Airtable CSV exports",
    )
    parser.add_argument(
        "--anchor",
        default="Active Members-Active Members.csv",
        help="CSV filename to use as the overlap anchor",
    )
    args = parser.parse_args()

    csv_paths = sorted(
        os.path.join(args.folder, filename)
        for filename in os.listdir(args.folder)
        if filename.lower().endswith(".csv")
    )

    profiles = [profile_csv(path) for path in csv_paths]
    for profile in profiles:
        print_profile(profile)

    anchor = next((profile for profile in profiles if profile.name == args.anchor), None)
    if anchor is not None:
        print_overlap(anchor, profiles)

    for path in csv_paths:
        print_status_counts(path)


if __name__ == "__main__":
    main()
