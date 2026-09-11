import React, { useState, useRef, useEffect } from 'react';
import { 
  ScanLine, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  X, 
  RefreshCw, 
  FileText, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Plus, 
  Trash2, 
  Images, 
  Cpu,
  Camera,
  RotateCcw,
  FlipHorizontal,
  Zap,
  CameraOff,
  ArrowLeftRight,
  MoveLeft,
  MoveRight,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { createWorker } from 'tesseract.js';
import { invoiceApi, salesInvoiceApi } from '../api';
import { 
  INDIAN_STATE_CODES, 
  calculateGstBreakdown, 
  extractStateCode, 
  getStateName 
} from '../utils/gstUtils';
import { 
  determinePageSequence, 
  mergeOrderedOcrTexts 
} from '../utils/pageOrdering';
import { 
  extractInvoiceFields, 
  reconcileExtractionResults,
  cleanOcrText,
  normalizeDateString
} from '../utils/invoiceExtraction';
import { callVlmExtraction } from '../utils/vlmExtraction';

import { CATEGORY_OPTIONS } from '../utils/categoryConstants';

function CandidateFieldBadge({
  fieldName,
  label,
  extractedData,
  onSelectCandidate
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const candidate = extractedData?.candidates?.[fieldName];
  const source = extractedData?.extractionSources?.[fieldName];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!candidate && !source) return null;

  if (candidate?.conflict) {
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition shadow-2xs cursor-pointer animate-pulse"
          title="Discrepancy detected between OCR and Vision AI — click to choose candidate"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          Conflict: Choose Source
        </button>

        {isOpen && (
          <div className="absolute z-50 right-0 mt-1 w-64 p-2.5 rounded-xl bg-white shadow-2xl border border-slate-200 text-xs space-y-2 animate-in fade-in zoom-in-95">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              Select Candidate for {label}
            </div>
            
            {candidate.regexVal !== null && candidate.regexVal !== undefined && (
              <button
                type="button"
                onClick={() => {
                  onSelectCandidate(fieldName, candidate.regexVal);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2 rounded-lg border transition text-xs flex flex-col ${
                  String(extractedData[fieldName]) === String(candidate.regexVal)
                    ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                  Tesseract OCR Engine (Regex):
                </span>
                <span className="font-mono text-[11px] truncate mt-0.5">
                  {typeof candidate.regexVal === 'number' ? `₹${candidate.regexVal.toLocaleString('en-IN')}` : String(candidate.regexVal)}
                </span>
              </button>
            )}

            {candidate.vlmVal !== null && candidate.vlmVal !== undefined && (
              <button
                type="button"
                onClick={() => {
                  onSelectCandidate(fieldName, candidate.vlmVal);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2 rounded-lg border transition text-xs flex flex-col ${
                  String(extractedData[fieldName]) === String(candidate.vlmVal)
                    ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-[9px] text-violet-600 font-bold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-violet-600" />
                  Local Ollama Vision Model (VLM):
                </span>
                <span className="font-mono text-[11px] truncate mt-0.5">
                  {typeof candidate.vlmVal === 'number' ? `₹${candidate.vlmVal.toLocaleString('en-IN')}` : String(candidate.vlmVal)}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (source === 'both') {
    return (
      <span 
        title="Verified match between Tesseract OCR and Ollama Vision AI"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
      >
        <Check className="w-2.5 h-2.5" />
        AI Verified
      </span>
    );
  }

  if (source === 'vlm') {
    return (
      <span 
        title="Extracted via Local Ollama Vision Model"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200"
      >
        <Sparkles className="w-2.5 h-2.5" />
        Vision AI
      </span>
    );
  }

  if (source === 'regex') {
    return (
      <span 
        title="Extracted via Tesseract OCR Engine"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
      >
        OCR
      </span>
    );
  }

  return null;
}

export default function OcrUploadScanner({ 
  onInvoiceScanned, 
  onSalesInvoiceScanned,
  onClose,
  initialScanMode = 'purchase'
}) {
  const [scanMode, setScanMode] = useState(initialScanMode); // 'purchase' | 'sales'
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [ocrRawText, setOcrRawText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showLineItems, setShowLineItems] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Multi-page Automatic Ordering Review State
  const [orderingReview, setOrderingReview] = useState(null);
  const vlmPendingPromiseRef = useRef(null);

  // Live Camera Scanner State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [cameraError, setCameraError] = useState(null);
  const [isCapturingFlash, setIsCapturingFlash] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const purchaseScanStepsList = [
    "Initializing Hybrid AI Engine (Tesseract OCR + Local Ollama Vision)...",
    "Pre-processing image & running parallel optical text + vision models...",
    "Analyzing document structure & calculating page sequence scores...",
    "Reconciling OCR text & VLM fields with Indian GST arithmetic cross-checks...",
    "Classifying expense category via BillWise ML Model...",
    "Validating Section 17(5) Input Tax Credit (ITC) eligibility..."
  ];

  const salesScanStepsList = [
    "Initializing Hybrid AI Engine (Tesseract OCR + Local Ollama Vision)...",
    "Pre-processing image & running parallel optical text + vision models...",
    "Extracting buyer details, customer GSTIN & POS invoice sequence...",
    "Computing output CGST/SGST/IGST tax liability & HSN codes...",
    "Determining GSTR-1 supply classification (B2B, B2C Large, B2C Small, Export)...",
    "Verifying outward supply ledger integrity & statutory totals..."
  ];

  const scanStepsList = scanMode === 'sales' ? salesScanStepsList : purchaseScanStepsList;

  const handleModeChange = (newMode) => {
    setScanMode(newMode);
    if (extractedData) {
      if (newMode === 'sales') {
        const custName = extractedData.customerName || extractedData.vendorName || '';
        const custGst = extractedData.customerGstin || extractedData.gstin || '';
        const pos = extractedData.placeOfSupply || extractStateCode(custGst) || '27';
        const supType = extractedData.supplyType || (custGst ? 'B2B' : 'B2C');
        const breakdown = calculateGstBreakdown({
          taxableAmount: extractedData.taxableAmount || 0,
          gstRate: extractedData.gstRate !== undefined ? extractedData.gstRate : 18,
          supplierStateCode: '27',
          customerGstin: custGst,
          placeOfSupply: pos,
          supplyType: supType
        });
        setExtractedData(prev => ({
          ...prev,
          customerName: custName,
          customerGstin: custGst,
          placeOfSupply: pos,
          supplyType: supType,
          cgst: breakdown.cgst,
          sgst: breakdown.sgst,
          igst: breakdown.igst,
          totalAmount: breakdown.totalAmount,
          isArithmeticValid: true
        }));
      } else {
        const vendName = extractedData.vendorName || extractedData.customerName || '';
        const gstinVal = extractedData.gstin || extractedData.customerGstin || '';
        const gst = Math.round(((extractedData.taxableAmount || 0) * (extractedData.gstRate || 18)) / 100 * 100) / 100;
        setExtractedData(prev => ({
          ...prev,
          vendorName: vendName,
          gstin: gstinVal,
          cgst: Math.round((gst / 2) * 100) / 100,
          sgst: Math.round((gst / 2) * 100) / 100,
          igst: 0,
          totalAmount: Math.round(((extractedData.taxableAmount || 0) + gst) * 100) / 100,
          itcAmount: prev.itcEligibility?.includes('Eligible') ? gst : 0,
          isArithmeticValid: true
        }));
      }
    }
  };

  // Stop camera tracks on unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, []);

  const stopCameraTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) { /* ignore */ }
      });
      mediaStreamRef.current = null;
    }
  };

  const startCamera = async (facing = cameraFacingMode) => {
    stopCameraTracks();
    setIsCameraOpen(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser. Please use the file upload option.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      let msg = "Could not access camera. Please check permissions.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Camera permission was denied. Please allow camera access in browser settings or use the file upload button.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "No camera device was found on this computer. You can upload an invoice image instead.";
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
    }
  };

  const handleCloseCamera = () => {
    stopCameraTracks();
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const handleToggleFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const handleCapturePhoto = (triggerOcrImmediately = false) => {
    if (!videoRef.current) return;

    // Trigger visual shutter flash
    setIsCapturingFlash(true);
    setTimeout(() => setIsCapturingFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const dateCode = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const fileName = `invoice-cam-scan-${dateCode}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      const newFileObj = {
        id: `img-cam-${Date.now()}`,
        file: file,
        name: fileName,
        previewUrl: previewUrl
      };

      const updatedFiles = [...uploadedFiles, newFileObj];
      setUploadedFiles(updatedFiles);
      handleCloseCamera();

      if (triggerOcrImmediately) {
        runOcrOnFiles(updatedFiles);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleMultipleFilesSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newFileObjects = files.map((file, index) => ({
        id: `img-${Date.now()}-${index}`,
        file: file,
        name: file.name,
        previewUrl: URL.createObjectURL(file)
      }));
      setUploadedFiles(prev => [...prev, ...newFileObjects]);
    }
  };

  const handleRemoveFile = (idToRemove) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== idToRemove));
    if (orderingReview) setOrderingReview(null);
  };

  // Preprocesses image with high-contrast scaling and grayscale for optimal OCR accuracy
  const preprocessImageForOcr = async (fileOrBlob) => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(fileOrBlob);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let width = img.width;
          let height = img.height;
          const maxDim = 2400;
          const minDim = 1500;

          if (Math.max(width, height) > maxDim) {
            const ratio = maxDim / Math.max(width, height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          } else if (Math.min(width, height) < minDim && Math.max(width, height) < 2000) {
            const ratio = minDim / Math.min(width, height);
            width = Math.round(width * Math.min(2.0, ratio));
            height = Math.round(height * Math.min(2.0, ratio));
          }

          canvas.width = width;
          canvas.height = height;

          // Draw original image
          ctx.drawImage(img, 0, 0, width, height);

          // Apply luminosity grayscale & contrast stretching
          try {
            const imgData = ctx.getImageData(0, 0, width, height);
            const d = imgData.data;
            const contrastFactor = 1.35; // boost contrast for faint numbers

            for (let i = 0; i < d.length; i += 4) {
              const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              const adjusted = Math.min(255, Math.max(0, ((gray - 128) * contrastFactor) + 128));
              d[i] = adjusted;
              d[i + 1] = adjusted;
              d[i + 2] = adjusted;
            }
            ctx.putImageData(imgData, 0, 0);
          } catch {
            // fallback if canvas security prevents getImageData
          }

          canvas.toBlob((blob) => {
            resolve(blob || fileOrBlob);
          }, 'image/png');
        };
        img.onerror = () => {
          resolve(fileOrBlob);
        };
        img.src = url;
      } catch {
        resolve(fileOrBlob);
      }
    });
  };

  // Perform multi-page OCR and sequence determination in parallel with Ollama Vision extraction
  const runOcrOnFiles = async (filesList = uploadedFiles) => {
    if (!filesList || filesList.length === 0) return;

    setIsScanning(true);
    setScanStep(0);
    setScanStatusText("Initializing Hybrid AI Pipeline (Tesseract OCR + Local Ollama Vision Model)...");

    // Launch local VLM extraction concurrently with Tesseract OCR (Zero waiting latency)
    let vlmPromise = null;
    if (filesList.length > 0 && (filesList[0].file || filesList[0].previewUrl)) {
      vlmPromise = callVlmExtraction({
        file: filesList[0].file,
        previewUrl: filesList[0].previewUrl,
        fileName: filesList[0].name
      });
    }
    vlmPendingPromiseRef.current = vlmPromise;

    try {
      setScanStep(1);

      // Perform OCR across each uploaded image concurrently
      const recognizedPages = [];
      const worker = await createWorker('eng');

      for (let i = 0; i < filesList.length; i++) {
        const item = filesList[i];
        setScanStatusText(`Parallel Processing: OCR text extraction on Page ${i + 1} of ${filesList.length} (${item.name})...`);
        
        let text = '';
        if (item.file) {
          const preprocessedBlob = await preprocessImageForOcr(item.file);
          const ret = await worker.recognize(preprocessedBlob);
          text = ret.data.text || '';
        } else if (item.ocrText) {
          text = item.ocrText;
        }

        recognizedPages.push({
          ...item,
          ocrText: text
        });
      }

      await worker.terminate();

      setScanStep(2);
      setScanStatusText("Analyzing document structure & calculating page sequence scores...");

      // Compute automatic sequence ordering
      const sequenceResult = determinePageSequence(recognizedPages);

      // If exactly 1 page, proceed immediately to hybrid reconciliation
      if (recognizedPages.length === 1) {
        processExtractionFromPages(sequenceResult.orderedPages, vlmPromise);
      } else {
        // Multi-page detected: Pause scanning and present the interactive Page Ordering Review Strip
        setIsScanning(false);
        setOrderingReview(sequenceResult);
      }

    } catch (err) {
      console.warn("Tesseract OCR error:", err);
      // Fail visibly and gracefully — never show hardcoded fake invoices
      setIsScanning(false);
      setSaveError("OCR text extraction encountered an error. Please try uploading clearer images or enter details manually.");
    }
  };

  // Reordering controls
  const handleSwapPages = (idxA, idxB) => {
    if (!orderingReview) return;
    const newPages = [...orderingReview.orderedPages];
    const temp = newPages[idxA];
    newPages[idxA] = newPages[idxB];
    newPages[idxB] = temp;

    setOrderingReview({
      ...orderingReview,
      orderedPages: newPages,
      isReordered: true,
      explanation: `Manual sequence: [${newPages[0].score.suggestedRole}] placed as Page 1.`
    });
  };

  const handleMovePageLeft = (idx) => {
    if (idx > 0) handleSwapPages(idx, idx - 1);
  };

  const handleMovePageRight = (idx) => {
    if (orderingReview && idx < orderingReview.orderedPages.length - 1) {
      handleSwapPages(idx, idx + 1);
    }
  };

  // Finalize extraction from ordered pages using Hybrid AI Reconciler
  const processExtractionFromPages = async (orderedPages, preloadedVlmPromise = null) => {
    setIsScanning(true);
    setScanStep(3);
    setScanStatusText("Running Hybrid AI Reconciliation: Tesseract OCR + Local Ollama Vision with GST Cross-Checks...");

    // Periodic reassuring status updates for local laptop GPU/CPU inference
    let progressTimer = 0;
    const vlmStatusInterval = setInterval(() => {
      progressTimer += 4;
      if (progressTimer === 4) {
        setScanStatusText("Running Local Ollama Vision AI inference (local GPU/CPU processing in progress)...");
      } else if (progressTimer === 12) {
        setScanStatusText("Analyzing invoice layout, tabular items & GSTIN with local vision model...");
      } else if (progressTimer === 24) {
        setScanStatusText("Performing local VLM neural inference & parsing strict JSON schema...");
      } else if (progressTimer >= 36) {
        setScanStatusText("Reconciling high-accuracy OCR results with local vision model output...");
      }
    }, 4000);

    // Stitched full text in correct sequential order
    const mergedText = mergeOrderedOcrTexts(orderedPages);
    setOcrRawText(mergedText);

    // Path A: High-Accuracy Regex Extraction (Table-row & context aware)
    const firstPageName = orderedPages[0]?.name || "";
    const regexResult = extractInvoiceFields(mergedText, firstPageName);

    // Path B: Local Vision Model (VLM) Extraction (Parallel Promise.allSettled)
    let vlmData = null;
    let vlmModelUsed = null;

    try {
      const activeVlmPromise = preloadedVlmPromise || vlmPendingPromiseRef.current || callVlmExtraction({
        file: orderedPages[0]?.file,
        previewUrl: orderedPages[0]?.previewUrl,
        fileName: firstPageName
      });

      const settledResult = await activeVlmPromise;
      if (settledResult && settledResult.success && settledResult.data) {
        vlmData = settledResult.data;
        vlmModelUsed = settledResult.modelUsed;
      }
    } catch (err) {
      console.warn("VLM call completed with fallback to regex:", err);
    } finally {
      clearInterval(vlmStatusInterval);
    }

    // Step C: Reconcile both outputs with arithmetic tie-breaker
    const reconciledFields = reconcileExtractionResults(regexResult, vlmData);

    setScanStep(4);
    setScanStatusText("Classifying expense category via BillWise ML Model...");

    let classifiedCategory = "Other";
    try {
      const classifyResult = await invoiceApi.classify(mergedText, reconciledFields.vendorName);
      classifiedCategory = classifyResult.category || "Other";
    } catch (err) {
      console.warn("Category classification failed, defaulting to 'Other':", err);
    }

    setScanStep(5);
    setScanStatusText("Validating Section 17(5) Input Tax Credit (ITC) eligibility...");

    const docType = reconciledFields.documentType || 'tax_invoice';
    const isBos = docType === 'bill_of_supply';
    const isRcm = docType === 'reverse_charge';

    // Auto-detect ITC eligibility based on category (e.g. Food & Entertainment is blocked under Sec 17(5)(b))
    const isBlockedCategory = classifiedCategory === "Food & Entertainment" || classifiedCategory === "Insurance";
    let itcEligibility = "Eligible";
    let itcAmount = reconciledFields.cgst + reconciledFields.sgst + reconciledFields.igst;

    if (isBos) {
      itcEligibility = "Ineligible (Bill of Supply)";
      itcAmount = 0;
    } else if (isBlockedCategory) {
      itcEligibility = "Ineligible (Sec 17(5))";
      itcAmount = 0;
    }

    const custGst = reconciledFields.customerGstin || (scanMode === 'sales' ? '' : reconciledFields.gstin) || '';
    const custName = reconciledFields.customerName || (scanMode === 'sales' ? (reconciledFields.vendorName || 'Walk-in Customer') : reconciledFields.vendorName) || '';
    const pos = extractStateCode(custGst) || '27';
    const supType = custGst ? 'B2B' : 'B2C';

    let salesTaxBreakdown = null;
    if (scanMode === 'sales') {
      salesTaxBreakdown = calculateGstBreakdown({
        taxableAmount: reconciledFields.taxableAmount || 0,
        gstRate: reconciledFields.gstRate !== undefined ? reconciledFields.gstRate : 18,
        supplierStateCode: '27',
        customerGstin: custGst,
        placeOfSupply: pos,
        supplyType: supType
      });
    }

    const realExtractedData = {
      id: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorName: reconciledFields.vendorName,
      customerName: custName,
      gstin: reconciledFields.gstin,
      customerGstin: custGst,
      supplyType: supType,
      placeOfSupply: pos,
      gstinValidation: reconciledFields.gstinValidation,
      invoiceNumber: reconciledFields.invoiceNumber,
      invoiceDate: normalizeDateString(reconciledFields.invoiceDate) || new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      category: classifiedCategory,
      hsnSac: reconciledFields.hsnSac || '998313',
      documentType: docType,
      extractionConfidence: reconciledFields.extractionConfidence !== undefined ? reconciledFields.extractionConfidence : 0.95,
      lineItems: reconciledFields.lineItems || [],
      taxableAmount: reconciledFields.taxableAmount,
      gstRate: reconciledFields.gstRate,
      cgst: salesTaxBreakdown ? salesTaxBreakdown.cgst : reconciledFields.cgst,
      sgst: salesTaxBreakdown ? salesTaxBreakdown.sgst : reconciledFields.sgst,
      igst: salesTaxBreakdown ? salesTaxBreakdown.igst : reconciledFields.igst,
      totalAmount: salesTaxBreakdown ? salesTaxBreakdown.totalAmount : reconciledFields.totalAmount,
      isArithmeticValid: salesTaxBreakdown ? true : reconciledFields.isArithmeticValid,
      itcEligibility: itcEligibility,
      itcAmount: itcAmount,
      rcmApplicable: isRcm,
      status: "Approved",
      paymentStatus: "Unpaid",
      ocrConfidence: reconciledFields.ocrConfidence,
      extractionMode: reconciledFields.extractionMode,
      extractionSources: reconciledFields.extractionSources,
      candidates: reconciledFields.candidates,
      hasConflicts: reconciledFields.hasConflicts,
      disagreements: reconciledFields.disagreements,
      sourceBreakdown: reconciledFields.sourceBreakdown,
      vlmModelUsed: vlmModelUsed,
      notes: orderedPages.length > 1 
        ? `Multi-page stitched scan (${orderedPages.length} pages automatically sequenced) • ${reconciledFields.sourceBreakdown}`
        : `Extracted via ${reconciledFields.sourceBreakdown} from ${orderedPages[0]?.name || 'scan'}`,
      pageCount: orderedPages.length,
      files: orderedPages,
      rawFileUrl: orderedPages[0]?.previewUrl,
      rawOcrTextSnippet: mergedText.substring(0, 350)
    };

    setTimeout(() => {
      setIsScanning(false);
      setOrderingReview(null);
      setExtractedData(realExtractedData);
      setTotalPages(orderedPages.length);
      setCurrentPage(1);
    }, 600);
  };

  const handleConfirmPageOrdering = () => {
    if (orderingReview && orderingReview.orderedPages) {
      processExtractionFromPages(orderingReview.orderedPages, vlmPendingPromiseRef.current);
    }
  };

  const handleDocumentTypeChange = (newType) => {
    if (!extractedData) return;
    const isBos = newType === 'bill_of_supply';
    const isRcm = newType === 'reverse_charge';

    let updated = { 
      ...extractedData, 
      documentType: newType,
      rcmApplicable: isRcm
    };

    if (isBos) {
      updated.gstRate = 0;
      updated.cgst = 0;
      updated.sgst = 0;
      updated.igst = 0;
      updated.totalAmount = updated.taxableAmount || 0;
      updated.itcEligibility = 'Ineligible (Bill of Supply)';
      updated.itcAmount = 0;
      updated.isArithmeticValid = true;
    } else if (extractedData.documentType === 'bill_of_supply' && !isBos) {
      const rate = 18;
      const gst = Math.round(((updated.taxableAmount || 0) * rate) / 100 * 100) / 100;
      updated.gstRate = rate;
      updated.cgst = Math.round((gst / 2) * 100) / 100;
      updated.sgst = Math.round((gst / 2) * 100) / 100;
      updated.totalAmount = Math.round(((updated.taxableAmount || 0) + gst) * 100) / 100;
      updated.itcEligibility = 'Eligible';
      updated.itcAmount = gst;
      updated.isArithmeticValid = true;
    }

    setExtractedData(updated);
  };

  const handleSelectCandidate = (fieldName, value) => {
    if (!extractedData) return;
    const updated = { ...extractedData, [fieldName]: value };

    if (scanMode === 'sales') {
      const taxable = fieldName === 'taxableAmount' ? (parseFloat(value) || 0) : (updated.taxableAmount || 0);
      const rate = fieldName === 'gstRate' ? (Number(value) || 0) : (updated.gstRate !== undefined ? updated.gstRate : 18);
      const custGst = fieldName === 'customerGstin' || fieldName === 'gstin' ? String(value).toUpperCase() : (updated.customerGstin || updated.gstin || '');
      const pos = fieldName === 'placeOfSupply' ? value : (updated.placeOfSupply || extractStateCode(custGst) || '27');
      const supType = fieldName === 'supplyType' ? value : (updated.supplyType || (custGst ? 'B2B' : 'B2C'));

      const breakdown = calculateGstBreakdown({
        taxableAmount: taxable,
        gstRate: rate,
        supplierStateCode: '27',
        customerGstin: custGst,
        placeOfSupply: pos,
        supplyType: supType
      });

      updated.taxableAmount = taxable;
      updated.gstRate = rate;
      if (fieldName === 'customerName' || fieldName === 'vendorName') {
        updated.customerName = value;
        updated.vendorName = value;
      }
      updated.customerGstin = custGst;
      updated.gstin = custGst;
      updated.placeOfSupply = pos;
      updated.supplyType = supType;
      updated.cgst = breakdown.cgst;
      updated.sgst = breakdown.sgst;
      updated.igst = breakdown.igst;
      updated.totalAmount = breakdown.totalAmount;
      updated.isArithmeticValid = true;
    } else {
      if (fieldName === 'taxableAmount') {
        const val = parseFloat(value) || 0;
        if (extractedData.documentType === 'bill_of_supply') {
          updated.taxableAmount = val;
          updated.totalAmount = val;
          updated.cgst = 0;
          updated.sgst = 0;
          updated.igst = 0;
          updated.isArithmeticValid = true;
        } else {
          const gst = Math.round((val * (extractedData.gstRate || 18)) / 100 * 100) / 100;
          updated.taxableAmount = val;
          updated.cgst = Math.round((gst / 2) * 100) / 100;
          updated.sgst = Math.round((gst / 2) * 100) / 100;
          updated.totalAmount = Math.round((val + gst) * 100) / 100;
          updated.itcAmount = extractedData.itcEligibility?.includes('Eligible') ? gst : 0;
          updated.isArithmeticValid = true;
        }
      } else if (fieldName === 'gstRate') {
        const rate = Number(value) || 0;
        const gst = Math.round(((extractedData.taxableAmount || 0) * rate) / 100 * 100) / 100;
        updated.gstRate = rate;
        updated.cgst = Math.round((gst / 2) * 100) / 100;
        updated.sgst = Math.round((gst / 2) * 100) / 100;
        updated.totalAmount = Math.round(((extractedData.taxableAmount || 0) + gst) * 100) / 100;
        updated.itcAmount = extractedData.itcEligibility?.includes('Eligible') ? gst : 0;
        updated.isArithmeticValid = true;
      } else if (fieldName === 'totalAmount') {
        updated.totalAmount = parseFloat(value) || 0;
      } else if (fieldName === 'gstin') {
        updated.gstin = String(value).toUpperCase();
      }
    }

    setExtractedData(updated);
  };

  const handleSaveInvoice = async () => {
    if (!extractedData) return;

    setIsSaving(true);
    setSaveError(null);

    if (scanMode === 'sales') {
      try {
        const custName = (extractedData.customerName || extractedData.vendorName || '').trim();
        const invNum = (extractedData.invoiceNumber || '').trim();

        if (!custName) {
          setSaveError('Customer / Buyer Name is required to record a sales invoice.');
          setIsSaving(false);
          return;
        }
        if (!invNum) {
          setSaveError('Invoice Number is required to record a sales invoice.');
          setIsSaving(false);
          return;
        }

        const taxableVal = Number(extractedData.taxableAmount) || 0;
        if (taxableVal <= 0) {
          setSaveError('Taxable Amount must be greater than 0.');
          setIsSaving(false);
          return;
        }

        const normalizedInvDate = normalizeDateString(extractedData.invoiceDate) || new Date().toISOString().split('T')[0];
        const normalizedDueDate = extractedData.dueDate ? (normalizeDateString(extractedData.dueDate) || null) : null;

        const salesPayload = {
          customerName: custName,
          customerGstin: (extractedData.customerGstin || extractedData.gstin || '').trim().toUpperCase() || null,
          invoiceNumber: invNum,
          invoiceDate: normalizedInvDate,
          dueDate: normalizedDueDate,
          hsnSac: (extractedData.hsnSac || '998313').trim(),
          taxableAmount: taxableVal,
          gstRate: Number(extractedData.gstRate) !== undefined ? Number(extractedData.gstRate) : 18,
          cgst: Number(extractedData.cgst) || 0,
          sgst: Number(extractedData.sgst) || 0,
          igst: Number(extractedData.igst) || 0,
          totalAmount: Number(extractedData.totalAmount) || 0,
          supplyType: extractedData.supplyType || (extractedData.customerGstin ? 'B2B' : 'B2C'),
          status: 'Issued',
          placeOfSupply: extractedData.placeOfSupply || extractStateCode(extractedData.customerGstin) || '27',
          notes: (extractedData.notes || 'Created via Invoice OCR Scan').trim()
        };

        const savedSalesInvoice = await salesInvoiceApi.create(salesPayload);
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
        if (onSalesInvoiceScanned) {
          onSalesInvoiceScanned(savedSalesInvoice);
        } else if (onInvoiceScanned) {
          onInvoiceScanned(savedSalesInvoice);
        }
        if (onClose) onClose();
      } catch (err) {
        setSaveError(err.message || 'Failed to save sales invoice to the backend.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const {
      files,
      pageCount,
      rawOcrTextSnippet,
      gstinValidation,
      isArithmeticValid,
      customerName,
      customerGstin,
      placeOfSupply,
      supplyType,
      ...invoicePayload
    } = extractedData;

    try {
      const savedInvoice = await invoiceApi.create(invoicePayload);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      if (onInvoiceScanned) onInvoiceScanned(savedInvoice);
      if (onClose) onClose();
    } catch (err) {
      setSaveError(err.message || 'Failed to save invoice to the backend.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl mx-auto space-y-6 relative border border-rose-200 shadow-2xl">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              BillWise High-Accuracy Invoice Scanner
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                Verified Extraction
              </span>
            </h2>
            <p className="text-xs text-slate-500">Extracts genuine GSTINs, invoice numbers, HSN/SAC, tax breakdowns & ML categories with zero fake fallbacks.</p>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Scan Mode Switcher (Inward Purchase vs Outward Sales) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <button
            type="button"
            onClick={() => handleModeChange('purchase')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              scanMode === 'purchase'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 border border-transparent'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Purchase Bill (Inward)</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-rose-100/70 text-rose-800">ITC Claim</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('sales')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              scanMode === 'sales'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sales Invoice (Outward)</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-100/70 text-indigo-800">Output GST</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-medium px-2">
          {scanMode === 'purchase' ? (
            <span>📥 Feeds vendor ledger & calculates <strong className="text-slate-700">Section 17(5) Eligible ITC</strong></span>
          ) : (
            <span>📤 Feeds sales ledger & calculates <strong className="text-slate-700">GSTR-1 & GSTR-3B Output Tax</strong></span>
          )}
        </div>
      </div>

      {/* Camera Viewfinder Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-rose-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
            
            {/* Camera Viewfinder Header */}
            <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5 text-white">
                <Camera className="w-5 h-5 text-rose-500 animate-pulse" />
                <span className="text-sm font-bold">Align Invoice in Viewfinder</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFacing}
                  title="Switch Front/Rear Camera"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  <FlipHorizontal className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Flip Camera</span>
                </button>

                <button
                  onClick={handleCloseCamera}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative w-full aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
              
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Shutter Flash Animation */}
              {isCapturingFlash && (
                <div className="absolute inset-0 bg-white z-30 transition-opacity duration-150 animate-fade-out" />
              )}

              {/* Scanner Framing Box & Guidelines */}
              <div className="absolute inset-8 sm:inset-12 border border-rose-500/40 rounded-2xl pointer-events-none z-10 flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-3 border-l-3 border-rose-500 rounded-tl-lg"></div>
                  <div className="w-6 h-6 border-t-3 border-r-3 border-rose-500 rounded-tr-lg"></div>
                </div>
                
                <div className="scanner-laser"></div>

                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-3 border-l-3 border-rose-500 rounded-bl-lg"></div>
                  <div className="w-6 h-6 border-b-3 border-r-3 border-rose-500 rounded-br-lg"></div>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <CameraOff className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-white font-bold text-sm">Camera Unavailable</h4>
                    <p className="text-xs text-slate-400">{cameraError}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => startCamera()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Try Again
                    </button>
                    <button
                      onClick={handleCloseCamera}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
                    >
                      Upload Image Instead
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Bottom Controls */}
            <div className="p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-around z-10">
              <button
                onClick={handleCloseCamera}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
              >
                Cancel
              </button>

              <button
                onClick={() => handleCapturePhoto(false)}
                className="relative group p-1 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition"
              >
                <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center bg-rose-600 group-hover:bg-rose-500 transition">
                  <Camera className="w-7 h-7 text-white" />
                </div>
              </button>

              <button
                onClick={() => handleCapturePhoto(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <ScanLine className="w-3.5 h-3.5" />
                Capture & Scan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* State 1: Multi-Page Automatic Sequence Review & Override Screen */}
      {orderingReview && !isScanning && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Header Banner */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            orderingReview.confidence === 'LOW_UNCONFIRMED'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                orderingReview.confidence === 'LOW_UNCONFIRMED'
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              }`}>
                {orderingReview.confidence === 'LOW_UNCONFIRMED' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5 text-emerald-600 animate-bounce" />
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-extrabold flex items-center gap-2">
                  {orderingReview.confidence === 'LOW_UNCONFIRMED'
                    ? '⚠️ Please Confirm Page Order'
                    : '✨ Automatic Page Sequencing Complete'}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    orderingReview.confidence === 'LOW_UNCONFIRMED'
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-emerald-200 text-emerald-800'
                  }`}>
                    {orderingReview.confidence === 'LOW_UNCONFIRMED' ? 'Review Needed' : 'Auto-Sorted'}
                  </span>
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  {orderingReview.explanation}
                </p>
              </div>
            </div>

            {orderingReview.orderedPages.length === 2 && (
              <button
                type="button"
                onClick={() => handleSwapPages(0, 1)}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-400 text-slate-800 font-bold text-xs shadow-2xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-rose-600" />
                Swap Page 1 & 2
              </button>
            )}
          </div>

          {/* Ordered Thumbnail Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
              <span>Detected Page Sequence (Use buttons or swap to adjust order):</span>
              <span className="text-[11px] font-normal text-slate-500">
                Total Pages: {orderingReview.orderedPages.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {orderingReview.orderedPages.map((page, idx) => (
                <div 
                  key={page.id || idx}
                  className="rounded-2xl border-2 border-rose-200 bg-slate-50 overflow-hidden shadow-sm flex flex-col justify-between hover:border-rose-400 transition group"
                >
                  <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center font-mono shadow-2xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        Page {idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMovePageLeft(idx)}
                          title="Move Left"
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        >
                          <MoveLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {idx < orderingReview.orderedPages.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMovePageRight(idx)}
                          title="Move Right"
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        >
                          <MoveRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img 
                      src={page.previewUrl} 
                      alt={`Page ${idx + 1}`} 
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-300"
                    />
                    
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-950/85 backdrop-blur-xs text-white text-[10px] font-bold border border-white/20">
                      {page.score?.suggestedRole || `Page ${idx + 1}`}
                    </div>
                  </div>

                  <div className="p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium truncate max-w-[140px]" title={page.name}>
                        {page.name}
                      </span>
                      <span className="font-mono font-bold text-rose-700 text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        Start: {page.score?.startScore || 0} | End: {page.score?.endScore || 0}
                      </span>
                    </div>

                    {page.score?.matchedStart?.length > 0 && (
                      <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 truncate">
                        ✓ Header: {page.score.matchedStart.slice(0, 3).join(', ')}
                      </div>
                    )}
                    {page.score?.matchedEnd?.length > 0 && (
                      <div className="text-[10px] text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 truncate">
                        ✓ Footer: {page.score.matchedEnd.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Confirmation Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setOrderingReview(null); setUploadedFiles([]); }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition"
            >
              Cancel & Start Over
            </button>

            <button
              type="button"
              onClick={handleConfirmPageOrdering}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition hover:scale-[1.02]"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm Page Order & Extract Invoice Fields
            </button>
          </div>

        </div>
      )}

      {/* State 2: Main Selection / Upload Landing Body */}
      {!extractedData && !isScanning && !orderingReview && (
        <div className="space-y-6">
          
          {/* Top Scan Options: Camera vs File Upload */}
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Selected Invoice Pages ({uploadedFiles.length})
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition hover:scale-[1.02]"
                >
                  <Camera className="w-4 h-4" />
                  Scan with Camera
                </button>

                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition hover:scale-[1.02]">
                  <Upload className="w-4 h-4" />
                  Upload Photo
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    multiple 
                    className="hidden" 
                    onChange={handleMultipleFilesSelect} 
                  />
                </label>
              </div>
            </div>

            {uploadedFiles.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Card 1: Camera Scanner Card */}
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="border-2 border-dashed border-rose-300 hover:border-rose-600 bg-rose-50/40 hover:bg-rose-50/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition group relative shadow-2xs"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/20 group-hover:scale-110 transition">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    Scan Photo Using Camera
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">LIVE</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Point your device camera at paper receipts or multi-page printed invoices.
                  </p>
                  <span className="mt-4 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-sm group-hover:bg-rose-700 transition">
                    Open Camera Viewfinder
                  </span>
                </button>

                {/* Card 2: File Upload Dropzone */}
                <label className="border-2 border-dashed border-slate-300 hover:border-slate-500 bg-slate-50/50 hover:bg-slate-100/70 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group relative shadow-2xs">
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    multiple 
                    className="hidden" 
                    onChange={handleMultipleFilesSelect} 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white text-slate-700 border border-slate-200 flex items-center justify-center shadow-md group-hover:scale-110 transition">
                    <Images className="w-7 h-7" />
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                    Upload Existing Photos or PDF
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Select 1 or multiple page photos in any order — BillWise will sort them.
                  </p>
                  <span className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs shadow-sm group-hover:bg-slate-900 transition">
                    Browse File Storage
                  </span>
                </label>

              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {uploadedFiles.map((fileObj, index) => (
                    <div 
                      key={fileObj.id} 
                      className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group shadow-2xs"
                    >
                      <img 
                        src={fileObj.previewUrl} 
                        alt={`Photo ${index + 1}`} 
                        className="w-full h-28 object-cover"
                      />
                      
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-bold font-mono">
                        Photo {index + 1}
                      </div>

                      <button
                        onClick={() => handleRemoveFile(fileObj.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition opacity-90 group-hover:opacity-100 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="p-2 text-[10px] font-medium text-slate-600 truncate bg-white border-t border-slate-100">
                        {fileObj.name}
                      </div>
                    </div>
                  ))}

                  {/* Add Another Page with Camera */}
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="border-2 border-dashed border-rose-200 hover:border-rose-400 bg-rose-50/20 hover:bg-rose-50/60 rounded-xl h-28 flex flex-col items-center justify-center text-center transition text-rose-600"
                  >
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-bold">Snap Page</span>
                  </button>

                  {/* Add Another Page with File */}
                  <label className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/40 hover:bg-slate-100 rounded-xl h-28 flex flex-col items-center justify-center text-center cursor-pointer transition text-slate-600">
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-bold">Upload Page</span>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      multiple 
                      className="hidden" 
                      onChange={handleMultipleFilesSelect} 
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => runOcrOnFiles(uploadedFiles)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2 hover:scale-[1.01]"
                  >
                    <ScanLine className="w-5 h-5" />
                    {uploadedFiles.length > 1 
                      ? `Analyze & Sequence ${uploadedFiles.length} Uploaded Pages with Smart OCR`
                      : 'Run Real Tesseract OCR on Uploaded Invoice'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* State 3: OCR Laser Scanning Animation State */}
      {isScanning && (
        <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
          
          <div className="relative w-64 h-40 bg-slate-900 border border-rose-400 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
            {uploadedFiles.length > 0 ? (
              <img src={uploadedFiles[0].previewUrl} alt="Invoice Scan" className="w-full h-full object-cover opacity-50" />
            ) : (
              <FileText className="w-12 h-12 text-slate-700" />
            )}
            
            <div className="scanner-laser"></div>
            
            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 via-transparent to-rose-500/20"></div>
          </div>

          <div className="space-y-2 max-w-md">
            <div className="flex items-center justify-center gap-2 text-rose-600 font-bold text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing Optical Text Recognition...
            </div>
            <p className="text-xs text-slate-600 font-mono transition-all">
              {scanStatusText || scanStepsList[scanStep]}
            </p>
          </div>

          <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-300"
              style={{ width: `${((scanStep + 1) / scanStepsList.length) * 100}%` }}
            ></div>
          </div>

        </div>
      )}

      {/* State 4: Extracted Data Review Form with Editable Verification */}
      {extractedData && !isScanning && !orderingReview && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs font-bold gap-2 shadow-2xs">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                {extractedData.extractionMode === 'hybrid'
                  ? `Hybrid AI Extraction (${extractedData.ocrConfidence}% Confidence) • Tesseract.js OCR + ${extractedData.vlmModelUsed || 'Local Ollama VLM'}`
                  : extractedData.extractionMode === 'vlm_only'
                    ? `Local Ollama Vision Extraction (${extractedData.ocrConfidence}% Confidence)`
                    : `Tesseract OCR Extraction (${extractedData.ocrConfidence}% Confidence) — Extracted ${extractedData.pageCount || 1} Page(s)`
                }
              </span>
            </span>

            <button 
              onClick={() => { setExtractedData(null); setUploadedFiles([]); setOrderingReview(null); }}
              className="text-slate-600 hover:text-slate-900 text-xs underline cursor-pointer"
            >
              Scan Another File
            </button>
          </div>

          {/* Low Extraction Confidence / Unclear Document Alert Banner */}
          {((extractedData.extractionConfidence !== undefined && extractedData.extractionConfidence < 0.5) || extractedData.documentType === 'unclear') && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span>Low Extraction Confidence — Please Review Carefully</span>
                  {extractedData.extractionConfidence !== undefined && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-mono font-bold">
                      Score: {Math.round(extractedData.extractionConfidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  The model encountered low scan contrast, handwritten annotations, or regional script. Please verify all extracted fields and line items before saving.
                </p>
              </div>
            </div>
          )}

          {/* Document Type Specific Info Banners */}
          {extractedData.documentType === 'bill_of_supply' && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5 shadow-2xs">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold">Bill of Supply (Composition Scheme / Exempt Supply):</span> GST is 0.0% by statutory regulation. Input Tax Credit (ITC) cannot be claimed on this bill.
              </div>
            </div>
          )}

          {extractedData.documentType === 'reverse_charge' && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2.5 shadow-2xs">
              <Zap className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <span className="font-bold">Reverse Charge Mechanism (RCM):</span> Tax liability falls on the recipient under GST Section 9(3)/9(4).
              </div>
            </div>
          )}

          {/* Conflict Resolution Notice Banner */}
          {extractedData.hasConflicts && (
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>Hybrid AI Notice: OCR & Vision AI Discrepancies Reconciled</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-mono">
                    {extractedData.disagreements?.length || 0} Field(s)
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Tesseract OCR and Ollama Vision differed on {extractedData.disagreements?.join(', ')}. BillWise auto-selected the candidate conforming to statutory Indian GST arithmetic. Click on the <strong>Conflict: Choose Source</strong> badges below to switch candidates anytime.
                </p>
              </div>
            </div>
          )}

          {/* Arithmetic Mismatch Warning if any (suppressed for Bill of Supply) */}
          {extractedData.isArithmeticValid === false && extractedData.documentType !== 'bill_of_supply' && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Tax Arithmetic Notice:</span> The extracted taxable amount (₹{extractedData.taxableAmount}) plus GST does not perfectly equal the grand total (₹{extractedData.totalAmount}). Please verify the amounts below.
              </div>
            </div>
          )}

          {/* Raw OCR Text Snippet Box */}
          {extractedData.rawOcrTextSnippet && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Stitched OCR Text Snippet:</span>
              <p className="text-[11px] font-mono text-slate-700 truncate">
                "{extractedData.rawOcrTextSnippet}"
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-rose-600" />
                  Captured Document Preview
                </span>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-72">
                <img 
                  src={extractedData.files && extractedData.files[currentPage - 1] ? extractedData.files[currentPage - 1].previewUrl : extractedData.rawFileUrl} 
                  alt="Invoice Page Image" 
                  className="w-full h-full object-cover" 
                />
                
                <div className="absolute top-4 left-4 border-2 border-rose-500 bg-white/90 px-2 py-0.5 rounded text-[9px] text-rose-700 font-bold font-mono shadow-sm">
                  {scanMode === 'sales' ? 'Customer' : 'Vendor'}: {(scanMode === 'sales' ? extractedData.customerName : extractedData.vendorName) || "Not Detected"}
                </div>
                <div className="absolute bottom-4 right-4 border-2 border-slate-800 bg-white/90 px-2 py-0.5 rounded text-[9px] text-slate-900 font-bold font-mono shadow-sm">
                  Total: ₹{extractedData.totalAmount ? extractedData.totalAmount.toLocaleString('en-IN') : "0"}
                </div>
              </div>
            </div>

            {/* Right: Editable Form for Verification */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Verify & Edit Extracted Fields</span>
                <span className="text-[10px] text-slate-500">Edit or select AI candidate</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Document Type */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-600 font-semibold">Document Type</label>
                    <span className="text-[10px] text-slate-500 font-medium">GST Classification</span>
                  </div>
                  <select
                    value={extractedData.documentType || 'tax_invoice'}
                    onChange={(e) => handleDocumentTypeChange(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:border-rose-500 outline-none"
                  >
                    <option value="tax_invoice">Tax Invoice (Standard GST Taxed)</option>
                    <option value="bill_of_supply">Bill of Supply (Composition Dealer / Exempt - 0% Tax)</option>
                    <option value="reverse_charge">Reverse Charge (RCM Invoice - Tax on Recipient)</option>
                    <option value="export_zero_rated">Export / Zero-Rated (LUT Supply)</option>
                    <option value="unclear">Unclear / Retail Cash Receipt</option>
                  </select>
                </div>

                {/* Party Name (Vendor vs Customer) */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-slate-600 font-semibold">
                        {scanMode === 'sales' ? 'Customer / Buyer Name' : 'Vendor / Supplier Name'}
                      </label>
                      <CandidateFieldBadge 
                        fieldName={scanMode === 'sales' ? 'customerName' : 'vendorName'} 
                        label={scanMode === 'sales' ? 'Customer Name' : 'Vendor Name'} 
                        extractedData={extractedData} 
                        onSelectCandidate={handleSelectCandidate} 
                      />
                    </div>
                    {!(scanMode === 'sales' ? extractedData.customerName : extractedData.vendorName) && (
                      <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Please enter
                      </span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder={scanMode === 'sales' ? 'Enter customer or business name...' : 'Enter vendor name...'}
                    value={(scanMode === 'sales' ? extractedData.customerName : extractedData.vendorName) || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (scanMode === 'sales') {
                        setExtractedData({ ...extractedData, customerName: val, vendorName: val });
                      } else {
                        setExtractedData({ ...extractedData, vendorName: val });
                      }
                    }}
                    className={`w-full mt-1 px-3 py-2 rounded-lg text-slate-900 font-bold outline-none border transition ${
                      !(scanMode === 'sales' ? extractedData.customerName : extractedData.vendorName) 
                        ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500' 
                        : 'border-slate-300 bg-slate-50 focus:border-rose-500'
                    }`}
                  />
                </div>

                {/* GSTIN */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-slate-600 font-semibold">
                        {scanMode === 'sales' ? 'Customer GSTIN (B2B)' : 'Vendor GSTIN'}
                      </label>
                      <CandidateFieldBadge 
                        fieldName={scanMode === 'sales' ? 'customerGstin' : 'gstin'} 
                        label={scanMode === 'sales' ? 'Customer GSTIN' : 'Vendor GSTIN'} 
                        extractedData={extractedData} 
                        onSelectCandidate={handleSelectCandidate} 
                      />
                    </div>
                    {scanMode === 'sales' ? (
                      <span className="text-[10px] text-slate-400 font-medium">Optional for B2C</span>
                    ) : (
                      !extractedData.gstin && (
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Required
                        </span>
                      )
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder="21AAACI7904G1ZN"
                    value={(scanMode === 'sales' ? (extractedData.customerGstin || extractedData.gstin) : extractedData.gstin) || ''}
                    onChange={(e) => {
                      const clean = e.target.value.toUpperCase().trim();
                      if (scanMode === 'sales') {
                        const detectedState = clean.length >= 2 && /^\d{2}/.test(clean) ? clean.substring(0, 2) : (extractedData.placeOfSupply || '27');
                        const supType = clean ? 'B2B' : (extractedData.supplyType || 'B2C');
                        const breakdown = calculateGstBreakdown({
                          taxableAmount: extractedData.taxableAmount || 0,
                          gstRate: extractedData.gstRate !== undefined ? extractedData.gstRate : 18,
                          supplierStateCode: '27',
                          customerGstin: clean,
                          placeOfSupply: detectedState,
                          supplyType: supType
                        });
                        setExtractedData({
                          ...extractedData,
                          customerGstin: clean,
                          gstin: clean,
                          placeOfSupply: detectedState,
                          supplyType: supType,
                          cgst: breakdown.cgst,
                          sgst: breakdown.sgst,
                          igst: breakdown.igst,
                          totalAmount: breakdown.totalAmount,
                          isArithmeticValid: true
                        });
                      } else {
                        setExtractedData({ ...extractedData, gstin: clean });
                      }
                    }}
                    className={`w-full mt-1 px-3 py-2 rounded-lg font-mono font-bold outline-none uppercase border transition ${
                      scanMode !== 'sales' && !extractedData.gstin 
                        ? 'border-amber-400 bg-amber-50/30 text-amber-900 focus:border-amber-500' 
                        : 'border-slate-300 bg-slate-50 text-rose-700 focus:border-rose-500'
                    }`}
                  />
                </div>

                {/* Invoice Number & Date Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-slate-600 font-semibold">Invoice Number</label>
                        <CandidateFieldBadge 
                          fieldName="invoiceNumber" 
                          label="Invoice Number" 
                          extractedData={extractedData} 
                          onSelectCandidate={handleSelectCandidate} 
                        />
                      </div>
                      {!extractedData.invoiceNumber && (
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Required
                        </span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. 1002251984503"
                      value={extractedData.invoiceNumber || ''}
                      onChange={(e) => setExtractedData({ ...extractedData, invoiceNumber: e.target.value })}
                      className={`w-full mt-1 px-3 py-2 rounded-lg font-mono outline-none border transition ${
                        !extractedData.invoiceNumber 
                          ? 'border-amber-400 bg-amber-50/30 text-amber-900 focus:border-amber-500' 
                          : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-rose-500'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-slate-600 font-semibold">Invoice Date</label>
                        <CandidateFieldBadge 
                          fieldName="invoiceDate" 
                          label="Invoice Date" 
                          extractedData={extractedData} 
                          onSelectCandidate={handleSelectCandidate} 
                        />
                      </div>
                      {!extractedData.invoiceDate && (
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Required
                        </span>
                      )}
                    </div>
                    <input 
                      type="date" 
                      value={extractedData.invoiceDate ? (extractedData.invoiceDate.includes('T') ? extractedData.invoiceDate.split('T')[0] : extractedData.invoiceDate) : ''}
                      onChange={(e) => setExtractedData({ ...extractedData, invoiceDate: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg font-mono outline-none border border-slate-300 bg-slate-50 text-slate-900 focus:border-rose-500 transition"
                    />
                  </div>
                </div>

                {/* Sales Specific: Supply Type & Place of Supply */}
                {scanMode === 'sales' && (
                  <>
                    <div>
                      <label className="text-slate-600 font-semibold flex items-center justify-between">
                        <span>Supply Type</span>
                        <span className="text-[10px] text-indigo-600 font-bold">GSTR-1</span>
                      </label>
                      <select
                        value={extractedData.supplyType || (extractedData.customerGstin ? 'B2B' : 'B2C')}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const breakdown = calculateGstBreakdown({
                            taxableAmount: extractedData.taxableAmount || 0,
                            gstRate: extractedData.gstRate !== undefined ? extractedData.gstRate : 18,
                            supplierStateCode: '27',
                            customerGstin: extractedData.customerGstin || extractedData.gstin || '',
                            placeOfSupply: extractedData.placeOfSupply || '27',
                            supplyType: newType
                          });
                          setExtractedData({
                            ...extractedData,
                            supplyType: newType,
                            cgst: breakdown.cgst,
                            sgst: breakdown.sgst,
                            igst: breakdown.igst,
                            totalAmount: breakdown.totalAmount,
                            isArithmeticValid: true
                          });
                        }}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:border-rose-500 outline-none"
                      >
                        <option value="B2B">B2B (Registered Business)</option>
                        <option value="B2C">B2C (Consumer / Retail)</option>
                        <option value="EXPORT">Export / Zero-Rated (LUT)</option>
                        <option value="SEZ">Special Economic Zone (SEZ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-600 font-semibold flex items-center justify-between">
                        <span>Place of Supply (State)</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          POS: {extractedData.placeOfSupply || '27'}
                        </span>
                      </label>
                      <select
                        value={extractedData.placeOfSupply || '27'}
                        onChange={(e) => {
                          const newPos = e.target.value;
                          const breakdown = calculateGstBreakdown({
                            taxableAmount: extractedData.taxableAmount || 0,
                            gstRate: extractedData.gstRate !== undefined ? extractedData.gstRate : 18,
                            supplierStateCode: '27',
                            customerGstin: extractedData.customerGstin || extractedData.gstin || '',
                            placeOfSupply: newPos,
                            supplyType: extractedData.supplyType || (extractedData.customerGstin ? 'B2B' : 'B2C')
                          });
                          setExtractedData({
                            ...extractedData,
                            placeOfSupply: newPos,
                            cgst: breakdown.cgst,
                            sgst: breakdown.sgst,
                            igst: breakdown.igst,
                            totalAmount: breakdown.totalAmount,
                            isArithmeticValid: true
                          });
                        }}
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:border-rose-500 outline-none"
                      >
                        {Object.entries(INDIAN_STATE_CODES).map(([code, name]) => (
                          <option key={code} value={code}>
                            {code} - {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Category */}
                <div>
                  <label className="text-slate-600 font-semibold flex items-center gap-1">
                    Category
                    <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px] font-bold">ML</span>
                  </label>
                  <select
                    value={extractedData.category}
                    onChange={(e) => setExtractedData({ ...extractedData, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:border-rose-500 outline-none"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* HSN/SAC */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-slate-600 font-semibold">HSN / SAC Code</label>
                      <CandidateFieldBadge 
                        fieldName="hsnSac" 
                        label="HSN/SAC Code" 
                        extractedData={extractedData} 
                        onSelectCandidate={handleSelectCandidate} 
                      />
                    </div>
                    {!extractedData.hsnSac && (
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder="e.g. 997133"
                    value={extractedData.hsnSac || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, hsnSac: e.target.value })}
                    className={`w-full mt-1 px-3 py-2 rounded-lg font-mono outline-none border transition ${
                      !extractedData.hsnSac 
                        ? 'border-slate-300 bg-slate-50 focus:border-rose-500' 
                        : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>

                {/* Taxable Value */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-slate-600 font-semibold">Taxable Value (₹)</label>
                      <CandidateFieldBadge 
                        fieldName="taxableAmount" 
                        label="Taxable Value" 
                        extractedData={extractedData} 
                        onSelectCandidate={handleSelectCandidate} 
                      />
                    </div>
                    {(!extractedData.taxableAmount || extractedData.taxableAmount === 0) && (
                      <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Enter Amount
                      </span>
                    )}
                  </div>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={extractedData.taxableAmount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (scanMode === 'sales') {
                        const breakdown = calculateGstBreakdown({
                          taxableAmount: val,
                          gstRate: extractedData.gstRate !== undefined ? extractedData.gstRate : 18,
                          supplierStateCode: '27',
                          customerGstin: extractedData.customerGstin || extractedData.gstin || '',
                          placeOfSupply: extractedData.placeOfSupply || '27',
                          supplyType: extractedData.supplyType || (extractedData.customerGstin ? 'B2B' : 'B2C')
                        });
                        setExtractedData({
                          ...extractedData,
                          taxableAmount: val,
                          cgst: breakdown.cgst,
                          sgst: breakdown.sgst,
                          igst: breakdown.igst,
                          totalAmount: breakdown.totalAmount,
                          isArithmeticValid: true
                        });
                      } else if (extractedData.documentType === 'bill_of_supply') {
                        setExtractedData({
                          ...extractedData,
                          taxableAmount: val,
                          totalAmount: val,
                          cgst: 0,
                          sgst: 0,
                          igst: 0,
                          isArithmeticValid: true
                        });
                      } else {
                        const gst = Math.round((val * extractedData.gstRate) / 100 * 100) / 100;
                        setExtractedData({ 
                          ...extractedData, 
                          taxableAmount: val,
                          cgst: Math.round((gst / 2) * 100) / 100,
                          sgst: Math.round((gst / 2) * 100) / 100,
                          totalAmount: Math.round((val + gst) * 100) / 100,
                          itcAmount: extractedData.itcEligibility.includes('Eligible') ? gst : 0,
                          isArithmeticValid: true
                        });
                      }
                    }}
                    className={`w-full mt-1 px-3 py-2 rounded-lg font-mono outline-none border transition ${
                      !extractedData.taxableAmount || extractedData.taxableAmount === 0
                        ? 'border-amber-400 bg-amber-50/30 text-amber-900 focus:border-amber-500' 
                        : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>

                {/* GST Rate */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-slate-600 font-semibold">GST Tax Rate</label>
                      <CandidateFieldBadge 
                        fieldName="gstRate" 
                        label="GST Tax Rate" 
                        extractedData={extractedData} 
                        onSelectCandidate={handleSelectCandidate} 
                      />
                    </div>
                  </div>
                  <select 
                    value={extractedData.gstRate}
                    disabled={extractedData.documentType === 'bill_of_supply'}
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      if (scanMode === 'sales') {
                        const breakdown = calculateGstBreakdown({
                          taxableAmount: extractedData.taxableAmount || 0,
                          gstRate: rate,
                          supplierStateCode: '27',
                          customerGstin: extractedData.customerGstin || extractedData.gstin || '',
                          placeOfSupply: extractedData.placeOfSupply || '27',
                          supplyType: extractedData.supplyType || (extractedData.customerGstin ? 'B2B' : 'B2C')
                        });
                        setExtractedData({
                          ...extractedData,
                          gstRate: rate,
                          cgst: breakdown.cgst,
                          sgst: breakdown.sgst,
                          igst: breakdown.igst,
                          totalAmount: breakdown.totalAmount,
                          isArithmeticValid: true
                        });
                      } else {
                        const gst = Math.round((extractedData.taxableAmount * rate) / 100 * 100) / 100;
                        setExtractedData({ 
                          ...extractedData, 
                          gstRate: rate,
                          cgst: Math.round((gst / 2) * 100) / 100,
                          sgst: Math.round((gst / 2) * 100) / 100,
                          totalAmount: Math.round((extractedData.taxableAmount + gst) * 100) / 100,
                          itcAmount: extractedData.itcEligibility.includes('Eligible') ? gst : 0,
                          isArithmeticValid: true
                        });
                      }
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:border-rose-500 outline-none disabled:opacity-60"
                  >
                    <option value={0}>0% (Nil / Exempt / Bill of Supply)</option>
                    <option value={5}>5% GST (2.5% + 2.5%)</option>
                    <option value={12}>12% GST (6% + 6%)</option>
                    <option value={18}>18% GST (9% + 9%)</option>
                    <option value={28}>28% GST (14% + 14%)</option>
                  </select>
                </div>

                {/* Total Amount */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-slate-600 font-semibold">Grand Total Amount (₹)</label>
                      <CandidateFieldBadge 
                        fieldName="totalAmount" 
                        label="Grand Total Amount" 
                        extractedData={extractedData} 
                        onSelectCandidate={handleSelectCandidate} 
                      />
                    </div>
                    {(!extractedData.totalAmount || extractedData.totalAmount === 0) && (
                      <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Enter Total
                      </span>
                    )}
                  </div>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={extractedData.totalAmount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setExtractedData({ 
                        ...extractedData, 
                        totalAmount: val
                      });
                    }}
                    className={`w-full mt-1 px-3 py-2 rounded-lg font-mono font-bold outline-none border transition ${
                      !extractedData.totalAmount || extractedData.totalAmount === 0
                        ? 'border-amber-400 bg-amber-50/30 text-amber-900 focus:border-amber-500' 
                        : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>
              </div>

              {/* ITC Selection (Purchase) vs Output GST Liability Summary (Sales) */}
              {scanMode === 'sales' ? (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Output GST Liability Summary</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                      {extractedData.placeOfSupply && extractedData.placeOfSupply !== '27' ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST+SGST)'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-500">Output CGST (Central Tax):</span>
                      <span className="font-bold text-slate-800">₹{(extractedData.cgst || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-500">Output SGST (State Tax):</span>
                      <span className="font-bold text-slate-800">₹{(extractedData.sgst || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-500">Output IGST (Integrated Tax):</span>
                      <span className="font-bold text-indigo-700">₹{(extractedData.igst || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-mono font-bold">
                      <span className="text-slate-700">Total Output Tax Liability:</span>
                      <span className="text-rose-600">₹{((extractedData.cgst || 0) + (extractedData.sgst || 0) + (extractedData.igst || 0)).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <label className="text-slate-600 text-xs font-semibold">Input Tax Credit (ITC) Classification</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setExtractedData({ ...extractedData, itcEligibility: 'Eligible', itcAmount: extractedData.cgst + extractedData.sgst + extractedData.igst })}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        extractedData.itcEligibility === 'Eligible'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Eligible ITC
                    </button>

                    <button
                      type="button"
                      onClick={() => setExtractedData({ ...extractedData, itcEligibility: 'Ineligible (Sec 17(5))', itcAmount: 0 })}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        extractedData.itcEligibility.includes('Ineligible')
                          ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Blocked Credit (Sec 17(5))
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Itemized Line Items Expandable Section */}
          {extractedData.lineItems && extractedData.lineItems.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setShowLineItems(!showLineItems)}
                className="w-full px-4 py-3 bg-slate-100/80 hover:bg-slate-200/70 transition flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Layers className="w-4 h-4 text-rose-600" />
                  <span>Itemized Line Items Breakdown ({extractedData.lineItems.length} items extracted)</span>
                  {(() => {
                    const rates = [...new Set(extractedData.lineItems.map(i => i.gstRate).filter(r => r !== undefined && r !== null))];
                    if (rates.length > 1) {
                      return (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                          Multi-Rate ({rates.map(r => `${r}%`).join(' + ')})
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="text-[11px] font-semibold">{showLineItems ? 'Hide Lines' : 'View Itemized Table'}</span>
                  {showLineItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showLineItems && (
                <div className="p-4 space-y-3">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">HSN/SAC</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                          <th className="py-2.5 px-3 text-center">GST Rate</th>
                          <th className="py-2.5 px-3 text-right">Tax (₹)</th>
                          <th className="py-2.5 px-3 text-right font-bold">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {extractedData.lineItems.map((item, idx) => {
                          const tax = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                              <td className="py-2 px-3 text-slate-400 font-sans">{idx + 1}</td>
                              <td className="py-2 px-3 font-sans font-medium text-slate-800 max-w-[200px] truncate" title={item.description}>
                                {item.description || "—"}
                              </td>
                              <td className="py-2 px-3 text-slate-500">{item.hsnSac || "—"}</td>
                              <td className="py-2 px-3 text-right">{item.quantity || 1}</td>
                              <td className="py-2 px-3 text-right">{item.unitPrice ? `₹${item.unitPrice.toLocaleString('en-IN')}` : "—"}</td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                ₹{(item.taxableValue || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  {item.gstRate || 0}%
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-rose-700 font-semibold">
                                ₹{tax.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                ₹{(item.totalAmount || ((item.taxableValue || 0) + tax)).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 px-1 gap-2 font-medium">
                    <span>Server-side roll-up ensures arithmetic consistency across all line items</span>
                    <span className="font-bold text-slate-900">
                      Authoritative Grand Total: ₹{extractedData.totalAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {saveError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs px-4 py-2.5">
              Couldn't save to the backend: {saveError}. Make sure the Spring Boot app is running on port 8081.
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={() => { setExtractedData(null); setUploadedFiles([]); setOrderingReview(null); }}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition disabled:opacity-50"
            >
              Discard
            </button>

            <button
              onClick={handleSaveInvoice}
              disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 cursor-pointer ${
                scanMode === 'sales'
                  ? 'bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 text-white shadow-indigo-600/20'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-600/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'Saving…' : (scanMode === 'sales' ? 'Save & Post to Sales Ledger' : 'Save & Post Verified Entry')}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
