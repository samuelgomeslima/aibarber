import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import OccurrencePreviewModal from "../../src/components/OccurrencePreviewModal";

describe("OccurrencePreviewModal", () => {
  it("renders a provided custom reason verbatim for failed items", () => {
    const html = renderToStaticMarkup(
      React.createElement(OccurrencePreviewModal, {
        visible: true,
        items: [
          {
            date: "2024-01-01",
            start: "09:00",
            end: "10:00",
            ok: false,
            reason: "Barber unavailable for this slot",
          },
        ],
        onClose: () => {},
        onConfirm: () => {},
      })
    );

    expect(html).toContain("Barber unavailable for this slot");
  });

  it("renders translated labels for conflict and outside-hours statuses", () => {
    const html = renderToStaticMarkup(
      React.createElement(OccurrencePreviewModal, {
        visible: true,
        items: [
          { date: "2024-02-01", start: "10:00", end: "11:00", ok: false, reason: "conflict" },
          { date: "2024-02-02", start: "12:00", end: "13:00", ok: false, reason: "outside-hours" },
        ],
        onClose: () => {},
        onConfirm: () => {},
      })
    );

    expect(html).toContain("Conflict");
    expect(html).toContain("Outside hours");
  });

  it("indicates a disabled confirm state when there are no successful occurrences", () => {
    const html = renderToStaticMarkup(
      React.createElement(OccurrencePreviewModal, {
        visible: true,
        items: [
          { date: "2024-03-01", start: "09:00", end: "10:00", ok: false, reason: "conflict" },
          { date: "2024-03-02", start: "11:00", end: "12:00", ok: false, reason: "outside-hours" },
        ],
        onClose: () => {},
        onConfirm: () => {},
      })
    );

    expect(html).toContain("0 will be created");
    expect(html).toContain("Create 0");
  });

  it("summarizes the number of created and skipped occurrences", () => {
    const html = renderToStaticMarkup(
      React.createElement(OccurrencePreviewModal, {
        visible: true,
        items: [
          { date: "2024-04-01", start: "09:00", end: "10:00", ok: true },
          { date: "2024-04-02", start: "11:00", end: "12:00", ok: true },
          { date: "2024-04-03", start: "13:00", end: "14:00", ok: false, reason: "conflict" },
        ],
        onClose: () => {},
        onConfirm: () => {},
      })
    );

    expect(html).toContain("2 will be created • 1 skipped");
  });
});
