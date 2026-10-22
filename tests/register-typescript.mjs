/** Test-only relative import resolution; Node 24 --experimental-transform-types handles syntax. */
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z0-9]+$/i.test(specifier)) {
      try { return nextResolve(specifier + '.ts', context); } catch { /* normal resolution below */ }
    }
    return nextResolve(specifier, context);
  },
});
