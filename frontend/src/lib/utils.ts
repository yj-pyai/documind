export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "ready": return "text-emerald-400 bg-emerald-400/10";
    case "processing": return "text-amber-400 bg-amber-400/10";
    case "error": return "text-red-400 bg-red-400/10";
    case "uploading": return "text-blue-400 bg-blue-400/10";
    default: return "text-zinc-400 bg-zinc-400/10";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "ready": return "就绪";
    case "processing": return "处理中";
    case "error": return "失败";
    case "uploading": return "上传中";
    default: return status;
  }
}
