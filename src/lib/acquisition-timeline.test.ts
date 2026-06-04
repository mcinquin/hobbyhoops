import { describe, expect, it } from "vitest";
import {
  formatAcquisitionMonthLabel,
  mapAcquisitionTimelineRows,
  openingDateSortToMonthKey,
} from "./acquisition-timeline";

describe("acquisition timeline", () => {
  it("derives month key from opening_date_sort", () => {
    expect(openingDateSortToMonthKey(20240315)).toBe(202403);
  });

  it("formats month labels per locale", () => {
    expect(formatAcquisitionMonthLabel(202403, "fr")).toMatch(/2024/);
    expect(formatAcquisitionMonthLabel(202403, "en")).toMatch(/2024/);
  });

  it("maps SQL rows to chart data", () => {
    const data = mapAcquisitionTimelineRows(
      [{ month_key: 202401, count: 2 }],
      "en"
    );
    expect(data[0]?.count).toBe(2);
    expect(data[0]?.name.length).toBeGreaterThan(0);
  });
});
