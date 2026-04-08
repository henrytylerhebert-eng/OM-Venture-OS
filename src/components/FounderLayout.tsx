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
    heading: 'Builder Workspace',
    items: [
      {
        label: 'Workspace',
        path: '/founder',
        icon: LayoutDashboard,
        description: 'See your current phase, weekly priorities, readiness signals, and missing proof.',
      },
      {
        label: 'Venture Copilot',
        path: '/founder/copilot',
        icon: Sparkles,
        description: 'Turn your evidence into a sharper brief before the next decision or review.',
      },
    ],
  },
  {
    heading: 'Evidence',
    items: [
      {
        label: 'Interviews',
        path: '/founder/discovery',
        icon: MessageSquare,
        description: 'Capture customer discovery with the quality signals the Builder program expects.',
      },
      {
        label: 'Patterns',
        path: '/founder/patterns',
        icon: Brain,
        description: 'Distill repeated truths instead of leaving interviews as raw notes.',
      },
      {
        label: 'Assumptions',
        path: '/founder/assumptions',
        icon: Lightbulb,
        description: 'Make your venture risks explicit and link them to evidence and tests.',
      },
      {
        label: 'Experiments',
        path: '/founder/experiments',
        icon: FlaskConical,
        description: 'Move from discovery into validation tests that unlock the next layer of support.',
      },
      {
        label: 'Signals',
        path: '/founder/signals',
        icon: SignalIcon,
        description: 'Track traction without pretending activity alone is readiness.',
      },
    ],
  },
];

const FounderLayout: React.FC = () => (
  <AppShellFrame
    tone="founder"
    eyebrow="Builder Workspace"
    title="Build proof before asking for more."
    summary="This workspace should guide founders through Builder as a staged operating system: evidence, synthesis, validation, readiness, and earned support."
    sections={sections}
  />
);

export default FounderLayout;
