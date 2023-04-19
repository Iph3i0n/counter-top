import type { ComponentBase } from "../../deps/wholemeal.ts";

type State = Record<never, never>;

type Actions<TState extends State> = Record<
  string,
  (this: TState, ...args: any[]) => Partial<TState> | Promise<Partial<TState>>
>;

export default function StateEngine<
  TState extends State,
  TActions extends Actions<TState>
>(default_value: TState, actions: TActions) {
  let current_value = default_value;

  const state: any = {};
  for (const key in default_value)
    Object.defineProperty(state, key, { get: () => current_value[key] });

  const instance = {
    State: state,
    Perform: async <TKey extends keyof TActions>(
      action: TKey,
      ...args: Parameters<TActions[TKey]>
    ) => {
      current_value = {
        ...current_value,
        ...(await actions[action].bind(current_value)(...args)),
      };

      document.dispatchEvent(new CustomEvent("__STATE_ENGINE_UPDATED__"));
    },
  };

  return {
    Attach(target: ComponentBase) {
      const handler = () => {
        if (!target || !target.isConnected) {
          document.removeEventListener("__STATE_ENGINE_UPDATED__", handler);
          return;
        }

        target.should_render();
      };
      document.addEventListener("__STATE_ENGINE_UPDATED__", handler);

      return instance;
    },
    ...instance,
  };
}
