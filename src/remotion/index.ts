/**
 * Remotion entry point — registers all compositions with Remotion's bundler.
 * This file is the entryPoint for @remotion/renderer bundle().
 */

import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
