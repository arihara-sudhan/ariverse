import Head from 'next/head';
import { useEffect } from 'react';
import '../src/styles.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    function isTextInput(target) {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || target.isContentEditable;
    }

    function onContextMenu(event) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('img')) {
        event.preventDefault();
      }
    }

    function onDragStart(event) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('img')) {
        event.preventDefault();
      }
    }

    function onCopy(event) {
      const selection = window.getSelection();
      let hasImageInSelection = false;
      if (selection) {
        for (let index = 0; index < selection.rangeCount; index += 1) {
          const range = selection.getRangeAt(index);
          const fragment = range.cloneContents();
          if (fragment.querySelector && fragment.querySelector('img')) {
            hasImageInSelection = true;
            break;
          }
        }
      }
      if (hasImageInSelection) {
        event.preventDefault();
      }
    }

    function onKeyDown(event) {
      if (isTextInput(event.target)) return;
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      if (event.key === 'F12') {
        event.preventDefault();
        return;
      }

      if (ctrlOrMeta && event.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
        event.preventDefault();
        return;
      }

      if (ctrlOrMeta && key === 'u') {
        event.preventDefault();
      }
    }

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('copy', onCopy);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
