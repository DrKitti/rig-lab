import catalog from '../data/rig-catalog.json' with { type: 'json' };

export function canonicalRigName(name) {
  return Object.hasOwn(catalog.aliases, name) ? catalog.aliases[name] : name;
}

export { catalog };
