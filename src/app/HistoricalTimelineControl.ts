import { uiText } from "./UiText";

export interface HistoricalTimelineControlOptions {
    readonly milestones: readonly number[];
    readonly selectedAt: number | undefined;
    readonly onSelect: (at: number) => void;
}

export interface HistoricalTimelineControl {
    readonly element: HTMLElement;
    setSelectedAt(at: number): void;
}

/** Browser-only historical navigation control; its range index is never the canonical time. */
export function createHistoricalTimelineControl(
    options: HistoricalTimelineControlOptions
): HistoricalTimelineControl {
    const element = document.createElement("section");
    element.className = "historical-timeline";
    element.setAttribute("aria-label", uiText.timelineTitle);
    element.dataset.milestoneCount = String(options.milestones.length);
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = uiText.timelineTitle;
    const help = document.createElement("span");
    help.textContent = uiText.timelineHelp;
    copy.append(title, help);
    const range = document.createElement("input");
    range.type = "range";
    range.min = "0";
    range.max = String(Math.max(0, options.milestones.length - 1));
    range.step = "1";
    range.setAttribute("aria-label", uiText.timelineRangeLabel);
    const date = document.createElement("output");
    date.className = "historical-timeline__date";
    date.setAttribute("aria-live", "polite");

    const setSelectedAt = (at: number): void => {
        const index = options.milestones.indexOf(at);
        if (index < 0) {
            throw new RangeError("Historical timeline selection must be a milestone.");
        }
        range.value = String(index);
        element.dataset.selectedAt = String(at);
        date.textContent =
            index === options.milestones.length - 1
                ? `${formatHistoricalDate(at)} · ${uiText.timelineLatest}`
                : formatHistoricalDate(at);
    };

    if (options.selectedAt === undefined || options.milestones.length === 0) {
        range.disabled = true;
        date.textContent = uiText.timelineEmpty;
    } else {
        setSelectedAt(options.selectedAt);
    }
    range.addEventListener("input", () => {
        const at = options.milestones[Number(range.value)];
        if (at !== undefined) {
            setSelectedAt(at);
            options.onSelect(at);
        }
    });
    element.append(copy, range, date);
    return Object.freeze({ element, setSelectedAt });
}

export function formatHistoricalDate(at: number): string {
    const date = new Date(at);
    if (!Number.isFinite(date.getTime())) {
        throw new RangeError("Historical UI date must be representable.");
    }
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = uiText.timelineMonths[date.getUTCMonth()];
    return `${day} ${month} ${date.getUTCFullYear()}`;
}
