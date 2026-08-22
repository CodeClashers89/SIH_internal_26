import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Zap, Sprout, TrendingUp } from 'lucide-react';

const ThreeCenterpiece = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isHovered: false });
  const [activeTelemetry, setActiveTelemetry] = useState(0);

  const telemetryData = [
    { label: 'Farm-Gate Freshness', val: '99.2%', icon: Sprout, color: 'text-emerald-400 border-emerald-500/30' },
    { label: 'Direct Escrow Settlement', val: '₹0 Commission', icon: ShieldCheck, color: 'text-amber-400 border-amber-500/30' },
    { label: 'Dynamic Logistics AI', val: '< 4hr Dispatch', icon: Zap, color: 'text-cyan-400 border-cyan-500/30' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTelemetry((prev) => (prev + 1) % telemetryData.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = ((e.clientX - rect.left) / width) * 2 - 1;
      mouseRef.current.targetY = ((e.clientY - rect.top) / height) * 2 - 1;
      mouseRef.current.isHovered = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
      mouseRef.current.isHovered = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // 3D Nodes generation (Agritech Double Helix + Bio Orb)
    const nodes = [];
    const numNodes = 40;
    
    for (let i = 0; i < numNodes; i++) {
      const t = (i / numNodes) * Math.PI * 4;
      const y = (i / numNodes - 0.5) * 260;
      
      // Strand 1 (Emerald Glow)
      nodes.push({
        x: Math.cos(t) * 60,
        y: y,
        z: Math.sin(t) * 60,
        strand: 1,
        color: '#10b981',
        glow: '#34d399'
      });

      // Strand 2 (Golden Amber / Cyan)
      nodes.push({
        x: Math.cos(t + Math.PI) * 60,
        y: y,
        z: Math.sin(t + Math.PI) * 60,
        strand: 2,
        color: i % 2 === 0 ? '#f59e0b' : '#06b6d4',
        glow: i % 2 === 0 ? '#fbbf24' : '#22d3ee'
      });
    }

    // Floating Bio-Pollen & Light Energy Particles
    const particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 280,
        y: (Math.random() - 0.5) * 320,
        z: (Math.random() - 0.5) * 280,
        size: Math.random() * 2.5 + 1,
        speed: Math.random() * 0.015 + 0.005,
        angle: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? '#10b981' : '#fbbf24'
      });
    }

    let rotationAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      rotationAngle += 0.01;
      const angleY = rotationAngle + mouse.x * 0.6;
      const angleX = mouse.y * 0.5;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const centerX = width / 2;
      const centerY = height / 2;
      const fov = 380;

      // Project particles
      particles.forEach((p) => {
        p.angle += p.speed;
        const hoverAmp = mouse.isHovered ? 1.5 : 1;
        const curX = p.x + Math.sin(p.angle) * 15 * hoverAmp;
        const curY = p.y + Math.cos(p.angle) * 15 * hoverAmp;

        let x1 = curX * cosY - p.z * sinY;
        let z1 = p.z * cosY + curX * sinY;
        let y1 = curY * cosX - z1 * sinX;
        let z2 = z1 * cosX + curY * sinX;

        const scale = fov / (fov + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y1 * scale;

        ctx.beginPath();
        ctx.arc(projX, projY, p.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = Math.max(0.15, Math.min(1, scale * 0.6));
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

      // Project DNA Nodes
      const projectedNodes = nodes.map((node) => {
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.z * cosY + node.x * sinY;
        let y1 = node.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + node.y * sinX;

        const scale = fov / (fov + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y1 * scale;

        return {
          x: projX,
          y: projY,
          z: z2,
          scale,
          color: node.color,
          glow: node.glow,
          strand: node.strand
        };
      });

      // 1. Draw rungs / connecting bridges
      for (let i = 0; i < projectedNodes.length; i += 2) {
        const n1 = projectedNodes[i];
        const n2 = projectedNodes[i + 1];

        if (n1 && n2) {
          const avgZ = (n1.z + n2.z) / 2;
          const alpha = Math.max(0.08, 1 - (avgZ + 120) / 240);

          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          
          const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
          grad.addColorStop(0, `rgba(16, 185, 129, ${alpha * 0.8})`);
          grad.addColorStop(0.5, `rgba(6, 182, 212, ${alpha * 0.9})`);
          grad.addColorStop(1, `rgba(245, 158, 11, ${alpha * 0.8})`);
          
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2 * ((n1.scale + n2.scale) / 2);
          ctx.stroke();
        }
      }

      // 2. Draw outer helical rails
      for (let s = 1; s <= 2; s++) {
        const strandNodes = projectedNodes.filter(n => n.strand === s);
        for (let i = 0; i < strandNodes.length - 1; i++) {
          const n1 = strandNodes[i];
          const n2 = strandNodes[i + 1];

          const avgZ = (n1.z + n2.z) / 2;
          const alpha = Math.max(0.12, 1 - (avgZ + 120) / 240);

          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = s === 1 
            ? `rgba(52, 211, 153, ${alpha * 0.95})` 
            : `rgba(251, 191, 36, ${alpha * 0.95})`;
          ctx.lineWidth = 3 * ((n1.scale + n2.scale) / 2);
          ctx.shadowBlur = 8;
          ctx.shadowColor = s === 1 ? '#10b981' : '#f59e0b';
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // 3. Draw glowing node spheres
      projectedNodes.forEach((node) => {
        const radius = 6 * node.scale;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowBlur = 18;
        ctx.shadowColor = node.glow;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Shiny reflection dot
        ctx.beginPath();
        ctx.arc(node.x - radius * 0.3, node.y - radius * 0.3, radius * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const CurrentIcon = telemetryData[activeTelemetry].icon;

  return (
    <div className="relative w-full h-[460px] flex items-center justify-center select-none">
      {/* Dynamic Aura background rings */}
      <div className="absolute w-[380px] h-[380px] rounded-full border border-emerald-500/20 animate-spin [animation-duration:35s] pointer-events-none"></div>
      <div className="absolute w-[280px] h-[280px] rounded-full border border-dashed border-cyan-500/20 animate-spin [animation-duration:22s] [animation-direction:reverse] pointer-events-none"></div>
      <div className="absolute w-[180px] h-[180px] rounded-full bg-emerald-500/10 blur-[50px] pointer-events-none animate-pulse"></div>

      {/* 3D Canvas element */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing relative z-10"
      />

      {/* Floating 3D Telemetry HUD Pill */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-500">
        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-xl border ${telemetryData[activeTelemetry].color} shadow-xl shadow-emerald-950/40`}>
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 animate-pulse">
            <CurrentIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {telemetryData[activeTelemetry].label}
            </div>
            <div className="text-xs font-black text-white">
              {telemetryData[activeTelemetry].val}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeCenterpiece;
