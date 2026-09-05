import React from 'react';
import { HelpCircle, Play, X, CheckCircle, ArrowRight } from 'lucide-react';

interface TrainingVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrainingVideosModal: React.FC<TrainingVideosModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const guides = [
    {
      title: '1. Fast Over-the-Counter Billing',
      desc: 'Tap catalog items or use the numpad Quick Bill for immediate ticket generation.',
      duration: '1:45 min',
    },
    {
      title: '2. Split Payment & Khata Ledger',
      desc: 'Allocate mixed tenders (Cash + UPI) or assign orders to customer credit accounts.',
      duration: '2:10 min',
    },
    {
      title: '3. Bluetooth Thermal Printing (58mm/80mm)',
      desc: 'Pair thermal ESC/POS receipt printers and configure standard retail invoice headers.',
      duration: '3:00 min',
    },
    {
      title: '4. Daily Cash Drawer & Float Balancing',
      desc: 'Perform morning float opening, log expense withdrawals, and run evening audit reports.',
      duration: '2:30 min',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md border border-[#d4d4d8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#1c1b1d]">
        <div className="px-4 py-3 border-b border-[#d4d4d8] flex items-center justify-between bg-[#f6f2f5]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#18181b]" />
            <h2 className="font-bold text-sm">MonoPOS Terminal Operation Guides</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#77767b] hover:text-[#1c1b1d] hover:bg-[#eae7ea]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
          {guides.map((g, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#d4d4d8] rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:border-[#18181b] transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-[#f0edf0] text-[#18181b] flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs text-[#1c1b1d]">{g.title}</h3>
                <p className="text-[11px] text-[#77767b] mt-0.5">{g.desc}</p>
                <span className="text-[10px] font-mono text-[#77767b] font-bold">
                  {g.duration}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-[#f6f2f5] border-t border-[#d4d4d8] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#18181b] text-white rounded-xl text-xs font-bold hover:bg-black"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
