import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ModulePageProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  rows: Array<Record<string, string>>;
};

export function ModulePage({ title, subtitle, icon: Icon, rows }: ModulePageProps) {
  const columns = Object.keys(rows[0] ?? { name: "" });
  const colTemplate = `repeat(${columns.length}, minmax(120px, 1fr))`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Icon className="h-6 w-6 shrink-0 text-primary" />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge>{rows.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div
              className="grid border-b px-4 py-2 text-xs font-medium text-muted-foreground"
              style={{ gridTemplateColumns: colTemplate }}
            >
              {columns.map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid border-b px-4 py-3 text-sm last:border-b-0"
                style={{ gridTemplateColumns: colTemplate }}
              >
                {columns.map((column) => (
                  <span key={column}>{row[column]}</span>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
