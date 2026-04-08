import React from 'react';
import {
  Brain,
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
    heading: 'Mentor Workspace',
    items: [
      {
        label: 'Assigned Founders',
        path: '/mentor',
        icon: LayoutDashboard,
        description: 'Focus only on assigned founders, their current phase, and the support they need now.',
      },
      {
        label: 'Venture Copilot',
        path: '/mentor/copilot',
        icon: Sparkles,
        description: 'Use evidence-backed summaries to prepare sharper meetings and follow-up guidance.',
      },
    ],
  },
  {
    heading: 'Evidence Context',
    items: [
      {
        label: 'Interviews',
        path: '/mentor/discovery',
        icon: MessageSquare,
        description: 'Review how well founders are hearing customer truth, not just logging activity.',
      },
      {
        label: 'Patterns',
        path: '/mentor/patterns',
        icon: Brain,
        description: 'Check the repeated signals that should shape mentor guidance.',
      },
      {
        label: 'Assumptions',
        path: '/mentor/assumptions',
        icon: Lightbulb,
        description: 'Focus feedback on the riskiest assumptions still needing proof.',
      },
      {
        label: 'Experiments',
        path: '/mentor/experiments',
        icon: FlaskConical,
        description: 'See what validation work is in motion beyond interviews alone.',
      },
      {
        label: 'Signals',
        path: '/mentor/signals',
        icon: SignalIcon,
        description: 'Use traction context to scope mentor advice without inventing momentum.',
      },
    ],
  },
];

const MentorLayout: React.FC = () => (
  <AppShellFrame
    tone="mentor"
    eyebrow="Mentor Workspace"
    title="Guide what needs to happen next."
    summary="Mentors should see scoped founder context, current proof, blockers, and recent readiness decisions instead of a broad admin dashboard."
    sections={sections}
  />
);

export default MentorLayout;
