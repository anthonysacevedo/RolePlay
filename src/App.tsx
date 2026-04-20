import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Film,
  Camera,
  Edit2,
  FileText,
  RotateCcw,
  Clapperboard,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardGroup } from './types';
import { api } from './services/api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Auto-fitting text component
const AutoFitText = ({ text, initialFontSize = 11.2 }: { text: string; initialFontSize?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(initialFontSize);

  useLayoutEffect(() => {
    // Reset font size when text changes
    setFontSize(initialFontSize);
  }, [text, initialFontSize]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use a small delay to allow the browser to calculate scrollHeight correctly
    const adjust = () => {
      const isOverflowing = container.scrollHeight > container.clientHeight;
      if (isOverflowing && fontSize > 4) {
        setFontSize(f => f - 0.2);
      }
    };

    const frame = requestAnimationFrame(adjust);
    return () => cancelAnimationFrame(frame);
  }, [fontSize, text]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      <div 
        style={{ fontSize: `${fontSize}pt` }} 
        className="leading-relaxed whitespace-pre-wrap text-justify [text-justify:inter-word] hyphens-auto"
      >
        {text}
      </div>
    </div>
  );
};

// Functional Preview Components
const CardFront = ({ card }: { card: Partial<Card> }) => (
  <div className="ambient-shadow rounded-2xl overflow-hidden aspect-[2.5/3.5] w-64 bg-surface-container-lowest border-2 border-black/80 flex flex-col p-6 text-black font-sans">
    <div className="flex justify-between items-center mb-1 text-[0.9rem] font-bold tracking-tight uppercase">
      <span>Situación nº {card.situacion || '5'}</span>
      <span>{card.rol || 'Cliente'}</span>
    </div>
    <div className="border-b-2 border-black/60 mb-4" />
    <div className="text-[0.65rem] leading-tight mb-4 text-justify [text-justify:inter-word] hyphens-auto font-light italic">
      Lee atentamente la situación, sin comentarla en voz alta, imagina cómo representarla y acción
    </div>
    <div className="flex-grow px-3 py-4 overflow-hidden mb-4 h-[120px] border border-black/30 rounded-xl">
      <AutoFitText 
        text={card.desarrollo || 'Se comunica porque está esperando su envío (un paquete contra-reembolso / PC) en su domicilio.\n\nSe encuentra preocupada porque hoy se cumple el 5to día hábil desde que se realizó el envío y el mismo aún no llega a su domicilio.'} 
      />
    </div>
    <div className="text-center pt-1">
      <div className="text-[0.75rem] font-bold text-black uppercase tracking-wider">
        {card.tema || 'Sucursales y Nacionales'}
      </div>
    </div>
  </div>
);

const CardBack = ({ card }: { card: Partial<Card> }) => (
  <div className="ambient-shadow rounded-2xl overflow-hidden aspect-[2.5/3.5] w-64 bg-white text-black border border-black/10 relative flex flex-col items-center justify-center">
    <div className="absolute inset-4 border-2 border-black/80 rounded-xl" />
    <div className="absolute inset-6 border border-black/40 rounded-lg" />
    <div className="z-10 text-center flex flex-col items-center p-4">
      {card.backImage ? (
        <img 
          src={card.backImage} 
          alt="Set Cover" 
          className="w-16 h-16 object-cover rounded mb-2 border border-black/10" 
          referrerPolicy="no-referrer" 
        />
      ) : (
        <Clapperboard className="w-12 h-12 mb-2" />
      )}
      <div className="text-[0.7rem] font-black uppercase tracking-widest text-center px-4 leading-tight">
        {card.setLabel || 'CORREO RolePlay'}
      </div>
    </div>
  </div>
);

export default function App() {
  const [groups, setGroups] = useState<CardGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'card' | 'group', id: string, secondaryId?: string } | null>(null);
  
  const [formData, setFormData] = useState<Partial<Card>>({
    situacion: '',
    rol: '',
    desarrollo: '',
    tema: '',
    setLabel: '',
    backImage: null
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const cardsToShow = selectedGroup?.cards || [];
  const currentCard = selectedGroupId ? cardsToShow[currentCardIndex] : formData;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // If user starts typing and we are viewing a group but NOT editing a specific card,
    // exit the group view to show the new card preview.
    if (selectedGroupId && !editingCardId) {
      setSelectedGroupId(null);
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Logic: exit group view if just starting a new card
      if (selectedGroupId && !editingCardId) {
        setSelectedGroupId(null);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, backImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (!formData.tema) {
        alert('Por favor ingresa un tema');
        return;
      }

      const res = await api.saveCard({
        ...formData,
        id: editingCardId
      });

      if (res.success) {
        await fetchGroups();
        setFormData({
          situacion: '',
          rol: '',
          desarrollo: '',
          tema: '',
          setLabel: '',
          backImage: null
        });
        setEditingCardId(null);
      }
    } catch (err: any) {
      console.error('Error saving card:', err);
      const msg = err.response?.status === 413 
        ? 'La imagen es demasiado grande. Intenta con una de menor resolución.' 
        : (err.response?.data?.error || err.message);
      alert(`Error al guardar la tarjeta: ${msg}`);
    }
  };

  const handleEdit = () => {
    if (selectedGroupId && cardsToShow[currentCardIndex]) {
      const card = cardsToShow[currentCardIndex];
      setFormData({
        situacion: card.situacion,
        rol: card.rol,
        desarrollo: card.desarrollo,
        tema: card.tema,
        setLabel: card.setLabel,
        backImage: card.backImage
      });
      setEditingCardId(card.id);
    }
  };

  const performDeleteCard = async (gId: string, cardId: string) => {
    try {
      const resp = await api.deleteCard(gId, cardId);
      if (resp.success) {
        await fetchGroups();
        
        if (editingCardId === cardId) {
          setEditingCardId(null);
          setFormData({
            situacion: '',
            rol: '',
            desarrollo: '',
            tema: '',
            setLabel: '',
            backImage: null
          });
        }
      }
      setConfirmDelete(null);
    } catch (err: any) {
      console.error('Error deleting card:', err);
      const msg = err.response?.data?.error || err.message;
      alert(`Error al eliminar la tarjeta: ${msg}`);
      setConfirmDelete(null);
    }
  };

  const performDeleteGroup = async (gId: string) => {
    try {
      const resp = await api.deleteGroup(gId);
      if (resp.success) {
        await fetchGroups();
        if (selectedGroupId === gId) {
          setSelectedGroupId(null);
          setCurrentCardIndex(0);
        }
      }
      setConfirmDelete(null);
    } catch (err: any) {
      console.error('Error deleting group:', err);
      alert(`Error al eliminar el grupo: ${err.message}`);
      setConfirmDelete(null);
    }
  };

  const handleDeleteCard = () => {
    if (!selectedGroupId || !cardsToShow[currentCardIndex]) return;
    setConfirmDelete({
      type: 'card',
      id: String(cardsToShow[currentCardIndex].id),
      secondaryId: String(selectedGroupId)
    });
  };

  const handleDeleteGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({
      type: 'group',
      id: String(groupId)
    });
  };

  const exportPDF = async (groupToExport?: CardGroup) => {
    const targetGroup = groupToExport || selectedGroup;
    if (!targetGroup || targetGroup.cards.length === 0) {
      alert('No hay tarjetas para exportar');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'cm',
      format: 'a4'
    });

    const cardWidth = 8;
    const cardHeight = 10;
    const margin = 1;
    const pageWidth = 29.7;
    const pageHeight = 21;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    const renderToCanvas = async (node: HTMLElement) => {
      const canvas = await html2canvas(node, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      return canvas.toDataURL('image/png');
    };

    let x = margin;
    let y = margin;

    for (let i = 0; i < targetGroup.cards.length; i++) {
        const card = targetGroup.cards[i];
        
        // Front with Auto-Fit logic for PDF
        let pdfFontSize = 10.5;
        const frontElement = document.createElement('div');
        frontElement.style.width = '300px';
        frontElement.style.height = '375px';
        container.innerHTML = '';
        container.appendChild(frontElement);

        const getFrontHTML = (fs: number) => `
          <div style="width: 300px; height: 375px; background: white; border: 2.5px solid black; padding: 20px; color: black; font-family: Inter, sans-serif; display: flex; flex-direction: column; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-bottom: 5px; text-transform: uppercase;">
              <span>Situación nº ${card.situacion}</span>
              <span>${card.rol}</span>
            </div>
            <div style="border-bottom: 3px solid rgba(0,0,0,0.6); margin-bottom: 10px;"></div>
            <div style="font-size: 8px; font-style: italic; margin-bottom: 10px; text-align: justify; hyphens: auto; text-justify: inter-word;">Lee atentamente la situación, sin comentarla en voz alta, imagina cómo representarla y acción</div>
            <div id="pdf-desc-container" style="flex-grow: 1; overflow: hidden; margin-bottom: 10px; border: 1.2px solid rgba(0,0,0,0.4); border-radius: 12px; padding: 12px;">
              <div id="pdf-desc-text" style="font-size: ${fs}pt; line-height: 1.4; white-space: pre-wrap; text-align: justify; hyphens: auto; text-justify: inter-word;">${card.desarrollo}</div>
            </div>
            <div style="padding-top: 5px; text-align: center; font-size: 10px; font-weight: bold; text-transform: uppercase;">${card.tema}</div>
          </div>
        `;

        frontElement.innerHTML = getFrontHTML(pdfFontSize);
        
        // Practical fit loop
        let attempts = 0;
        while (attempts < 50) {
            const textEl = frontElement.querySelector('#pdf-desc-text') as HTMLElement;
            const containerEl = frontElement.querySelector('#pdf-desc-container') as HTMLElement;
            if (textEl && containerEl && textEl.scrollHeight > containerEl.clientHeight && pdfFontSize > 4) {
                pdfFontSize -= 0.2;
                frontElement.innerHTML = getFrontHTML(pdfFontSize);
                attempts++;
            } else {
                break;
            }
        }

        const frontImg = await renderToCanvas(frontElement);

        // Back
        const backElement = document.createElement('div');
        backElement.style.width = '300px';
        backElement.style.height = '375px';
        container.innerHTML = '';
        container.appendChild(backElement);
        backElement.innerHTML = `
          <div style="width: 300px; height: 375px; background: white; border: 1px solid black; padding: 20px; color: black; font-family: Inter, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; box-sizing: border-box;">
            <div style="position: absolute; inset: 15px; border: 2px solid black; border-radius: 10px;"></div>
            <div style="z-index: 10; text-align: center; font-weight: 900; text-transform: uppercase; font-size: 11px; letter-spacing: 2px;">
              ${card.backImage ? `<img src="${card.backImage}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; border: 1px solid black;" />` : `<div style="font-size: 40px; margin-bottom: 15px;">🎭</div>`}
              <div style="border-top: 1px solid black; padding-top: 5px;">${card.setLabel || 'CORREO ROLEPLAY'}</div>
            </div>
          </div>
        `;
        const backImg = await renderToCanvas(backElement);

        if (x + 2 * cardWidth + 0.5 > pageWidth - margin) {
          x = margin;
          y += cardHeight + 0.5;
        }
        if (y + cardHeight > pageHeight - margin) {
          doc.addPage('landscape');
          x = margin;
          y = margin;
        }

        doc.addImage(frontImg, 'PNG', x, y, cardWidth, cardHeight);
        const cl = 0.4;
        doc.setDrawColor(200);
        doc.line(x, y, x+cl, y); doc.line(x, y, x, y+cl);
        doc.line(x+cardWidth, y, x+cardWidth-cl, y); doc.line(x+cardWidth, y, x+cardWidth, y+cl);
        doc.line(x, y+cardHeight, x+cl, y+cardHeight); doc.line(x, y+cardHeight, x, y+cardHeight-cl);
        doc.line(x+cardWidth, y+cardHeight, x+cardWidth-cl, y+cardHeight); doc.line(x+cardWidth, y+cardHeight, x+cardWidth, y+cardHeight-cl);

        x += cardWidth + 0.1;

        doc.addImage(backImg, 'PNG', x, y, cardWidth, cardHeight);
        doc.line(x, y, x+cl, y); doc.line(x, y, x, y+cl);
        doc.line(x+cardWidth, y, x+cardWidth-cl, y); doc.line(x+cardWidth, y, x+cardWidth, y+cl);
        doc.line(x, y+cardHeight, x+cl, y+cardHeight); doc.line(x, y+cardHeight, x, y+cardHeight-cl);
        doc.line(x+cardWidth, y+cardHeight, x+cardWidth-cl, y+cardHeight); doc.line(x+cardWidth, y+cardHeight, x+cardWidth, y+cardHeight-cl);

        x += cardWidth + 0.8;
    }

    document.body.removeChild(container);
    doc.save(`${targetGroup.name}_Cards.pdf`);
  };

  return (
    <div className="bg-surface text-on-surface">
      {/* TopAppBar Section */}
      <header className="docked full-width top-0 z-50 bg-surface dark:bg-slate-950">
        <nav className="flex justify-between items-center w-full px-4 md:px-8 py-4 md:py-6 max-w-[1440px] mx-auto">
          <div 
            onClick={() => { setSelectedGroupId(null); fetchGroups(); }}
            className="text-xl md:text-2xl font-black tracking-tight text-on-surface cursor-pointer"
          >
            Tarjetas RolePlay
          </div>
        </nav>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 md:py-12">
        <h1 className="font-sans font-bold text-3xl md:text-[2.75rem] leading-tight text-on-surface mb-8 md:mb-12">Generador de Tarjetas</h1>
        
        {/* Main Generator Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
          
          {/* Left Column: Input Form */}
          <section className="lg:col-span-5 space-y-8 md:space-y-10 bg-surface-container-low p-4 md:p-8 rounded-xl h-fit">
            <div className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight border-b border-outline-variant/20 pb-4">Configuración de Escena</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-[0.75rem] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Situación</label>
                  <input 
                    name="situacion"
                    value={formData.situacion}
                    onChange={handleInputChange}
                    className="w-full bg-surface-container-lowest border-none rounded-xl p-4 focus:ring-2 focus:ring-primary-container transition-all" 
                    placeholder="01" 
                    type="text"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[0.75rem] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Rol</label>
                  <input 
                    name="rol"
                    value={formData.rol}
                    onChange={handleInputChange}
                    className="w-full bg-surface-container-lowest border-none rounded-xl p-4 focus:ring-2 focus:ring-primary-container transition-all" 
                    placeholder="Ej: Explorador" 
                    type="text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.75rem] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Desarrollo</label>
                <textarea 
                  name="desarrollo"
                  value={formData.desarrollo}
                  onChange={handleInputChange}
                  className="w-full bg-surface-container-lowest border-none rounded-xl p-4 focus:ring-2 focus:ring-primary-container transition-all resize-none min-h-[160px]" 
                  placeholder="Describe el contexto o la acción principal..."
                />
              </div>

              <div>
                <label className="block text-[0.75rem] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tema</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    name="tema"
                    value={formData.tema}
                    onChange={handleInputChange}
                    className="flex-grow bg-surface-container-lowest border-none rounded-xl p-4 focus:ring-2 focus:ring-primary-container transition-all" 
                    placeholder="Fantasía Oscura" 
                    type="text"
                  />
                  <button 
                    onClick={handleCreateOrUpdate}
                    className="bg-inverse-surface text-inverse-on-surface px-6 py-4 rounded-xl font-bold transition-all hover:opacity-90 active:scale-95 whitespace-nowrap w-full sm:w-auto"
                  >
                    {editingCardId ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-outline-variant/10">
              <h2 className="text-xl font-bold tracking-tight border-b border-outline-variant/20 pb-4">Editar Dorso</h2>
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="w-full sm:flex-grow">
                  <label className="block text-[0.75rem] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nombre del Set</label>
                  <input 
                    name="setLabel"
                    value={formData.setLabel}
                    onChange={handleInputChange}
                    className="w-full bg-surface-container-lowest border-none rounded-xl p-4 focus:ring-2 focus:ring-primary-container transition-all" 
                    placeholder="Aventura en el Bosque" 
                    type="text"
                  />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary-container/10 text-primary-container px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-container/20 transition-all h-[56px] whitespace-nowrap w-full sm:w-auto"
                >
                  <Upload size={20} /> Imagen
                </button>
              </div>
            </div>
          </section>

          {/* Right Column: Preview */}
          <section className="lg:col-span-7 bg-surface-container-high p-4 md:p-8 rounded-xl relative flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-bold">Tarjetas Preview</h2>
              {selectedGroup && (
                <div className="text-xs md:text-sm font-medium text-on-surface-variant">
                  {currentCardIndex + 1} de {cardsToShow.length}
                </div>
              )}
            </div>

            <div className="flex-grow flex flex-col xl:flex-row items-center justify-center gap-6 md:gap-8 mb-8 md:mb-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`front-${selectedGroupId}-${currentCardIndex}-${JSON.stringify(formData)}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardFront card={currentCard} />
                </motion.div>
                <motion.div
                  key={`back-${selectedGroupId}-${currentCardIndex}-${JSON.stringify(formData)}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <CardBack card={currentCard} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Carousel Controls */}
            {selectedGroupId ? (
              <div className="space-y-8">
                <div className="relative px-12">
                  <button 
                    onClick={() => setCurrentCardIndex(p => Math.max(0, p - 1))}
                    disabled={currentCardIndex === 0}
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-surface-variant transition-all text-on-surface-variant disabled:opacity-20"
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 scroll-smooth">
                    {cardsToShow.map((card, idx) => (
                      <button
                        key={card.id}
                        onClick={() => setCurrentCardIndex(idx)}
                        className={`flex-shrink-0 w-20 h-28 rounded-lg bg-surface-container-lowest ambient-shadow p-1 transition-all ${idx === currentCardIndex ? 'border-2 border-primary' : 'opacity-60 grayscale'}`}
                      >
                         <div className="w-full h-full bg-surface-container-low rounded-md overflow-hidden flex items-center justify-center text-[0.6rem] font-bold">
                           {card.backImage ? (
                             <img src={card.backImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           ) : (
                             <span>{card.situacion}</span>
                           )}
                         </div>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setCurrentCardIndex(p => Math.min(cardsToShow.length - 1, p + 1))}
                    disabled={currentCardIndex === cardsToShow.length - 1}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-surface-variant transition-all text-on-surface-variant disabled:opacity-20"
                  >
                    <ChevronRight size={32} />
                  </button>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:flex sm:justify-end gap-2 md:gap-3">
                  <button 
                    onClick={handleEdit}
                    className="bg-transparent border-2 border-black text-black px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-xs md:text-sm uppercase tracking-widest transition-all hover:bg-black/5 active:scale-95"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={handleDeleteCard}
                    className="bg-transparent border-2 border-black text-black px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-xs md:text-sm uppercase tracking-widest transition-all hover:bg-error hover:text-on-error hover:border-error active:scale-95"
                  >
                    Eliminar
                  </button>
                  <button 
                    onClick={() => exportPDF()}
                    className="bg-primary text-on-primary px-8 md:px-10 py-3 md:py-4 rounded-full font-black text-xs md:text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1 active:translate-y-0"
                  >
                    Exportar PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-on-surface-variant/50 font-medium italic border-2 border-dashed border-outline-variant/30 rounded-xl">
                 Ingresa datos para ver la vista previa en vivo
              </div>
            )}
          </section>
        </div>

        {/* Gallery Section */}
        <section className="mt-24">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <h2 className="font-sans font-bold text-2xl md:text-3xl text-on-surface">Tarjetas Generadas</h2>
              <p className="text-on-surface-variant mt-2 font-medium">Gestiona tus colecciones y grupos de rol.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groups.map((group) => (
              <div 
                key={group.id}
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setCurrentCardIndex(0);
                }}
                className={`bg-surface-container-low p-6 rounded-2xl group transition-all hover:bg-surface-container-highest/50 relative border-2 ${selectedGroupId === group.id ? 'border-primary' : 'border-transparent'}`}
              >
                <div className="relative h-48 mb-6">
                  {/* Stack effect */}
                  <div className="absolute inset-0 bg-surface-container-lowest rounded-xl translate-x-4 translate-y-4 ambient-shadow opacity-40"></div>
                  <div className="absolute inset-0 bg-surface-container-lowest rounded-xl translate-x-2 translate-y-2 ambient-shadow opacity-70"></div>
                  <div className="absolute inset-0 bg-surface-container-lowest rounded-xl ambient-shadow p-4 flex flex-col">
                    <div className="flex-grow rounded-lg overflow-hidden relative border border-outline-variant/10">
                      {group.cards[0]?.backImage ? (
                        <img 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                          src={group.cards[0].backImage}
                        />
                      ) : (
                        <div className="w-full h-full relative overflow-hidden bg-primary/10">
                          <img 
                            src={`https://loremflickr.com/600/400/${encodeURIComponent((group.cards[0]?.rol || 'office') + ',illustration')}/all`}
                            className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:opacity-100 hover:mix-blend-normal transition-all duration-700 contrast-125 brightness-90 shadow-inner"
                            referrerPolicy="no-referrer"
                            alt="Role Illustration"
                          />
                          <div className="absolute inset-0 bg-primary/20 mix-blend-multiply pointer-events-none" />
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent pointer-events-none" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 text-white">
                        <p className="text-[0.6rem] font-bold uppercase tracking-widest opacity-80">Vista Previa</p>
                        <p className="text-xs font-bold truncate max-w-[140px]">{group.cards[0]?.rol || 'Sin título'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-bold text-lg">{group.name}</h3>
                    <p className="text-sm text-on-surface-variant font-medium">{group.cards.length} tarjetas creadas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleDeleteGroup(group.id, e)}
                      className="text-on-surface-variant/40 hover:text-error transition-colors p-2 relative z-50 rounded-full hover:bg-error/10"
                      title="Eliminar Grupo"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                   <button 
                    onClick={(e) => { e.stopPropagation(); exportPDF(group); }}
                    className="flex-grow bg-primary text-on-primary py-3 rounded-xl text-sm font-bold transition-all hover:bg-primary/90 flex items-center justify-center gap-2"
                   >
                     <Download size={18} /> Exportar PDF
                   </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="full-width mt-20 bg-surface-container-low">
        <div className="flex justify-center items-center px-4 md:px-12 py-10 w-full max-w-[1440px] mx-auto text-center">
          <div className="font-sans text-xs md:text-[0.875rem] text-on-surface-variant font-medium">
            2026 Tarjetas RolePlay - Creación Anthony Acevedo
          </div>
        </div>
      </footer>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-surface-container-low rounded-3xl p-8 max-w-sm w-full ambient-shadow border border-outline-variant/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error mb-6 mx-auto">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">¿Confirmar eliminación?</h3>
              <p className="text-on-surface-variant text-center mb-8 font-medium">
                {confirmDelete.type === 'card' 
                  ? 'Esta tarjeta se eliminará permanentemente del grupo.' 
                  : 'Se eliminará el grupo completo junto con todas sus tarjetas.'}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold border-2 border-outline-variant hover:bg-surface-container-highest transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (confirmDelete.type === 'card' && confirmDelete.secondaryId) {
                      performDeleteCard(confirmDelete.secondaryId, confirmDelete.id);
                    } else {
                      performDeleteGroup(confirmDelete.id);
                    }
                  }}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-error text-on-error hover:bg-error/90 transition-all shadow-lg shadow-error/20"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
