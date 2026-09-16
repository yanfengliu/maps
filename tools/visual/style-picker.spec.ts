/** Browser DOM fixture for a future registry entry. The city hero separately
 * verifies the two current styles against the production app and actual pixels.
 */
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { expect, test } from "@playwright/test";

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
  expect(await picker.locator("option").allTextContents()).toEqual(["Cartographic", "Satellite", "Future style"]);
  await page.keyboard.press("Tab"); await expect(picker).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(picker).toHaveValue("future-style");
  await expect(page.getByRole("status")).toHaveText("future-style");
  await expect(page.getByText("A third registry entry")).toBeVisible();
  await picker.click(); await page.keyboard.press("Home"); await page.keyboard.press("Enter");
  await expect(picker).toHaveValue("cartographic");
  await expect(page.getByRole("status")).toHaveText("cartographic");
  const box = await picker.boundingBox(); expect(box?.height).toBeGreaterThanOrEqual(44);
});
