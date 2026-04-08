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
        description: 'Interview Capture is the first hard proof layer in Builder. Capture customer truth with the quality signals Opportunity Machine expects.',
      },
      {
        label: 'Patterns & Assumptions',
        path: '/founder/patterns',
        icon: Brain,
        description: 'Turn interviews into repeated truth, ranked risk, and a persevere, narrow, or pivot decision before you design an MVP or test.',
      },
      {
        label: 'Assumption Stack',
        path: '/founder/assumptions',
        icon: Lightbulb,
        description: 'Drill into the weakest risks still needing proof so your next test is grounded in evidence.',
      },
      {
        label: 'MVP / Test Design',
        path: '/founder/experiments',
        icon: FlaskConical,
        description: 'Design the smallest test that helps you learn whether the weakest remaining assumption is true.',
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
    summary="This workspace should guide founders through Builder as a staged operating system: interview capture, synthesis, MVP or test design, live testing, readiness, and earned support."
    sections={sections}
  />
);

export default FounderLayout;
