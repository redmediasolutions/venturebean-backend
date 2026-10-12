"use client";

/**
 * The content editor (like the WordPress "Classic" editor).
 * Saves the content as HTML, which your Astro site can render with set:html.
 */
import { useEffect, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  CodeXml,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaPickerDialog } from "@/features/media/components/media-picker-dialog";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Smaller version used inside custom fields. */
  compact?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder = "Start writing…", compact = false }: RichTextEditorProps) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn("prose-editor px-5 py-4", compact ? "min-h-[160px]" : "min-h-[420px]"),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // If the value is replaced from outside (e.g. post finished loading), update the editor.
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML() && !(value === "" && editor.isEmpty)) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow-xs focus-within:border-ring/60">
      <Toolbar
        editor={editor}
        htmlMode={htmlMode}
        onToggleHtml={() => {
          if (htmlMode && editor) editor.commands.setContent(value || "", { emitUpdate: false });
          setHtmlMode((m) => !m);
        }}
        onLink={() => setLinkOpen(true)}
        onImage={() => setImageOpen(true)}
        compact={compact}
      />
      {htmlMode ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "rounded-none border-0 font-mono text-[13px] shadow-none focus-visible:ring-0",
            compact ? "min-h-[160px]" : "min-h-[420px]"
          )}
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      <LinkDialog open={linkOpen} onOpenChange={setLinkOpen} editor={editor} />
      <MediaPickerDialog
        open={imageOpen}
        onOpenChange={setImageOpen}
        kind="image"
        title="Insert image"
        onSelect={(items) => {
          const img = items[0];
          if (img && editor) editor.chain().focus().setImage({ src: img.url, alt: img.alt || img.name }).run();
        }}
      />
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          className={cn("size-8 text-muted-foreground", active && "bg-accent text-foreground")}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Toolbar({
  editor,
  htmlMode,
  onToggleHtml,
  onLink,
  onImage,
  compact,
}: {
  editor: Editor | null;
  htmlMode: boolean;
  onToggleHtml: () => void;
  onLink: () => void;
  onImage: () => void;
  compact: boolean;
}) {
  const off = !editor || htmlMode;
  const chain = () => editor!.chain().focus();
  const is = (name: string, attrs?: Record<string, unknown>) => Boolean(editor?.isActive(name, attrs));

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1 backdrop-blur">
      <ToolButton icon={Pilcrow} label="Paragraph" disabled={off} active={is("paragraph")} onClick={() => chain().setParagraph().run()} />
      <ToolButton icon={Heading2} label="Heading 2" disabled={off} active={is("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <ToolButton icon={Heading3} label="Heading 3" disabled={off} active={is("heading", { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      {!compact && (
        <ToolButton icon={Heading4} label="Heading 4" disabled={off} active={is("heading", { level: 4 })} onClick={() => chain().toggleHeading({ level: 4 }).run()} />
      )}
      <Separator orientation="vertical" className="mx-1 !h-5" />
      <ToolButton icon={Bold} label="Bold (Ctrl+B)" disabled={off} active={is("bold")} onClick={() => chain().toggleBold().run()} />
      <ToolButton icon={Italic} label="Italic (Ctrl+I)" disabled={off} active={is("italic")} onClick={() => chain().toggleItalic().run()} />
      <ToolButton icon={Underline} label="Underline (Ctrl+U)" disabled={off} active={is("underline")} onClick={() => chain().toggleUnderline().run()} />
      <ToolButton icon={Strikethrough} label="Strikethrough" disabled={off} active={is("strike")} onClick={() => chain().toggleStrike().run()} />
      <Separator orientation="vertical" className="mx-1 !h-5" />
      <ToolButton icon={List} label="Bullet list" disabled={off} active={is("bulletList")} onClick={() => chain().toggleBulletList().run()} />
      <ToolButton icon={ListOrdered} label="Numbered list" disabled={off} active={is("orderedList")} onClick={() => chain().toggleOrderedList().run()} />
      <ToolButton icon={Quote} label="Quote" disabled={off} active={is("blockquote")} onClick={() => chain().toggleBlockquote().run()} />
      {!compact && <ToolButton icon={Code} label="Code block" disabled={off} active={is("codeBlock")} onClick={() => chain().toggleCodeBlock().run()} />}
      <ToolButton icon={Minus} label="Divider line" disabled={off} onClick={() => chain().setHorizontalRule().run()} />
      <Separator orientation="vertical" className="mx-1 !h-5" />
      <ToolButton icon={Link2} label="Add link" disabled={off} active={is("link")} onClick={onLink} />
      {is("link") && <ToolButton icon={Unlink} label="Remove link" disabled={off} onClick={() => chain().unsetLink().run()} />}
      <ToolButton icon={ImagePlus} label="Insert image" disabled={off} onClick={onImage} />
      <div className="ml-auto flex items-center gap-0.5">
        <ToolButton icon={Undo2} label="Undo" disabled={off || !editor?.can().undo()} onClick={() => chain().undo().run()} />
        <ToolButton icon={Redo2} label="Redo" disabled={off || !editor?.can().redo()} onClick={() => chain().redo().run()} />
        <ToolButton icon={CodeXml} label={htmlMode ? "Back to visual editor" : "Edit HTML"} active={htmlMode} onClick={onToggleHtml} />
      </div>
    </div>
  );
}

function LinkDialog({ open, onOpenChange, editor }: { open: boolean; onOpenChange: (o: boolean) => void; editor: Editor | null }) {
  const [url, setUrl] = useState("");
  const [newTab, setNewTab] = useState(false);

  useEffect(() => {
    if (open && editor) {
      const attrs = editor.getAttributes("link");
      setUrl(attrs.href ?? "");
      setNewTab(attrs.target === "_blank");
    }
  }, [open, editor]);

  function apply() {
    if (!editor) return;
    const href = url.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const finalHref = /^(https?:|mailto:|tel:|\/|#)/.test(href) ? href : `https://${href}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: finalHref, target: newTab ? "_blank" : null })
        .run();
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert link</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
          className="space-y-4"
        >
          <Input autoFocus placeholder="https://example.com or /about" value={url} onChange={(e) => setUrl(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} className="size-4 accent-current" />
            Open in a new tab
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
