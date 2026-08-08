"use client";

import { useState } from "react";

export default function TransactionDetailOverlay() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hidden trigger - rows can call this via context in future */}
      <div
        className={`fixed inset-0 z-[60] bg-surface-deep/80 backdrop-blur-sm ${
          open ? "flex" : "hidden"
        } items-center justify-center p-4`}
        onClick={() => setOpen(false)}
      >
        <div
          className="w-full max-w-4xl bg-surface-container border border-subtle shadow-2xl rounded-xl overflow-hidden flex flex-col md:flex-row h-[751px]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Transaction Core Details (Left Panel) */}
          <div className="flex-1 p-5 border-r border-subtle overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="font-label-caps text-label-caps text-secondary">
                  TRANSACTION ID
                </span>
                <h3 className="font-headline-md text-headline-md">#KTX-98214</h3>
              </div>
              <span className="bg-status-success/10 text-status-success px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest">
                SUCCESS
              </span>
            </div>
            <div className="grid grid-cols-2 gap-max-gap mb-8">
              <div className="space-y-4">
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    SENDER
                  </p>
                  <p className="font-body-md font-bold">John Doe</p>
                  <p className="text-body-sm text-on-primary-container">
                    ID: U-88219-X
                  </p>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    RECIPIENT DETAILS
                  </p>
                  <p className="font-data-mono text-body-sm bg-surface-deep p-2 rounded border border-outline-variant">
                    1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    ASSET TYPE
                  </p>
                  <p className="font-body-md flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">
                      currency_bitcoin
                    </span>{" "}
                    Bitcoin (BTC)
                  </p>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    AMOUNT &amp; FEES
                  </p>
                  <p className="font-data-mono text-headline-md text-on-surface">
                    0.024 BTC
                  </p>
                  <p className="text-[10px] text-on-primary-container">
                    Fee: 0.00012 BTC ($5.42)
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-surface-deep/50 p-4 rounded-lg border border-outline-variant">
              <h4 className="font-label-caps text-label-caps text-secondary mb-4">
                BLOCKCHAIN EXPLORER DATA
              </h4>
              <div className="space-y-2 font-data-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Hash:</span>
                  <span className="text-primary truncate ml-4">
                    f4184fc596403b9d638783cf57...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Confirmations:</span>
                  <span>12 Blocks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Network:</span>
                  <span>Mainnet</span>
                </div>
              </div>
            </div>
            {/* Detail View Actions */}
            <div className="mt-8 flex flex-wrap gap-2">
              <button className="flex-1 bg-status-danger text-white py-2 rounded font-label-caps text-label-caps hover:bg-red-600 transition-colors">
                FLAG SUSPICIOUS
              </button>
              <button className="flex-1 bg-surface-bright border border-subtle py-2 rounded font-label-caps text-label-caps hover:bg-surface-container-high transition-colors">
                REVERSE / REFUND
              </button>
            </div>
          </div>

          {/* Transaction Timeline (Right Panel) */}
          <div className="w-full md:w-80 bg-surface-container-low p-5 flex flex-col relative">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-label-caps text-label-caps text-on-primary-container">
                ACTIVITY LOG
              </h4>
              <button
                className="p-1 hover:bg-surface-bright rounded"
                onClick={() => setOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 relative">
              {/* Vertical Timeline Line */}
              <div className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-outline-variant"></div>
              <div className="space-y-6">
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-status-success flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[12px] text-white"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  </div>
                  <p className="text-[11px] font-bold">Transaction Completed</p>
                  <p className="text-[10px] text-on-surface-variant">
                    Oct 27, 2023 &bull; 14:22:10
                  </p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] text-on-secondary-fixed">
                      sync
                    </span>
                  </div>
                  <p className="text-[11px] font-bold">Network Broadcast</p>
                  <p className="text-[10px] text-on-surface-variant">
                    Oct 27, 2023 &bull; 14:20:45
                  </p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-outline-variant flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px]">
                      person
                    </span>
                  </div>
                  <p className="text-[11px] font-bold">Initiated by User</p>
                  <p className="text-[10px] text-on-surface-variant">
                    Oct 27, 2023 &bull; 14:18:02
                  </p>
                  <p className="text-[9px] mt-1 italic text-on-primary-container">
                    IP: 192.168.1.44 (Lagos, NG)
                  </p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-status-info flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] text-white">
                      security
                    </span>
                  </div>
                  <p className="text-[11px] font-bold">Security Check Passed</p>
                  <p className="text-[10px] text-on-surface-variant">
                    Oct 27, 2023 &bull; 14:18:00
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-subtle">
              <button className="w-full bg-surface-container-highest py-2 border border-outline-variant rounded font-label-caps text-label-caps hover:bg-surface-bright transition-colors">
                VIEW FULL AUDIT TRAIL
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
