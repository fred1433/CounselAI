import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import './ContractEditor.css';
import { useEffect } from 'react';

interface ContractEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  isEditing: boolean;
}

const ContractEditor = ({ content, onChange, isEditing }: ContractEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false, // Prevents HTML tags from being rendered as is
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '*',
        linkify: true,
        breaks: true,
      }),
    ],
    content: content,
    editable: !isEditing,
    onUpdate: ({ editor }) => {
      onChange(editor.storage.markdown.getMarkdown());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    // Synchronize editor content when the parent state changes, but prevent update loops.
    if (editor && editor.storage.markdown.getMarkdown() !== content) {
      // setContent(..., false) is crucial to prevent the onUpdate callback
      // from firing again and creating an infinite loop.
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  return <EditorContent editor={editor} className="prose max-w-none flex-1 overflow-y-auto p-6" />;
};

export default ContractEditor; 