/**
 * The World style control's own option rows and description, found through the
 * bindings the control writes rather than by matching every `[role="option"]` on
 * the page.
 *
 * Why this file exists: `hero.spec.ts` and `style-picker.spec.ts` both matched
 * option rows page-wide. The app has one picker today, so the match happened to be
 * right, and it would have gone on passing against a second widget's rows — a
 * check whose subject is "some option exists somewhere" rather than "this control
 * offers this row". The button names its listbox through `aria-controls` and its
 * description through `aria-describedby` (`src/ui/style-picker.ts`), so the scope
 * is the control's own claim about itself rather than a class name restated in a
 * spec that would not notice the class changing.
 *
 * Bound: this finds rows and descriptions. It says nothing about whether the
 * control commits a selection, and it cannot see a row that exists but is
 * unreachable by the input path under test. Both halves of that are asserted in
 * `hero.spec.ts`, each as itself, because a closed control commits as the active
 * option moves and a click followed by an arrow key therefore cannot tell "the
 * pointer opened the listbox" from "the pointer did nothing".
 */
import type { Locator, Page } from "@playwright/test";

/** The element this control points at through one of its own ARIA bindings. */
async function boundTo(
  page: Page,
  control: Locator,
  attribute: "aria-controls" | "aria-describedby",
  what: string,
): Promise<Locator> {
  const id = await control.getAttribute(attribute);
  if (id === null || id.trim() === "") {
    throw new Error(
      `The World style control names no ${what} through ${attribute}, so its own ${what} cannot be told ` +
        "apart from another widget's. `src/ui/style-picker.ts` writes both bindings on the control it " +
        "builds; a control without them is a different control from the one these specs reviewed, and a " +
        `page-wide match would hide that. Rebuild and re-run the gate with \`npm run visual\`.`,
    );
  }
  return page.locator(`#${id}`);
}

/** The option rows of this control's own listbox, in the order it built them. */
export async function styleOptionRows(page: Page, control: Locator): Promise<Locator> {
  const listbox = await boundTo(page, control, "aria-controls", "listbox");
  return listbox.locator('[role="option"]');
}

/** The one row of this control's listbox that carries an option id. */
export async function styleOption(page: Page, control: Locator, id: string): Promise<Locator> {
  // Scoped from the listbox rather than from a row: a row's own `data-style-id` is
  // an attribute of the row, so `row.locator("[data-style-id=...]")` would look for
  // one *inside* it and match nothing.
  const listbox = await boundTo(page, control, "aria-controls", "listbox");
  return listbox.locator(`[role="option"][data-style-id="${id}"]`);
}

/** The description this control points at, which is where it reports its value. */
export async function styleDescription(page: Page, control: Locator): Promise<Locator> {
  return boundTo(page, control, "aria-describedby", "description");
}
