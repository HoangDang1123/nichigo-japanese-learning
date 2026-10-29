import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { ThemeSwitcherIcons } from "./theme-switcher-icons";

test("theme switcher server markup contains both CSS-selected theme icons", () => {
  const markup = renderToStaticMarkup(
    <ThemeSwitcherIcons lightClass="lightIcon" darkClass="darkIcon" />,
  );

  assert.equal((markup.match(/<svg/g) ?? []).length, 2);
  assert.match(markup, /class="lightIcon"/);
  assert.match(markup, /class="darkIcon"/);
});
