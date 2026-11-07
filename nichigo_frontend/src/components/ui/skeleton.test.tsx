import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { isHomeLoading } from "../home/home-loading";

// The project's Node test runner compiles TSX without bundling CSS Modules.
// Empty emitted CSS files let us inspect real React markup without adding a UI test library.
const testRequire = createRequire(__filename);
testRequire.extensions[".css"] = (module) => {
  module.exports = new Proxy({}, { get: (_target, key) => key === "__esModule" ? false : String(key) });
};
writeFileSync(join(__dirname, "skeleton.module.css"), "");
const emittedApp = resolve(__dirname, "../../app");
mkdirSync(emittedApp, { recursive: true });
writeFileSync(join(emittedApp, "home.module.css"), "");
const emittedHome = resolve(__dirname, "../home");
writeFileSync(join(emittedHome, "home-skeleton.module.css"), "");

test("SKEL-01/04: primitive variants have dimensions and stay decorative", async () => {
  const { Skeleton, SkeletonRegion } = await import("./skeleton");
  const markup = renderToStaticMarkup(
    <SkeletonRegion label="Đang tải bài học" className="region">
      <Skeleton variant="circle" width="2rem" height="2rem" />
      <Skeleton variant="line" width="60%" />
      <Skeleton variant="block" height="3rem" />
    </SkeletonRegion>,
  );
  assert.match(markup, /role="status">Đang tải bài học/);
  assert.match(markup, /class="region" aria-busy="true"/);
  assert.match(markup, /class="skeleton circle" style="width:2rem;height:2rem"/);
  assert.match(markup, /class="skeleton line" style="width:60%"/);
  assert.match(markup, /class="skeleton block" style="height:3rem"/);
  assert.equal((markup.match(/aria-hidden="true"/g) ?? []).length, 3);
  assert.doesNotMatch(markup, /tabindex|<button|<h[1-6]/i);
});

test("SKEL-02/03/13: semantic light/dark/system colors and reduced motion are declared", () => {
  const css = readFileSync(resolve(process.cwd(), "src/components/ui/skeleton.module.css"), "utf8");
  const themes = readFileSync(resolve(process.cwd(), "src/styles/themes.css"), "utf8");
  assert.match(css, /var\(--color-skeleton-base\)/);
  assert.match(css, /var\(--color-skeleton-highlight\)/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  assert.equal((themes.match(/--color-skeleton-base:/g) ?? []).length, 3);
  assert.equal((themes.match(/--color-skeleton-highlight:/g) ?? []).length, 3);
  assert.match(themes, /\[data-theme="dark"\]/);
  assert.match(themes, /prefers-color-scheme: dark/);
});

test("SKEL-05/06/07/08/10: Home only uses its skeleton during auth checking", async () => {
  const { HomeSkeleton } = await import("../home/home-skeleton");
  const { HomeStudyDesk } = await import("../home/home-study-desk");
  const markup = renderToStaticMarkup(<HomeSkeleton />);
  assert.equal(isHomeLoading("checking"), true);
  for (const resolved of ["authenticated", "guest", "unavailable"] as const) {
    assert.equal(isHomeLoading(resolved), false, `${resolved} must use Home's content or unavailable state`);
  }
  assert.match(markup, /aria-busy="true"/);
  assert.equal((markup.match(/class="quickCard"/g) ?? []).length, 4);
  assert.doesNotMatch(markup, /<a\b|<progress\b|XP|streak|hoàn thành/i);

  const guest = renderToStaticMarkup(<HomeStudyDesk status="guest" authenticated={false} progress={null} />);
  const empty = renderToStaticMarkup(<HomeStudyDesk status="authenticated" authenticated progress={null} />);
  const unavailable = renderToStaticMarkup(<HomeStudyDesk status="unavailable" authenticated={false} progress={null} />);
  assert.match(guest, /Bắt đầu hành trình của bạn/);
  assert.match(empty, /Chưa có bài học để tiếp tục/);
  assert.match(unavailable, /Chưa thể xem bài học gần đây/);
  for (const resolvedMarkup of [guest, empty, unavailable]) {
    assert.doesNotMatch(resolvedMarkup, /aria-busy="true"|class="skeleton /);
  }

  const loaded = renderToStaticMarkup(<HomeStudyDesk status="authenticated" authenticated progress={{
    resume: { title: "Bài thử", context: "Bản ghi kiểm thử", href: "/learn", completedActivities: 1, totalActivities: 2 },
    weeklyActivity: null, goal: null, recommendations: null,
  }} />);
  assert.match(loaded, /Bài thử/);
  assert.match(loaded, /1 \/ 2 hoạt động/);
  assert.doesNotMatch(loaded, /class="skeleton /);
});

test("SKEL-11/12: future compositions are responsive but static routes do not mount them", () => {
  const railway = readFileSync(resolve(process.cwd(), "src/components/learning-path/learning-path-skeleton.module.css"), "utf8");
  const skills = readFileSync(resolve(process.cwd(), "src/components/skills/skills-skeleton.module.css"), "utf8");
  const home = readFileSync(resolve(process.cwd(), "src/app/home.module.css"), "utf8");
  const learnRoute = readFileSync(resolve(process.cwd(), "src/app/learn/page.tsx"), "utf8");
  const skillsRoute = readFileSync(resolve(process.cwd(), "src/app/skills/page.tsx"), "utf8");
  assert.match(railway, /max-width: 600px/);
  assert.match(skills, /max-width: 600px/);
  assert.match(home, /max-width: 600px/);
  assert.doesNotMatch(learnRoute, /LearningPathSkeleton/);
  assert.doesNotMatch(skillsRoute, /SkillsSkeleton/);
});
