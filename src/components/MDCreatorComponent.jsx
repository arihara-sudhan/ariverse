import { useRef, useState } from 'react';

function getSelectionRange(textarea) {
  if (!textarea) {
    return { start: 0, end: 0 };
  }
  return {
    start: textarea.selectionStart ?? 0,
    end: textarea.selectionEnd ?? 0,
  };
}

function applyTextChange(textarea, nextValue, nextStart, nextEnd, onChange) {
  onChange(nextValue);
  requestAnimationFrame(() => {
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(nextStart, nextEnd);
  });
}

function wrapSelection(textarea, onChange, value, before, after = before) {
  const { start, end } = getSelectionRange(textarea);
  const selected = value.slice(start, end) || '';
  const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  const nextStart = start + before.length;
  const nextEnd = nextStart + selected.length;
  applyTextChange(textarea, nextValue, nextStart, nextEnd, onChange);
}

function replaceSelectedLines(textarea, onChange, value, prefix) {
  const { start, end } = getSelectionRange(textarea);
  const selected = value.slice(start, end) || '';
  const nextBlock = selected
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
  const nextValue = `${value.slice(0, start)}${nextBlock}${value.slice(end)}`;
  applyTextChange(textarea, nextValue, start + prefix.length, start + nextBlock.length, onChange);
}

function insertSnippet(textarea, onChange, value, snippet, cursorOffset = snippet.length) {
  const { start, end } = getSelectionRange(textarea);
  const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
  const nextCursor = start + cursorOffset;
  applyTextChange(textarea, nextValue, nextCursor, nextCursor, onChange);
}

function iconBox(path, size = '1em') {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: size, height: size, flex: '0 0 auto' }}>
      <path d={path} fill="currentColor" />
    </svg>
  );
}

export default function MDCreatorComponent({
  label = 'Markdown',
  value = '',
  onChange,
  rows = 12,
  placeholder = 'Write markdown here...',
  onUploadImage,
}) {
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(event) {
    const file = event.target.files?.[0] || null;
    if (!file || typeof onUploadImage !== 'function') {
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await onUploadImage(file);
      if (imageUrl) {
        const alt = file.name.replace(/\.[^.]+$/, '').trim() || 'image';
        insertSnippet(
          textareaRef.current,
          onChange,
          String(value || ''),
          `![${alt}](${imageUrl})`,
          `![${alt}](`.length,
        );
      }
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  return (
    <div className="md-creator">
      <label htmlFor="md-creator-textarea">{label}</label>
      <div className="md-creator-toolbar" role="toolbar" aria-label="Markdown tools">
        <button type="button" className="md-tool" onClick={() => wrapSelection(textareaRef.current, onChange, String(value || ''), '**')}>
          {iconBox('M7 4.5h5.2a3.2 3.2 0 0 1 0 6.4H7v-6.4Zm0 8.2h5.8a3.3 3.3 0 0 1 0 6.6H7v-6.6Zm2 1.8v3h3.7a1.5 1.5 0 0 0 0-3H9Z')}
          <span>Bold</span>
        </button>
        <button type="button" className="md-tool" onClick={() => wrapSelection(textareaRef.current, onChange, String(value || ''), '*')}>
          {iconBox('M10.2 5h7.1v1.7h-2.4l-3.2 10.6h2.5V19H7.1v-1.7h2.4l3.2-10.6h-2.5V5Z')}
          <span>Italic</span>
        </button>
        <button type="button" className="md-tool" onClick={() => replaceSelectedLines(textareaRef.current, onChange, String(value || ''), '## ')}>
          {iconBox('M8.2 5.3H10v5.1h4V5.3h1.8v13.4H14V12H10v6.7H8.2V5.3Z')}
          <span>H2</span>
        </button>
        <button
          type="button"
          className="md-tool md-tool-image"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading || typeof onUploadImage !== 'function'}
          title="Upload image"
          aria-label="Upload image"
        >
          {iconBox('M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Zm2.5-.7a.7.7 0 0 0-.7.7v11.2l3.1-3.1a1 1 0 0 1 1.4 0l2.1 2.1 2.7-2.7a1 1 0 0 1 1.4 0L19 16.6V5.5a.7.7 0 0 0-.7-.7h-11ZM8 8.2A1.7 1.7 0 1 1 8 11.6 1.7 1.7 0 0 1 8 8.2Z')}
          <span>Image</span>
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
      </div>
      <textarea
        id="md-creator-textarea"
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
