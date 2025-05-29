import { Badge } from "@/components/ui/badge";
import { EventStatus } from "@/types/events";
import { cn } from "@/lib/utils";

interface EventStatusBadgeProps {
  status: EventStatus;
  className?: string;
}

export default function EventStatusBadge({
  status,
  className,
}: EventStatusBadgeProps) {
  const getStatusConfig = (status: EventStatus) => {
    switch (status) {
      case EventStatus.DRAFT:
        return {
          label: "Draft",
          variant: "secondary" as const,
          className:
            "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
        };
      case EventStatus.ACTIVE:
        return {
          label: "Active",
          variant: "default" as const,
          className:
            "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300",
        };
      case EventStatus.COMPLETED:
        return {
          label: "Completed",
          variant: "outline" as const,
          className:
            "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300",
        };
      case EventStatus.CANCELLED:
        return {
          label: "Cancelled",
          variant: "destructive" as const,
          className:
            "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-300",
        };
      default:
        return {
          label: status,
          variant: "secondary" as const,
          className: "",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
