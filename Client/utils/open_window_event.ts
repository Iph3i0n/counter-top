type Bounding = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export default class OpenWindowEvent extends Event {
  static get Key() {
    return "COUNTER_TOP_OPEN_WINDOW";
  }

  readonly #app: string;
  readonly #location: string;
  readonly #name: string;
  readonly #on_close: () => void;
  readonly #bounds: Bounding | undefined;

  constructor(
    app: string,
    location: string,
    name: string,
    on_close: () => void,
    bounds?: Bounding
  ) {
    super(OpenWindowEvent.Key, { bubbles: false, cancelable: false });
    this.#app = app;
    this.#location = location;
    this.#name = name;
    this.#on_close = on_close;
    this.#bounds = bounds;
  }

  get App() {
    return this.#app;
  }

  get Location() {
    return this.#location;
  }

  get Name() {
    return this.#name;
  }

  get OnClose() {
    return this.#on_close;
  }

  get Bounds() {
    return this.#bounds;
  }
}
