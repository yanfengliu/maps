import "./style-picker.css";

export interface StylePickerOptions {
  readonly styles: readonly {
    readonly id: string;
    readonly label: string;
    readonly description: string;
  }[];
  readonly initialStyle: string;
  readonly onChange: (id: string) => void;
}

let descriptionSequence = 0;

/** A registry-fed native select. Programmatic updates never emit a change. */
export function createStylePicker({ styles, initialStyle, onChange }: StylePickerOptions): {
  element: HTMLElement;
  setStyle(id: string): void;
  dispose(): void;
} {
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

  const element = document.createElement("section");
  element.className = "world-style-picker";
  element.setAttribute("aria-label", "World appearance");
  const label = document.createElement("label");
  label.className = "world-style-picker__label";
  label.append("World style");
  const select = document.createElement("select");
  select.className = "world-style-picker__select";
  for (const style of styles) {
    const option = document.createElement("option");
    option.value = style.id;
    option.textContent = style.label;
    select.append(option);
  }
  label.append(select);

  const description = document.createElement("p");
  description.className = "world-style-picker__description";
  description.id = `world-style-description-${++descriptionSequence}`;
  select.setAttribute("aria-describedby", description.id);
  element.append(label, description);

  function setStyle(id: string): void {
    const style = requireStyle(id);
    select.value = id;
    description.textContent = style.description;
  }
  function change(): void {
    setStyle(select.value);
    onChange(select.value);
  }
  setStyle(initialStyle);
  select.addEventListener("change", change);

  return {
    element,
    setStyle,
    dispose() {
      select.removeEventListener("change", change);
      element.remove();
    },
  };
}
