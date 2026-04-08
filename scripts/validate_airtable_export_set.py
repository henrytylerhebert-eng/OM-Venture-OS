#!/usr/bin/env python3
"""Validate a shared Airtable export folder against the OM source contract.

This script is intentionally stdlib-only. It checks that the expected export
filenames are present, reports their category, and highlights missing or
unexpected files before we build import or sync logic on top of them.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ExportSpec:
    filename: str
    table_title: str
    view_title: str
    category: str
    required: bool
    note: str


EXPORT_SPECS = (
    ExportSpec(
        filename="FULL_ALL_UNEDITED-Grid view.csv",
        table_title="FULL_ALL_UNEDITED",
        view_title="Grid view",
        category="core_archive",
        required=True,
        note="Historical application archive.",
    ),
    ExportSpec(
        filename="Internal Application Review-FULL_ALL_UNEDITED.csv",
        table_title="Internal Application Review",
        view_title="FULL_ALL_UNEDITED",
        category="core_archive",
        required=False,
        note="Duplicate or internal review view of application archive.",
    ),
    ExportSpec(
        filename="Active Members-Active Members.csv",
        table_title="Active Members",
        view_title="Active Members",
        category="core_live",
        required=True,
        note="Best current anchor for active companies.",
    ),
    ExportSpec(
        filename="Member Companies-Startup Circle (Active from Any Cohort).csv",
        table_title="Member Companies",
        view_title="Startup Circle (Active from Any Cohort)",
        category="core_program",
        required=True,
        note="Program overlay for active Builder and Startup Circle companies.",
    ),
    ExportSpec(
        filename="Cohorts-Grid view.csv",
        table_title="Cohorts",
        view_title="Grid view",
        category="core_program",
        required=True,
        note="Cohort participation and Builder artifact source.",
    ),
    ExportSpec(
        filename="Personnel-Grid view.csv",
        table_title="Personnel",
        view_title="Grid view",
        category="core_people",
        required=True,
        note="Master people and operations table.",
    ),
    ExportSpec(
        filename="Personnel-Active Personnel.csv",
        table_title="Personnel",
        view_title="Active Personnel",
        category="qa_view",
        required=False,
        note="Filtered QA view for active people.",
    ),
    ExportSpec(
        filename="Personnel-Alphabetical - Active.csv",
        table_title="Personnel",
        view_title="Alphabetical - Active",
        category="qa_view",
        required=False,
        note="Alternate filtered QA view for active people.",
    ),
    ExportSpec(
        filename="Mentors-Grid view.csv",
        table_title="Mentors",
        view_title="Grid view",
        category="core_ops",
        required=True,
        note="Mentor inventory source.",
    ),
    ExportSpec(
        filename="Meeting Requests-ALL Meeting Status.csv",
        table_title="Meeting Requests",
        view_title="ALL Meeting Status",
        category="core_ops",
        required=True,
        note="Mentor request and meeting event log.",
    ),
    ExportSpec(
        filename="Feedback-Grid view.csv",
        table_title="Feedback",
        view_title="Grid view",
        category="core_ops",
        required=True,
        note="Feedback and post-meeting outcomes.",
    ),
    ExportSpec(
        filename="Connections-Grid view.csv",
        table_title="Connections",
        view_title="Grid view",
        category="phase_two",
        required=False,
        note="Curated introductions and relationship tracking.",
    ),
    ExportSpec(
        filename="Library-Bookshelf.csv",
        table_title="Library",
        view_title="Bookshelf",
        category="out_of_scope",
        required=False,
        note="Recognized source, currently out of venture-tracking scope.",
    ),
    ExportSpec(
        filename="2.0_3.0 Invoices-Grid view.csv",
        table_title="2.0_3.0 Invoices",
        view_title="Grid view",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
    ExportSpec(
        filename="Change Requests-Remove Team Member.csv",
        table_title="Change Requests",
        view_title="Remove Team Member",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
    ExportSpec(
        filename="File Cabinets-Grid view.csv",
        table_title="File Cabinets",
        view_title="Grid view",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
    ExportSpec(
        filename="Funnel-Grid view.csv",
        table_title="Funnel",
        view_title="Grid view",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
    ExportSpec(
        filename="Inventory-Overdue.csv",
        table_title="Inventory",
        view_title="Overdue",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
    ExportSpec(
        filename="Ledger-By Action.csv",
        table_title="Ledger",
        view_title="By Action",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
    ExportSpec(
        filename="Mailboxes-Mailbox Reference Sheet.csv",
        table_title="Mailboxes",
        view_title="Mailbox Reference Sheet",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
    ExportSpec(
        filename="News Tracker-Grid view.csv",
        table_title="News Tracker",
        view_title="Grid view",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
    ExportSpec(
        filename="Office Keys-Grid view.csv",
        table_title="Office Keys",
        view_title="Grid view",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
    ExportSpec(
        filename="Scholarship Applications-Grid view.csv",
        table_title="Scholarship Applications",
        view_title="Grid view",
        category="out_of_scope",
        required=False,
        note="Recognized operations source, not in first migration phase.",
    ),
)


def validate_folder(folder: str) -> int:
    found = {
        filename
        for filename in os.listdir(folder)
        if filename.lower().endswith(".csv")
    }
    expected = {spec.filename for spec in EXPORT_SPECS}
    missing_required = [spec for spec in EXPORT_SPECS if spec.required and spec.filename not in found]
    missing_optional = [spec for spec in EXPORT_SPECS if not spec.required and spec.filename not in found]
    recognized = [spec for spec in EXPORT_SPECS if spec.filename in found]
    unexpected = sorted(found - expected)

    print(f"EXPORT FOLDER: {folder}")
    print(f"FOUND CSV FILES: {len(found)}")
    print(f"RECOGNIZED FILES: {len(recognized)}")
    print("---")

    for spec in recognized:
        flag = "required" if spec.required else "optional"
        print(
            f"FOUND [{flag}] {spec.filename} :: "
            f"{spec.table_title} / {spec.view_title} :: {spec.category}"
        )
    print("---")

    if missing_required:
        print("MISSING REQUIRED FILES")
        for spec in missing_required:
            print(f"- {spec.filename} :: {spec.table_title} / {spec.view_title}")
        print("---")

    if missing_optional:
        print("MISSING OPTIONAL FILES")
        for spec in missing_optional:
            print(f"- {spec.filename} :: {spec.table_title} / {spec.view_title}")
        print("---")

    if unexpected:
        print("UNEXPECTED CSV FILES")
        for filename in unexpected:
            print(f"- {filename}")
        print("---")

    if not missing_required and not unexpected:
        print("STATUS: PASS")
        return 0

    print("STATUS: REVIEW_NEEDED")
    return 1


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", help="Folder containing Airtable CSV exports")
    args = parser.parse_args()
    raise SystemExit(validate_folder(args.folder))


if __name__ == "__main__":
    main()
