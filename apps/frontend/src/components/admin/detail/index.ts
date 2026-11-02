/*
 * The content of a detail of the back office: header, sections, fields drawn
 * by the cells of the table kit. Rules: `docs/admin-detail.md`.
 */
export { DetailAction, DetailActions } from "./actions";
export { BulkEditAction, type BulkEditChange, type BulkEditField, type BulkEditMode } from "./bulk-edit";
export { DetailColumnField, DetailColumnFields } from "./column-fields";
export { DetailForm, DetailSectionForm } from "./draft";
export { type DetailDraft, type DetailDraftResult, type DetailDraftSpec, useDetailDraft } from "./use-detail-draft";
export { DetailFields, DetailField } from "./field";
export { DetailFieldButton } from "./field-buttons";
export type { DetailEditKind, DetailEditOption, DetailFieldEdit } from "./edit-types";
export { fromRule } from "./field-edit";
export { Markdown } from "./markdown";
export { DetailCover, DetailHeader, DetailMedia } from "./header";
export { DetailHistory, type DetailHistoryEvent } from "./history";
export { LucideIconByName } from "./icon-picker";
export { DetailItem, DetailItemButton, DetailItems } from "./items";
export { DetailEmpty, DetailLoader, DetailSkeleton } from "./loader";
export { DetailRelated, type DetailRelatedItem } from "./related";
export { type RowPanelControls, type RowPanelOptions, useRowPanel } from "./row-panel";
export { DetailSection, type DetailSectionPill } from "./section";
export { type DetailTab, DetailTabs } from "./tabs";
export { DetailTimeline, DetailTimelineItem } from "./timeline";
