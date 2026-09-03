import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CloudRain,
  FileImage,
  History,
  Loader2,
  MapPin,
  ScanLine,
  Satellite,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

const DEFAULT_PROMPT = "Count visible buildings, assess any flooding indicators and estimate affected area if defensible, then describe crop-health patterns and notable uncertainty.";

type Report = {
  title: string;
  summary: string;
  originalPrompt: string;
  buildingCount: number | null;
  floodingIndicators: string;
  affectedAreaEstimate: string;
  cropHealthObservations: string;
  overallConfidence: number;
  findings: Array<{ category: string; label: string; estimate: string; confidence: number; observation: string }>;
  keyObservations: string[];
  limitations: string[];
};

type SelectedAnalysis = {
  id: number;
  fileName: string;
  imageUrl: string;
  prompt: string;
  report: Report;
  createdAt: Date | string;
};

function parseSaved(row: { id: number; fileName: string; imageUrl: string; prompt: string; reportJson: string; createdAt: Date | string }): SelectedAnalysis {
  return { ...row, report: JSON.parse(row.reportJson) as Report };
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState<SelectedAnalysis | null>(null);
  const historyQuery = trpc.analysis.list.useQuery(undefined, { staleTime: 30_000 });
  const createAnalysis = trpc.analysis.create.useMutation({
    onSuccess: data => {
      const next = data as SelectedAnalysis & { report: Report };
      setSelected(next);
      setFile(null);
      setPreview("");
      void historyQuery.refetch();
      toast.success("Analysis complete and saved to your history");
    },
    onError: error => toast.error(error.message || "Analysis failed. Try a smaller or clearer image."),
  });

  const history = useMemo(() => (historyQuery.data ?? []).map(row => {
    try { return parseSaved(row); } catch { return null; }
  }).filter(Boolean) as SelectedAnalysis[], [historyQuery.data]);

  function acceptFile(next: File | undefined) {
    if (!next) return;
    if (!next.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      toast.error("Images must be 10 MB or smaller.");
      return;
    }
    setFile(next);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(next);
  }

  function runAnalysis() {
    if (!file || !preview) {
      toast.error("Add an image before starting the analysis.");
      return;
    }
    if (prompt.trim().length < 12) {
      toast.error("Describe what you want to investigate in a little more detail.");
      return;
    }
    createAnalysis.mutate({
      fileName: file.name,
      mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
      imageData: preview,
      prompt: prompt.trim(),
    });
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] blueprint-grid overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 text-slate-950 shadow-[0_24px_80px_rgba(27,61,79,0.10)]">
      <header className="border-b border-slate-200/80 bg-white/70 px-5 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[1400px] items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-700"><span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_0_4px_rgba(34,211,238,0.15)]" /> Remote sensing / workspace 01</div>
            <h1 className="max-w-3xl text-4xl font-black tracking-[-0.06em] sm:text-6xl">See more in the <span className="text-cyan-600">terrain.</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">A focused workspace for turning satellite and aerial imagery into evidence-led observations.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:flex"><Activity className="h-3.5 w-3.5 text-cyan-600" /> AI vision online</div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-8 p-5 sm:p-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4"><div><p className="tech-label">01 / Input protocol</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Define an investigation</h2></div><span className="font-mono text-xs text-slate-400">IMG → VISION → REPORT</span></div>
          <div
            className={`relative min-h-[340px] overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${isDragging ? "border-cyan-500 bg-cyan-50/80" : "border-slate-300 bg-white/70"}`}
            onDragOver={event => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={event => { event.preventDefault(); setIsDragging(false); acceptFile(event.dataTransfer.files?.[0]); }}
          >
            {preview ? <>
              <img src={preview} alt="Selected aerial imagery preview" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/5 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200">Loaded image</p><p className="mt-1 max-w-[320px] truncate font-semibold">{file?.name}</p></div><Button variant="secondary" size="sm" onClick={() => { setFile(null); setPreview(""); }}><X className="mr-2 h-4 w-4" /> Remove</Button></div>
            </> : <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[340px] w-full flex-col items-center justify-center px-6 text-center focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"><span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><UploadCloud className="h-8 w-8" /></span><span className="text-xl font-bold tracking-tight">Drop imagery here</span><span className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Upload a clear satellite or aerial image to begin an evidence pass.</span><span className="mt-5 inline-flex items-center rounded-full bg-slate-950 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white">Browse files <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></span><span className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400">JPG / PNG / WEBP · MAX 10 MB</span></button>}
            <input ref={inputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => acceptFile(event.target.files?.[0])} />
          </div>

          <Card className="border-slate-200/80 bg-white/75 shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ScanLine className="h-4 w-4 text-cyan-600" /> Investigation prompt</CardTitle></CardHeader><CardContent className="space-y-4"><Label htmlFor="analysis-prompt" className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Describe the features or conditions to investigate</Label><Textarea id="analysis-prompt" value={prompt} onChange={event => setPrompt(event.target.value)} className="min-h-32 resize-y border-slate-200 bg-white text-sm leading-6 shadow-none focus-visible:ring-cyan-500" placeholder="For example: identify buildings, flooding indicators, and crop-health patterns..." /><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="max-w-lg text-xs leading-5 text-slate-500">The model will separate visible evidence from inference and call out when a precise estimate is not defensible.</p><Button onClick={runAnalysis} disabled={createAnalysis.isPending || !file} className="bg-slate-950 px-5 hover:bg-cyan-700">{createAnalysis.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing imagery</> : <><Sparkles className="mr-2 h-4 w-4" /> Run analysis</>}</Button></div></CardContent></Card>

          {selected ? <ReportView analysis={selected} /> : <div className="grid gap-3 sm:grid-cols-3"><StatTile icon={Satellite} label="Source" value="Aerial / satellite" /><StatTile icon={BarChart3} label="Output" value="Structured report" /><StatTile icon={MapPin} label="Scope" value="Visible evidence" /></div>}
        </section>

        <aside id="history" className="space-y-6 xl:border-l xl:border-slate-200/80 xl:pl-8">
          <div className="flex items-end justify-between"><div><p className="tech-label">02 / Archive</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Past analyses</h2></div><History className="h-5 w-5 text-pink-400" /></div>
          <div className="rounded-2xl border border-pink-100 bg-pink-50/55 p-4"><div className="flex gap-3"><FileImage className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" /><p className="text-xs leading-5 text-slate-600">Reports are stored to your signed-in workspace so you can compare observations over time.</p></div></div>
          <div className="space-y-3">{historyQuery.isLoading ? <div className="flex items-center gap-2 py-8 font-mono text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading archive</div> : history.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">No saved reports</p><p className="mt-2 text-sm leading-6 text-slate-500">Your completed investigations will appear here.</p></div> : history.map(item => <button key={item.id} type="button" onClick={() => setSelected(item)} className={`group w-full rounded-2xl border bg-white/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg ${selected?.id === item.id ? "border-cyan-400 shadow-md" : "border-slate-200/80"}`}><div className="flex gap-3"><img src={item.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold">{item.report.title}</p><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-cyan-600" /></div><p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">{new Date(item.createdAt).toLocaleDateString()} · {item.fileName}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.report.summary}</p></div></div></button>)}</div>
        </aside>
      </main>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Satellite; label: string; value: string }) { return <div className="rounded-2xl border border-slate-200/80 bg-white/65 p-4"><Icon className="h-4 w-4 text-cyan-600" /><p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Satellite }) { return <div className="rounded-xl border border-slate-200 bg-white/75 p-3"><Icon className="h-4 w-4 text-cyan-600" /><p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 line-clamp-2 text-sm font-bold leading-5">{value}</p></div>; }

function ReportView({ analysis }: { analysis: SelectedAnalysis }) {
  const report = analysis.report;
  return <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_12px_40px_rgba(27,61,79,0.06)] sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="tech-label">03 / Findings</p><h2 className="mt-2 text-2xl font-bold tracking-tight">{report.title}</h2></div><Badge className="w-fit gap-1 border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-50"><CheckCircle2 className="h-3.5 w-3.5" /> {report.overallConfidence}% confidence</Badge></div><p className="text-sm leading-7 text-slate-600">{report.summary}</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Buildings" value={report.buildingCount === null ? "Not measurable" : String(report.buildingCount)} icon={Satellite} /><MetricCard label="Flooding signal" value={report.floodingIndicators} icon={CloudRain} /><MetricCard label="Affected area" value={report.affectedAreaEstimate} icon={MapPin} /><MetricCard label="Crop health" value={report.cropHealthObservations} icon={Activity} /></div><div className="grid gap-3 md:grid-cols-2">{report.findings.map((finding, index) => <div key={`${finding.label}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-700">{finding.category}</p><p className="mt-1 font-semibold">{finding.label}</p></div><span className="rounded-full bg-white px-2 py-1 font-mono text-[10px] text-slate-500">{finding.confidence}%</span></div><p className="mt-4 text-xl font-black tracking-tight">{finding.estimate}</p><p className="mt-2 text-xs leading-5 text-slate-500">{finding.observation}</p></div>)}</div><div className="grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2"><div><p className="tech-label">Key observations</p><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{report.keyObservations.map((item, index) => <li key={index} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />{item}</li>)}</ul></div><div><p className="tech-label">Limitations</p><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{report.limitations.map((item, index) => <li key={index} className="flex gap-2"><AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-pink-400" />{item}</li>)}</ul></div></div><div className="rounded-xl bg-slate-950 p-4 text-white"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">Original analysis prompt</p><p className="mt-2 text-sm leading-6 text-slate-300">{report.originalPrompt || analysis.prompt}</p></div></section>;
}
