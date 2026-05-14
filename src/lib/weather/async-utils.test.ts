import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's test runner needs the explicit extension here.
import { chunkArray, mapChunksInParallel } from "./async-utils.ts";

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

test("chunkArray splits items by chunk size", () => {
  assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunkArray([1, 2], 10), [[1, 2]]);
  assert.throws(
    () => chunkArray([1, 2], 0),
    /chunkArray requires a finite positive integer chunk size/
  );
  assert.throws(
    () => chunkArray([1, 2], -1),
    /chunkArray requires a finite positive integer chunk size/
  );
  assert.throws(
    () => chunkArray([1, 2], 1.5),
    /chunkArray requires a finite positive integer chunk size/
  );
  assert.throws(
    () => chunkArray([1, 2], Number.NaN),
    /chunkArray requires a finite positive integer chunk size/
  );
});

test("mapChunksInParallel runs chunks concurrently and preserves order", async () => {
  const lifecycle: string[] = [];
  const result = await mapChunksInParallel([1, 2, 3, 4, 5, 6], 2, async (chunk, chunkIndex) => {
    lifecycle.push(`start-${chunkIndex}`);
    await delay(60 - chunkIndex * 10);
    lifecycle.push(`end-${chunkIndex}`);
    return chunk.join(",");
  });

  assert.deepEqual(result, ["1,2", "3,4", "5,6"]);
  assert.deepEqual(lifecycle.slice(0, 3), ["start-0", "start-1", "start-2"]);
  assert.ok(
    lifecycle.indexOf("end-2") < lifecycle.indexOf("end-0"),
    `Expected chunk executions to overlap, got lifecycle ${lifecycle.join(" -> ")}`
  );
});

test("mapChunksInParallel returns [] for empty input", async () => {
  const result = await mapChunksInParallel<number, number>([], 2, async (chunk) => chunk.length);
  assert.deepEqual(result, []);
});

test("mapChunksInParallel keeps a single chunk intact", async () => {
  const result = await mapChunksInParallel([1, 2], 5, async (chunk) => chunk.join(","));
  assert.deepEqual(result, ["1,2"]);
});

test("mapChunksInParallel propagates mapper errors", async () => {
  await assert.rejects(
    mapChunksInParallel([1, 2, 3], 2, async (chunk, chunkIndex) => {
      if (chunkIndex === 1) throw new Error(`failed-${chunk.join(",")}`);
      return chunk.join(",");
    }),
    /failed-3/
  );
});
