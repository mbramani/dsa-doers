"use client";

import { Check, Loader2, X } from "lucide-react";
import {
  useEventAccessStatus,
  useRequestEventAccess,
} from "@/hooks/user-events";

import { Button } from "@/components/ui/button";
import { EventEligibility } from "@/types/events";
import { toast } from "sonner";
import { useState } from "react";

interface RequestAccessButtonProps {
  eventId: string;
  eligibility: EventEligibility;
  isUpcoming: boolean;
  eventStatus: string;
  disabled?: boolean;
  className?: string;
}

export default function RequestAccessButton({
  eventId,
  eligibility,
  isUpcoming,
  eventStatus,
  disabled = false,
  className,
}: RequestAccessButtonProps) {
  const [hasRequested, setHasRequested] = useState(false);
  const { data: accessStatus } = useEventAccessStatus(eventId);
  const requestAccess = useRequestEventAccess();

  const handleRequestAccess = async () => {
    try {
      await requestAccess.mutateAsync(eventId);
      setHasRequested(true);
      toast.success(
        "Access request submitted successfully! You'll be notified when approved.",
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to request access");
    }
  };

  // User already has access
  if (accessStatus?.data?.hasAccess) {
    return (
      <Button className={className} disabled variant="outline">
        <Check className="w-4 h-4 mr-2" />
        Access Granted
      </Button>
    );
  }

  // User has pending request
  if (hasRequested || accessStatus?.data?.status === "requested") {
    return (
      <Button className={className} disabled variant="secondary">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Request Pending
      </Button>
    );
  }

  // Event is not upcoming or active
  if (!isUpcoming || eventStatus !== "active") {
    return (
      <Button className={className} disabled variant="outline">
        Event Ended
      </Button>
    );
  }

  // User is not eligible
  if (!eligibility.is_eligible) {
    const missingCount = eligibility.missing_required_tags?.length || 0;
    return (
      <Button className={className} disabled variant="secondary">
        <X className="w-4 h-4 mr-2" />
        Missing {missingCount} Tag{missingCount !== 1 ? "s" : ""}
      </Button>
    );
  }

  // User can request access
  return (
    <Button
      className={className}
      onClick={handleRequestAccess}
      disabled={requestAccess.isPending || disabled}
    >
      {requestAccess.isPending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Requesting...
        </>
      ) : (
        "Request Access"
      )}
    </Button>
  );
}
