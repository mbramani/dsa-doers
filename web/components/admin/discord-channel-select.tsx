"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DiscordChannel } from "@/types/events";
import { Hash } from "lucide-react";

interface DiscordChannelSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  channels: DiscordChannel[];
  disabled?: boolean;
  placeholder?: string;
}

export default function DiscordChannelSelect({
  value,
  onValueChange,
  channels,
  disabled = false,
  placeholder = "Select a voice channel",
}: DiscordChannelSelectProps) {
  // Filter for voice channels (type 2)
  const voiceChannels = channels.filter((channel) => channel.type === "voice");

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {value && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span>
                {voiceChannels.find((channel) => channel.id === value)?.name ||
                  "Unknown Channel"}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {voiceChannels.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground text-center">
            No voice channels available
          </div>
        ) : (
          voiceChannels.map((channel) => (
            <SelectItem key={channel.id} value={channel.id}>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span>{channel.name}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
