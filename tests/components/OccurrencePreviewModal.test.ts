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

  it("shows a neutral fallback when a failure reason is missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(OccurrencePreviewModal, {
        visible: true,
        items: [
          {
            date: "2024-01-02",
            start: "10:00",
            end: "11:00",
            ok: false,
          },
        ],
        onClose: () => {},
        onConfirm: () => {},
      })
    );

    expect(html).toContain("Unknown error");
  });
});
