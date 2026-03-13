"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { 
    Bold, 
    Italic, 
    Underline as UnderlineIcon, 
    List, 
    ListOrdered, 
    Heading1, 
    Heading2, 
    Link as LinkIcon,
    Highlighter,
    Undo,
    Redo,
    Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    onPasteImage?: (files: File[]) => void;
    placeholder?: string;
}

const MenuButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    tooltip 
}: { 
    onClick: () => void; 
    isActive?: boolean; 
    disabled?: boolean; 
    children: React.ReactNode; 
    tooltip: string;
}) => (
    <TooltipProvider delayDuration={200}>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        onClick();
                    }}
                    disabled={disabled}
                    className={cn(
                        "h-8 w-8 p-0",
                        isActive && "bg-muted text-primary font-bold"
                    )}
                >
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] px-2 py-1">
                {tooltip}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

export function RichTextEditor({ value, onChange, onPasteImage, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Highlight,
            Link.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder: placeholder || "Write something...",
            }),
        ],
        content: value,
        immediatelyRender: false,
        editorProps: {
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || []);
                const imageFiles = items
                    .filter(item => item.type.startsWith("image/"))
                    .map(item => item.getAsFile())
                    .filter((file): file is File => file !== null);

                if (imageFiles.length > 0 && onPasteImage) {
                    onPasteImage(imageFiles);
                    return true; // prevent default paste behavior for images
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-col w-full border rounded-md overflow-hidden bg-background focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-1 border-b bg-muted/20">
                <MenuButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive("heading", { level: 1 })}
                    tooltip="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive("heading", { level: 2 })}
                    tooltip="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </MenuButton>
                
                <div className="w-px h-4 bg-border mx-1" />

                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    tooltip="Bold (Ctrl+B)"
                >
                    <Bold className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    tooltip="Italic (Ctrl+I)"
                >
                    <Italic className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive("underline")}
                    tooltip="Underline (Ctrl+U)"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    isActive={editor.isActive("highlight")}
                    tooltip="Highlight"
                >
                    <Highlighter className="h-4 w-4" />
                </MenuButton>

                <div className="w-px h-4 bg-border mx-1" />

                <MenuButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    tooltip="Bullet List"
                >
                    <List className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    tooltip="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </MenuButton>

                <div className="w-px h-4 bg-border mx-1" />

                <MenuButton
                    onClick={() => {
                        const url = window.prompt("Enter URL");
                        if (url) {
                            editor.chain().focus().setLink({ href: url }).run();
                        } else if (url === "") {
                            editor.chain().focus().unsetLink().run();
                        }
                    }}
                    isActive={editor.isActive("link")}
                    tooltip="Link"
                >
                    <LinkIcon className="h-4 w-4" />
                </MenuButton>

                <div className="flex-1" />

                <MenuButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    tooltip="Undo"
                >
                    <Undo className="h-4 w-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    tooltip="Redo"
                >
                    <Redo className="h-4 w-4" />
                </MenuButton>
            </div>

            {/* Editor Area */}
            <div className="p-4 min-h-[250px] prose prose-sm max-w-none prose-stone dark:prose-invert focus:outline-none">
                <EditorContent editor={editor} />
            </div>

            <style jsx global>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
                .ProseMirror:focus {
                    outline: none;
                }
                .ProseMirror {
                    min-height: 250px;
                }
            `}</style>
        </div>
    );
}

