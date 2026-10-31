import { formatBytes, formatDateTime, formatNumber, formatRelative } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { POC_NOW, type PocUser } from "./poc-data";
import { STATUSES } from "./poc-marks";

/** What the detail panel shows of a fake account: the content only, the panel is the layout's. */
export function PocUserDetail({ user }: { user: PocUser }) {
  const fields: [string, string][] = [
    ["E-mail", user.email],
    ["Statut", STATUSES[user.status].label],
    ["Inscription", formatDateTime(user.createdAt)],
    ["Dernière visite", user.lastSeenAt ? formatRelative(user.lastSeenAt, POC_NOW) : "Jamais"],
    ["Activités", formatNumber(user.activitiesCount)],
    ["Stockage", formatBytes(user.storageBytes)],
    ["Connexion", user.signInMethods.join(", ") || "Aucune"],
    ["Strava", user.stravaConnected ? "Connecté" : "Non connecté"],
  ];
  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <p className="text-lg font-semibold">{user.displayName ?? `@${user.username}`}</p>
        <p className="text-sm text-muted-foreground">@{user.username}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate">{value}</dd>
          </div>
        ))}
      </dl>
      {user.userTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {user.userTags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
      {user.note && <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{user.note}</p>}
    </div>
  );
}
