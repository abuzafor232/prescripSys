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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge>{rows.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className="grid border-b px-4 py-2 text-xs font-medium text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            {columns.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid border-b px-4 py-3 text-sm last:border-b-0"
              style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
            >
              {columns.map((column) => (
                <span key={column}>{row[column]}</span>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
