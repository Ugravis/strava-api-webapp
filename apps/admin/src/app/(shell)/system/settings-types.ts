import type { AdminAppSetting, AppSettingCategory } from "@kilotrace/shared";
import type { ConfirmOptions } from "@kilotrace/ui/components/admin/data-table";

/** A setting as the table and its detail show it: its value, plus its texts from the messages. */
export interface SettingRow extends AdminAppSetting {
  category: AppSettingCategory;
  categoryTitle: string;
  label: string;
  description: string;
  /** A switch: asked first both ways, the dialog of each side. */
  confirm: { off: ConfirmOptions; on: ConfirmOptions } | null;
}
