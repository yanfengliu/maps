/** Admit the installed Playwright debug setting before a headless capture.
 * Bound: inherited debug environment only; this does not admit headed CLI flags.
 */
export function assertHeadlessEnvironment(environment: Readonly<Record<string, string | undefined>> = process.env): void {
  // Playwright uses the first defined alias, including an empty value.
  for (const key of ["PWDEBUG", "npm_config_pwdebug", "npm_package_config_pwdebug"] as const) {
    const value = environment[key];
    if (value === undefined) continue;
    if (value === "" || value === "0" || value === "false" || value === "console") return;
    throw new Error(
      `Headless capture refused: effective ${key}=${JSON.stringify(value)} enables the Playwright inspector, ` +
      "which forces a headed browser. Clear PWDEBUG, npm_config_pwdebug and npm_package_config_pwdebug, " +
      'or set the effective value to "0" or "false", then rerun the capture.',
    );
  }
}
