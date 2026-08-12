/**
 * BillWise — Multi-Page Invoice Automatic Page Ordering Engine
 * Analyzes OCR text per page to determine sequential order (Page 1 vs Page 2/N)
 * for out-of-sequence multi-page invoice photo uploads.
 */

// Start-of-invoice keyword signals
const START_KEYWORDS = [
  'tax invoice',
  'original for recipient',
  'invoice to',
  'bill of supply',
  'commercial invoice',
  'invoice no',
  'invoice number',
  'inv no',
  'bill no',
  'invoice date',
  'date of invoice',
  'gstin',
  'supplier gstin',
  'pan no',
  'pan number',
  'place of supply',
  'state code',
  'billed to',
  'buyer',
  'consignee',
  'customer name',
  'm/s',
  'challan no',
  'e-way bill',
  'po no',
  'order no',
  'dispatch through',
  'destination',
  // Table headers typically found on starting pages
  'sr. no',
  's.no',
  'item description',
  'description of goods',
  'particulars',
  'hsn/sac',
  'hsn code',
  'sac code',
  'qty',
  'quantity',
  'unit price',
  'rate per unit',
  'taxable value',
  'taxable amount'
];

// End-of-invoice keyword signals
const END_KEYWORDS = [
  'total in words',
  'rupees in words',
  'amount in words',
  'bank details',
  'bank name',
  'account number',
  'a/c no',
  'account no',
  'ifsc',
  'ifsc code',
  'branch',
  'terms and conditions',
  'terms & conditions',
  'authorised signatory',
  'authorized signatory',
  'signature of issuer',
  'customer signature',
  'receiver\'s signature',
  'for ',
  'e. & o.e.',
  'e&oe',
  'pay using upi',
  'upi id',
  'scan & pay',
  'qr code',
  'thank you for shopping',
  'thank you for your business',
  'subject to jurisdiction',
  // Standalone summary / total indicators
  'grand total',
  'total amount',
  'total tax amount',
  'cgst total',
  'sgst total',
  'igst total',
  'net payable',
  'round off'
];

/**
 * Extracts explicit page numbers if printed in the OCR text
 * e.g., "Page 1 of 2", "Page 2/2", "1 of 2", "1/2"
 */
export function extractExplicitPageMarker(text) {
  if (!text) return null;
  
  const pageRegex1 = /\bpage\s*(\d{1,2})\s*(?:of|\/)\s*(\d{1,2})\b/i;
  const match1 = text.match(pageRegex1);
  if (match1) {
    return {
      page: parseInt(match1[1], 10),
      total: parseInt(match1[2], 10),
      raw: match1[0]
    };
  }

  const pageRegex2 = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/;
  const match2 = text.match(pageRegex2);
  if (match2) {
    const p = parseInt(match2[1], 10);
    const t = parseInt(match2[2], 10);
    if (p <= t && t <= 10 && p >= 1) {
      return { page: p, total: t, raw: match2[0] };
    }
  }

  return null;
}

/**
 * Calculates startScore, endScore, and role characteristics for a page's OCR text.
 */
export function scorePageRole(ocrText) {
  if (!ocrText || !ocrText.trim()) {
    return {
      startScore: 0,
      endScore: 0,
      netScore: 0,
      matchedStart: [],
      matchedEnd: [],
      explicitMarker: null,
      suggestedRole: 'General Page'
    };
  }

  const lower = ocrText.toLowerCase();
  const explicitMarker = extractExplicitPageMarker(ocrText);

  const matchedStart = [];
  let startScore = 0;
  for (const kw of START_KEYWORDS) {
    if (lower.includes(kw)) {
      matchedStart.push(kw);
      // Give higher weight to definitive header terms
      if (kw === 'tax invoice' || kw === 'invoice no' || kw === 'invoice date' || kw === 'gstin' || kw === 'billed to') {
        startScore += 2;
      } else {
        startScore += 1;
      }
    }
  }

  const matchedEnd = [];
  let endScore = 0;
  for (const kw of END_KEYWORDS) {
    if (lower.includes(kw)) {
      matchedEnd.push(kw);
      // Give higher weight to definitive footer terms
      if (kw === 'bank details' || kw === 'authorised signatory' || kw === 'total in words' || kw === 'terms and conditions') {
        endScore += 2;
      } else {
        endScore += 1;
      }
    }
  }

  const netScore = startScore - endScore;

  let suggestedRole = 'General Page';
  if (explicitMarker) {
    suggestedRole = `Page ${explicitMarker.page} (Explicit)`;
  } else if (startScore >= endScore + 2) {
    suggestedRole = 'Header & Line Items (Page 1)';
  } else if (endScore >= startScore + 2) {
    suggestedRole = 'Totals, Bank & Signatory (Page 2)';
  } else if (startScore > endScore) {
    suggestedRole = 'Start-leaning Section';
  } else if (endScore > startScore) {
    suggestedRole = 'Ending-leaning Section';
  }

  return {
    startScore,
    endScore,
    netScore,
    matchedStart,
    matchedEnd,
    explicitMarker,
    suggestedRole
  };
}

/**
 * Determines the optimal sequential page order from a list of page objects with OCR text.
 * Each item in rawPages is expected to have: { id, name, previewUrl, ocrText, file }
 */
export function determinePageSequence(rawPages) {
  if (!rawPages || rawPages.length === 0) return { orderedPages: [], confidence: 'HIGH_SINGLE', isReordered: false };
  if (rawPages.length === 1) {
    const scored = { ...rawPages[0], score: scorePageRole(rawPages[0].ocrText) };
    return {
      orderedPages: [scored],
      confidence: 'HIGH_SINGLE',
      isReordered: false
    };
  }

  // Score each page
  const scoredPages = rawPages.map((page, originalIndex) => {
    const score = scorePageRole(page.ocrText);
    return {
      ...page,
      originalIndex,
      score
    };
  });

  // Check if all pages have explicit page markers
  const allExplicit = scoredPages.every(p => p.score.explicitMarker && p.score.explicitMarker.page);
  if (allExplicit) {
    const sorted = [...scoredPages].sort((a, b) => a.score.explicitMarker.page - b.score.explicitMarker.page);
    const isReordered = sorted.some((p, idx) => p.originalIndex !== idx);
    return {
      orderedPages: sorted,
      confidence: 'HIGH_EXPLICIT',
      isReordered,
      explanation: 'Arranged by explicit page numbers detected in OCR (e.g. Page 1 of 2).'
    };
  }

  // If 2 pages, use startScore vs endScore comparison
  if (scoredPages.length === 2) {
    const p1 = scoredPages[0];
    const p2 = scoredPages[1];

    const scoreDiff = (p1.score.startScore - p1.score.endScore) - (p2.score.startScore - p2.score.endScore);

    if (Math.abs(scoreDiff) >= 2) {
      const sorted = scoreDiff >= 0 ? [p1, p2] : [p2, p1];
      const isReordered = sorted[0].originalIndex !== 0;
      return {
        orderedPages: sorted,
        confidence: 'HIGH_HEURISTIC',
        isReordered,
        explanation: isReordered 
          ? `Detected Page 2 uploaded first. Auto-sorted: [${sorted[0].score.suggestedRole}] placed as Page 1.` 
          : `Verified order: [${sorted[0].score.suggestedRole}] confirmed as Page 1.`
      };
    } else {
      // Score margin too low — fall back to upload order and flag as unconfirmed
      return {
        orderedPages: scoredPages,
        confidence: 'LOW_UNCONFIRMED',
        isReordered: false,
        explanation: 'Low confidence in automatic sequence. Please verify or adjust the page order.'
      };
    }
  }

  // For 3+ pages: sort by netScore (startScore - endScore) descending
  const sorted = [...scoredPages].sort((a, b) => b.score.netScore - a.score.netScore);
  const isReordered = sorted.some((p, idx) => p.originalIndex !== idx);
  
  // Calculate average margin
  const topMargin = sorted[0].score.netScore - sorted[sorted.length - 1].score.netScore;
  const confidence = topMargin >= 3 ? 'HIGH_HEURISTIC' : 'LOW_UNCONFIRMED';

  return {
    orderedPages: sorted,
    confidence,
    isReordered,
    explanation: confidence === 'HIGH_HEURISTIC'
      ? `Ranked ${sorted.length} pages by document layout signals (Header -> Continuation -> Footer).`
      : 'Page order estimated with moderate signals. Please verify before proceeding.'
  };
}

/**
 * Merges ordered OCR text strings with a clear page break delimiter.
 */
export function mergeOrderedOcrTexts(orderedPages) {
  if (!orderedPages || orderedPages.length === 0) return '';
  return orderedPages
    .map((p, idx) => `=== [PAGE ${idx + 1} OF ${orderedPages.length}] ===\n${p.ocrText || ''}`)
    .join('\n\n');
}
