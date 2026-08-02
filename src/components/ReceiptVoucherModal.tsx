import React, { useRef, useState, useEffect } from 'react';
import { Download, Printer, X, Phone, MapPin, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Order } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
// @ts-ignore
import companyLogoAsset from '../assets/images/digital_vision_center_logo_1784451081564.jpg';

const companyLogoImg = companyLogoAsset || '/company-logo.jpg';

interface ReceiptVoucherModalProps {
  order: Order;
  onClose: () => void;
}

export default function ReceiptVoucherModal({ order, onClose }: ReceiptVoucherModalProps) {
  const voucherRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Auto-adjust scale based on screen width for laptop, tablet, mobile
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 480) {
        setZoomScale(0.52);
      } else if (w < 640) {
        setZoomScale(0.68);
      } else if (w < 1024) {
        setZoomScale(0.85);
      } else {
        setZoomScale(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Format date and time in Arabic
  const formattedDateTime = new Date(order.created_at).toLocaleString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const formattedAmount = Number(order.totalPrice || 0).toLocaleString('ar-IQ');
  const isPaid = order.status === 'approved';

  // Handle PDF Generation & Download
  const handleDownloadPDF = async () => {
    if (!voucherRef.current) return;
    setDownloading(true);
    try {
      // Temporary override transform scale to 1 for perfect crisp canvas capture
      const currentScale = zoomScale;
      setZoomScale(1);

      // Wait brief tick for scale re-render
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(voucherRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Restore zoom scale for UI preview
      setZoomScale(currentScale);

      const imgData = canvas.toDataURL('image/png');
      // A5 dimensions: 148mm width x 210mm height
      const pdf = new jsPDF('p', 'mm', 'a5');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 148mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight > 210 ? 210 : pdfHeight);
      pdf.save(`وصل-قبض-${order.id.replace('order-', '')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF voucher:', err);
      alert('حدث خطأ أثناء تحميل وصل القبض، يرجى المحاولة مرة أخرى.');
    } finally {
      setDownloading(false);
    }
  };

  // Handle Browser Native Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* Printable Style Sheet Override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt-area, #printable-receipt-area * {
            visibility: visible;
          }
          #printable-receipt-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 148mm;
            height: 210mm;
            margin: 0;
            padding: 10mm;
            box-shadow: none !important;
            border: none !important;
            transform: scale(1) !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col print:m-0 print:border-none print:shadow-none print:bg-white">
        
        {/* Top Action Controls Bar (PDF, Print, Zoom, Exit) - Excluded from Print */}
        <div className="no-print flex flex-wrap items-center justify-between p-3 sm:p-4 bg-slate-950 border-b border-slate-800 shrink-0 gap-2">
          
          {/* Main Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-1.5 sm:gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs py-2 px-3 sm:px-4 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'جاري التحميل...' : 'تنزيل PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2 px-3 sm:px-4 rounded-xl transition-all cursor-pointer border border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
          </div>

          {/* Zoom / Scale Controls for Small Screens */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-slate-300 text-xs">
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.max(0.4, +(prev - 0.1).toFixed(2)))}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold px-1.5 text-amber-400">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.min(1.3, +(prev + 0.1).toFixed(2)))}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-white"
              title="الحجم الأصلي 100%"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exit / Close Button */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-block text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
              A5 - وصل قبض رسمي
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>خروج / إغلاق</span>
            </button>
          </div>
        </div>

        {/* Scrollable Container with Auto-Fit Responsive Scaling */}
        <div className="p-2 sm:p-6 overflow-auto flex-1 flex justify-center items-start bg-slate-950/80 print:p-0 print:bg-white">
          
          {/* Scale Outer Envelope */}
          <div
            style={{
              width: `${148 * zoomScale}mm`,
              height: `${210 * zoomScale}mm`,
              transition: 'width 0.2s ease, height 0.2s ease'
            }}
            className="flex justify-center items-start shrink-0 relative"
          >
            {/* A5 Printable Content Wrapper */}
            <div
              id="printable-receipt-area"
              ref={voucherRef}
              dir="rtl"
              className="bg-white text-slate-900 p-6 rounded-xl shadow-2xl font-sans relative flex flex-col justify-between border-2 border-slate-300 text-right text-xs leading-relaxed origin-top-left shrink-0"
              style={{
                width: '148mm',
                height: '210mm',
                boxSizing: 'border-box',
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top right'
              }}
            >
              {/* Inner Decorative Watermark Border */}
              <div className="absolute inset-2 border border-dashed border-amber-700/30 pointer-events-none rounded-lg" />

              <div className="space-y-3.5 relative z-10">
                
                {/* HEADER SECTION */}
                <div className="grid grid-cols-3 gap-2 items-center pb-3 border-b-2 border-slate-800">
                  
                  {/* Left Side: Digital Vision Center Logo */}
                  <div className="flex flex-col items-start justify-center">
                    <div className="flex items-center gap-2">
                      <img
                        src={companyLogoImg}
                        alt="Digital Vision Center"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/company-logo.jpg';
                        }}
                        className="w-13 h-13 sm:w-14 sm:h-14 object-cover rounded-xl border border-slate-200 shadow-md bg-slate-900 shrink-0"
                      />
                      <div>
                        <span className="block font-black text-amber-900 text-xs tracking-tight leading-tight">
                          Digital Vision
                        </span>
                        <span className="block text-[9px] font-bold text-slate-600">
                          Center
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Company Name & Voucher Title */}
                  <div className="text-center space-y-0.5">
                    <h1 className="font-extrabold text-slate-900 text-sm leading-tight">
                      مركز الرؤية الرقمية
                    </h1>
                    <span className="block text-[10px] font-bold text-amber-800 tracking-wide">
                      Digital Vision Center
                    </span>
                    <div className={`inline-block text-white font-black text-xs px-3.5 py-0.5 rounded-md tracking-wider shadow-sm mt-1 ${
                      isPaid ? 'bg-slate-900' : 'bg-rose-900'
                    }`}>
                      {isPaid ? 'وصل قبض' : 'مطالبة سداد / فاتورة'}
                    </div>
                    <span className="block text-[8px] font-semibold text-slate-500 font-mono">
                      {isPaid ? 'RECEIPT VOUCHER' : 'UNPAID INVOICE DEMAND'}
                    </span>
                  </div>

                  {/* Right Side: Order & Customer Key Details */}
                  <div className="text-right space-y-1 text-[9.5px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-600">التاريخ والوقت:</span>
                      <span className="font-mono font-semibold text-slate-900 dir-ltr">{formattedDateTime}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-600">رقم الطلب:</span>
                      <span className="font-mono font-bold text-indigo-900">{order.id.replace('order-', '#')}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-600">اسم الزبون:</span>
                      <span className="font-bold text-slate-900">{order.username}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-600">المبلغ:</span>
                      <span className="font-extrabold text-emerald-800 font-mono text-[10.5px]">{formattedAmount} د.ع</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                      <span className="font-bold text-slate-600">حالة الدفع:</span>
                      <span className={`font-black px-1.5 py-0.2 rounded text-[8.5px] ${
                        isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {isPaid ? 'مدفوع' : 'غير مدفوع'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-600">اسم المشروع:</span>
                      <span className="font-semibold text-slate-900 truncate max-w-[90px]">{order.orderName}</span>
                    </div>
                  </div>

                </div>

                {/* VOUCHER BODY CONTENT */}
                <div className="space-y-2.5 pt-1">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="font-extrabold text-slate-700 min-w-[125px]">
                        {isPaid ? 'استلمنا من السيد/السيدة:' : 'المطلوب من السيد/السيدة:'}
                      </span>
                      <span className="font-bold text-indigo-900 text-xs">{order.username}</span>
                    </div>

                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="font-extrabold text-slate-700 min-w-[125px]">
                        {isPaid ? 'مبلغ وقدره:' : 'المبلغ المطلوب سداده:'}
                      </span>
                      <span className={`font-black text-xs px-2 py-0.5 rounded border ${
                        isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {formattedAmount} دينار عراقي {isPaid ? 'لا غير' : '(لم يتم الدفع بعد)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <span className="font-extrabold text-slate-700 min-w-[125px]">
                        {isPaid ? 'وذلك عن قيمة:' : 'وذلك عن مستحقات:'}
                      </span>
                      <span className="font-bold text-slate-900">{order.orderName}</span>
                    </div>

                    {!isPaid && (
                      <div className="p-2 bg-amber-50 border border-amber-200/80 rounded-lg text-[9px] text-amber-900 font-medium">
                        تنبيه: هذا المستند يُعد المطالبة الرسمية بسداد المبلغ أعلاه، ولا يُعتبر إشعاراً بالاستلام أو إبراءً للذمة حتى يتم تأكيد عملية الدفع نهائياً.
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-0.5">
                      <div>
                        <span className="font-bold text-slate-600">طريقة الدفع: </span>
                        <span className="font-semibold text-slate-800">
                          {order.paymentMethod === 'zaincash_manual'
                            ? 'زين كاش (تحويل يدوي)'
                            : order.paymentMethod === 'zaincash_auto'
                            ? 'زين كاش (بوابة إلكترونية)'
                            : 'فاتورة عقد برمجيات'}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-slate-600">رقم الهاتف: </span>
                        <span className="font-mono font-bold text-slate-800">{order.phone}</span>
                      </div>

                      {order.referenceId && (
                        <div>
                          <span className="font-bold text-slate-600">الرقم المرجعي: </span>
                          <span className="font-mono font-bold text-indigo-800">{order.referenceId}</span>
                        </div>
                      )}

                      {order.customerWallet && (
                        <div>
                          <span className="font-bold text-slate-600">محفظة المرسل: </span>
                          <span className="font-mono font-bold text-slate-800">{order.customerWallet}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[9.5px]">
                      <span className="font-bold text-slate-600">عنوان الزبون: </span>
                      <span className="text-slate-800">{order.address}</span>
                    </div>

                  </div>
                </div>

              </div>

              {/* FOOTER SECTION */}
              <div className="pt-4 mt-2 border-t-2 border-slate-800 relative z-10">
                <div className="grid grid-cols-2 gap-3 items-end">
                  
                  {/* Left Side: Admin Signature Box (Left Empty) */}
                  <div className="border-2 border-dashed border-slate-400 rounded-xl p-2.5 text-center space-y-4 bg-slate-50">
                    <span className="block font-extrabold text-slate-800 text-[10px]">
                      {isPaid ? 'توقيع المدير / المستلم' : 'توقيع المحاسب / مسؤول المبيعات'}
                    </span>
                    {/* Blank space strictly left empty for manual physical or digital signature */}
                    <div className="h-8" />
                  </div>

                  {/* Right Side: Company Contact Phone & Address */}
                  <div className="text-right space-y-1 text-[9.5px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                      <Phone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>رقم الشركة:</span>
                      <span className="font-mono text-indigo-900 dir-ltr text-xs">+9647708506036</span>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">عنوان الشركة:</span>
                        <span className="font-medium">كركوك-طريق بغداد-مافي مول-طابق الارضي</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Copyright bar */}
                <div className="mt-2 text-center text-[7.5px] text-slate-500 font-mono border-t border-slate-200 pt-1">
                  وثيقة رسمية صادرة من مركز الرؤية الرقمية - جميع الحقوق محفوظة © {new Date().getFullYear()}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
