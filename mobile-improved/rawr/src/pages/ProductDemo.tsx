import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { DemoWalkthrough } from '../components/helpCenter/DemoWalkthrough';
import { borrowDemoScreens } from '../components/helpCenter/demoScreens/BorrowDemoScreens';
import { returnDemoScreens } from '../components/helpCenter/demoScreens/ReturnDemoScreens';
import { profileDemoScreens } from '../components/helpCenter/demoScreens/ProfileDemoScreens';
import { resetDemoScreens } from '../components/helpCenter/demoScreens/ResetDemoScreens';
import { notificationsDemoScreens } from '../components/helpCenter/demoScreens/NotificationsDemoScreens';
import { demoWalkthroughs } from '../data/helpCenter';

const screensByDemo: Record<string, Array<() => React.ReactElement>> = {
  borrow: borrowDemoScreens,
  return: returnDemoScreens,
  reset: resetDemoScreens,
  notifications: notificationsDemoScreens,
  profile: profileDemoScreens
};

export function ProductDemo() {
  const { demoId = '' } = useParams();
  const demo = demoWalkthroughs[demoId];
  const screens = screensByDemo[demoId];

  if (!demo || !screens) return <Navigate to="/app/help" replace />;

  // Keyed so switching demos restarts at step 1
  return <DemoWalkthrough key={demoId} demo={demo} screens={screens} />;
}