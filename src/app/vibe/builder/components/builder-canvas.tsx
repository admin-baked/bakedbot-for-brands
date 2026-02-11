'use client';

/**
 * Builder Canvas - Main GrapesJS Editor
 *
 * 3-panel layout: Blocks (left) | Canvas (center) | Properties (right)
 */

import { useEffect, useRef, useState } from 'react';
import type grapesjs from 'grapesjs';
import { Loader2 } from 'lucide-react';

interface BuilderCanvasProps {
  userId: string;
  projectName: string;
}

export function BuilderCanvas({ userId, projectName }: BuilderCanvasProps) {
  const editorRef = useRef<grapesjs.Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamically import GrapesJS (client-side only)
    const initEditor = async () => {
      if (!containerRef.current) return;

      try {
        const grapesjs = (await import('grapesjs')).default;
        const grapesjsBlocksBasic = (await import('grapesjs-blocks-basic')).default;
        const grapesjsPluginForms = (await import('grapesjs-plugin-forms')).default;
        const grapesjsPresetWebpage = (await import('grapesjs-preset-webpage')).default;

        // Initialize GrapesJS
        const editor = grapesjs.init({
          container: containerRef.current,
          height: '100%',
          width: 'auto',
          storageManager: false, // We'll handle storage ourselves

          // Panels
          panels: {
            defaults: [
              {
                id: 'layers',
                el: '.panel__right',
                resizable: {
                  maxDim: 350,
                  minDim: 200,
                  tc: 0,
                  cl: 1,
                  cr: 0,
                  bc: 0,
                },
              },
              {
                id: 'panel-switcher',
                el: '.panel__switcher',
                buttons: [
                  {
                    id: 'show-layers',
                    active: true,
                    label: 'Layers',
                    command: 'show-layers',
                    togglable: false,
                  },
                  {
                    id: 'show-style',
                    active: true,
                    label: 'Styles',
                    command: 'show-styles',
                    togglable: false,
                  },
                  {
                    id: 'show-traits',
                    active: true,
                    label: 'Settings',
                    command: 'show-traits',
                    togglable: false,
                  },
                ],
              },
            ],
          },

          // Layer Manager
          layerManager: {
            appendTo: '.layers-container',
          },

          // Blocks
          blockManager: {
            appendTo: '.blocks-container',
          },

          // Style Manager
          styleManager: {
            appendTo: '.styles-container',
            sectors: [
              {
                name: 'Dimension',
                open: false,
                buildProps: ['width', 'min-height', 'padding', 'margin'],
              },
              {
                name: 'Typography',
                open: false,
                buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align'],
              },
              {
                name: 'Decorations',
                open: false,
                buildProps: ['opacity', 'border-radius', 'border', 'box-shadow', 'background'],
              },
              {
                name: 'Extra',
                open: false,
                buildProps: ['transition', 'perspective', 'transform'],
              },
            ],
          },

          // Trait Manager (element settings)
          traitManager: {
            appendTo: '.traits-container',
          },

          // Canvas
          canvas: {
            styles: [
              // Add Tailwind CSS for preview
              'https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css',
            ],
          },

          // Plugins
          plugins: [grapesjsBlocksBasic, grapesjsPluginForms, grapesjsPresetWebpage],
          pluginsOpts: {
            'grapesjs-blocks-basic': {},
            'grapesjs-plugin-forms': {},
            'grapesjs-preset-webpage': {
              modalImportTitle: 'Import Template',
              modalImportLabel: '<div style="margin-bottom: 10px; font-size: 13px;">Paste here your HTML/CSS and click Import</div>',
              modalImportContent: function(editor: grapesjs.Editor) {
                return editor.getHtml() + '<style>' + editor.getCss() + '</style>';
              },
            },
          },
        });

        // Add custom cannabis blocks
        addCannabisBlocks(editor);

        // Store reference
        editorRef.current = editor;

        // Log editor ready
        console.log('[BUILDER] GrapesJS initialized');
        setLoading(false);
      } catch (error) {
        console.error('[BUILDER] Failed to initialize GrapesJS:', error);
        setLoading(false);
      }
    };

    initEditor();

    // Cleanup
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden bg-muted/20">
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading Builder...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Left Panel: Blocks */}
          <div className="w-64 border-r bg-background flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Blocks</h3>
            </div>
            <div className="flex-1 overflow-auto blocks-container p-2" />
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 flex flex-col">
            <div ref={containerRef} className="flex-1" />
          </div>

          {/* Right Panel: Properties */}
          <div className="w-80 border-l bg-background flex flex-col panel__right">
            <div className="panel__switcher border-b flex" />
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Layers</h4>
                <div className="layers-container" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Styles</h4>
                <div className="styles-container" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Settings</h4>
                <div className="traits-container" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Add custom cannabis-specific blocks
 */
function addCannabisBlocks(editor: grapesjs.Editor) {
  const blockManager = editor.BlockManager;

  // Cannabis Hero Block
  blockManager.add('cannabis-hero', {
    label: 'Cannabis Hero',
    category: 'Cannabis',
    content: `
      <section class="relative h-96 bg-green-900 flex items-center justify-center text-white" data-gjs-type="section">
        <div class="absolute inset-0 bg-black opacity-30"></div>
        <div class="relative z-10 text-center max-w-4xl px-4">
          <h1 class="text-5xl font-bold mb-4">Welcome to Our Dispensary</h1>
          <p class="text-xl mb-8">Premium cannabis products delivered to your door</p>
          <a href="#" class="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg">
            Shop Now
          </a>
        </div>
      </section>
    `,
    attributes: { class: 'fa fa-cannabis' },
  });

  // Product Grid Block
  blockManager.add('product-grid', {
    label: 'Product Grid',
    category: 'Cannabis',
    content: `
      <section class="py-16 px-4" data-gjs-type="section">
        <div class="max-w-7xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-12">Featured Products</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
              <img src="https://via.placeholder.com/300x300?text=Product+1" alt="Product" class="w-full h-64 object-cover">
              <div class="p-6">
                <h3 class="font-bold text-xl mb-2">Blue Dream</h3>
                <p class="text-gray-600 text-sm mb-4">Hybrid • 22% THC</p>
                <div class="flex justify-between items-center">
                  <span class="text-2xl font-bold text-green-600">$45</span>
                  <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Add to Cart</button>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
              <img src="https://via.placeholder.com/300x300?text=Product+2" alt="Product" class="w-full h-64 object-cover">
              <div class="p-6">
                <h3 class="font-bold text-xl mb-2">OG Kush</h3>
                <p class="text-gray-600 text-sm mb-4">Indica • 25% THC</p>
                <div class="flex justify-between items-center">
                  <span class="text-2xl font-bold text-green-600">$50</span>
                  <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Add to Cart</button>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
              <img src="https://via.placeholder.com/300x300?text=Product+3" alt="Product" class="w-full h-64 object-cover">
              <div class="p-6">
                <h3 class="font-bold text-xl mb-2">Sour Diesel</h3>
                <p class="text-gray-600 text-sm mb-4">Sativa • 20% THC</p>
                <div class="flex justify-between items-center">
                  <span class="text-2xl font-bold text-green-600">$42</span>
                  <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Add to Cart</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `,
    attributes: { class: 'fa fa-th' },
  });

  // Age Verification Block
  blockManager.add('age-gate', {
    label: 'Age Gate',
    category: 'Cannabis',
    content: `
      <div class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" data-gjs-type="age-gate">
        <div class="bg-white rounded-lg p-8 max-w-md text-center">
          <h2 class="text-2xl font-bold mb-4">Age Verification</h2>
          <p class="mb-6">You must be 21 or older to enter this site.</p>
          <div class="flex gap-4">
            <button class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg">
              I'm 21+
            </button>
            <button class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg">
              Exit
            </button>
          </div>
        </div>
      </div>
    `,
    attributes: { class: 'fa fa-lock' },
  });

  console.log('[BUILDER] Cannabis blocks added');
}
