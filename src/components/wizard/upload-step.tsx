"use client";

import { useWizard } from "./wizard-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileUp, Trash2 } from "lucide-react";

export function UploadStep() {
  const { state, setReportType, addFiles, removeFile, nextStep, prevStep } = useWizard();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Data Upload</CardTitle>
        <CardDescription>Upload measurement files (.KFK, .PDF) and select report type.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Report Type</Label>
          <Select value={state.reportType} onValueChange={(val: any) => setReportType(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="indoor-climate">Indoor Climate (Inneklima)</SelectItem>
              <SelectItem value="noise">Noise (Støy)</SelectItem>
              <SelectItem value="chemical">Chemical / Dust</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4 hover:bg-slate-50 transition-colors">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <FileUp className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
          <Input 
            type="file" 
            multiple 
            className="hidden" 
            id="file-upload"
            onChange={handleFileChange} 
          />
          <Button variant="outline" onClick={() => document.getElementById("file-upload")?.click()}>
            Browse Files
          </Button>
        </div>

        {state.files.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Files ({state.files.length})</Label>
            <div className="space-y-2">
              {state.files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded bg-white">
                  <span className="text-sm truncate">{file.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={prevStep}>Back</Button>
        <Button onClick={nextStep} disabled={!state.reportType}>Next Step</Button>
      </CardFooter>
    </Card>
  );
}
