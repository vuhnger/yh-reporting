"use client";

import { useId } from "react";
import type { ReactNode, ChangeEvent, TextareaHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  imageSrc?: string;
  onImageChange?: (image: string | null) => void;
  imageScale?: number;
  onImageScaleChange?: (scale: number) => void;
  actions?: ReactNode;
};

export function ImageTextarea({
  imageSrc,
  onImageChange,
  imageScale = 100,
  onImageScaleChange,
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
      {imageSrc && (
        <div className="space-y-2">
          <img
            src={imageSrc}
            alt="Opplastet vedlegg"
            className="rounded-md border border-muted object-contain"
            style={{ width: `${imageScale}%` }}
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Størrelse</span>
            <input
              type="range"
              min={40}
              max={140}
              value={imageScale}
              onChange={(event) => onImageScaleChange?.(Number(event.target.value))}
              className="w-40"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">{imageScale}%</span>
          </div>
        </div>
      )}
      <div className="relative">
        <Textarea
          {...props}
          className={cn("bg-white", className)}
        />
        {actions && <div className="absolute right-2 top-2">{actions}</div>}
      </div>
    </div>
  );
}
