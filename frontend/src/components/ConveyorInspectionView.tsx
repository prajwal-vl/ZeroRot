import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  Upload,
  RefreshCw
} from 'lucide-react';
import { DataBadge } from './DataBadge';
import { api } from '../services/api';

interface InspectionResult {
  id: string;
  timestamp: string;
  commodity: string;
  classification: 'GOOD' | 'MODERATELY_DAMAGED' | 'REJECTED';
  grade: string;
  confidence_score: number;
  defect_surface_ratio_pct: number;
  defects_detected: Array<{ type: string; severity: string; area_pct: number }>;
  recommended_destination: string;
  bounding_box: { x: number; y: number; width: number; height: number };
  data_label: string;
}

export const ConveyorInspectionView: React.FC = () => {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('tomato');
  const [isAutoConveyor, setIsAutoConveyor] = useState<boolean>(true);
  const [currentScan, setCurrentScan] = useState<InspectionResult | null>(null);
  const [history, setHistory] = useState<InspectionResult[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const conveyorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const beltOffsetRef = useRef<number>(0);

  const totalCount = history.length;
  const goodCount = history.filter((h) => h.classification === 'GOOD').length;
  const modCount = history.filter((h) => h.classification === 'MODERATELY_DAMAGED').length;
  const rejectedCount = history.filter((h) => h.classification === 'REJECTED').length;

  const triggerScan = async (profile: string = 'random') => {
    setIsScanning(true);
    try {
      const res = await api.scanConveyorItem(selectedCommodity, profile);
      if (res.status === 'SUCCESS') {
        const item: InspectionResult = {
          ...res,
          id: `SCAN-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleTimeString(),
        };
        setCurrentScan(item);
        setHistory((prev) => [item, ...prev.slice(0, 19)]);
      }
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    triggerScan('GOOD');
  }, []);

  useEffect(() => {
    if (!isAutoConveyor) return;
    const interval = setInterval(() => {
      triggerScan('random');
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoConveyor, selectedCommodity]);

  // Continuous 2D Canvas Conveyor Animation
  useEffect(() => {
    const canvas = conveyorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      beltOffsetRef.current = (beltOffsetRef.current + 1.2) % 30;

      // Conveyor Bed
      const beltY = 160;
      const beltHeight = 55;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(40, beltY, canvas.width - 80, beltHeight);

      // Rollers
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      for (let x = 40 + beltOffsetRef.current; x < canvas.width - 40; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, beltY);
        ctx.lineTo(x, beltY + beltHeight);
        ctx.stroke();
      }

      // Belt Rail Guides
      ctx.fillStyle = '#64748B';
      ctx.fillRect(35, beltY - 6, canvas.width - 70, 6);
      ctx.fillRect(35, beltY + beltHeight, canvas.width - 70, 6);

      // Overhead Camera Inspection Arch
      const cameraX = canvas.width / 2;
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(cameraX - 60, 20, 12, beltY - 20);
      ctx.fillRect(cameraX + 48, 20, 12, beltY - 20);
      ctx.fillStyle = '#1E40AF';
      ctx.fillRect(cameraX - 60, 20, 120, 10);

      // Camera Enclosure
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(cameraX - 25, 30, 50, 45);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.strokeRect(cameraX - 25, 30, 50, 45);

      // Lens
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(cameraX, 52, 12, 0, Math.PI * 2);
      ctx.fill();

      // Scanning Laser Beam
      const time = Date.now() / 300;
      const beamSpread = Math.sin(time) * 20;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(cameraX, 64);
      ctx.lineTo(cameraX - 45 + beamSpread, beltY);
      ctx.lineTo(cameraX + 45 + beamSpread, beltY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cameraX - 45 + beamSpread, beltY + beltHeight / 2);
      ctx.lineTo(cameraX + 45 + beamSpread, beltY + beltHeight / 2);
      ctx.stroke();

      // Produce item on belt
      const itemColor =
        selectedCommodity === 'tomato'
          ? '#EF4444'
          : selectedCommodity === 'mango'
          ? '#F59E0B'
          : selectedCommodity === 'banana'
          ? '#EAB308'
          : selectedCommodity === 'potato'
          ? '#B45309'
          : '#A855F7';

      ctx.fillStyle = itemColor;
      ctx.beginPath();
      ctx.arc(cameraX, beltY + beltHeight / 2, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (currentScan) {
        ctx.strokeStyle =
          currentScan.classification === 'GOOD'
            ? '#16A34A'
            : currentScan.classification === 'MODERATELY_DAMAGED'
            ? '#D97706'
            : '#DC2626';
        ctx.lineWidth = 2;
        ctx.strokeRect(cameraX - 26, beltY + beltHeight / 2 - 26, 52, 52);

        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(`${(currentScan.confidence_score * 100).toFixed(0)}%`, cameraX - 24, beltY + beltHeight / 2 - 30);
      }

      // Incoming item
      ctx.fillStyle = itemColor;
      ctx.beginPath();
      ctx.arc(cameraX - 160, beltY + beltHeight / 2, 22, 0, Math.PI * 2);
      ctx.fill();

      // Diverter
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cameraX + 110, beltY);
      ctx.lineTo(cameraX + 150, beltY + beltHeight - 8);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [selectedCommodity, currentScan]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadedFile(file);
    setIsScanning(true);
    try {
      const res = await api.uploadProduceImage(selectedCommodity, file);
      if (res.status === 'SUCCESS') {
        const item: InspectionResult = {
          ...res,
          id: `FILE-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleTimeString(),
        };
        setCurrentScan(item);
        setHistory((prev) => [item, ...prev.slice(0, 19)]);
      }
    } catch (err) {
      console.error('File upload inspection error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Automated Produce Inspection — 2D Conveyor Twin
            </h3>
            <DataBadge label="PREDICTED" sourceText="OpenCV Vision Pipeline" />
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Optical grading chamber. Analyzes fruit surface lesions, rot, and necrosis in HSV
            color space to classify produce into three sorting destinations.
          </p>
        </div>

        {/* Commodity Selector & Conveyor Run Toggle */}
        <div className="flex items-center gap-3">
          <select
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="tomato">Tomato</option>
            <option value="mango">Mango</option>
            <option value="banana">Banana</option>
            <option value="potato">Potato</option>
            <option value="onion">Onion</option>
          </select>

          <button
            onClick={() => setIsAutoConveyor(!isAutoConveyor)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs ${
              isAutoConveyor
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isAutoConveyor ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoConveyor ? 'AUTO BELT ON' : 'PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* Conveyor Canvas 2D Animated Environment */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 text-xs text-slate-500 border-b border-slate-200 pb-2">
          <span className="flex items-center gap-2 text-slate-900 font-semibold">
            <ScanLine className="w-4 h-4 text-blue-600" />
            Inspection Camera Active (30 FPS Optical Flow)
          </span>
          <div className="flex items-center gap-3">
            <span>Laser: <strong className="text-blue-600">ACTIVE</strong></span>
            <span>Belt Speed: <strong className="text-slate-900">0.45 m/s</strong></span>
          </div>
        </div>

        <div className="relative w-full aspect-[21/9] max-h-[300px] bg-slate-950 border-2 border-slate-800 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
          <canvas
            ref={conveyorCanvasRef}
            width={780}
            height={260}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Sorting Destination Trays below belt */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {/* Destination 1: Good */}
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-lg flex items-center justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Destination 1: Premium Cold Storage</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5">Grade A export &amp; cold hub allocation.</p>
            </div>
            <div className="text-xl font-bold text-emerald-700">{goodCount}</div>
          </div>

          {/* Destination 2: Moderate */}
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg flex items-center justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Destination 2: Local Mandi / Quick Sale</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">Grade B secondary market &amp; processing.</p>
            </div>
            <div className="text-xl font-bold text-amber-700">{modCount}</div>
          </div>

          {/* Destination 3: Rejected */}
          <div className="bg-red-50 border border-red-200 p-3.5 rounded-lg flex items-center justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-red-800 text-xs font-bold">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Destination 3: Rejection Bay</span>
              </div>
              <p className="text-[11px] text-red-700 mt-0.5">Grade C spoiled / composting.</p>
            </div>
            <div className="text-xl font-bold text-red-700">{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Scan Results & Inspection History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Scan Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase text-slate-800">Latest Optical Analysis</span>
            </div>
            {currentScan && <DataBadge label={currentScan.data_label} />}
          </div>

          {currentScan ? (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-500">Classified Grade:</span>
                  <strong
                    className={`text-sm px-2 py-0.5 rounded font-bold ${
                      currentScan.classification === 'GOOD'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentScan.classification === 'MODERATELY_DAMAGED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {currentScan.grade}
                  </strong>
                </div>

                <div className="flex justify-between text-slate-500 mt-2">
                  <span>Confidence Score:</span>
                  <strong className="text-slate-900">{(currentScan.confidence_score * 100).toFixed(1)}%</strong>
                </div>
                <div className="flex justify-between text-slate-500 mt-1">
                  <span>Defect Surface Ratio:</span>
                  <strong className="text-slate-900">{currentScan.defect_surface_ratio_pct}%</strong>
                </div>
                <div className="flex justify-between text-slate-500 mt-1">
                  <span>Assigned Lane:</span>
                  <strong className="text-blue-600 truncate max-w-[200px]">
                    {currentScan.recommended_destination}
                  </strong>
                </div>
              </div>

              {/* Defect breakdown list */}
              <div>
                <span className="text-slate-600 font-semibold block mb-1.5 uppercase text-[11px]">
                  Detected Surface Defects:
                </span>
                {currentScan.defects_detected.length === 0 ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-center font-medium">
                    Zero visual blemishes detected. Clean epidermal cuticle.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {currentScan.defects_detected.map((d, i) => (
                      <div
                        key={i}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center"
                      >
                        <span className="text-slate-800 font-medium">{d.type}</span>
                        <span className="text-red-600 font-bold">
                          {d.area_pct}% ({d.severity})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs">Awaiting scan trigger...</div>
          )}

          {/* Manual Trigger Buttons & Real Photo Upload */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => triggerScan('GOOD')}
                disabled={isScanning}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold rounded-lg text-white transition-colors shadow-xs"
              >
                Scan Good
              </button>
              <button
                onClick={() => triggerScan('MODERATE')}
                disabled={isScanning}
                className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-xs font-semibold rounded-lg text-white transition-colors shadow-xs"
              >
                Scan Moderate
              </button>
              <button
                onClick={() => triggerScan('SPOILED')}
                disabled={isScanning}
                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-xs font-semibold rounded-lg text-white transition-colors shadow-xs"
              >
                Scan Spoiled
              </button>
            </div>

            {/* Real File Upload */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-center justify-between text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                <span className="flex items-center gap-2 font-medium">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Upload Real Produce Photo</span>
                </span>
                <span className="text-[10px] bg-blue-600 px-2.5 py-1 rounded text-white font-semibold">Browse</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadedFile && (
                <span className="text-[10px] text-blue-700 font-semibold block mt-1">
                  Inspecting: {uploadedFile.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Batch Inspection History Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
            <span className="text-xs uppercase font-bold text-slate-700">
              Inspection Batch Telemetry Log ({totalCount} Inspected)
            </span>
            <button
              onClick={() => setHistory([])}
              className="text-[11px] text-slate-500 hover:text-slate-800"
            >
              Clear Log
            </button>
          </div>

          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 font-semibold">Item ID</th>
                  <th className="p-2.5 font-semibold">Commodity</th>
                  <th className="p-2.5 font-semibold">Grade</th>
                  <th className="p-2.5 font-semibold">Confidence</th>
                  <th className="p-2.5 font-semibold">Defect Area</th>
                  <th className="p-2.5 font-semibold">Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">
                      No inspection items logged yet.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-slate-900">{item.id}</td>
                      <td className="p-2.5 capitalize">{item.commodity}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.classification === 'GOOD'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.classification === 'MODERATELY_DAMAGED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.grade.split(' ')[0]} {item.grade.split(' ')[1]}
                        </span>
                      </td>
                      <td className="p-2.5">{(item.confidence_score * 100).toFixed(0)}%</td>
                      <td className="p-2.5">{item.defect_surface_ratio_pct}%</td>
                      <td className="p-2.5 text-slate-500 truncate max-w-[140px]">
                        {item.recommended_destination.split(':')[1] || item.recommended_destination}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
