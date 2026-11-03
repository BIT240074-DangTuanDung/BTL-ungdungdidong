import { useSyncExternalStore } from 'react';

export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(
    () => () => {},
    () => client,
    () => server
  );
}
