import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("./product-quick-add-sheet.tsx", import.meta.url),
  "utf8",
);

test("selector mount forces a fresh canonical Cart confirmation", () => {
  assert.match(source, /currentCartQueryOptions\(locale, null\)/);
  assert.match(source, /refetchOnMount: "always"/);
  assert.match(source, /staleTime: 0/);
});

test("normal selection states keep stable summary, helper, and Add regions", () => {
  assert.match(source, /data-quick-add-region="summary"/);
  assert.match(source, /data-quick-add-region="quantity-helper"/);
  assert.match(source, /data-quick-add-action="add"/);
  assert.doesNotMatch(source, /peer-checked:font-/);
  assert.match(source, /peer-checked:opacity-100/);
});
