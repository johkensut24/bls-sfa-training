import React, { useState, useRef, useEffect } from "react";

/**
 * ManualCropperModal - DOH Authority Registry Theme
 * Professional teal/slate interface for personnel signature assets.
 */
const ManualCropperModal = ({
  imageSrc,
  onClose,
  onSave,
  aspectRatio = 3 / 1,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [image, setImage] = useState(null);
  const [cropArea, setCropArea] = useState({
    x: 50,
    y: 50,
    width: 300,
    height: 100,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      const initialWidth = Math.min(img.width * 0.6, 400);
      const initialHeight = initialWidth / aspectRatio;
      setCropArea({
        x: (img.width - initialWidth) / 2,
        y: (img.height - initialHeight) / 2,
        width: initialWidth,
        height: initialHeight,
      });
    };
    img.src = imageSrc;
  }, [imageSrc, aspectRatio]);

  // Update container size
  useEffect(() => {
    if (containerRef.current) {
      const updateSize = () => {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      };
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
  }, []);

  // Draw canvas (Updated with Registry Colors)
  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const containerWidth = containerSize.width || 600;
    const containerHeight = containerSize.height || 400;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const scale = Math.min(
      containerWidth / image.width,
      containerHeight / image.height,
    );
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const offsetX = (containerWidth - scaledWidth) / 2;
    const offsetY = (containerHeight - scaledHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);

    // DOH Dark Overlay
    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaledCropX = cropArea.x * scale + offsetX;
    const scaledCropY = cropArea.y * scale + offsetY;
    const scaledCropWidth = cropArea.width * scale;
    const scaledCropHeight = cropArea.height * scale;

    ctx.clearRect(scaledCropX, scaledCropY, scaledCropWidth, scaledCropHeight);
    ctx.drawImage(
      image,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      scaledCropX,
      scaledCropY,
      scaledCropWidth,
      scaledCropHeight,
    );

    // REGISTRY TEAL STROKE
    ctx.strokeStyle = "#006666";
    ctx.lineWidth = 3;
    ctx.strokeRect(scaledCropX, scaledCropY, scaledCropWidth, scaledCropHeight);

    // HANDLE STYLING
    const handleSize = 10;
    ctx.fillStyle = "#006666";
    const handles = [
      { x: scaledCropX, y: scaledCropY },
      { x: scaledCropX + scaledCropWidth, y: scaledCropY },
      { x: scaledCropX, y: scaledCropY + scaledCropHeight },
      { x: scaledCropX + scaledCropWidth, y: scaledCropY + scaledCropHeight },
      { x: scaledCropX + scaledCropWidth / 2, y: scaledCropY },
      {
        x: scaledCropX + scaledCropWidth / 2,
        y: scaledCropY + scaledCropHeight,
      },
      { x: scaledCropX, y: scaledCropY + scaledCropHeight / 2 },
      {
        x: scaledCropX + scaledCropWidth,
        y: scaledCropY + scaledCropHeight / 2,
      },
    ];

    handles.forEach((h) => {
      ctx.beginPath();
      ctx.arc(h.x, h.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // DIMENSIONS TEXT
    ctx.fillStyle = "white";
    ctx.font = "bold 10px Inter, sans-serif";
    const text = `${Math.round(cropArea.width)} × ${Math.round(cropArea.height)} PX`;
    ctx.fillText(text, scaledCropX, scaledCropY - 10);
  }, [image, cropArea, containerSize, aspectRatio]);

  // Logic Handlers (Unchanged)
  const getCursorPosition = (e) => {
    if (!canvasRef.current || !image) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(
      rect.width / image.width,
      rect.height / image.height,
    );
    const offsetX = (rect.width - image.width * scale) / 2;
    const offsetY = (rect.height - image.height * scale) / 2;
    return {
      x: (e.clientX - rect.left - offsetX) / scale,
      y: (e.clientY - rect.top - offsetY) / scale,
      scale,
      offsetX,
      offsetY,
    };
  };

  const getHandleAtPosition = (x, y) => {
    const handleSize = 15;
    const pos = getCursorPosition({ clientX: x, clientY: y });
    if (!pos) return null;
    const { scale, offsetX, offsetY } = pos;
    const sx = cropArea.x * scale + offsetX;
    const sy = cropArea.y * scale + offsetY;
    const sw = cropArea.width * scale;
    const sh = cropArea.height * scale;
    const rx = x - canvasRef.current.getBoundingClientRect().left;
    const ry = y - canvasRef.current.getBoundingClientRect().top;

    if (Math.abs(rx - sx) < handleSize && Math.abs(ry - sy) < handleSize)
      return "nw";
    if (Math.abs(rx - (sx + sw)) < handleSize && Math.abs(ry - sy) < handleSize)
      return "ne";
    if (Math.abs(rx - sx) < handleSize && Math.abs(ry - (sy + sh)) < handleSize)
      return "sw";
    if (
      Math.abs(rx - (sx + sw)) < handleSize &&
      Math.abs(ry - (sy + sh)) < handleSize
    )
      return "se";
    if (
      Math.abs(rx - (sx + sw / 2)) < handleSize &&
      Math.abs(ry - sy) < handleSize
    )
      return "n";
    if (
      Math.abs(rx - (sx + sw / 2)) < handleSize &&
      Math.abs(ry - (sy + sh)) < handleSize
    )
      return "s";
    if (
      Math.abs(rx - sx) < handleSize &&
      Math.abs(ry - (sy + sh / 2)) < handleSize
    )
      return "w";
    if (
      Math.abs(rx - (sx + sw)) < handleSize &&
      Math.abs(ry - (sy + sh / 2)) < handleSize
    )
      return "e";
    if (rx > sx && rx < sx + sw && ry > sy && ry < sy + sh) return "move";
    return null;
  };

  const handleMouseDown = (e) => {
    const pos = getCursorPosition(e);
    if (!pos) return;
    const handle = getHandleAtPosition(e.clientX, e.clientY);
    if (handle === "move") {
      setIsDragging(true);
      setDragStart({ x: pos.x - cropArea.x, y: pos.y - cropArea.y });
    } else if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
      setDragStart({ x: pos.x, y: pos.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) {
      const handle = getHandleAtPosition(e.clientX, e.clientY);
      const cursorMap = {
        nw: "nw-resize",
        ne: "ne-resize",
        sw: "sw-resize",
        se: "se-resize",
        n: "n-resize",
        s: "s-resize",
        w: "w-resize",
        e: "e-resize",
        move: "move",
      };
      canvasRef.current.style.cursor = cursorMap[handle] || "default";
      return;
    }
    const pos = getCursorPosition(e);
    if (!pos || !image) return;

    if (isDragging) {
      let newX = Math.max(
        0,
        Math.min(pos.x - dragStart.x, image.width - cropArea.width),
      );
      let newY = Math.max(
        0,
        Math.min(pos.y - dragStart.y, image.height - cropArea.height),
      );
      setCropArea({ ...cropArea, x: newX, y: newY });
    } else if (isResizing) {
      const deltaX = pos.x - dragStart.x;
      const deltaY = pos.y - dragStart.y;
      let { x, y, width, height } = cropArea;

      if (resizeHandle.includes("e")) width += deltaX;
      if (resizeHandle.includes("w")) {
        x += deltaX;
        width -= deltaX;
      }
      if (resizeHandle.includes("s")) height += deltaY;
      if (resizeHandle.includes("n")) {
        y += deltaY;
        height -= deltaY;
      }

      if (["nw", "ne", "sw", "se"].includes(resizeHandle)) {
        height = width / aspectRatio;
      }

      if (width > 50 && height > 50) {
        setCropArea({ x, y, width, height });
        setDragStart({ x: pos.x, y: pos.y });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };
  const handleReset = () => {
    const initialWidth = Math.min(image.width * 0.6, 400);
    setCropArea({
      x: (image.width - initialWidth) / 2,
      y: (image.height - initialWidth / aspectRatio) / 2,
      width: initialWidth,
      height: initialWidth / aspectRatio,
    });
  };

  const handleSave = async () => {
    if (!image) return;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400 / aspectRatio;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-[2rem] border-b-8 border-[#006666] p-8 max-w-4xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* DOH THEMED HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#F0F9F9] flex items-center justify-center border border-[#006666]/20">
              <svg
                className="w-6 h-6 text-[#006666]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                Asset Processing
              </h3>
              <p className="text-[10px] font-bold text-[#006666] uppercase tracking-[0.3em] mt-0.5">
                Personnel Signature Cropper
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            ✕
          </button>
        </div>

        {/* WORK AREA */}
        <div
          ref={containerRef}
          className="relative bg-slate-50 rounded-2xl border-2 border-slate-100 overflow-hidden shadow-inner"
          style={{ height: "380px" }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* DOH INSTRUCTION FOOTER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="flex gap-4 items-start p-4 bg-[#F0F9F9] rounded-2xl border border-[#006666]/10">
            <div className="w-2 h-2 rounded-full bg-[#006666] mt-1.5 shrink-0" />
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Ensure the signature is{" "}
              <strong className="text-[#006666]">centered</strong> and avoids
              the edges of the selection box for the best rendering on the
              Authority Registry cards.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              ↻ Reset Area
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] py-4 bg-[#006666] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#006666]/20 hover:bg-[#004D4D] transition-all active:scale-95"
            >
              ✓ Finalize & Save Asset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualCropperModal;
