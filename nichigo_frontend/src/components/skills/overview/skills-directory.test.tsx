import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "../../../api";
import type { DirectoryDto } from "../../../api/skills";
import {
  LOADING_STATE,
  backendStatus,
  buildDirectoryEntries,
  directoryErrorMessage,
  filterEntries,
  loadDirectory,
  usesDemoData,
} from "./skills-directory";

// The Node test runner resolves neither "@/..." aliases nor CSS Modules (same approach as grammar.test.tsx).
const ROOT = join(__dirname, "..", "..", "..");
type ModuleInternals = { _resolveFilename: (...a: unknown[]) => string; _load: (...a: unknown[]) => unknown };
const internals = Module as unknown as ModuleInternals;
const originalResolve = internals._resolveFilename;
const originalLoad = internals._load;
const classNameProxy = new Proxy({}, { get: (_t, key) => (key === "__esModule" ? false : String(key)) });
internals._resolveFilename = function (request: unknown, ...rest: unknown[]) {
  const req = String(request);
  return originalResolve.call(this, req.startsWith("@/") ? join(ROOT, req.slice(2)) : req, ...rest);
};
internals._load = function (request: unknown, ...rest: unknown[]) {
  if (String(request).endsWith(".css")) return classNameProxy;
  return originalLoad.call(this, request, ...rest);
};
const testRequire = createRequire(__filename);

const FOUNDATION = ["kana", "vocabulary", "grammar", "kanji"];
const LANGUAGE = ["listening", "speaking", "reading", "writing"];

function directory(overrides: Record<string, { availability: string; itemCount: number | null }> = {}): DirectoryDto {
  const skill = (type: string, fallback: { availability: string; itemCount: number | null }) => ({
    type, ...(overrides[type] ?? fallback),
  }) as DirectoryDto["groups"][number]["skills"][number];
  return {
    groups: [
      { id: "foundation-knowledge", skills: FOUNDATION.map((t) => skill(t, { availability: "no_published_content", itemCount: 0 })) },
      { id: "language-skills", skills: LANGUAGE.map((t) => skill(t, { availability: "feature_unavailable", itemCount: null })) },
    ],
  };
}

function render(state: import("./skills-directory").DirectoryState, onRetry = () => {}) {
  const { SkillsOverviewView } = testRequire("./skills-overview") as typeof import("./skills-overview");
  return renderToStaticMarkup(<SkillsOverviewView state={state} onRetry={onRetry} />);
}

test("eight backend Skills in backend group order; Flashcards is a frontend tool, not a ninth backend Skill", () => {
  const entries = buildDirectoryEntries(directory());
  assert.deepEqual(entries.map((e) => e.meta.key), [...FOUNDATION, ...LANGUAGE, "flashcards"]);
  assert.equal(entries.filter((e) => e.backend !== null).length, 8);
  const flashcards = entries[entries.length - 1];
  assert.equal(flashcards.backend, null);
  assert.equal(flashcards.meta.availability, "planned", "stays planned until the Flashcards route exists");
  assert.deepEqual(entries.slice(0, 4).map((e) => e.meta.filterGroup), Array(4).fill("foundational"));
  assert.deepEqual(entries.slice(4, 8).map((e) => e.meta.filterGroup), Array(4).fill("language-skills"));
  assert.equal(flashcards.meta.filterGroup, "review");
});

test("backend order is respected and unknown backend Skills or groups are skipped, not invented", () => {
  const dto: DirectoryDto = {
    groups: [
      { id: "language-skills", skills: [{ type: "writing", availability: "feature_unavailable", itemCount: null }, { type: "mystery", availability: "available", itemCount: 3 }] },
      { id: "surprise-group", skills: [{ type: "kana", availability: "available", itemCount: 9 }] },
      { id: "foundation-knowledge", skills: [{ type: "kanji", availability: "available", itemCount: 1 }, { type: "kanji", availability: "available", itemCount: 1 }] },
    ],
  };
  assert.deepEqual(buildDirectoryEntries(dto).map((e) => e.meta.key), ["writing", "kanji", "flashcards"]);
  assert.deepEqual(buildDirectoryEntries({ groups: [] }), [], "no backend Skills means no entries, not just Flashcards");
});

test("availability mapping keeps backend status, frontend readiness and demo data separate", () => {
  const entries = buildDirectoryEntries(directory({
    kana: { availability: "available", itemCount: 12 },
    vocabulary: { availability: "available", itemCount: 0 },
  }));
  const by = (key: string) => entries.find((e) => e.meta.key === key)!;
  // Backend `available` with demo UI: the card still says the UI is demo; it never claims published content is shown.
  assert.deepEqual(backendStatus(by("kana")), { tone: "published", text: "12 mục đã xuất bản" });
  assert.equal(usesDemoData(by("kana")), true);
  assert.equal(by("kana").meta.availability, "demo");
  // available with a count of 0 is still reported as the real count; `null` is never rendered as 0.
  assert.deepEqual(backendStatus(by("vocabulary")), { tone: "published", text: "0 mục đã xuất bản" });
  assert.deepEqual(backendStatus(by("grammar")), { tone: "empty", text: "Chưa có nội dung xuất bản" });
  assert.equal(backendStatus(by("listening")), null, "feature_unavailable: the Chưa khả dụng badge already says it");
  assert.equal(backendStatus(by("flashcards")), null);
  assert.equal(usesDemoData(by("listening")), false);
  assert.equal(usesDemoData(by("kanji")), false, "Kanji now reads the Skills API, so it is not labelled demo");
  assert.equal(by("kanji").meta.availability, "demo", "still an available, clickable screen");
  const noCount = buildDirectoryEntries({ groups: [{ id: "foundation-knowledge", skills: [{ type: "kana", availability: "available", itemCount: null }] }] });
  assert.equal(backendStatus(noCount[0])?.text, "Đã có nội dung xuất bản");
  assert.ok(!/0/.test(backendStatus(noCount[0])!.text));
});

test("itemCount 0 and null are different outcomes in the rendered cards", () => {
  const html = render({ status: "success", entries: buildDirectoryEntries(directory({ kana: { availability: "available", itemCount: 0 } })) });
  assert.match(html, /0 mục đã xuất bản/);
  assert.match(html, /Chưa có nội dung xuất bản/);
  assert.doesNotMatch(html, /null mục|undefined/);
});

test("search and group filters apply to card metadata only", () => {
  const entries = buildDirectoryEntries(directory());
  assert.equal(filterEntries(entries, "all", "").length, 9);
  assert.deepEqual(filterEntries(entries, "foundational", "").map((e) => e.meta.key), FOUNDATION);
  assert.deepEqual(filterEntries(entries, "review", "").map((e) => e.meta.key), ["flashcards"]);
  assert.ok(filterEntries(entries, "all", "  KANJI ").some((e) => e.meta.key === "kanji"));
  assert.equal(filterEntries(entries, "all", "không-có-kỹ-năng-này").length, 0);
  assert.equal(filterEntries(entries, "language-skills", "kanji").length, 0);
});

test("success renders cards and honest notes; no mock Items", () => {
  const html = render({ status: "success", entries: buildDirectoryEntries(directory({ kanji: { availability: "available", itemCount: 3 } })) });
  assert.match(html, /Kiến thức nền tảng/);
  assert.match(html, /Công cụ ôn tập/);
  assert.match(html, /Giao diện đang dùng dữ liệu minh họa/);
  assert.match(html, /3 mục đã xuất bản/);
  assert.match(html, /Sắp ra mắt/);
  assert.doesNotMatch(html, /role="alert"/);
});

test("loading shows the skeleton region and neither cards nor error", () => {
  const html = render(LOADING_STATE);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Đang tải thư viện kỹ năng/);
  assert.doesNotMatch(html, /Bảng chữ cái/);
  assert.doesNotMatch(html, /role="alert"/);
});

test("error shows a message and a working Retry, never fake cards", () => {
  let retried = 0;
  const element = render({ status: "error", message: "Không thể kết nối máy chủ." }, () => { retried += 1; });
  assert.match(element, /role="alert"/);
  assert.match(element, /Không thể kết nối máy chủ\./);
  assert.match(element, /Thử lại/);
  assert.doesNotMatch(element, /Bảng chữ cái/);
  assert.equal(retried, 0);
});

test("empty Directory from a valid response is an honest empty state, distinct from error and loading", () => {
  const html = render({ status: "success", entries: [] });
  assert.match(html, /Chưa có dữ liệu kỹ năng/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.doesNotMatch(html, /aria-busy/);
});

test("loadDirectory: success, error, retry after error and cancellation", async () => {
  const ok = async () => directory();
  const ready = await loadDirectory(ok);
  assert.equal(ready.status, "success");
  assert.equal(ready.status === "success" && ready.entries.length, 9);

  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls === 1) throw new ApiError("network_error", 0, "network_error", "Không thể kết nối máy chủ.");
    return directory();
  };
  const failed = await loadDirectory(flaky);
  assert.deepEqual(failed, { status: "error", message: "Không thể kết nối máy chủ." });
  const retried = await loadDirectory(flaky);
  assert.equal(retried.status, "success");
  assert.equal(calls, 2);

  await assert.rejects(
    loadDirectory(async () => { throw new ApiError("cancelled", 0, "cancelled", "Request cancelled."); }),
    (error: unknown) => error instanceof ApiError && error.category === "cancelled",
  );
});

test("error messages: configuration, HTTP and unknown failures are reported without a fake success", () => {
  assert.match(directoryErrorMessage(new ApiError("configuration_error", 0, "configuration_error", "API base URL is not configured.")), /Chưa cấu hình/);
  assert.equal(directoryErrorMessage(new ApiError("http_error", 503, "http_503", "Dịch vụ tạm thời gián đoạn.")), "Dịch vụ tạm thời gián đoạn.");
  assert.match(directoryErrorMessage(new Error("boom")), /Không thể tải danh sách kỹ năng/);
});
