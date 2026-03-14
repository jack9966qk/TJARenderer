import { calculateInferredHands } from "../src/auto-annotation.js";
import { type Annotation, HandType, NoteLocationMap, NoteType } from "../src/primitives.js";
import type { ParsedChart } from "../src/tja-parser.js";

function runTest(name: string, fn: () => void) {
  try {
    console.log(`\n--- ${name} ---`);
    fn();
    console.log("PASS");
  } catch (e) {
    if (e instanceof Error) {
      console.error(`FAIL: ${e.message}`);
    } else {
      console.error(`FAIL: ${e}`);
    }
    process.exit(1);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseSampleText(text: string): { chart: ParsedChart; expectedLabels: string } {
  const lines = text.trim().split("\n");
  const bars: NoteType[][] = [];
  const barParams: { measureRatio: number }[] = [];
  let expectedHands = "";

  for (let i = 0; i < lines.length; i += 3) {
    if (typeof lines[i] === "undefined" || !lines[i]) break;
    const expectedLine = lines[i];
    const notesLine = lines[i + 1];

    const barNotes: NoteType[] = [];
    for (const char of notesLine.replace(/,/g, "")) {
      switch (char) {
        case "1":
          barNotes.push(NoteType.Don);
          break;
        case "2":
          barNotes.push(NoteType.Ka);
          break;
        case "3":
          barNotes.push(NoteType.DonBig);
          break;
        case "4":
          barNotes.push(NoteType.KaBig);
          break;
        case "0":
          barNotes.push(NoteType.None);
          break;
      }
    }
    bars.push(barNotes);
    barParams.push({ measureRatio: 1.0 });
    expectedHands += expectedLine;
  }

  const chart = { bars, barParams } as unknown as ParsedChart;
  return { chart, expectedLabels: expectedHands };
}

const SAMPLE_FULL_ALT = `
r lrl rl rlrl rl
1011201101112011,

 rlrl rl rlrl r 
0211101102111020,

l rlr lr lrlr l 
1021102101211020,

r lrl rl rlrl r 
1021102101211020,

l rlr lr lrlr lr
1011201101112011,

 lrlr lr lrlr l 
0211101102111020,

r lrl rl rlrl r 
1021102101211020,

l rlr l rlrlrlr 
1021102011212110,
`;

const SAMPLE_ALMOST_FULL_ALT = `
r lrl rl rlrl rl
1011201101112011,

 rlrl rl rlrl r 
0211101102111020,

l rlr lr lrlr l 
1021102101211020,

r lrl rl rlrl r 
1021102101211020,

l rlr lr lrlr lr
1011201101112011,

 lrlr lr lrlr l 
0211101102111020,

r lrl rl rlrl r 
1021102101211020,

l rlr l rlrlrlr 
1021102011212110,
`;

const SAMPLE_HALF_ALT = `
r rlr rl rlrl rl
1011201101112011,

 rlrl rl rlrl r 
0211101102111020,

l rlr rl rlrl r 
1021102101211020,

l rlr rl rlrl r 
1021102101211020,

l rlr rl rlrl rl
1011201101112011,

 rlrl rl rlrl r 
0211101102111020,

l rlr rl rlrl r 
1021102101211020,

l rlr r rlrlrlr 
1021102011212110,
`;

const SAMPLE_COOK = `
r rlr rl rlrl rl
1011201101112011,

 rlrl rl rlrl r 
0211101102111020,

r rlr rl rlrl r 
1021102101211020,

r rlr rl rlrl r 
1021102101211020,

r rlr rl rlrl rl
1011201101112011,

 rlrl rl rlrl r 
0211101102111020,

r rlr rl rlrl r 
1021102101211020,

r rlr r rlrlrlr 
1021102011212110,
`;

function testConfiguration(chart: ParsedChart, expectedLabels: string, altThreshold: number, resetThreshold: number) {
  const annotations = new NoteLocationMap<Annotation>();
  const inferred = calculateInferredHands(chart, annotations, altThreshold, resetThreshold);

  let actualResult = "";

  for (let i = 0; i < chart.bars.length; i++) {
    const bar = chart.bars[i];
    let line = "";
    for (let j = 0; j < bar.length; j++) {
      const char = bar[j];
      if (char !== NoteType.None) {
        const hand = inferred.get({ barIndex: i, charIndex: j });
        line += hand === HandType.R ? "r" : "l";
      } else {
        line += " ";
      }
    }
    actualResult += line;
  }

  const flatExpected = expectedLabels.replace(/\\n/g, "");
  assert(actualResult === flatExpected, `Expected:\n${flatExpected}\nActual:\n${actualResult}`);
}

try {
  console.log("Testing Auto Annotation...");

  runTest("Auto Annotation - alternation = inf, reset = 0 (100% full alt)", () => {
    const { chart, expectedLabels } = parseSampleText(SAMPLE_FULL_ALT);
    testConfiguration(chart, expectedLabels, Infinity, 0);
  });

  runTest("Auto Annotation - alternation = inf, reset = 4 (almost full alt)", () => {
    const { chart, expectedLabels } = parseSampleText(SAMPLE_ALMOST_FULL_ALT);
    testConfiguration(chart, expectedLabels, Infinity, 4);
  });

  runTest("Auto Annotation - half alt (alternation = inf, reset = 1/12)", () => {
    const { chart, expectedLabels } = parseSampleText(SAMPLE_HALF_ALT);
    testConfiguration(chart, expectedLabels, Infinity, 1 / 12);
  });

  runTest("Auto Annotation - cook (alternation = 1/12, reset = 1/12)", () => {
    const { chart, expectedLabels } = parseSampleText(SAMPLE_COOK);
    testConfiguration(chart, expectedLabels, 1 / 12, 1 / 12);
  });

  console.log("\nAll auto annotation tests passed.\n");
} catch (e) {
  if (e instanceof Error) {
    console.error(`\nFATAL: ${e.message}\n`);
  }
  process.exit(1);
}
