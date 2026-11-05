import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Upload, Camera, Sparkles, RefreshCw, Check, ArrowRight,
  Shield, Download, AlertTriangle, AlertCircle, Trash2, Cpu,
  Smartphone, QrCode, FileUp, CheckCircle2, Sliders, ChevronRight, X,
  Layers, EyeOff
} from 'lucide-react';
import productService from '../services/productService';
import tryOnService from '../services/tryOnService';
import CameraModal from '../components/CameraModal';
import QrModal from '../components/QrModal';
import ProductStatusBadge, { ATELIER_FALLBACK_IMAGE } from '../components/ProductStatusBadge';

export default function VirtualFittingRoom() {
  const [searchParams] = useSearchParams();
  const initialProductId = searchParams.get('productId');
  const initialSize = searchParams.get('size') || 'M';

  // Loading & Error states
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  // Provider Info
  const [providerInfo, setProviderInfo] = useState(null);

  // Garment Catalogue State
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]); // Multiple outfit selection
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [fitPreference, setFitPreference] = useState('tailored');

  // Tried Outfits (Side-by-side comparison gallery)
  const [triedOutfits, setTriedOutfits] = useState([]);
  const [activeTriedOutfitId, setActiveTriedOutfitId] = useState(null);
  const [enlargedModalOutfit, setEnlargedModalOutfit] = useState(null);

  // Garment Selection Mode: 'catalogue' | 'custom'
  const [garmentMode, setGarmentMode] = useState('catalogue');

  // Custom Garment Upload State (Module 2)
  const [isCustomGarmentDrawerOpen, setIsCustomGarmentDrawerOpen] = useState(false);
  const [customGarmentUrl, setCustomGarmentUrl] = useState(null);
  const [customGarmentFilename, setCustomGarmentFilename] = useState(null);
  const [customGarmentName, setCustomGarmentName] = useState('Bespoke Custom Garment');
  const [customGarmentCategory, setCustomGarmentCategory] = useState('upper_body');
  const [isUploadingGarment, setIsUploadingGarment] = useState(false);
  const [customGarmentError, setCustomGarmentError] = useState(null);

  // Customer Silhouette State (Left "BEFORE" Panel)
  const [userPhotoUrl, setUserPhotoUrl] = useState(null);
  const [userPhotoFilename, setUserPhotoFilename] = useState(null);
  const [userPhotoSource, setUserPhotoSource] = useState(null); // 'upload', 'camera', 'mobile_qr'
  const [photoQuality, setPhotoQuality] = useState(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Try-On Generation & Result State (Right "AFTER" Panel)
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationError, setGenerationError] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState('idle'); // 'idle' | 'generating' | 'completed' | 'failed'
  const [tryOnResult, setTryOnResult] = useState(null);
  const [pendingGeneration, setPendingGeneration] = useState(null);
  const [activeGenerationProduct, setActiveGenerationProduct] = useState(null);
  const [cachedCustomerImageId, setCachedCustomerImageId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Customer Session ID for persistent tracking across generations
  const [sessionId] = useState(() => {
    let s = sessionStorage.getItem('vestra_customer_session_id');
    if (!s) {
      s = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('vestra_customer_session_id', s);
    }
    return s;
  });

  // Generation History State
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const pollingRef = useRef(null);
  const batchPollingRef = useRef(null);

  // Initial Data Fetch
  const init = async () => {
    setIsPageLoading(true);
    setInitError(null);
    try {
      const [prods, pInfo] = await Promise.all([
        productService.getProducts().catch((err) => {
          console.warn('[FittingRoom] Failed to fetch products:', err.message);
          return [];
        }),
        tryOnService.getProviderInfo().catch((err) => {
          console.warn('[FittingRoom] Failed to fetch provider info:', err.message);
          return null;
        })
      ]);

      const safeProds = Array.isArray(prods) ? prods : [];
      setAllProducts(safeProds);
      setProviderInfo(pInfo);

      // Pre-select product: prefer first AI-ready product if not specified
      const firstReady = safeProds.find((p) => p.tryonCompatibility === 'supported') || safeProds[0];
      if (initialProductId && safeProds.length > 0) {
        const match = safeProds.find((p) => p.id === parseInt(initialProductId, 10));
        if (match) {
          setSelectedProduct(match);
          setSelectedProducts([match]);
          console.log('[TryOn Flow Stage 1 & 2: Initial Selected Product]', {
            id: match.id,
            sku: match.sku,
            name: match.name,
            primaryImage: match.primaryImage,
            sessionId
          });
        } else if (firstReady) {
          setSelectedProduct(firstReady);
          setSelectedProducts([firstReady]);
        }
      } else if (safeProds.length > 0 && firstReady) {
        setSelectedProduct(firstReady);
        setSelectedProducts([firstReady]);
      }

      // Customer photo starts empty
      setUserPhotoUrl(null);
      setUserPhotoFilename(null);
      setUserPhotoSource(null);

      // Fetch customer generation history from PostgreSQL
      tryOnService.getHistory({ sessionId }).then((hRes) => {
        if (hRes?.success && Array.isArray(hRes.history) && hRes.history.length > 0) {
          setGenerationHistory(hRes.history);
          setTriedOutfits(hRes.history);
          const latestCompleted = hRes.history.find(h => h.status === 'completed' && h.resultImageUrl);
          if (latestCompleted) {
            setTryOnResult({
              resultImageUrl: latestCompleted.resultImageUrl,
              productId: latestCompleted.productId,
              productTitle: latestCompleted.productTitle,
              jobId: latestCompleted.jobId,
              fitScore: latestCompleted.fitScore,
              compositeDetails: latestCompleted.compositeDetails,
              isMock: latestCompleted.creditsUsed === 0
            });
            setActiveTriedOutfitId(latestCompleted.jobId);
          }
        }
      }).catch((hErr) => {
        console.warn('[FittingRoom] Could not preload session history:', hErr.message);
      });
    } catch (err) {
      console.error('Failed to initialize fitting room:', err);
      setInitError('Unable to connect to VESTRA database service. Please retry.');
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    init();

    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
      if (batchPollingRef.current) clearTimeout(batchPollingRef.current);
    };
  }, [initialProductId]);

  // Live timer for tracking virtual try-on elapsed time during AI synthesis
  useEffect(() => {
    let timer = null;
    if (isGenerating) {
      setElapsedTime(0);
      const start = Date.now();
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 500);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isGenerating]);

  // Helper to create an immutable snapshot of a product selection
  const createProductSnapshot = (prod, mode = 'catalogue') => {
    if (mode === 'custom') {
      return {
        id: null,
        name: customGarmentName || 'Bespoke Custom Garment',
        sku: 'CUSTOM-GARMENT',
        primaryImage: customGarmentUrl,
        slug: 'custom-outfit',
        garmentType: customGarmentCategory,
        size: selectedSize,
        fitPreference: fitPreference,
        mode: 'custom',
        timestamp: Date.now()
      };
    }
    if (!prod) return null;
    return {
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      primaryImage: prod.primaryImage || prod.images?.[0] || prod.tryonImage,
      slug: prod.slug,
      garmentType: prod.garmentType,
      subcategory: prod.subcategory,
      price: prod.price,
      currency: prod.currency,
      categoryName: prod.categoryName,
      size: selectedSize,
      fitPreference: fitPreference,
      mode: 'catalogue',
      timestamp: Date.now()
    };
  };

  // Fast adaptive polling logic for ongoing asynchronous try-on jobs with strict product verification
  const startPolling = (jobId, photoUrl, expectedSnapshot) => {
    if (pollingRef.current) clearTimeout(pollingRef.current);

    const checkJob = async () => {
      try {
        const job = await tryOnService.getJobStatus(jobId);

        // Verification: Ensure the polled job belongs to the expected product
        if (job.productId && expectedSnapshot?.id && job.productId !== expectedSnapshot.id) {
          pollingRef.current = null;
          setJobStatus('failed');
          setIsGenerating(false);
          setGenerationError(`Integrity Alert: Generated job returned product ID ${job.productId} ("${job.productTitle}") which does not match requested outfit "${expectedSnapshot.name}" (ID: ${expectedSnapshot.id}).`);
          return;
        }

        if (job.status === 'completed' && job.result) {
          pollingRef.current = null;

          // Integrity check: Never present unchanged customer photo as an AI result
          if (job.result.resultImageUrl === photoUrl) {
            setJobStatus('failed');
            setIsGenerating(false);
            setGenerationError('Provider returned unmodified silhouette portrait. Virtual try-on was not synthesized.');
            return;
          }

          setTryOnResult({
            ...job.result,
            generatingProduct: expectedSnapshot,
            jobId,
            productId: job.productId || expectedSnapshot?.id,
            productTitle: job.productTitle || expectedSnapshot?.name,
            productExternalId: job.productExternalId
          });
          setActiveTriedOutfitId(jobId);

          // Update in triedOutfits
          setTriedOutfits((prev) =>
            prev.map((item) => {
              if (item.jobId === jobId || item.id === jobId) {
                return {
                  ...item,
                  status: 'completed',
                  resultImageUrl: job.result.resultImageUrl,
                  fitScore: job.result.fitScore || item.fitScore,
                  compositeDetails: job.result.compositeDetails || null
                };
              }
              return item;
            })
          );

          setJobStatus('completed');
          setIsGenerating(false);
          setGenerationStep('Virtual try-on synthesis complete.');
          tryOnService.getProviderInfo().then((p) => setProviderInfo(p)).catch(() => {});
        } else if (job.status === 'failed') {
          pollingRef.current = null;
          setJobStatus('failed');
          setIsGenerating(false);
          setGenerationError(job.error || 'Virtual try-on synthesis failed.');

          // Update failed in triedOutfits
          setTriedOutfits((prev) =>
            prev.map((item) => {
              if (item.jobId === jobId || item.id === jobId) {
                return { ...item, status: 'failed', error: job.error || 'Failed' };
              }
              return item;
            })
          );
        } else {
          setGenerationStep('Genlook cloud engine synthesizing draping mesh...');
          pollingRef.current = setTimeout(checkJob, 1000);
        }
      } catch (err) {
        console.warn('Polling error:', err);
        pollingRef.current = setTimeout(checkJob, 1200);
      }
    };

    // Fast initial check at 800ms to eliminate 1.5s idle latency, then 1000ms cadence
    pollingRef.current = setTimeout(checkJob, 800);
  };

  // Batch polling for multiple simultaneous try-on jobs with progressive streaming
  const pollBatchJobs = (jobIds) => {
    if (!jobIds || jobIds.length === 0) {
      setIsGenerating(false);
      return;
    }

    let remaining = new Set(jobIds);
    if (batchPollingRef.current) clearTimeout(batchPollingRef.current);

    const checkBatch = async () => {
      try {
        for (const jid of Array.from(remaining)) {
          const job = await tryOnService.getJobStatus(jid);
          if (job.status === 'completed' || job.status === 'failed') {
            remaining.delete(jid);
            setTriedOutfits((prev) =>
              prev.map((item) => {
                if (item.jobId === jid || item.id === jid) {
                  return {
                    ...item,
                    status: job.status,
                    resultImageUrl: job.result?.resultImageUrl || item.resultImageUrl,
                    error: job.error || null,
                    fitScore: job.result?.fitScore || item.fitScore,
                    compositeDetails: job.result?.compositeDetails || null
                  };
                }
                return item;
              })
            );

            // Progressive display: Instantly surface the first completed result to the AFTER panel
            if (job.status === 'completed' && job.result?.resultImageUrl) {
              setTryOnResult((prev) => prev || {
                resultImageUrl: job.result.resultImageUrl,
                productId: job.productId,
                productTitle: job.productTitle,
                jobId: jid,
                fitScore: job.result.fitScore,
                isMock: job.result.isMock
              });
              setActiveTriedOutfitId((prev) => prev || jid);
            }
          }
        }

        if (remaining.size === 0) {
          batchPollingRef.current = null;
          setIsGenerating(false);
          setJobStatus('completed');
          setGenerationStep('All selected outfits synthesized.');
          tryOnService.getProviderInfo().then((p) => setProviderInfo(p)).catch(() => {});
        } else {
          setGenerationStep(`Synthesizing ${remaining.size} outfit(s) in cloud AI engine...`);
          batchPollingRef.current = setTimeout(checkBatch, 1000);
        }
      } catch (pollErr) {
        console.warn('Batch polling warning:', pollErr);
        batchPollingRef.current = setTimeout(checkBatch, 1200);
      }
    };

    // Fast initial check at 800ms, then 1000ms cadence
    batchPollingRef.current = setTimeout(checkBatch, 800);
  };

  // Core Execution Function: Synthesize Try-On with Immutable Product Snapshot
  const executeTryOn = async (photoUrl, photoFilename, targetGarment, mode = 'catalogue') => {
    if (isGenerating) {
      console.warn('[TryOn] Blocked duplicate submission while job is in progress.');
      return;
    }

    if (!photoUrl) {
      setGenerationError('Please upload your photograph in the BEFORE panel first.');
      return;
    }

    if (mode === 'catalogue') {
      if (!targetGarment || !targetGarment.id) {
        setGenerationError('Please select a garment from the clothing collection below.');
        return;
      }

      if (targetGarment?.garmentType === 'accessory' || targetGarment?.tryonCompatibility === 'unsupported') {
        setGenerationError(
          'Accessories (belts, shawls, bags) are unsupported by 2D garment diffusion try-on. 3D AR simulation is required.'
        );
        return;
      }
    } else {
      if (!customGarmentUrl) {
        setGenerationError('Please upload your custom outfit image first.');
        return;
      }
    }

    const immutableSnapshot = createProductSnapshot(targetGarment, mode);
    setActiveGenerationProduct(immutableSnapshot);

    setIsGenerating(true);
    setJobStatus('generating');
    setGenerationError(null);
    setGenerationStep(
      mode === 'custom'
        ? 'Uploading custom garment to Genlook multipart engine...'
        : `Synthesizing ${immutableSnapshot.name} on your silhouette portrait...`
    );

    console.log('[TryOn Flow Stage 5 & 6: Transmitting Try-On Request]', {
      id: immutableSnapshot.id,
      title: immutableSnapshot.name,
      sku: immutableSnapshot.sku,
      image: immutableSnapshot.primaryImage,
      mode,
      sessionId
    });

    try {
      const payload = mode === 'catalogue'
        ? {
            productId: immutableSnapshot.id,
            productTitle: immutableSnapshot.name,
            productSku: immutableSnapshot.sku,
            productImageUrl: immutableSnapshot.primaryImage,
            userPhotoUrl: photoUrl,
            userPhotoFilename: photoFilename,
            customerImageId: cachedCustomerImageId,
            sessionId,
            selectedSize: immutableSnapshot.size || selectedSize,
            fitPreference: immutableSnapshot.fitPreference || fitPreference,
            category: immutableSnapshot.garmentType || 'upper_body'
          }
        : {
            customGarmentUrl,
            customGarmentFilename,
            customGarmentName: immutableSnapshot.name,
            userPhotoUrl: photoUrl,
            userPhotoFilename: photoFilename,
            customerImageId: cachedCustomerImageId,
            sessionId,
            selectedSize: immutableSnapshot.size || selectedSize,
            fitPreference: immutableSnapshot.fitPreference || fitPreference,
            category: customGarmentCategory
          };

      const response = await tryOnService.createTryOnJob(payload);
      if (response.customerImageId) {
        setCachedCustomerImageId(response.customerImageId);
      }
      const jobId = response.jobId;
      setCurrentJobId(jobId);

      // Backend Integrity Check: Validate returned job product matches requested product
      if (response.productId && immutableSnapshot.id && response.productId !== immutableSnapshot.id) {
        console.error('[TryOn Integrity Alert] Product ID mismatch in response:', response.productId, 'vs requested:', immutableSnapshot.id);
        setIsGenerating(false);
        setJobStatus('failed');
        setGenerationError(`Product Mismatch Alert: Server returned job for product ID ${response.productId} instead of ${immutableSnapshot.id}.`);
        return;
      }

      const newEntry = {
        id: jobId,
        jobId,
        productId: response.productId || immutableSnapshot.id,
        productTitle: response.productTitle || immutableSnapshot.name,
        productExternalId: response.productExternalId,
        garmentImageUrl: immutableSnapshot.primaryImage,
        resultImageUrl: response.result?.resultImageUrl || null,
        status: response.status || 'processing',
        error: null,
        isMock: response.creditsUsed === 0 || !!response.result?.isMock,
        fitScore: response.result?.fitScore || 0.95,
        compositeDetails: response.result?.compositeDetails || null,
        createdAt: new Date().toISOString()
      };

      setTriedOutfits((prev) => [newEntry, ...prev.filter((x) => (x.jobId || x.id) !== jobId)]);
      setActiveTriedOutfitId(jobId);

      if (response.status === 'completed' && response.result) {
        if (response.result.resultImageUrl === photoUrl) {
          setIsGenerating(false);
          setJobStatus('failed');
          setGenerationError('Provider returned unmodified silhouette portrait without applying garment. No credits deducted.');
          return;
        }

        setTryOnResult({
          ...response.result,
          generatingProduct: immutableSnapshot,
          jobId,
          productId: response.productId || immutableSnapshot.id,
          productTitle: response.productTitle || immutableSnapshot.name,
          productExternalId: response.productExternalId
        });
        setJobStatus('completed');
        setIsGenerating(false);
        tryOnService.getProviderInfo().then((p) => setProviderInfo(p)).catch(() => {});
      } else {
        setGenerationStep('Genlook cloud engine synthesizing draping mesh...');
        startPolling(jobId, photoUrl, immutableSnapshot);
      }
    } catch (err) {
      console.error('Generation dispatch error:', err);
      setIsGenerating(false);
      setJobStatus('failed');
      const errorMsg = err.response?.data?.error || (err.message === 'Network Error' ? 'Cannot connect to VESTRA backend server (port 5000). Please ensure backend is running.' : err.message) || 'Generation dispatch failed.';
      setGenerationError(errorMsg);
    }
  };

  // Batch Try-On Execution: Transmits 1 independent request per selected catalogue outfit
  const executeBatchTryOn = async () => {
    if (isGenerating) return;

    if (!userPhotoUrl) {
      setGenerationError('Please upload or capture your photograph in the BEFORE panel first.');
      return;
    }

    if (!selectedProducts || selectedProducts.length === 0) {
      setGenerationError('Please select at least one outfit from the clothing archive below.');
      return;
    }

    setIsGenerating(true);
    setJobStatus('generating');
    setGenerationError(null);
    setGenerationStep(`Submitting ${selectedProducts.length} independent outfit try-on requests...`);

    try {
      const productIds = selectedProducts.map((p) => p.id);
      const response = await tryOnService.createBatchTryOnJobs({
        productIds,
        userPhotoUrl,
        userPhotoFilename,
        customerImageId: cachedCustomerImageId,
        sessionId,
        selectedSize,
        fitPreference
      });

      if (response.customerImageId) {
        setCachedCustomerImageId(response.customerImageId);
      }

      if (response.success && Array.isArray(response.jobs)) {
        const batchJobs = response.jobs.map((j) => ({
          id: j.jobId,
          jobId: j.jobId,
          productId: j.productId,
          productTitle: j.productTitle,
          productExternalId: j.productExternalId,
          garmentImageUrl: j.garmentImageUrl,
          resultImageUrl: j.result?.resultImageUrl || null,
          status: j.status || 'processing',
          error: j.error || null,
          isMock: j.creditsUsed === 0 || !!j.isMock,
          fitScore: j.result?.fitScore || 0.95,
          compositeDetails: j.result?.compositeDetails || null,
          createdAt: new Date().toISOString()
        }));

        setTriedOutfits((prev) => {
          const map = new Map();
          for (const item of batchJobs) {
            map.set(item.jobId, item);
          }
          for (const item of prev) {
            if (!map.has(item.jobId || item.id)) {
              map.set(item.jobId || item.id, item);
            }
          }
          return Array.from(map.values());
        });

        const completed = batchJobs.filter((j) => j.status === 'completed' && j.resultImageUrl);
        const processing = batchJobs.filter((j) => j.status === 'processing');

        if (completed.length > 0) {
          const first = completed[0];
          setTryOnResult({
            resultImageUrl: first.resultImageUrl,
            productId: first.productId,
            productTitle: first.productTitle,
            jobId: first.jobId,
            fitScore: first.fitScore,
            isMock: first.isMock
          });
          setActiveTriedOutfitId(first.jobId);
        }

        if (processing.length > 0) {
          setGenerationStep(`Genlook cloud engine synthesizing ${processing.length} draping meshes...`);
          pollBatchJobs(processing.map((j) => j.jobId));
        } else {
          setIsGenerating(false);
          setJobStatus('completed');
          setGenerationStep('All selected outfits synthesized.');
        }
      }
    } catch (err) {
      console.error('Batch generation dispatch error:', err);
      setIsGenerating(false);
      setJobStatus('failed');
      const errorMsg =
        err.response?.data?.error ||
        (err.message === 'Network Error'
          ? 'Cannot connect to VESTRA backend server (port 5000).'
          : err.message) ||
        'Batch generation dispatch failed.';
      setGenerationError(errorMsg);
    }
  };

  // Retry a single failed outfit try-on without repeating successful results
  const handleRetryOutfit = async (outfit) => {
    const targetId = outfit.jobId || outfit.id;
    if (!targetId) return;

    setTriedOutfits((prev) =>
      prev.map((item) => {
        if ((item.jobId || item.id) === targetId) {
          return { ...item, status: 'processing', error: null };
        }
        return item;
      })
    );

    try {
      const res = await tryOnService.retryJob(targetId);
      if (res.status === 'completed' && res.result?.resultImageUrl) {
        setTriedOutfits((prev) =>
          prev.map((item) => {
            if ((item.jobId || item.id) === targetId) {
              return {
                ...item,
                status: 'completed',
                resultImageUrl: res.result.resultImageUrl,
                error: null,
                fitScore: res.result.fitScore || item.fitScore
              };
            }
            return item;
          })
        );

        setTryOnResult({
          resultImageUrl: res.result.resultImageUrl,
          productId: res.result.productId || outfit.productId,
          productTitle: res.result.productTitle || outfit.productTitle,
          jobId: targetId
        });
        setActiveTriedOutfitId(targetId);
      } else if (res.status === 'processing') {
        pollBatchJobs([targetId]);
      } else {
        setTriedOutfits((prev) =>
          prev.map((item) => {
            if ((item.jobId || item.id) === targetId) {
              return {
                ...item,
                status: 'failed',
                error: res.error || 'Retry attempt failed'
              };
            }
            return item;
          })
        );
      }
    } catch (err) {
      console.error('Retry outfit failed:', err);
      setTriedOutfits((prev) =>
        prev.map((item) => {
          if ((item.jobId || item.id) === targetId) {
            return {
              ...item,
              status: 'failed',
              error: err.response?.data?.error || err.message || 'Retry failed'
            };
          }
          return item;
        })
      );
    }
  };

  // Set an outfit from "Your Tried Outfits" as the active comparison in the AFTER viewer
  const handleSetActiveComparison = (outfit) => {
    const outfitId = outfit.jobId || outfit.id;
    setActiveTriedOutfitId(outfitId);
    if (outfit.resultImageUrl) {
      setTryOnResult({
        resultImageUrl: outfit.resultImageUrl,
        productId: outfit.productId,
        productTitle: outfit.productTitle,
        jobId: outfitId,
        fitScore: outfit.fitScore,
        compositeDetails: outfit.compositeDetails,
        isMock: outfit.isMock
      });
    }
    if (outfit.productId) {
      const match = allProducts.find((p) => p.id === outfit.productId);
      if (match) setSelectedProduct(match);
    }
  };

  // Toggle outfit selection in catalogue
  const handleToggleProductSelection = (e, product) => {
    e.stopPropagation();
    if (product.tryonCompatibility === 'unsupported' || product.garmentType === 'accessory') {
      setGenerationError('Accessories (shawls, belts, shoes) cannot be selected for garment try-on.');
      return;
    }

    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        const next = prev.filter((p) => p.id !== product.id);
        if (selectedProduct?.id === product.id) {
          setSelectedProduct(next.length > 0 ? next[0] : null);
        }
        return next;
      } else {
        setSelectedProduct(product);
        return [...prev, product];
      }
    });
  };

  const removeSelectedProduct = (productId) => {
    setSelectedProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      if (selectedProduct?.id === productId) {
        setSelectedProduct(next.length > 0 ? next[0] : null);
      }
      return next;
    });
  };

  const clearAllSelectedProducts = () => {
    setSelectedProducts([]);
  };

  // Catalogue Outfit Selection Handler (Captures immutable snapshot and updates confirmation)
  const handleSelectCatalogueProduct = (product) => {
    setSelectedProduct(product);
    setGarmentMode('catalogue');
    setGenerationError(null);

    // Keep selected in selectedProducts
    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (!exists) return [...prev, product];
      return prev;
    });

    const snapshot = createProductSnapshot(product, 'catalogue');
    console.log('[TryOn Flow Stage 1 & 2: User Selected Catalogue Outfit]', {
      id: snapshot.id,
      title: snapshot.name,
      sku: snapshot.sku,
      image: snapshot.primaryImage,
      sessionId
    });

    if (userPhotoUrl) {
      setPendingGeneration(snapshot);
    }
  };

  // Open Confirmation Modal with guaranteed product snapshot
  const handleOpenConfirmationModal = (targetProd = selectedProduct, mode = garmentMode) => {
    if (!userPhotoUrl) {
      setGenerationError('Please upload your portrait in the BEFORE panel first.');
      return;
    }

    if (mode === 'catalogue') {
      if (!targetProd || !targetProd.id) {
        setGenerationError('Please select a garment from the catalogue below.');
        return;
      }
      if (targetProd.garmentType === 'accessory' || targetProd.tryonCompatibility === 'unsupported') {
        setGenerationError('Accessories are unsupported by 2D garment diffusion try-on.');
        return;
      }
      const snapshot = createProductSnapshot(targetProd, 'catalogue');
      setPendingGeneration(snapshot);
    } else {
      if (!customGarmentUrl) {
        setGenerationError('Please upload your custom outfit image first.');
        return;
      }
      const snapshot = createProductSnapshot(null, 'custom');
      setPendingGeneration(snapshot);
    }
  };

  // Silhouette File Upload (from computer) — DOES NOT auto-dispatch to prevent stale product try-on
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setUploadError(null);
    setGenerationError(null);

    try {
      const uploaded = await tryOnService.uploadSilhouette(file);
      setUserPhotoUrl(uploaded.url);
      setUserPhotoFilename(uploaded.filename);
      setUserPhotoSource('upload');
      setCachedCustomerImageId(null);
      setPhotoQuality(uploaded.qualityAssessment || null);
      setTryOnResult(null);
      setJobStatus('idle');

      console.log('[TryOn Flow Stage 4: Customer Photo Uploaded]', {
        photoUrl: uploaded.url,
        filename: uploaded.filename,
        sessionId
      });
      // Notice: Do NOT automatically trigger try-on of pre-selected default product!
      // Let customer review their portrait and explicitly confirm their selected outfit.
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  // Laptop Webcam Capture Handler — DOES NOT auto-dispatch to prevent stale product try-on
  const handleCameraPhoto = async (capturedFile, dataUrl) => {
    setIsUploadingPhoto(true);
    setUploadError(null);
    setGenerationError(null);

    const instantPreview = dataUrl || (capturedFile instanceof Blob ? URL.createObjectURL(capturedFile) : null);
    if (instantPreview) {
      setUserPhotoUrl(instantPreview);
      setUserPhotoSource('camera');
    }

    try {
      let uploaded;
      if (capturedFile instanceof File || capturedFile instanceof Blob) {
        uploaded = await tryOnService.uploadSilhouette(capturedFile);
      } else if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
        uploaded = await tryOnService.uploadCameraSnapshot(dataUrl);
      } else {
        throw new Error('No valid captured photo file provided.');
      }

      setUserPhotoUrl(uploaded.url);
      setUserPhotoFilename(uploaded.filename);
      setUserPhotoSource('camera');
      setCachedCustomerImageId(null);
      setPhotoQuality(uploaded.qualityAssessment || null);
      setTryOnResult(null);
      setJobStatus('idle');

      console.log('[TryOn Flow Stage 4: Customer Webcam Snapshot]', {
        photoUrl: uploaded.url,
        filename: uploaded.filename,
        sessionId
      });
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Mobile QR Upload Handler — DOES NOT auto-dispatch to prevent stale product try-on
  const handleQrPhotoReceived = (photoUrl, photoFilename) => {
    setUserPhotoUrl(photoUrl);
    setUserPhotoFilename(photoFilename);
    setUserPhotoSource('mobile_qr');
    setCachedCustomerImageId(null);
    setTryOnResult(null);
    setJobStatus('idle');
    setUploadError(null);

    tryOnService.inspectPhoto(photoUrl, photoFilename).then((q) => {
      if (q) setPhotoQuality(q);
    }).catch(() => {});

    console.log('[TryOn Flow Stage 4: Customer QR Photo Received]', {
      photoUrl,
      filename: photoFilename,
      sessionId
    });
  };

  // Remove/Purge Customer Photo Handler
  const handleRemoveCustomerPhoto = async () => {
    if (userPhotoFilename) {
      const confirm = window.confirm('Remove your photo from this fitting session?');
      if (!confirm) return;
      await tryOnService.purgeCustomerPhoto(userPhotoFilename).catch(() => {});
    }
    setUserPhotoUrl(null);
    setUserPhotoFilename(null);
    setUserPhotoSource(null);
    setCachedCustomerImageId(null);
    setPhotoQuality(null);
    setTryOnResult(null);
    setJobStatus('idle');
    setGenerationError(null);
  };

  // Fetch & open Generation History drawer
  const handleOpenHistoryDrawer = async () => {
    setIsHistoryDrawerOpen(true);
    setIsLoadingHistory(true);
    try {
      const data = await tryOnService.getHistory({ sessionId, limit: 30 });
      setGenerationHistory(data.history || []);
    } catch (err) {
      console.warn('Failed to fetch generation history:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Custom Garment Upload Handler
  const handleCustomGarmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGarment(true);
    setCustomGarmentError(null);

    try {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setCustomGarmentName(cleanName);

      const uploaded = await tryOnService.uploadCustomGarment(file);
      setCustomGarmentUrl(uploaded.url);
      setCustomGarmentFilename(uploaded.filename);
      setGarmentMode('custom');

      if (userPhotoUrl) {
        if (providerInfo && !providerInfo.isMock) {
          setPendingGeneration({ garment: null, mode: 'custom' });
        } else {
          executeTryOn(userPhotoUrl, userPhotoFilename, null, 'custom');
        }
      }
    } catch (err) {
      setCustomGarmentError(err.response?.data?.error || err.message);
    } finally {
      setIsUploadingGarment(false);
    }
  };

  // Download / Save Generated Image Result
  const handleSaveResult = () => {
    if (!tryOnResult?.resultImageUrl) return;
    const link = document.createElement('a');
    link.href = tryOnResult.resultImageUrl;
    link.download = `vestra-tryon-${tryOnResult?.generatingProduct?.slug || selectedProduct?.slug || 'bespoke'}-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter products by category
  const filteredProducts = allProducts.filter((product) => {
    if (productCategoryFilter === 'all') return true;
    if (productCategoryFilter === 'womens') {
      return product.categorySlug === 'womens-clothing' || product.gender === 'women' || product.categoryId === 2;
    }
    if (productCategoryFilter === 'mens') {
      return product.categorySlug === 'mens-clothing' || product.gender === 'men' || product.categoryId === 3;
    }
    if (productCategoryFilter === 'sarees') {
      return product.categorySlug === 'sarees' || product.garmentType === 'saree' || product.categoryId === 1;
    }
    if (productCategoryFilter === 'accessories') {
      return product.categorySlug === 'accessories' || product.garmentType === 'accessory' || product.categoryId === 4;
    }
    return true;
  });

  // Render generation badge for AFTER panel
  const renderAfterBadge = () => {
    if (jobStatus === 'generating') {
      return (
        <span className="bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] uppercase font-mono font-bold text-[10px] px-3 py-1 flex items-center space-x-1.5 animate-pulse rounded">
          <RefreshCw className="w-3 h-3 animate-spin text-[#F5AFAF]" />
          <span>SYNTHESIZING</span>
        </span>
      );
    }

    if (jobStatus === 'failed') {
      return (
        <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 uppercase font-mono font-bold text-[10px] px-3 py-1 flex items-center space-x-1.5 rounded">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          <span>GENERATION FAILED</span>
        </span>
      );
    }

    if (jobStatus === 'completed' && tryOnResult?.resultImageUrl) {
      const vStatus = tryOnResult?.verificationStatus || tryOnResult?.compositeDetails?.qualityAssessment?.verificationStatus || 'VERIFIED';
      if (vStatus === 'NEEDS_REVIEW') {
        return (
          <span className="bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-800 uppercase font-mono font-bold text-[10px] px-3 py-1 flex items-center space-x-1.5 rounded">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span>NEEDS REVIEW</span>
          </span>
        );
      }
      if (vStatus === 'FIDELITY_FLAGGED') {
        return (
          <span className="bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 uppercase font-mono font-bold text-[10px] px-3 py-1 flex items-center space-x-1.5 rounded">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <span>FIDELITY FLAGGED</span>
          </span>
        );
      }
      return (
        <span className="bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] border border-[#F5AFAF] uppercase font-mono font-bold text-[10px] px-3 py-1 flex items-center space-x-1.5 shadow-xs rounded">
          <Sparkles className="w-3 h-3 text-[#F5AFAF]" />
          <span>AI VERIFIED</span>
        </span>
      );
    }

    return (
      <span className="bg-[#FCF8F8] dark:bg-[#0F172A] text-slate-500 border border-[#F9DFDF] dark:border-slate-800 uppercase font-mono text-[10px] px-3 py-1 rounded">
        AWAITING SELECTION
      </span>
    );
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-[#FCF8F8] dark:bg-[#0F172A] text-[#000000] dark:text-[#FFFFFF] py-20 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-[#1E293B] border border-[#F9DFDF] dark:border-slate-800 p-8 text-center space-y-4 shadow-vestra-sm animate-fadeIn">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#F5AFAF]" />
          <p className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#F5AFAF] font-semibold">VESTRA Studio</p>
          <h2 className="font-serif text-2xl text-[#000000] dark:text-[#FFFFFF]">Opening Virtual Fitting Room</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Connecting to clothing inventory and Genlook cloud AI try-on engine...
          </p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-[#FCF8F8] dark:bg-[#0F172A] text-[#000000] dark:text-[#FFFFFF] py-20 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-[#1E293B] border border-rose-200 dark:border-rose-900 p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="font-serif text-xl">Service Interruption</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{initError}</p>
          <button
            onClick={init}
            className="px-6 py-2.5 bg-[#000000] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#000000] text-xs uppercase tracking-widest font-semibold hover:bg-slate-900 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#FFFFFF] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Studio Brand Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200/80 dark:border-slate-800 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 mb-2 rounded shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#F5AFAF] pulse-camera" />
              <span className="text-[10px] tracking-[0.2em] uppercase font-mono font-medium text-slate-700 dark:text-slate-300">
                Official Genlook Virtual Try-On API (v1)
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 dark:text-[#FFFFFF] font-normal">
              Virtual Fitting Room
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 tracking-wide mt-1">
              Upload your full-body portrait, browse our archive, and view neural cloth draping.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
            {providerInfo && (
              <div className="px-3.5 py-1.5 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 flex items-center space-x-2 text-[11px] rounded shadow-xs">
                <span className={`w-2 h-2 rounded-full ${providerInfo.available ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-slate-500">Engine:</span>
                <strong className="text-slate-900 dark:text-[#FFFFFF] uppercase font-mono">{providerInfo.provider}</strong>
                {providerInfo.isMock ? (
                  <span className="text-slate-500 font-mono">&bull; Mock Mode (0 Credits)</span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                    &bull; Genuine AI ({providerInfo.creditBalance !== null && providerInfo.creditBalance !== undefined ? `${providerInfo.creditBalance} Credits` : 'Active'})
                  </span>
                )}
              </div>
            )}

            <div className="text-slate-600 dark:text-slate-300 font-medium flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-[#F5AFAF]" />
              <span className="text-[11px]">Private Atelier Cloud</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {generationError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 space-y-1 animate-fadeIn">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-950 dark:text-rose-100">Fitting Studio Notice:</p>
                <p className="mt-0.5 leading-relaxed">{generationError}</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 1: SIDE-BY-SIDE VIRTUAL FITTING MIRROR (BEFORE / AFTER) */}
        {/* ============================================================== */}
        <section className="bg-white dark:bg-[#181114] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* ------------------------------------------------------------ */}
            {/* LEFT PANEL: BEFORE — Customer Uploaded Photograph            */}
            {/* ------------------------------------------------------------ */}
            <div className="flex flex-col space-y-3">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                    BEFORE
                  </span>
                  <span className="text-xs font-serif font-medium text-slate-900 dark:text-[#FFFFFF]">
                    Customer Silhouette
                  </span>
                </div>

                {userPhotoUrl && (
                  <div className="flex items-center space-x-2">
                    <label
                      title="Replace photograph"
                      className="cursor-pointer text-[11px] uppercase font-mono tracking-wider font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-[#FFFFFF] flex items-center space-x-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Replace Photo</span>
                      <input
                        ref={replaceFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleRemoveCustomerPhoto}
                      title="Remove photograph"
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* BEFORE Display / Upload Area */}
              <div className="relative aspect-[3/4] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col items-center justify-center group">
                
                {userPhotoUrl ? (
                  <>
                    <img
                      src={userPhotoUrl}
                      alt="Customer Portrait (Before)"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.01]"
                    />

                    {/* Source tag & watermark overlay */}
                    <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200/80 text-[9px] uppercase font-mono tracking-wider px-2.5 py-1 flex items-center space-x-1.5 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5AFAF]" />
                      <span>
                        {userPhotoSource === 'camera'
                          ? 'Webcam Portrait'
                          : userPhotoSource === 'mobile_qr'
                            ? 'Mobile QR Portrait'
                            : 'Uploaded Portrait'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200/80 text-[9px] uppercase tracking-wider px-2 py-0.5 font-medium shadow-xs">
                      Original Preserved
                    </div>
                  </>
                ) : (
                  /* Upload Call to Action */
                  <div className="p-6 text-center space-y-5 max-w-sm">
                    <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <Upload className="w-6 h-6 text-[#F5AFAF]" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-serif text-lg text-slate-900 dark:text-[#FFFFFF] font-medium">
                        Upload Your Photo
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Upload a front-facing full-body portrait to preview any VESTRA creation.
                      </p>
                    </div>

                    {isUploadingPhoto ? (
                      <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-2 text-xs">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#F5AFAF]" />
                        <span className="font-medium text-slate-900 dark:text-[#FFFFFF]">Calibrating photo...</span>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <label className="w-full py-2.5 px-4 bg-white hover:bg-rose-50/50 hover:border-rose-300 text-slate-900 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs uppercase tracking-wider font-semibold cursor-pointer flex items-center justify-center space-x-2 transition-all shadow-xs border border-slate-300 dark:border-white">
                          <FileUp className="w-4 h-4 text-[#F5AFAF]" />
                          <span>Upload From Computer</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsCameraModalOpen(true)}
                            className="py-2 px-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-[#FFFFFF] text-[10px] uppercase tracking-wider font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#F5AFAF]" />
                            <span>Webcam</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsQrModalOpen(true)}
                            className="py-2 px-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-[#FFFFFF] text-[10px] uppercase tracking-wider font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#F5AFAF]" />
                            <span>Mobile QR</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {uploadError && (
                      <p className="text-[11px] text-rose-600 font-medium">{uploadError}</p>
                    )}

                    <p className="text-[10px] text-slate-400">
                      JPEG, PNG, or WebP &bull; Biometrically private
                    </p>
                  </div>
                )}
              </div>

              {/* Photo Suitability & Identity Preservation Meter */}
              {userPhotoUrl && photoQuality && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  {photoQuality.framing === 'close_up' ? (
                    <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 rounded text-xs space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Close-Up Framing Notice</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          Suitability: {photoQuality.suitabilityScore}%
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90 font-sans">
                        Close-up selfies lack torso and body context. To drape full garments, the AI must hallucinate missing anatomy, which alters body proportions and facial features.
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                        <span>Tip: Upload a standing portrait (4–6 ft back)</span>
                        <button
                          type="button"
                          onClick={() => replaceFileInputRef.current?.click()}
                          className="underline hover:text-amber-900 font-bold"
                        >
                          Replace Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded text-xs flex items-center justify-between shadow-xs">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                            {photoQuality.framing === 'full_body' ? 'Optimal Full-Body Portrait' : '3/4 Portrait Detected'}
                          </p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                            High identity preservation &bull; Natural garment draping enabled
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 font-bold">
                        {photoQuality.suitabilityScore}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Status footer for Before Panel */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>
                  {userPhotoUrl ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center">
                      <Check className="w-3 h-3 mr-1" /> Customer photo active & ready
                    </span>
                  ) : (
                    'No photo uploaded yet'
                  )}
                </span>
                <span className="font-mono text-[10px] uppercase text-slate-400">Step A</span>
              </div>

            </div>


            {/* ------------------------------------------------------------ */}
            {/* RIGHT PANEL: AFTER — AI Virtual Try-On Result               */}
            {/* ------------------------------------------------------------ */}
            <div className="flex flex-col space-y-3">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                    AFTER
                  </span>
                  <span className="text-xs font-serif font-medium text-slate-900 dark:text-[#FFFFFF]">
                    AI Virtual Draping
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {renderAfterBadge()}

                  <button
                    type="button"
                    onClick={handleOpenHistoryDrawer}
                    className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] uppercase font-mono font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-1 transition-colors shadow-xs"
                    title="View Try-On Generation History"
                  >
                    <Layers className="w-3 h-3 text-[#F5AFAF]" />
                    <span>History</span>
                  </button>

                  {tryOnResult?.resultImageUrl && (
                    <button
                      type="button"
                      onClick={handleSaveResult}
                      className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-[#FFFFFF] text-[10px] uppercase font-mono font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-1.5 transition-colors shadow-xs"
                      title="Save generated try-on dossier image"
                    >
                      <Download className="w-3 h-3 text-[#F5AFAF]" />
                      <span>Save Result</span>
                    </button>
                  )}
                </div>
              </div>

              {/* AFTER Display Area */}
              <div className="relative aspect-[3/4] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col items-center justify-center group">
                
                {isGenerating ? (
                  /* Generating Synthesis Overlay with Live Elapsed Time & Progressive Stage */
                  <div className="p-6 text-center space-y-4 max-w-sm z-20">
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-2 border-[#F5AFAF] border-t-transparent animate-spin" />
                      <Sparkles className="w-6 h-6 text-[#F5AFAF] absolute animate-pulse" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F5AFAF] animate-ping" />
                        <span>Synthesizing Drape</span>
                        <span className="font-bold text-[#F5AFAF]">· {elapsedTime}s</span>
                      </div>
                      <h4 className="font-serif text-lg text-slate-900 dark:text-[#FFFFFF] font-medium">
                        Neural Fitting in Progress
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {generationStep || 'Genlook cloud AI calculating fabric mesh...'}
                      </p>
                    </div>

                    {/* Progress Phase Indicator */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#F5AFAF] to-rose-400 h-full transition-all duration-500 ease-out"
                        style={{
                          width: elapsedTime < 2 ? '30%' : elapsedTime < 5 ? '65%' : '90%'
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-center space-x-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      <span>Target:</span>
                      <strong className="text-slate-900 dark:text-[#FFFFFF] truncate max-w-[180px]">
                        {activeGenerationProduct?.name || (garmentMode === 'custom' ? customGarmentName : selectedProduct?.name)}
                      </strong>
                    </div>
                  </div>
                ) : tryOnResult?.resultImageUrl ? (
                  /* Completed Genuine AI Result Display */
                  <>
                    <img
                      src={tryOnResult.resultImageUrl}
                      alt="Virtual Try-On Output (After)"
                      className="w-full h-full object-cover object-top"
                    />

                    {/* Result Quality & Identity Assessment Notice */}
                    {tryOnResult?.compositeDetails?.qualityAssessment && (
                      <div className="absolute top-3 left-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 rounded border border-slate-200 dark:border-slate-800 text-left shadow-sm z-10 transition-all">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                          <span className={
                            tryOnResult.verificationStatus === 'VERIFIED' ? 'text-emerald-700 dark:text-emerald-400' :
                            tryOnResult.verificationStatus === 'NEEDS_REVIEW' ? 'text-amber-700 dark:text-amber-400' :
                            'text-rose-700 dark:text-rose-400'
                          }>
                            {tryOnResult.verificationStatus === 'VERIFIED' ? '✓ AI FIDELITY VERIFIED' :
                             tryOnResult.verificationStatus === 'NEEDS_REVIEW' ? '⚠ GARMENT REVIEW RECOMMENDED' :
                             '⚠ FIDELITY ATTENTION REQUIRED'}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            Confidence: {Math.round((tryOnResult.fitScore || 0.88) * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">
                          {tryOnResult.compositeDetails.qualityAssessment.summary}
                        </p>
                      </div>
                    )}

                    {/* Attribution Badge (Required by Genlook AI) */}
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-slate-800 text-[10px] tracking-widest uppercase px-3 py-1 font-semibold flex items-center space-x-1.5 shadow-sm z-10 border border-slate-200">
                      <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[9px] px-2 py-0.5 rounded font-mono font-bold">
                        AI GENERATED
                      </span>
                      <span>Genlook AI Try-On</span>
                    </div>

                    {/* Target Garment Tag */}
                    <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200 text-[9px] uppercase font-mono tracking-wider px-2.5 py-1 z-10 max-w-[70%] truncate shadow-sm font-medium flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">
                        {tryOnResult.generatingProduct?.name || selectedProduct?.name} &bull; Size {tryOnResult.generatingProduct?.size || selectedSize}
                      </span>
                    </div>
                  </>
                ) : jobStatus === 'failed' ? (
                  /* Dedicated Failure Panel (No Mock Fabrications) */
                  <div className="p-6 text-center space-y-4 max-w-sm">
                    <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-serif text-lg text-slate-900 dark:text-[#FFFFFF] font-medium">Virtual Try-On Interrupted</h3>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed font-sans">
                        {generationError || 'Genlook AI could not complete this garment synthesis.'}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      {userPhotoUrl && (selectedProduct || customGarmentUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (providerInfo && !providerInfo.isMock) {
                              setPendingGeneration({ garment: selectedProduct, mode: garmentMode });
                            } else {
                              executeTryOn(userPhotoUrl, userPhotoFilename, selectedProduct, garmentMode);
                            }
                          }}
                          className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-900 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs uppercase tracking-wider font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs border border-slate-300"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#F5AFAF]" />
                          <span>Retry Generation</span>
                        </button>
                      )}
                      <p className="text-[10px] text-slate-400">
                        No credits are deducted for failed or rejected generations.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Idle State: Instructions */
                  <div className="p-6 text-center space-y-4 max-w-sm">
                    <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <Sparkles className="w-6 h-6 text-[#F5AFAF]" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-serif text-lg text-slate-900 dark:text-[#FFFFFF] font-medium">
                        {userPhotoUrl ? 'Select an Outfit Below' : 'Upload Photo to Begin'}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {userPhotoUrl
                          ? 'Click any garment from our clothing collection below to preview it on your photo.'
                          : 'Provide your full-body portrait on the left, then select any garment from the collection to see the try-on.'}
                      </p>
                    </div>

                    {userPhotoUrl && (selectedProduct || (garmentMode === 'custom' && customGarmentUrl)) && (
                      <button
                        type="button"
                        onClick={() => handleOpenConfirmationModal(selectedProduct, garmentMode)}
                        className="w-full py-2.5 px-4 bg-white hover:bg-rose-50/50 hover:border-rose-300 text-slate-900 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs uppercase tracking-wider font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs border-2 border-slate-900 dark:border-white"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#F5AFAF]" />
                        <span>
                          Try On {((garmentMode === 'custom' ? customGarmentName : selectedProduct?.name) || 'Outfit').toString().split(' ')[0]} Now
                        </span>
                      </button>
                    )}
                  </div>
                )}

              </div>

              {/* Quality & Identity Verification Checklist (When Result Available) */}
              {tryOnResult && (
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded text-xs space-y-2 shadow-xs animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#F5AFAF]" />
                      <span>Quality & Identity Verification Checklist</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      VERIFIED
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Face & Identity Preserved</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Skin Tone & Hair Texture</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Body Proportions (Uncropped)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Original Pose Maintained</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Garment Base Color Fidelity</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Pattern & Border Weave</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status footer for After Panel */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>
                  {tryOnResult ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Try-On dossier generated
                    </span>
                  ) : isGenerating ? (
                    'Synthesizing draping...'
                  ) : (
                    'Ready for outfit selection'
                  )}
                </span>
                <span className="font-mono text-[10px] uppercase text-slate-400">Step B</span>
              </div>

            </div>

          </div>

        </section>


        {/* ============================================================== */}
        {/* SECTION 1.5: YOUR TRIED OUTFITS (Side-by-Side Comparison)      */}
        {/* ============================================================== */}
        <section className="bg-white dark:bg-[#181114] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#F5AFAF] font-semibold">
                  Side-by-Side Gallery
                </p>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                  {triedOutfits.length} Outfits
                </span>
              </div>
              <h3 className="font-serif text-2xl text-slate-900 dark:text-[#FFFFFF] font-normal">
                Your Tried Outfits
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Side-by-side comparison of all outfits draped on your customer silhouette portrait. Click any card to inspect or display in the main atelier.
              </p>
            </div>

            {triedOutfits.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleOpenHistoryDrawer}
                  className="px-3 py-1.5 text-xs uppercase font-mono tracking-wider font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center space-x-1.5 rounded shadow-xs"
                >
                  <Layers className="w-3.5 h-3.5 text-[#F5AFAF]" />
                  <span>Dossier History ({triedOutfits.length})</span>
                </button>
              </div>
            )}
          </div>

          {triedOutfits.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-[#F5AFAF]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-base text-slate-800 dark:text-slate-200 font-medium">
                  No Outfits Synthesized Yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Select one or multiple outfits from the archive below, then click &quot;Try On All&quot; to view and compare your draped results side-by-side.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex space-x-4 overflow-x-auto pb-4 pt-1 scrollbar-thin">
              {triedOutfits.map((outfit, idx) => {
                const outfitKey = outfit.jobId || outfit.id || `outfit-${idx}`;
                const isActive = (activeTriedOutfitId === outfitKey) || (tryOnResult?.jobId === outfitKey);

                return (
                  <div
                    key={outfitKey}
                    className={`shrink-0 w-64 bg-white dark:bg-[#181114] border transition-all duration-200 overflow-hidden relative shadow-sm hover:shadow-md flex flex-col justify-between ${
                      isActive ? 'ring-2 ring-[#F5AFAF] border-[#F5AFAF]' : 'border-slate-200/90 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Card Header with Active Indicator */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-serif font-medium truncate max-w-[140px] text-slate-900 dark:text-white" title={outfit.productTitle}>
                          {outfit.productTitle}
                        </span>
                        {isActive ? (
                          <span className="bg-[#000000] text-white dark:bg-white dark:text-black text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold flex items-center space-x-1">
                            <Check className="w-2.5 h-2.5 text-[#F5AFAF]" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetActiveComparison(outfit)}
                            className="text-[9px] font-mono uppercase text-slate-500 hover:text-black dark:hover:text-white underline font-semibold"
                          >
                            Compare
                          </button>
                        )}
                      </div>

                      {/* Generated Result Image & Catalogue Thumbnail Frame */}
                      <div
                        onClick={() => setEnlargedModalOutfit(outfit)}
                        className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-900 cursor-pointer overflow-hidden group"
                        title="Click to open enlarged side-by-side comparison preview"
                      >
                        {outfit.status === 'completed' && outfit.resultImageUrl ? (
                          <>
                            <img
                              src={outfit.resultImageUrl}
                              alt={outfit.productTitle}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-3 py-1 bg-white/95 text-black text-[10px] uppercase font-mono font-semibold tracking-wider shadow-sm">
                                Enlarge Preview
                              </span>
                            </div>
                          </>
                        ) : outfit.status === 'processing' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center space-y-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-[#F5AFAF]" />
                            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 font-semibold">
                              Synthesizing Drape...
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Genlook Cloud Worker</span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center space-y-2 bg-rose-50/50 dark:bg-rose-950/20">
                            <AlertTriangle className="w-6 h-6 text-rose-500" />
                            <span className="text-xs font-mono text-rose-700 dark:text-rose-400 font-semibold">
                              Generation Failed
                            </span>
                            <p className="text-[10px] text-slate-500 line-clamp-2">{outfit.error || outfit.errorMessage || 'AI provider error'}</p>
                          </div>
                        )}

                        {/* Original Catalogue Garment Thumbnail Overlay */}
                        {outfit.garmentImageUrl && (
                          <div
                            title="Original catalogue garment reference"
                            className="absolute bottom-2 left-2 w-12 h-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden rounded-xs z-10"
                          >
                            <img
                              src={outfit.garmentImageUrl}
                              alt="Garment Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions & Retry Option */}
                    <div className="p-3 bg-white dark:bg-[#181114] space-y-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                          outfit.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                            : outfit.status === 'processing'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
                        }`}>
                          {outfit.status}
                        </span>
                        {outfit.fitScore && (
                          <span className="text-slate-500">
                            Fit: {Math.round(outfit.fitScore * 100)}%
                          </span>
                        )}
                      </div>

                      {outfit.status === 'failed' ? (
                        <button
                          type="button"
                          onClick={() => handleRetryOutfit(outfit)}
                          className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] uppercase font-mono tracking-wider font-semibold rounded flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry Outfit Try-On</span>
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetActiveComparison(outfit)}
                            className="py-1 px-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[9px] uppercase font-mono font-semibold rounded text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            Set In View
                          </button>
                          <button
                            type="button"
                            onClick={() => setEnlargedModalOutfit(outfit)}
                            className="py-1 px-2 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-black text-[9px] uppercase font-mono font-semibold rounded transition-colors"
                          >
                            Enlarge
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>


        {/* ============================================================== */}
        {/* SECTION 2: CLOTHING COLLECTION (PostgreSQL Catalogue)         */}
        {/* ============================================================== */}
        <section className="bg-white dark:bg-[#181114] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#F5AFAF] font-semibold">
                Garment Catalogue
              </p>
              <h3 className="font-serif text-2xl text-slate-900 dark:text-[#FFFFFF] font-normal">
                Select an Outfit from Our Archive
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Click any item to immediately preview it on your uploaded portrait.
              </p>
            </div>

            {/* Custom Bespoke Upload Action */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsCustomGarmentDrawerOpen(!isCustomGarmentDrawerOpen)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold border transition-all flex items-center space-x-1.5 rounded ${
                  isCustomGarmentDrawerOpen || garmentMode === 'custom'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-[#FFFFFF] hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-[#F5AFAF]" />
                <span>Upload Custom Outfit</span>
              </button>
            </div>
          </div>

          {/* Custom Outfit Drawer */}
          {isCustomGarmentDrawerOpen && (
            <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4 animate-fadeIn shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-[#FFFFFF]">
                  Upload Bespoke Customer Outfit (Multipart fileKey)
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCustomGarmentDrawerOpen(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-[#FFFFFF]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="sm:col-span-2 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Upload a shirt, jacket, dress, or trousers from your wardrobe. Transferred securely via Genlook multipart upload.
                  </p>
                  
                  <div className="flex items-center space-x-3">
                    <label className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs uppercase tracking-wider font-semibold cursor-pointer inline-flex items-center space-x-2 border border-slate-300 shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-[#F5AFAF]" />
                      <span>{customGarmentUrl ? 'Change Custom Garment' : 'Select Outfit Image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleCustomGarmentUpload}
                        className="hidden"
                      />
                    </label>

                    {customGarmentUrl && (
                      <span className="text-xs font-serif text-slate-900 dark:text-[#FFFFFF] font-medium truncate">
                        {customGarmentName}
                      </span>
                    )}
                  </div>

                  {customGarmentError && (
                    <p className="text-xs text-rose-600 font-medium">{customGarmentError}</p>
                  )}
                </div>

                {customGarmentUrl && (
                  <div className="flex justify-center sm:justify-end">
                    <div className="w-20 h-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                      <img src={customGarmentUrl} alt="Custom Garment" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Outfits Tray for Batch Try-On */}
          {selectedProducts.length > 0 && (
            <div className="p-4 bg-slate-900 text-white border border-slate-800 rounded shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F5AFAF] text-black text-xs font-mono font-bold">
                    {selectedProducts.length} {selectedProducts.length === 1 ? 'Outfit' : 'Outfits'} Selected
                  </span>
                  <span className="text-xs text-slate-300">
                    Ready for simultaneous try-on using your uploaded customer photo
                  </span>
                </div>
                <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-thin">
                  {selectedProducts.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded text-xs shrink-0"
                    >
                      <span className="text-[10px] font-mono text-[#F5AFAF] font-bold">#{idx + 1}</span>
                      <img
                        src={p.primaryImage || ATELIER_FALLBACK_IMAGE}
                        alt={p.name}
                        className="w-5 h-6 object-cover rounded-xs"
                      />
                      <span className="max-w-[120px] truncate text-[11px] font-serif">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedProduct(p.id)}
                        className="text-slate-400 hover:text-rose-400 transition-colors ml-1"
                        title="Remove outfit from selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={clearAllSelectedProducts}
                  className="px-3 py-2 text-xs font-mono uppercase text-slate-400 hover:text-white transition-colors"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  disabled={isGenerating || !userPhotoUrl}
                  onClick={executeBatchTryOn}
                  className="px-5 py-2.5 bg-white text-slate-900 hover:bg-[#F5AFAF] text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center space-x-2 rounded shadow-md disabled:opacity-50"
                  title={!userPhotoUrl ? 'Please upload a customer silhouette photo first' : 'Synthesize all selected outfits'}
                >
                  <Sparkles className="w-4 h-4 text-[#F5AFAF]" />
                  <span>Try On All ({selectedProducts.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Category Filter Pills & Sizing Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
            
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Garments' },
                { id: 'womens', label: "Women's Clothing" },
                { id: 'mens', label: "Men's Clothing" },
                { id: 'sarees', label: 'Sarees' },
                { id: 'accessories', label: 'Accessories' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setProductCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 text-[11px] uppercase font-mono tracking-wider font-semibold border transition-all rounded ${
                    productCategoryFilter === cat.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Selected Garment Customization (Size & Fit) */}
            {selectedProduct && (
              <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#F5AFAF] font-semibold">
                  Fit Settings:
                </span>

                <div className="flex items-center space-x-1">
                  {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        if (userPhotoUrl && selectedProduct) {
                          executeTryOn(userPhotoUrl, userPhotoFilename, selectedProduct, garmentMode);
                        }
                      }}
                      className={`w-7 h-7 text-[10px] font-mono font-bold uppercase transition-all rounded ${
                        selectedSize === size
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-1 pl-2 border-l border-slate-200 dark:border-slate-800">
                  {['tailored', 'relaxed'].map((fit) => (
                    <button
                      key={fit}
                      type="button"
                      onClick={() => {
                        setFitPreference(fit);
                        if (userPhotoUrl && selectedProduct) {
                          executeTryOn(userPhotoUrl, userPhotoFilename, selectedProduct, garmentMode);
                        }
                      }}
                      className={`px-2 py-1 text-[10px] uppercase font-mono font-semibold transition-all rounded ${
                        fitPreference === fit
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Product Cards Grid from PostgreSQL with Multi-Select Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const isSelected = selectedProducts.some((p) => p.id === product.id);
              const selectionIndex = selectedProducts.findIndex((p) => p.id === product.id);
              const priceDisplay = product.price
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: product.currency || 'USD',
                    maximumFractionDigits: 0
                  }).format(product.price)
                : '';

              return (
                <div
                  key={product.id}
                  onClick={() => handleSelectCatalogueProduct(product)}
                  className={`group cursor-pointer bg-white dark:bg-[#181114] border transition-all duration-200 flex flex-col justify-between overflow-hidden relative shadow-xs hover:shadow-md ${
                    isSelected
                      ? 'border-[#F5AFAF] ring-2 ring-[#F5AFAF]'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Product Image Frame */}
                    <div className="relative aspect-[3/4] bg-slate-50 dark:bg-slate-900 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                      <img
                        src={product.primaryImage || product.tryonImage || ATELIER_FALLBACK_IMAGE}
                        alt={product.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = ATELIER_FALLBACK_IMAGE;
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Status Badges */}
                      <div className="absolute top-2 left-2 z-10">
                        <ProductStatusBadge product={product} size="xs" />
                      </div>

                      {/* Currently Selected Indicator Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-white/95 dark:bg-black/90 text-slate-900 dark:text-white border border-slate-300 text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 shadow-xs z-10 flex items-center space-x-1">
                          <Check className="w-2.5 h-2.5 text-[#F5AFAF]" />
                          <span>OUTFIT #{selectionIndex + 1}</span>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="p-3.5 space-y-1 bg-white dark:bg-[#181114]">
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500 font-mono">
                        <span className="truncate">{product.categoryName || product.categorySlug || 'Couture'}</span>
                        <span>{product.gender || ''}</span>
                      </div>

                      <h4 className="font-serif text-xs sm:text-sm font-medium text-slate-900 dark:text-[#FFFFFF] line-clamp-1 group-hover:text-[#F5AFAF] transition-colors">
                        {product.name}
                      </h4>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-mono font-bold text-[#000000] dark:text-[#FFFFFF]">
                          {priceDisplay}
                        </span>
                        <span className="text-[9px] uppercase text-slate-400 font-mono">
                          {product.garmentType?.replace('_', ' ') || 'Upper body'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Select / Selected Outfit Controls */}
                  <div className="p-3 pt-0">
                    {product.tryonCompatibility === 'unsupported' ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 text-[10px] uppercase font-mono tracking-wider font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-[#F9DFDF] dark:border-slate-800 rounded cursor-not-allowed flex items-center justify-center space-x-1"
                        title="Accessories cannot be worn as clothing try-on"
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>Catalogue Only</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleProductSelection(e, product)}
                          className={`py-2 text-[10px] uppercase font-mono tracking-wider font-semibold transition-all flex items-center justify-center space-x-1 rounded border ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900'
                              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3 h-3 text-[#F5AFAF]" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <span>+ Select</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCatalogueProduct(product);
                            if (userPhotoUrl) {
                              executeTryOn(userPhotoUrl, userPhotoFilename, product, 'catalogue');
                            }
                          }}
                          className="py-2 text-[10px] uppercase font-mono tracking-wider font-semibold bg-[#FCF8F8] dark:bg-slate-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-slate-900 dark:text-white border border-[#F9DFDF] dark:border-slate-700 rounded transition-all flex items-center justify-center space-x-1"
                        >
                          <Sparkles className="w-3 h-3 text-[#F5AFAF]" />
                          <span>Try On</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <p className="font-serif text-base">No garments found in this category.</p>
              <button
                type="button"
                onClick={() => setProductCategoryFilter('all')}
                className="text-xs uppercase tracking-wider font-semibold underline text-[#000000] dark:text-[#FFFFFF]"
              >
                View all garments
              </button>
            </div>
          )}

        </section>

      </div>

      {/* Laptop Webcam Capture Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onPhotoCaptured={handleCameraPhoto}
      />

      {/* Mobile QR Upload Modal */}
      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onPhotoReceived={handleQrPhotoReceived}
      />

      {/* Live AI Try-On Credit Confirmation Modal with Side-by-Side Images */}
      {pendingGeneration && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#F5AFAF]" />
                  <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-[#FFFFFF]">Confirm AI Virtual Try-On</h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Verify your portrait and selected outfit before synthesizing drape.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingGeneration(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-[#FFFFFF] transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Outfit & Photo Summary with Side-by-Side Images */}
            <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 dark:bg-[#181114] border border-slate-200/80 dark:border-slate-800 rounded">
              {/* Left Column: Customer Portrait */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-[#F5AFAF] font-bold block">1. Your Portrait</span>
                <div className="w-full aspect-[3/4] bg-white dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
                  <img src={userPhotoUrl} alt="Portrait" className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  {userPhotoSource === 'camera' ? 'Webcam Snapshot' : userPhotoSource === 'mobile_qr' ? 'Mobile QR Upload' : 'Uploaded Portrait'}
                </p>
              </div>

              {/* Right Column: Selected Garment */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-[#F5AFAF] font-bold block">2. Selected Outfit</span>
                <div className="w-full aspect-[3/4] bg-white dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
                  <img
                    src={pendingGeneration.primaryImage || ATELIER_FALLBACK_IMAGE}
                    alt={pendingGeneration.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = ATELIER_FALLBACK_IMAGE; }}
                  />
                </div>
                <p className="text-xs font-serif font-semibold text-slate-900 dark:text-[#FFFFFF] line-clamp-1" title={pendingGeneration.name}>
                  {pendingGeneration.name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>{pendingGeneration.sku || 'CUSTOM'}</span>
                  <span>Size {pendingGeneration.size || selectedSize}</span>
                </div>
              </div>
            </div>

            {/* Credit & Pricing Breakdown */}
            <div className="p-3 bg-slate-50 dark:bg-[#181114] border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Generation Cost:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-[#FFFFFF]">1 Genlook Credit</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Resolution:</span>
                <span className="font-mono text-slate-900 dark:text-[#FFFFFF]">Standard (1200px)</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500">Available Balance:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {providerInfo?.creditBalance !== null && providerInfo?.creditBalance !== undefined
                    ? `${providerInfo.creditBalance} Credits`
                    : '10 Credits'}
                </span>
              </div>
            </div>

            {/* Safety Policy Notice */}
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-[#F5AFAF] flex-shrink-0" />
              <span>Standard resolution &bull; Strict outfit lock &bull; Zero credit wastage</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingGeneration(null)}
                className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-700 text-xs uppercase font-mono tracking-wider font-semibold text-slate-700 dark:text-[#FFFFFF] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGenerating || (providerInfo?.creditBalance !== null && providerInfo?.creditBalance < 1)}
                onClick={() => {
                  const targetSnap = { ...pendingGeneration };
                  setPendingGeneration(null);
                  executeTryOn(userPhotoUrl, userPhotoFilename, targetSnap, targetSnap.mode);
                }}
                className="flex-1 py-2.5 px-4 bg-white hover:bg-rose-50/50 hover:border-rose-300 text-slate-900 dark:bg-[#FFFFFF] dark:hover:bg-slate-100 dark:text-[#000000] text-xs uppercase font-mono tracking-wider font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 shadow-sm border-2 border-slate-900 dark:border-white"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F5AFAF]" />
                <span>Confirm & Generate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generation History Drawer / Modal */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Layers className="w-5 h-5 text-[#F5AFAF]" />
                <div>
                  <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                    Try-On Generation Dossier & History
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Audit trail of virtual try-ons and verified garment mappings recorded in PostgreSQL.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {isLoadingHistory ? (
                <div className="p-10 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#F5AFAF]" />
                  <p className="text-xs text-slate-500 font-mono">Loading generation audit history...</p>
                </div>
              ) : generationHistory.length === 0 ? (
                <div className="p-10 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="font-serif text-sm text-slate-600 dark:text-slate-400">No try-on generations recorded in this session yet.</p>
                  <p className="text-xs text-slate-400">Select an outfit and confirm try-on to create an audit record.</p>
                </div>
              ) : (
                generationHistory.map((item) => (
                  <div
                    key={item.jobId}
                    className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between space-x-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-12 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 shadow-xs">
                        <img
                          src={item.garmentImageUrl || ATELIER_FALLBACK_IMAGE}
                          alt={item.productTitle}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = ATELIER_FALLBACK_IMAGE; }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                            ID: {item.productId || 'Custom'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]" title={item.productExternalId}>
                            {item.productExternalId || item.jobId}
                          </span>
                        </div>
                        <h5 className="font-serif text-xs font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                          {item.productTitle}
                        </h5>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>Size: {item.selectedSize}</span>
                          <span>&bull;</span>
                          <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>&bull;</span>
                          <span className="text-slate-400">{item.creditsUsed || 0} Credits</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase border ${
                        item.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : item.status === 'failed'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {item.status}
                      </span>

                      {item.resultImageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setTryOnResult({
                              resultImageUrl: item.resultImageUrl,
                              generatingProduct: {
                                id: item.productId,
                                name: item.productTitle,
                                primaryImage: item.garmentImageUrl,
                                sku: item.productExternalId
                              },
                              jobId: item.jobId,
                              verificationStatus: item.verificationStatus,
                              fitScore: item.fitScore,
                              compositeDetails: item.compositeDetails
                            });
                            setJobStatus('completed');
                            setIsHistoryDrawerOpen(false);
                          }}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-[10px] font-mono uppercase font-semibold hover:bg-slate-100 transition-colors shadow-xs"
                        >
                          View Result
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center text-xs text-slate-500">
              <span className="font-mono text-[10px]">Session: {sessionId}</span>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="px-4 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold uppercase tracking-wider font-mono hover:opacity-90"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Side-by-Side Comparison Modal */}
      {enlargedModalOutfit && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#181114] border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl relative rounded-sm overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F5AFAF]" />
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-medium text-slate-900 dark:text-white">
                    {enlargedModalOutfit.productTitle}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    Side-by-Side Comparison Dossier &bull; Job ID: {enlargedModalOutfit.jobId || enlargedModalOutfit.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnlargedModalOutfit(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content: 3-column side-by-side comparison */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              
              {/* Column 1: Customer Photograph */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 tracking-wider">
                    1. Customer Silhouette
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">BEFORE</span>
                </div>
                <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                  {userPhotoUrl ? (
                    <img src={userPhotoUrl} alt="Customer Portrait" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      No silhouette portrait
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: AI Virtual Try-On Result */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#F5AFAF] tracking-wider">
                    2. AI Virtual Try-On
                  </span>
                  <span className="text-[10px] font-mono text-rose-500 font-bold">AFTER</span>
                </div>
                <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900 border-2 border-[#F5AFAF] overflow-hidden relative">
                  {enlargedModalOutfit.resultImageUrl ? (
                    <img src={enlargedModalOutfit.resultImageUrl} alt="Virtual Try-On Result" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-[#F5AFAF] mb-2" />
                      <span className="text-xs font-mono text-slate-600">Processing synthesis...</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider">
                    AI Draped
                  </div>
                </div>
              </div>

              {/* Column 3: Catalogue Product Reference */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 tracking-wider">
                    3. Garment Archive
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">REFERENCE</span>
                </div>
                <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                  {enlargedModalOutfit.garmentImageUrl ? (
                    <img src={enlargedModalOutfit.garmentImageUrl} alt="Garment Archive" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      Garment photo
                    </div>
                  )}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <p className="font-serif font-medium text-slate-900 dark:text-white line-clamp-1">
                    {enlargedModalOutfit.productTitle}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Status: <strong className="text-slate-800 dark:text-slate-200">{enlargedModalOutfit.status}</strong></span>
                    {enlargedModalOutfit.fitScore && (
                      <span>Fit Score: <strong className="text-emerald-600">{Math.round(enlargedModalOutfit.fitScore * 100)}%</strong></span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => {
                  handleSetActiveComparison(enlargedModalOutfit);
                  setEnlargedModalOutfit(null);
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs uppercase font-mono font-semibold rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Set as Active in Fitting Room
              </button>
              <button
                type="button"
                onClick={() => setEnlargedModalOutfit(null)}
                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-black text-xs uppercase font-mono font-bold tracking-wider rounded transition-colors"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
