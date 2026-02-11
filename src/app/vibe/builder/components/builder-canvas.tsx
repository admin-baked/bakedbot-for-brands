// @ts-nocheck - GrapesJS types are complex, skip for now
'use client';

/**
 * Builder Canvas - Main GrapesJS Editor
 *
 * 3-panel layout: Blocks (left) | Canvas (center) | Properties (right)
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getBuilderProducts, type BuilderProduct } from '@/server/actions/vibe-pos-products';

import type { VibeProject } from '@/types/vibe-project';

interface BuilderCanvasProps {
  userId: string;
  projectId: string;
  projectName: string;
  initialProject: VibeProject | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditorReady?: (editor: any) => void;
}

export function BuilderCanvas({
  userId,
  projectId,
  projectName,
  initialProject,
  onEditorReady,
}: BuilderCanvasProps) {
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

        // Add custom component type for Live Product Grid
        editor.DomComponents.addType('live-product-grid', {
          model: {
            defaults: {
              traits: [
                {
                  type: 'button',
                  label: 'Sync POS Products',
                  name: 'sync-products',
                  text: 'Sync Products',
                  command: async (editor: grapesjs.Editor) => {
                    const component = editor.getSelected();
                    if (!component) return;

                    try {
                      // Show loading state
                      const productContainer = component.find(
                        '[data-product-container]'
                      )[0];
                      if (productContainer) {
                        productContainer.components(
                          '<div class="text-center text-gray-500 col-span-3"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div><p class="mt-2">Loading products...</p></div>'
                        );
                      }

                      // Fetch products from POS
                      const result = await getBuilderProducts(userId, 12);

                      if (result.success && result.products) {
                        const productCards = result.products
                          .map(
                            (product: BuilderProduct) => `
                          <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                            <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-64 object-cover">
                            <div class="p-6">
                              ${product.isOnSale ? '<span class="inline-block bg-red-500 text-white text-xs px-2 py-1 rounded mb-2">' + product.saleBadgeText + '</span>' : ''}
                              <h3 class="font-bold text-xl mb-2">${product.name}</h3>
                              <p class="text-gray-600 text-sm mb-4">${product.brand} • ${product.category}${product.thcPercent ? ` • ${product.thcPercent}% THC` : ''}</p>
                              <div class="flex justify-between items-center">
                                ${product.isOnSale && product.salePrice ? '<div><span class="text-lg text-gray-400 line-through">$' + product.price + '</span> <span class="text-2xl font-bold text-green-600">$' + product.salePrice + '</span></div>' : '<span class="text-2xl font-bold text-green-600">$' + product.price + '</span>'}
                                <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Add to Cart</button>
                              </div>
                            </div>
                          </div>
                        `
                          )
                          .join('');

                        if (productContainer) {
                          productContainer.components(productCards);
                        }

                        console.log(
                          `[BUILDER] Synced ${result.products.length} products`
                        );
                      }
                    } catch (error) {
                      console.error('[BUILDER] Failed to sync products:', error);
                      const productContainer = component.find(
                        '[data-product-container]'
                      )[0];
                      if (productContainer) {
                        productContainer.components(
                          '<div class="text-center text-red-500 col-span-3">Failed to load products. Please try again.</div>'
                        );
                      }
                    }
                  },
                },
                {
                  type: 'number',
                  label: 'Product Count',
                  name: 'product-count',
                  min: 3,
                  max: 24,
                  step: 3,
                  value: 12,
                },
              ],
            },
          },
        });

        // Load saved project data if exists
        if (initialProject) {
          try {
            // Load components and styles
            if (initialProject.components && initialProject.components !== '[]') {
              editor.setComponents(JSON.parse(initialProject.components));
            }
            if (initialProject.styles && initialProject.styles !== '[]') {
              editor.setStyle(JSON.parse(initialProject.styles));
            }

            console.log('[BUILDER] Loaded saved project data');
          } catch (error) {
            console.error('[BUILDER] Failed to load project data:', error);
          }
        }

        // Store reference
        editorRef.current = editor;

        // Notify parent that editor is ready
        if (onEditorReady) {
          onEditorReady(editor);
        }

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

  // Live Product Grid Block (syncs with POS)
  blockManager.add('live-product-grid', {
    label: 'Live Product Grid',
    category: 'Cannabis',
    content: {
      tagName: 'section',
      attributes: {
        class: 'py-16 px-4',
        'data-gjs-type': 'live-product-grid',
      },
      components: [
        {
          tagName: 'div',
          attributes: { class: 'max-w-7xl mx-auto' },
          components: [
            {
              tagName: 'h2',
              attributes: { class: 'text-3xl font-bold text-center mb-12' },
              components: [{ type: 'textnode', content: 'Live Products from POS' }],
            },
            {
              tagName: 'div',
              attributes: {
                class: 'grid grid-cols-1 md:grid-cols-3 gap-8',
                'data-product-container': 'true',
              },
              components: [
                {
                  tagName: 'div',
                  attributes: { class: 'text-center text-gray-500 col-span-3' },
                  components: [
                    {
                      type: 'textnode',
                      content:
                        'Click "Sync POS Products" in the settings panel to load your products →',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    attributes: { class: 'fa fa-sync' },
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

  // Button Block
  blockManager.add('styled-button', {
    label: 'Button',
    category: 'Basic',
    content: `
      <a href="#" class="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors">
        Click Me
      </a>
    `,
    attributes: { class: 'fa fa-hand-pointer' },
  });

  // Text Block
  blockManager.add('text-block', {
    label: 'Text',
    category: 'Basic',
    content: `
      <div class="text-base text-gray-700 leading-relaxed">
        <p>Double-click to edit this text. You can add multiple paragraphs, format text, and create engaging content for your visitors.</p>
      </div>
    `,
    attributes: { class: 'fa fa-font' },
  });

  // Image Block
  blockManager.add('image-block', {
    label: 'Image',
    category: 'Basic',
    content: `
      <img src="https://via.placeholder.com/800x400?text=Your+Image+Here" alt="Placeholder" class="w-full h-auto rounded-lg shadow-md" />
    `,
    attributes: { class: 'fa fa-image' },
  });

  // Contact Form Block
  blockManager.add('contact-form', {
    label: 'Contact Form',
    category: 'Forms',
    content: `
      <form class="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
        <h3 class="text-2xl font-bold mb-6">Get in Touch</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input type="text" name="name" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input type="email" name="email" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <textarea name="message" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required></textarea>
        </div>
        <button type="submit" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
          Send Message
        </button>
      </form>
    `,
    attributes: { class: 'fa fa-envelope' },
  });

  // Container Block
  blockManager.add('container', {
    label: 'Container',
    category: 'Layout',
    content: `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p class="text-center text-gray-500">Drag blocks here</p>
      </div>
    `,
    attributes: { class: 'fa fa-square' },
  });

  // Section Block
  blockManager.add('section', {
    label: 'Section',
    category: 'Layout',
    content: `
      <section class="py-16 px-4 bg-gray-50">
        <div class="max-w-7xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-8">Section Heading</h2>
          <p class="text-center text-gray-600">Add your content here</p>
        </div>
      </section>
    `,
    attributes: { class: 'fa fa-bars' },
  });

  // Spacer Block
  blockManager.add('spacer', {
    label: 'Spacer',
    category: 'Layout',
    content: `
      <div class="h-16" style="min-height: 4rem"></div>
    `,
    attributes: { class: 'fa fa-arrows-v' },
  });

  console.log('[BUILDER] 10 blocks added (3 cannabis + 7 core)');
}
