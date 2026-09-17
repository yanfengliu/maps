import "./style-picker.css";

/**
 * The World style dropdown.
 *
 * It is a button plus an in-page listbox rather than a native `<select>`, and
 * that is a correction rather than a preference. Chromium draws a native
 * select's option list in the browser process, outside the renderer's own hit
 * testing, so no synthesised pointer event can land on one of its rows: measured
 * 2026-09-16 in a headless and in a headed window alike, a press opens the popup
 * and a second press on the correct row closes it without changing the value —
 * see `docs/work/0_shibuya-1km/reviews/27_implementation.md`, which measured it
 * and kept its probe. A control whose pointer path cannot be driven by a harness
 * cannot be shown to work by pointer, and the acceptance criterion asks for
 * exactly that. Here every option is an element in this document, so a synthesised
 * press runs the same code a person's click runs through.
 *
 * The options come from the caller and are never restated here. A new entry in
 * the registry (`src/world/styles.ts`) appears in this list with no change to
 * this file; `options()` reports the list this control actually built, which is
 * what lets a check see that the list is the registry rather than a copy of it.
 */
export interface StylePickerOptions {
  readonly styles: readonly {
    readonly id: string;
    readonly label: string;
    readonly description: string;
  }[];
  readonly initialStyle: string;
  readonly onChange: (id: string) => void;
}

/** One option, as the control built it. */
export interface StylePickOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface StylePicker {
  readonly element: HTMLElement;
  /** The control a pointer and a keyboard both operate. */
  readonly control: HTMLElement;
  /** The in-page option list, in the order the caller supplied. */
  readonly listbox: HTMLElement;
  /** The options this control is offering, copied. */
  options(): StylePickOption[];
  /** The selected id, as the control itself reports it. */
  selected(): string;
  /** Reflect a selection made elsewhere. Never emits `onChange`. */
  setStyle(id: string): void;
  dispose(): void;
}

interface BuiltOption extends StylePickOption {
  readonly element: HTMLElement;
}

let pickerSequence = 0;

/** A registry-fed dropdown whose options are elements in this document. */
export function createStylePicker({ styles, initialStyle, onChange }: StylePickerOptions): StylePicker {
  const byId = new Map(styles.map((style) => [style.id, style]));
  if (styles.length === 0 || byId.size !== styles.length || styles.some((style) => !style.id.trim())) {
    throw new Error("World style options must contain at least one style, with a non-empty, unique id for each option.");
  }
  const requireStyle = (id: string) => {
    const style = byId.get(id);
    if (style === undefined) {
      throw new Error(`World style "${id}" is unknown. Choose one of: ${[...byId.keys()].join(", ")}.`);
    }
    return style;
  };
  requireStyle(initialStyle);

  const sequence = ++pickerSequence;
  const labelId = `world-style-label-${sequence}`;
  const valueId = `world-style-value-${sequence}`;
  const listboxId = `world-style-listbox-${sequence}`;
  const descriptionId = `world-style-description-${sequence}`;
  const optionId = (id: string): string => `world-style-option-${sequence}-${id}`;

  const element = document.createElement("section");
  element.className = "world-style-picker";
  element.setAttribute("aria-label", "World appearance");

  const label = document.createElement("span");
  label.className = "world-style-picker__label";
  label.id = labelId;
  label.append("World style");

  const control = document.createElement("button");
  control.type = "button";
  // The role the repository's existing checks look for, and the honest one: a
  // widget that shows a value and opens a list of choices.
  control.setAttribute("role", "combobox");
  control.className = "world-style-picker__control";
  control.setAttribute("aria-haspopup", "listbox");
  control.setAttribute("aria-expanded", "false");
  control.setAttribute("aria-controls", listboxId);
  // Named by the visible label and its own value, so the accessible name is
  // "World style Satellite" rather than a label with the value hidden in it.
  control.setAttribute("aria-labelledby", `${labelId} ${valueId}`);
  const value = document.createElement("span");
  value.className = "world-style-picker__value";
  value.id = valueId;
  const caret = document.createElement("span");
  caret.className = "world-style-picker__caret";
  caret.setAttribute("aria-hidden", "true");
  caret.append("\u25be");
  control.append(value, caret);

  const listbox = document.createElement("ul");
  listbox.className = "world-style-picker__listbox";
  listbox.id = listboxId;
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("aria-labelledby", labelId);
  listbox.hidden = true;

  const options: BuiltOption[] = styles.map((style) => {
    const option = document.createElement("li");
    option.className = "world-style-picker__option";
    option.id = optionId(style.id);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.setAttribute("data-style-id", style.id);
    option.tabIndex = -1;
    const optionLabel = document.createElement("span");
    optionLabel.className = "world-style-picker__option-label";
    optionLabel.append(style.label);
    const optionDescription = document.createElement("span");
    optionDescription.className = "world-style-picker__option-description";
    optionDescription.append(style.description);
    option.append(optionLabel, optionDescription);
    return { element: option, id: style.id, label: style.label, description: style.description };
  });
  for (const option of options) listbox.append(option.element);

  const description = document.createElement("p");
  description.className = "world-style-picker__description";
  description.id = descriptionId;
  control.setAttribute("aria-describedby", descriptionId);

  element.append(label, control, listbox, description);

  let selectedId = initialStyle;
  let activeId = initialStyle;
  let open = false;

  function render(): void {
    const style = requireStyle(selectedId);
    value.textContent = style.label;
    description.textContent = style.description;
    // The value on the DOM, so a check can read which style the control holds
    // without asking the application what style it thinks it is in.
    control.setAttribute("data-style-id", style.id);
    control.setAttribute("data-style-label", style.label);
    control.setAttribute("aria-expanded", open ? "true" : "false");
    listbox.hidden = !open;
    control.classList.toggle("world-style-picker__control--open", open);
    for (const option of options) {
      const selected = option.id === selectedId;
      option.element.setAttribute("aria-selected", selected ? "true" : "false");
      option.element.classList.toggle("world-style-picker__option--selected", selected);
      option.element.classList.toggle("world-style-picker__option--active", open && option.id === activeId);
    }
    if (open) control.setAttribute("aria-activedescendant", optionId(activeId));
    else control.removeAttribute("aria-activedescendant");
  }

  function setOpen(next: boolean): void {
    open = next;
    if (next) activeId = selectedId;
    render();
  }

  /** Select an option. This is the one place a pointer and a keyboard meet. */
  function choose(id: string): void {
    const style = requireStyle(id);
    selectedId = style.id;
    activeId = style.id;
    render();
    onChange(style.id);
  }

  function move(step: number): void {
    const index = options.findIndex((option) => option.id === activeId);
    const from = index < 0 ? 0 : index;
    const next = Math.max(0, Math.min(options.length - 1, from + step));
    const option = options[next];
    if (option === undefined) return;
    const moved = option.id !== activeId;
    activeId = option.id;
    // A closed control commits as the active option moves, which is what a
    // native select does, and an open one highlights while Enter commits, so the
    // list can be walked before choosing. Moving onto the current option is not
    // a change in either state, and neither is a move that hit the end of the
    // list — a control that reported those would fire `onChange` for nothing.
    if (option.id === selectedId) { if (moved) render(); return; }
    if (open) render();
    else choose(option.id);
  }

  let pointerPressed = false;

  function onControlPointerDown(event: MouseEvent): void {
    // Keep focus on the control: a browser moves focus on mousedown, and the
    // blur handler below would close the list before the click arrives.
    event.preventDefault();
    pointerPressed = true;
    control.focus();
  }

  function onControlClick(): void {
    // Enter and Space on a button fire a synthetic click as well as a keydown.
    // A click with no press before it is that one, and the keydown above has
    // already run the keyboard path: acting on it too toggles the list straight
    // back, so the first version of this control committed on Enter and
    // reopened the list in the same keystroke.
    if (!pointerPressed) return;
    pointerPressed = false;
    setOpen(!open);
  }

  function onControlKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowDown": move(1); break;
      case "ArrowUp": move(-1); break;
      case "Home": move(-options.length); break;
      case "End": move(options.length); break;
      case "Enter":
      case " ":
        // Open: commit the highlighted row and close, which is one finished
        // choice. Closed: open, so the list can be walked first.
        if (open) { choose(activeId); setOpen(false); }
        else setOpen(true);
        break;
      case "Escape":
        if (!open) return;
        setOpen(false);
        break;
      default:
        return;
    }
    // Unconditional, and after the switch rather than inside each case: an
    // ArrowDown on a list that is already at its end is still the control's key
    // and must not scroll the page underneath it.
    event.preventDefault();
    event.stopPropagation();
  }

  function optionIdFromEvent(event: MouseEvent): string | null {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    return target.closest("[data-style-id]")?.getAttribute("data-style-id") ?? null;
  }

  function onOptionPointerDown(event: MouseEvent): void {
    // Without this the browser moves focus to the option on mousedown, the
    // control's blur handler closes the list, and the click lands on a row that
    // is no longer there — which is what "the popup never selects" looks like.
    event.preventDefault();
  }

  function onOptionClick(event: MouseEvent): void {
    const id = optionIdFromEvent(event);
    if (id === null) return;
    // One press chooses and closes, which is what a pointer user expects and
    // what makes the whole switch reachable in a single gesture.
    choose(id);
    setOpen(false);
  }

  function onDocumentPointerDown(event: MouseEvent): void {
    if (!open) return;
    const target = event.target;
    if (target instanceof Node && element.contains(target)) return;
    setOpen(false);
  }

  function onControlBlur(): void {
    if (!open) return;
    const active = document.activeElement;
    if (active !== null && element.contains(active)) return;
    setOpen(false);
  }

  control.addEventListener("pointerdown", onControlPointerDown);
  control.addEventListener("click", onControlClick);
  control.addEventListener("keydown", onControlKeyDown);
  control.addEventListener("blur", onControlBlur);
  for (const option of options) {
    option.element.addEventListener("pointerdown", onOptionPointerDown);
    option.element.addEventListener("click", onOptionClick);
  }
  // Capture phase, so a press anywhere else closes the list before the press
  // reaches whatever it landed on.
  document.addEventListener("pointerdown", onDocumentPointerDown, true);

  render();

  return {
    element,
    control,
    listbox,
    options: () => options.map((option) => ({ id: option.id, label: option.label, description: option.description })),
    selected: () => selectedId,
    setStyle(id: string): void {
      selectedId = requireStyle(id).id;
      activeId = selectedId;
      render();
    },
    dispose(): void {
      control.removeEventListener("pointerdown", onControlPointerDown);
      control.removeEventListener("click", onControlClick);
      control.removeEventListener("keydown", onControlKeyDown);
      control.removeEventListener("blur", onControlBlur);
      for (const option of options) {
        option.element.removeEventListener("pointerdown", onOptionPointerDown);
        option.element.removeEventListener("click", onOptionClick);
      }
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      element.remove();
    },
  };
}
