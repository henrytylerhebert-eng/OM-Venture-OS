import React from 'react';
import {
  Brain,
  ClipboardCheck,
  FileSearch,
  FlaskConical,
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  Signal as SignalIcon,
  Sparkles,
} from 'lucide-react';
import { AppShellFrame, type ShellNavSection } from './AppShellFrame';

const sections: ShellNavSection[] = [
  {
    heading: 'Operate',
    items: [
      {
        label: 'Console',
        path: '/staff',
        icon: LayoutDashboard,
        description: 'Watch momentum, evidence quality, and where staff needs to intervene now.',
      },
      {
        label: 'Readiness Queue',
        path: '/staff/readiness',
        icon: ClipboardCheck,
        description: 'Review proof, issue decisions, and keep readiness separate from membership.',
      },
      {
        label: 'Evidence Intake',
        path: '/staff/intake',
        icon: FileSearch,
        description: 'Review raw Jotform discovery submissions before they become canonical evidence.',
      },
      {
        label: 'Venture Copilot',
        path: '/staff/copilot',
        icon: Sparkles,
        description: 'Synthesize founder evidence into sharp operating briefs and next moves.',
      },
    ],
  },
  {
    heading: 'Evidence Review',
    items: [
      {
        label: 'Interviews',
        path: '/staff/discovery',
        icon: MessageSquare,
        description: 'Review discovery quality, pain intensity, and segment coverage.',
      },
      {
        label: 'Patterns',
        path: '/staff/patterns',
        icon: Brain,
        description: 'Spot repeated problem themes, pivot signals, and confidence gaps.',
      },
      {
        label: 'Assumptions',
        path: '/staff/assumptions',
        icon: Lightbulb,
        description: 'Track which venture risks are still open and which ones have proof.',
      },
      {
        label: 'Experiments',
        path: '/staff/experiments',
        icon: FlaskConical,
        description: 'Evaluate what has moved beyond interviews into real validation work.',
      },
      {
        label: 'Signals',
        path: '/staff/signals',
        icon: SignalIcon,
        description: 'Review traction indicators without collapsing them into fake dashboards.',
      },
    ],
  },
];

const StaffLayout: React.FC = () => (
  <AppShellFrame
    tone="staff"
    eyebrow="OM Staff Console"
    title="Run the operating system."
    summary="This workspace is for staff decisions, founder momentum, readiness reviews, and support activation. It should feel like an operating console, not a generic CRM."
    sections={sections}
  />
);

export default StaffLayout;
