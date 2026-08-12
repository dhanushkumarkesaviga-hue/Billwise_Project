/**
 * BillWise — Local Vision-Language Model (VLM) Extraction Client
 * Calls local Ollama vision endpoint via Spring Boot proxy without exposing API keys or cloud calls.
 * 100% local processing for MSME privacy.
 */

import { invoiceApi } from '../api';

/**
 * Converts a File or Blob object into a base64 string.
 * @param {File|Blob} fileOrBlob 
 * @returns {Promise<string>} base64 data URL
 */
export async function fileToBase64(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Converts an image preview URL into base64 (useful for mock templates or canvas).
 * @param {string} url 
 * @returns {Promise<string>}
 */
export async function urlToBase64(url) {
  if (!url) return '';
  if (url.startsWith('data:image')) {
    return url;
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await fileToBase64(blob);
  } catch (err) {
    console.warn("Could not fetch image URL to base64:", err);
    return '';
  }
}

/**
 * Executes VLM extraction against the local Ollama vision endpoint.
 * Runs with graceful degradation: fails silently with a structured error result rather than throwing.
 * 
 * @param {Object} options
 * @param {File|Blob} [options.file] - File or Blob object
 * @param {string} [options.previewUrl] - Object URL or preview URL
 * @param {string} [options.imageBase64] - Raw or data URL base64
 * @param {string} [options.mimeType] - Mime type
 * @param {string} [options.fileName] - Name of file
 * @param {number} [options.timeoutMs=135000] - Timeout in milliseconds (default 135s for local laptop GPU/CPU cold load buffer)
 * @returns {Promise<{success: boolean, data: Object|null, modelUsed?: string, error?: string, rawReply?: string, isArithmeticValid?: boolean}>}
 */
export async function callVlmExtraction({ file, previewUrl, imageBase64, mimeType, fileName, timeoutMs = 135000 }) {
  try {
    let base64Data = imageBase64;

    if (!base64Data && file) {
      base64Data = await fileToBase64(file);
    } else if (!base64Data && previewUrl) {
      base64Data = await urlToBase64(previewUrl);
    }

    if (!base64Data) {
      return {
        success: false,
        data: null,
        error: 'No image data provided for VLM extraction'
      };
    }

    // Call backend endpoint with timeout race
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Local VLM inference timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs);
    });

    const extractionPromise = invoiceApi.extractVlm({
      imageBase64: base64Data,
      mimeType: mimeType || (file ? file.type : 'image/jpeg'),
      fileName: fileName || (file ? file.name : 'invoice.jpg')
    });

    const response = await Promise.race([extractionPromise, timeoutPromise]);

    if (!response || !response.success || !response.data) {
      return {
        success: false,
        data: null,
        modelUsed: response?.modelUsed || null,
        error: response?.error || 'Vision model returned no data',
        rawReply: response?.rawReply || null
      };
    }

    return {
      success: true,
      data: response.data,
      modelUsed: response.modelUsed,
      isArithmeticValid: response.isArithmeticValid,
      rawReply: response.rawReply,
      error: null
    };

  } catch (err) {
    console.warn("VLM Extraction error (continuing with regex pipeline):", err.message || err);
    return {
      success: false,
      data: null,
      error: err.message || 'Vision model unavailable'
    };
  }
}
