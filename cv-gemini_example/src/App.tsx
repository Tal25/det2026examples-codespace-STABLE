/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Camera, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { analyzeVideoFrame, DetectedObject } from "./analysis";

export default function App() {
  // Refs for video and canvas elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for application status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);

  // Initialize webcam on mount
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraReady(true);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please ensure you have given permission.");
      }
    }
    setupCamera();

    // Cleanup stream on unmount
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Captures the current frame from the video and sends it to Gemini for analysis.
   */
  const analyzeFrame = async () => {
    if (!videoRef.current || !isCameraReady || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeVideoFrame(videoRef.current);
      setObjects(result);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Real-time analysis loop
  useEffect(() => {
    if (!isCameraReady || !isRealtime) return;

    const interval = setInterval(() => {
      if (!isAnalyzing) {
        analyzeFrame();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isCameraReady, isRealtime, isAnalyzing]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-sans">
      {/* Header / Status */}
      <div className="absolute top-8 left-0 right-0 flex flex-col items-center gap-2 z-20">
        <h1 className="text-xl font-light tracking-widest uppercase opacity-80">
          Gemini 3 Visual Analysis
        </h1>
        <div className="flex items-center gap-2 text-xs font-mono opacity-50">
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Analyzing Frame...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              <span>Manual Capture Mode</span>
            </>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="relative w-full max-w-4xl aspect-video bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5">
        {/* Video Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Bounding Box Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence>
            {objects.map((obj, index) => {
              const [ymin, xmin, ymax, xmax] = obj.box_2d;
              // Convert 0-1000 normalized coordinates to percentages
              const top = ymin / 10;
              const left = xmin / 10;
              const height = (ymax - ymin) / 10;
              const width = (xmax - xmin) / 10;

              const isPhone = obj.label.toLowerCase().includes("phone") || obj.label.toLowerCase().includes("cellphone");
              const boxColor = isPhone ? "border-red-500/60 bg-red-500/10" : "border-cyan-400/60 bg-cyan-400/10";
              const labelColor = isPhone ? "bg-red-500" : "bg-cyan-400";

              return (
                <motion.div
                  key={`${obj.label}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className={`absolute border-2 rounded-sm ${boxColor}`}
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                >
                  <div className={`absolute -top-6 left-0 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-t-sm whitespace-nowrap uppercase tracking-tighter ${labelColor}`}>
                    {obj.label}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Error Message Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 p-6 text-center">
            <div className="max-w-xs">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-neutral-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Initial Loading State */}
        {!isCameraReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 z-10">
            <Camera className="w-12 h-12 text-neutral-700 mb-4 animate-pulse" />
            <p className="text-neutral-500 text-sm animate-pulse">Initializing Camera...</p>
          </div>
        )}
      </div>

      {/* Action Button & Controls */}
      <div className="mt-8 flex flex-col items-center gap-6">
        <div className="flex items-center gap-8">
          {/* Real-time Toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={isRealtime}
                onChange={(e) => setIsRealtime(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-neutral-300 transition-colors">
              Real-time Detection
            </span>
          </label>

          {/* Manual Trigger */}
          <button
            onClick={analyzeFrame}
            disabled={!isCameraReady || isAnalyzing || isRealtime}
            className="group relative px-6 py-2 bg-white text-black rounded-full font-bold uppercase tracking-widest text-[10px] overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isAnalyzing && !isRealtime ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="w-3 h-3" />
                  Capture Frame
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>

      </div>
    </div>
  );
}
