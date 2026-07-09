import { SiteHeader } from "@/components/site-header";
import { TradeForm } from "@/components/trade-form";

export default function LogTradePage() {
  return (
    <>
      <SiteHeader
        description="MNQ/MES · chart · P&L · Heart Rate Index · notes"
        title="Log trade"
      />
      <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <TradeForm />
      </div>
    </>
  );
}
