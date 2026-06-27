import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, FileText } from "lucide-react";

interface AgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function AgreementModal({ isOpen, onClose, title, content }: AgreementModalProps) {
  // Convert Markdown-like text to formatted HTML simple lines
  const renderParagraphs = (text: string) => {
    return text.split("\n\n").map((para, idx) => {
      if (para.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-sm font-black text-white mt-5 mb-2 uppercase tracking-wide border-b border-zinc-800 pb-1">
            {para.replace("### ", "")}
          </h4>
        );
      }
      if (para.startsWith("* ")) {
        return (
          <ul key={idx} className="list-disc pl-5 space-y-1.5 my-2 text-zinc-300 text-xs">
            {para.split("\n").map((line, lIdx) => (
              <li key={lIdx} className="leading-relaxed">
                {line.replace("* ", "")}
              </li>
            ))}
          </ul>
        );
      }
      return (
        <p key={idx} className="text-zinc-300 text-xs leading-relaxed mb-3">
          {para}
        </p>
      );
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] cursor-pointer"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col pointer-events-auto max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider max-w-[280px] sm:max-w-[340px] truncate">
                    {title}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <div className="prose prose-invert font-sans">
                  {renderParagraphs(content)}
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-zinc-900/60 bg-zinc-900/20 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Kapat ve Geri Dön
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
