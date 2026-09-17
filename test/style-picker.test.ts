/**
 * The World style control's own gate. Bound: the control's contract in a Node
 * process, against a DOM double written here. It says nothing about pixels and
 * nothing about the application — the registry-to-dropdown wiring, the rendered
 * result and the camera and simulation preservation across a switch are checked
 * in `tools/style-ui/world-style.spec.ts` against the running build.
 *
 * Claim: the control offers exactly the options it was handed, and both input
 * paths reach the same `onChange` — a pointer press on an option row, and the
 * keys the acceptance criterion names. The defect it exists for is a control
 * whose keyboard path selects and whose pointer path cannot, which is what a
 * native `<select>` gave us and what no DOM check of the value alone would see:
 * a case that assigns the value proves the setter, not the control.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { createStylePicker, type StylePickOption } from "../src/ui/style-picker.js";

/** `classList`, as much of it as the control uses. */
class FakeClassList {
  readonly names = new Set<string>();
  add(...tokens: string[]): void { for (const token of tokens) this.names.add(token); }
  remove(...tokens: string[]): void { for (const token of tokens) this.names.delete(token); }
  contains(token: string): boolean { return this.names.has(token); }
  toggle(token: string, force?: boolean): boolean {
    const next = force ?? !this.names.has(token);
    if (next) this.names.add(token);
    else this.names.delete(token);
    return next;
  }
}

/** One node of the double. Enough of an element for this control, and no more. */
class FakeElement {
  readonly tagName: string;
  parent: FakeElement | null = null;
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners: { type: string; handler: (event: unknown) => void; capture: boolean }[] = [];
  readonly classList = new FakeClassList();
  textContent = "";
  hidden = false;
  tabIndex = 0;
  type = "";
  focused = false;
  removed = false;

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  /** `id` is a reflected property in the DOM, so setting it sets the attribute. */
  get id(): string { return this.attributes.get("id") ?? ""; }
  set id(value: string) { this.attributes.set("id", value); }

  set className(value: string) {
    this.classList.names.clear();
    for (const name of value.split(/\s+/)) if (name !== "") this.classList.add(name);
  }
  get className(): string {
    return [...this.classList.names].join(" ");
  }

  append(...nodes: (FakeElement | string)[]): void {
    for (const node of nodes) {
      if (typeof node === "string") {
        this.textContent += node;
        continue;
      }
      node.parent = this;
      this.children.push(node);
    }
  }

  /** As the DOM composes it: this node's own text, then its children's. */
  get text(): string {
    return this.textContent + this.children.map((child) => child.text).join("");
  }

  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string): void { this.attributes.delete(name); }
  addEventListener(type: string, handler: (event: unknown) => void, options?: { capture?: boolean }): void {
    this.listeners.push({ type, handler, capture: options?.capture === true });
  }
  removeEventListener(type: string, handler: (event: unknown) => void, options?: { capture?: boolean }): void {
    const index = this.listeners.findIndex((entry) => entry.type === type && entry.handler === handler && entry.capture === (options?.capture === true));
    if (index >= 0) this.listeners.splice(index, 1);
  }
  focus(): void {
    this.focused = true;
    (document as unknown as { activeElement: FakeElement | null }).activeElement = this;
  }
  remove(): void {
    this.removed = true;
    if (this.parent !== null) {
      const index = this.parent.children.indexOf(this);
      if (index >= 0) this.parent.children.splice(index, 1);
      this.parent = null;
    }
  }
  contains(node: FakeElement | null): boolean {
    for (let at = node; at !== null; at = at.parent) if (at === this) return true;
    return false;
  }
  closest(selector: string): FakeElement | null {
    const attribute = /^\[([^\]]+)\]$/.exec(selector)?.[1];
    if (attribute === undefined) throw new Error(`The DOM double understands [attribute] selectors only, and was asked for ${selector}.`);
    for (let at: FakeElement | null = this; at !== null; at = at.parent) if (at.attributes.has(attribute)) return at;
    return null;
  }

  /** The root-to-node path, which is what capture and bubble phases walk. */
  path(): FakeElement[] {
    const path: FakeElement[] = [];
    for (let at: FakeElement | null = this; at !== null; at = at.parent) path.unshift(at);
    return path;
  }
}

/** A synthesised event, dispatched with real capture and bubble phases. */
class FakeEvent {
  readonly type: string;
  readonly target: FakeElement;
  readonly key: string;
  readonly bubbles: boolean;
  defaultPrevented = false;
  stopped = false;

  constructor(type: string, target: FakeElement, options: { key?: string; bubbles?: boolean } = {}) {
    this.type = type;
    this.target = target;
    this.key = options.key ?? "";
    this.bubbles = options.bubbles ?? true;
  }
  preventDefault(): void { this.defaultPrevented = true; }
  stopPropagation(): void { this.stopped = true; }
}

const fakeDocument = {
  // The document is the root of every path, so a walk upwards has to end here.
  parent: null as FakeElement | null,
  activeElement: null as FakeElement | null,
  listeners: [] as { type: string; handler: (event: unknown) => void; capture: boolean }[],
  createElement(tagName: string): FakeElement { return new FakeElement(tagName); },
  append(): void {},
  contains(node: FakeElement | null): boolean { return node !== null; },
  addEventListener(type: string, handler: (event: unknown) => void, options?: { capture?: boolean }): void {
    this.listeners.push({ type, handler, capture: options?.capture === true });
  },
  removeEventListener(type: string, handler: (event: unknown) => void, options?: { capture?: boolean }): void {
    const index = this.listeners.findIndex((entry) => entry.type === type && entry.handler === handler && entry.capture === (options?.capture === true));
    if (index >= 0) this.listeners.splice(index, 1);
  },
};

/** The page, as much of one as the control is allowed to touch. */
const page = globalThis as unknown as { document?: unknown; Element?: unknown; Node?: unknown; HTMLElement?: unknown };

beforeEach(() => {
  fakeDocument.activeElement = null;
  fakeDocument.listeners = [];
  page.document = fakeDocument;
  page.Element = FakeElement;
  page.Node = FakeElement;
  page.HTMLElement = FakeElement;
});

const STYLES = [
  { id: "cartographic", label: "Cartographic", description: "A clear city." },
  { id: "satellite", label: "Satellite", description: "A photographic city." },
] as const;

const REGISTRY = [
  ...STYLES,
  { id: "future-style", label: "Future style", description: "A third registry entry." },
];

/**
 * Dispatch with the real phase order. The path is the document, then every
 * ancestor, then the target — which is what makes the control's capture-phase
 * outside-press listener reachable from a node that was never appended.
 */
function dispatch(target: FakeElement, event: FakeEvent): FakeEvent {
  if (target.parent === null) target.parent = fakeDocument as unknown as FakeElement;
  const path = target.path();
  const fire = (nodes: readonly FakeElement[]): boolean => {
    for (const node of nodes) {
      if (node === target) continue;
      const listeners = node === (fakeDocument as unknown as FakeElement) ? fakeDocument.listeners : node.listeners;
      for (const listener of listeners) {
        if (listener.type !== event.type) continue;
        listener.handler(event);
        if (event.stopped) return true;
      }
    }
    return false;
  };
  if (fire([...path].reverse())) return event;
  for (const listener of target.listeners) {
    if (listener.type !== event.type) continue;
    listener.handler(event);
    if (event.stopped) return event;
  }
  if (!event.bubbles) return event;
  fire(path);
  return event;
}

/** Press the control, the way a browser delivers a press. */
function press(element: FakeElement): void {
  dispatch(element, new FakeEvent("pointerdown", element));
  dispatch(element, new FakeEvent("click", element));
}

/** Press a key on whatever currently holds focus. */
function key(name: string): FakeEvent {
  const target = fakeDocument.activeElement;
  if (target === null) throw new Error(`Nothing holds focus, so the ${name} key had nowhere to go.`);
  return dispatch(target, new FakeEvent("keydown", target, { key: name }));
}

function build(onChange: (id: string) => void, initialStyle = "satellite") {
  return createStylePicker({ styles: REGISTRY, initialStyle, onChange });
}

const optionFor = (picker: { listbox: HTMLElement }, id: string): FakeElement => {
  const found = (picker.listbox as unknown as FakeElement).children.find((child) => child.getAttribute("data-style-id") === id);
  if (found === undefined) throw new Error(`The control offered no option ${id}.`);
  return found;
};

describe("the World style control", () => {
  it("offers the registry's options in order, and says where they came from", () => {
    // The list is the caller's, not a pair written into the control: adding a
    // third entry here is the whole of adding a third style.
    const picker = build(() => {});
    expect(picker.options()).toEqual(REGISTRY satisfies readonly StylePickOption[]);
    expect((picker.listbox as unknown as FakeElement).children.map((child) => child.text)).toEqual([
      "CartographicA clear city.",
      "SatelliteA photographic city.",
      "Future styleA third registry entry.",
    ]);
    expect(picker.selected()).toBe("satellite");
    expect(picker.control.getAttribute("data-style-id")).toBe("satellite");
  });

  it("selects by pointer: one press on a row chooses it and closes the list", () => {
    const chosen: string[] = [];
    const picker = build((id) => chosen.push(id));
    press(picker.control as unknown as FakeElement);
    expect(picker.control.getAttribute("aria-expanded")).toBe("true");
    expect(picker.listbox.hidden).toBe(false);

    press(optionFor(picker, "cartographic"));
    expect(chosen).toEqual(["cartographic"]);
    expect(picker.control.getAttribute("data-style-id")).toBe("cartographic");
    expect(picker.control.getAttribute("data-style-label")).toBe("Cartographic");
    // Closed again, so the same gesture reaches the other direction.
    expect(picker.control.getAttribute("aria-expanded")).toBe("false");
    expect(picker.listbox.hidden).toBe(true);

    press(picker.control as unknown as FakeElement);
    press(optionFor(picker, "satellite"));
    expect(chosen).toEqual(["cartographic", "satellite"]);
    expect(picker.control.getAttribute("data-style-id")).toBe("satellite");
  });

  it("selects by keyboard, both directions, from the control alone", () => {
    const chosen: string[] = [];
    const picker = build((id) => chosen.push(id));
    (picker.control as unknown as FakeElement).focus();

    key("ArrowUp");
    expect(chosen).toEqual(["cartographic"]);
    key("ArrowDown");
    expect(chosen).toEqual(["cartographic", "satellite"]);
    key("ArrowDown");
    expect(chosen).toEqual(["cartographic", "satellite", "future-style"]);
    // The end of the list is not a change, and neither is walking onto the
    // option that is already selected.
    key("ArrowDown");
    expect(chosen).toEqual(["cartographic", "satellite", "future-style"]);
    key("Home");
    expect(chosen).toEqual(["cartographic", "satellite", "future-style", "cartographic"]);
    key("End");
    expect(chosen).toEqual(["cartographic", "satellite", "future-style", "cartographic", "future-style"]);
    expect(key("ArrowDown").defaultPrevented, "ArrowDown was left to scroll the page").toBe(true);
  });

  it("walks an open list without committing, and commits the active row on Enter", () => {
    const chosen: string[] = [];
    const picker = build((id) => chosen.push(id));
    (picker.control as unknown as FakeElement).focus();
    key(" ");
    expect(picker.control.getAttribute("aria-expanded")).toBe("true");
    expect(chosen).toEqual([]);
    key("ArrowUp");
    expect(chosen).toEqual([]);
    expect(picker.control.getAttribute("aria-activedescendant")).toBe(optionFor(picker, "cartographic").getAttribute("id"));
    key("Enter");
    expect(chosen).toEqual(["cartographic"]);
    // Enter commits and leaves the list closed. A synthetic click follows the
    // keydown on a real button, and a control that acted on both would reopen
    // the list here.
    dispatch(picker.control as unknown as FakeElement, new FakeEvent("click", picker.control as unknown as FakeElement));
    expect(picker.control.getAttribute("aria-expanded")).toBe("false");
    expect(chosen).toEqual(["cartographic"]);
    // Open again, walk to the other end, choose it: the keyboard reaches both
    // styles in both directions without the pointer.
    key(" ");
    key("End");
    expect(chosen).toEqual(["cartographic"]);
    key("Enter");
    expect(chosen).toEqual(["cartographic", "future-style"]);
  });

  it("closes an open list on Escape without choosing, and on a press outside", () => {
    const chosen: string[] = [];
    const picker = build((id) => chosen.push(id));
    (picker.control as unknown as FakeElement).focus();

    key(" ");
    key("ArrowUp");
    key("Escape");
    expect(chosen).toEqual([]);
    expect(picker.control.getAttribute("aria-expanded")).toBe("false");
    expect(picker.control.getAttribute("aria-activedescendant")).toBe(null);

    (picker.control as unknown as FakeElement).focus();
    key(" ");
    const outside = new FakeElement("div");
    dispatch(outside, new FakeEvent("pointerdown", outside));
    expect(picker.control.getAttribute("aria-expanded")).toBe("false");
    expect(chosen).toEqual([]);
  });

  it("never emits a change for a selection made elsewhere, and reports that selection", () => {
    const chosen: string[] = [];
    const picker = build((id) => chosen.push(id));
    picker.setStyle("cartographic");
    expect(chosen).toEqual([]);
    expect(picker.selected()).toBe("cartographic");
    expect(picker.control.getAttribute("data-style-id")).toBe("cartographic");
    expect(optionFor(picker, "cartographic").getAttribute("aria-selected")).toBe("true");
    expect(optionFor(picker, "satellite").getAttribute("aria-selected")).toBe("false");
    expect(() => picker.setStyle("no-such-style")).toThrow(/World style "no-such-style" is unknown/);
  });

  it("refuses a registry it cannot offer honestly", () => {
    const onChange = (): void => {};
    expect(() => createStylePicker({ styles: [], initialStyle: "satellite", onChange })).toThrow(/at least one style/);
    expect(() => createStylePicker({ styles: [STYLES[0], STYLES[0]], initialStyle: "satellite", onChange })).toThrow(/non-empty, unique id/);
    expect(() => createStylePicker({ styles: STYLES, initialStyle: "satellite", onChange })).not.toThrow();
    expect(() => createStylePicker({ styles: STYLES, initialStyle: "mars", onChange })).toThrow(/World style "mars" is unknown/);
  });

  it("releases every listener it added and leaves the document", () => {
    const picker = build(() => {});
    const element = picker.element as unknown as FakeElement;
    const control = picker.control as unknown as FakeElement;
    expect(control.listeners.length).toBeGreaterThan(0);
    expect(fakeDocument.listeners.length).toBe(1);
    picker.dispose();
    expect(control.listeners).toEqual([]);
    expect(optionFor(picker, "cartographic").listeners).toEqual([]);
    expect(fakeDocument.listeners).toEqual([]);
    expect(element.removed).toBe(true);
  });
});
