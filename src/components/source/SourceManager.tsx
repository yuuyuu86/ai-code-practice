"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuBookOpen, LuChevronDown, LuChevronRight, LuUpload, LuX } from "react-icons/lu";
import { addSource, deleteSource, listSources, type SourceWithCount } from "@/lib/storage/sources";
import { ACCEPTED_EXTENSIONS, readSourceFile } from "@/lib/source/readSourceFile";

const TYPE_LABELS: Record<SourceWithCount["type"], string> = {
  pdf: "PDF",
  markdown: "Markdown",
  text: "テキスト",
  slide: "スライド",
};

/**
 * 教材ソースの登録・一覧。
 * ここに入れた教材は、単元が近い部分だけが問題生成のプロンプトに渡される。
 */
export default function SourceManager({ onChange }: { onChange?: (count: number) => void }) {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<SourceWithCount[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const next = await listSources();
    setSources(next);
    onChange?.(next.length);
  }, [onChange]);

  // 初期読み込み。refresh()を直接呼ぶとエフェクト内setStateとして検出されるので、
  // 他の初期化(AppShell)と同じくPromiseのthenで受ける形にそろえる。
  useEffect(() => {
    listSources()
      .then((next) => {
        setSources(next);
        onChange?.(next.length);
      })
      .catch(console.warn);
  }, [onChange]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        for (const file of Array.from(files)) {
          const read = await readSourceFile(file);
          if (!read.ok) {
            setError(`${file.name}: ${read.reason}`);
            continue;
          }
          const saved = await addSource({ title: read.title, type: read.type, text: read.text });
          if (!saved.ok) {
            setError(`${file.name}: ${saved.reason}`);
            continue;
          }
          setNotice(`「${saved.source.title}」を${saved.chunkCount}件に分けて登録しました。`);
        }
        await refresh();
      } catch (err) {
        console.warn("[SourceManager] 読み込みエラー:", err);
        setError("読み込みに失敗しました。");
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [refresh],
  );

  const handlePasteSave = useCallback(async () => {
    if (pasteText.trim() === "") {
      setError("本文が空です。");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await addSource({ title: pasteTitle, type: "text", text: pasteText });
      if (!saved.ok) {
        setError(saved.reason);
        return;
      }
      setNotice(`「${saved.source.title}」を${saved.chunkCount}件に分けて登録しました。`);
      setPasteTitle("");
      setPasteText("");
      setPasteOpen(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [pasteTitle, pasteText, refresh]);

  const handleDelete = useCallback(
    async (source: SourceWithCount) => {
      setBusy(true);
      try {
        await deleteSource(source.id);
        setNotice(null);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return (
    <div className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-500 hover:text-slate-700"
      >
        {open ? <LuChevronDown className="size-3.5" /> : <LuChevronRight className="size-3.5" />}
        <LuBookOpen className="size-3.5" />
        <span>教材({sources.length})</span>
        <span className="ml-auto font-normal text-[10px] text-slate-400">問題生成の参考にする</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-slate-100 p-2.5">
          <p className="text-[10px] leading-relaxed text-slate-400">
            登録した教材のうち、選んだ単元に近い部分だけをAIに渡します。教材の文章をそのまま出題することはありません。
            端末内のみに保存され、外部には送りません。
          </p>

          <div className="flex gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <LuUpload className="size-3.5" />
              ファイル
            </button>
            <button
              onClick={() => setPasteOpen((v) => !v)}
              disabled={busy}
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              貼り付け
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <p className="text-[10px] text-slate-400">対応: {ACCEPTED_EXTENSIONS.join(" / ")}</p>

          {pasteOpen && (
            <div className="space-y-1.5 rounded-lg bg-slate-50 p-2">
              <input
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="教材の名前(任意)"
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
              />
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="教材の本文を貼り付けてください"
                rows={5}
                className="w-full resize-y rounded-md border border-slate-200 px-2 py-1 font-mono text-[11px]"
              />
              <button
                onClick={handlePasteSave}
                disabled={busy}
                className="w-full rounded-md bg-blue-500 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
              >
                登録する
              </button>
            </div>
          )}

          {busy && <p className="text-[10px] text-slate-400">読み込み中…</p>}
          {error && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-relaxed text-amber-700">
              {error}
            </p>
          )}
          {notice && !error && <p className="text-[10px] text-green-600">{notice}</p>}

          {sources.length > 0 && (
            <ul className="max-h-32 space-y-1 overflow-y-auto">
              {sources.map((source) => (
                <li key={source.id} className="group flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-slate-600">{source.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {TYPE_LABELS[source.type]} / {source.chunkCount}件
                    </span>
                  </span>
                  <button
                    onClick={() => handleDelete(source)}
                    disabled={busy}
                    aria-label={`${source.title}を削除`}
                    title="この教材を削除"
                    className="rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100 disabled:opacity-30"
                  >
                    <LuX className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
