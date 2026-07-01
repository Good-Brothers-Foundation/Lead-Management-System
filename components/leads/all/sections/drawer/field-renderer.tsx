"use client";

import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FieldRendererProps {
  label: string;
  name: string;
  value: string;
  isEditing: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  renderCustomEdit?: ReactNode;
  customViewText?: string;
}

export function FieldRenderer({
  label,
  name,
  value,
  isEditing,
  onChange,
  renderCustomEdit,
  customViewText,
}: FieldRendererProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {isEditing ? (
        renderCustomEdit || (
          <Input
            name={name}
            value={value ?? ""}
            onChange={onChange}
            className="h-10 bg-card border-input"
          />
        )
      ) : (
        <p className="h-10 flex items-center px-3 border border-transparent font-medium capitalize text-sm text-foreground">
          {customViewText || value || "—"}
        </p>
      )}
    </div>
  );
}