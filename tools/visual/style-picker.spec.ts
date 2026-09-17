/** Browser DOM fixture for a future registry entry. The city hero separately
 * verifies the two current styles against the production app and actual pixels.
 */
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { expect, test } from "@playwright/test";

import { styleDescription, styleOption, styleOptionRows } from "./style-control.js";

test("renders and selects an added registry style without picker changes", async ({ page }) => {
  const source = await readFile("src/ui/style-picker.ts", "utf8");
  const css = await readFile("src/ui/style-picker.css", "utf8");
  // The fixture loads the shipped module body. Its CSS import is supplied in the
  // page style element because this isolated DOM test does not boot Vite dev.
  const module = ts.transpileModule(source.replace('import "./style-picker.css";', ""), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
  await page.route("**/__style-picker-fixture", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><title>World style registry fixture</title><style>${css}</style><output aria-label="Selected style">satellite</output><script type="module">${module}
    document.body.append(createStylePicker({ styles: [
      {id:"cartographic",label:"Cartographic",description:"Designed city"},
      {id:"satellite",label:"Satellite",description:"Photographic city"},
      {id:"future-style",label:"Future style",description:"A third registry entry"}
    ],initialStyle:"satellite",onChange(id){document.querySelector("output").textContent=id;}}).element);
  </script>` }));
  await page.goto("/__style-picker-fixture");
  const picker = page.getByRole("combobox", { name: "World style" });
  // The control builds its options as elements in this document — a button plus an
  // in-page listbox — rather than as a native `<select>`, whose popup the browser
  // process draws outside the renderer's hit testing. The labels are read from the
  // option rows' own label spans, because a row also carries its description and
  // its text content is the two concatenated. The rows are the ones in the listbox
  // this control names through `aria-controls` rather than every `[role="option"]`
  // on the page; see `style-control.ts`.
  const rows = await styleOptionRows(page, picker);
  expect(await rows.locator(".world-style-picker__option-label").allTextContents()).toEqual(["Cartographic", "Satellite", "Future style"]);
  await page.keyboard.press("Tab"); await expect(picker).toBeFocused();
  // Keyboard, control closed: an arrow key commits as the active option moves,
  // which is what a native select does.
  await page.keyboard.press("ArrowDown");
  await expect(picker).toHaveAttribute("data-style-id", "future-style");
  await expect(page.getByRole("status")).toHaveText("future-style");
  // The description the control points at through `aria-describedby`, asserted
  // visible as well as correct: `toHaveText` on its own passes on an element nobody
  // can see, which is weaker than the visible assertion this replaced.
  const description = await styleDescription(page, picker);
  await expect(description).toBeVisible();
  await expect(description).toHaveText("A third registry entry");
  // Pointer, completed by a press on the option row itself. The press has to be
  // what opens the list and the row press what commits: a closed control commits on
  // an arrow key as well, so `click()` followed by `Home` and `Enter` cannot tell
  // "the pointer opened the listbox" from "the pointer did nothing" — round 31's
  // review, finding B3, and the shape both of these specs used to have.
  await picker.click();
  await expect(picker, "a pointer press on the control must open its listbox").toHaveAttribute("aria-expanded", "true");
  await (await styleOption(page, picker, "cartographic")).click();
  await expect(picker).toHaveAttribute("data-style-id", "cartographic");
  await expect(picker, "a completed switch must leave the listbox closed").toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("status")).toHaveText("cartographic");
  const box = await picker.boundingBox(); expect(box?.height).toBeGreaterThanOrEqual(44);
});
