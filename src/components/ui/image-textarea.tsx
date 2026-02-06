"use client";

import { useId } from "react";
import type { ReactNode, ChangeEvent, TextareaHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  imageSrc?: string;
  onImageChange?: (image: string | null) => void;
  actions?: ReactNode;
};

export function ImageTextarea({
  imageSrc,
  onImageChange,
  actions,
  className,
  ...props
}: Props) {
  const inputId = useId();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImageChange) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      onImageChange(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(inputId)?.click()}
        >
          Last opp bilde
        </Button>
        {imageSrc && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onImageChange?.(null)}
          >
            Fjern bilde
          </Button>
        )}
      </div>
      <div className="relative">
        {imageSrc && (
          <img
            src={imageSrc}
            alt="Opplastet vedlegg"
            className="absolute inset-0 h-full w-full object-contain opacity-30 pointer-events-none"
          />
        )}
        <Textarea
          {...props}
          className={cn("relative z-10 bg-white/70", className)}
        />
        {actions && <div className="absolute right-2 top-2 z-20">{actions}</div>}
      </div>
    </div>
  );
}
