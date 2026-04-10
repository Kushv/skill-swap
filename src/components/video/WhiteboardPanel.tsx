import { useRef, useEffect, useState } from "react";

interface Props {
  socket: any;
  roomId: string;
}

export default function WhiteboardPanel({ socket, roomId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState("#a78bfa");
  const [lineWidth, setLineWidth] = useState(3);

  // Draw a line segment
  const drawSegment = (x0: number, y0: number, x1: number, y1: number, c: string, lw: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("whiteboard-draw", (data: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawSegment(
        data.x0 * canvas.width,
        data.y0 * canvas.height,
        data.x1 * canvas.width,
        data.y1 * canvas.height,
        data.color,
        data.lineWidth
      );
    });

    socket.on("whiteboard-clear", () => {
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off("whiteboard-draw");
      socket.off("whiteboard-clear");
    };
  }, [socket]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current!;
    const { x, y } = getPos(e);
    const { x: x0, y: y0 } = lastPosRef.current;
    drawSegment(x0, y0, x, y, color, lineWidth);
    if (socket) {
      socket.emit("whiteboard-draw", {
        roomId,
        x0: x0 / canvas.width,
        y0: y0 / canvas.height,
        x1: x / canvas.width,
        y1: y / canvas.height,
        color,
        lineWidth,
      });
    }
    lastPosRef.current = { x, y };
  };

  const onMouseUp = () => { isDrawingRef.current = false; };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    if (socket) socket.emit("whiteboard-clear", { roomId });
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col glass-card m-4 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <span className="text-sm font-semibold">Whiteboard</span>
        <div className="flex items-center gap-2 ml-2">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-border"
            title="Pen color"
          />
          <input
            type="range"
            min={1}
            max={20}
            value={lineWidth}
            onChange={e => setLineWidth(Number(e.target.value))}
            className="w-20"
            title="Pen size"
          />
          <span className="text-xs text-muted-foreground">{lineWidth}px</span>
        </div>
        <button
          onClick={clearBoard}
          className="ml-auto px-3 py-1 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-colors"
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={520}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className="flex-1 w-full cursor-crosshair bg-[#0f0f1a]"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
