// [Modified Content]
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch'; // Ensure this exists or use checkmark
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Eye, Code, Sparkles, Search, ShoppingCart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Image from 'next/image';
import Chatbot from '@/components/chatbot';
import { cn } from '@/lib/utils';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { searchCannMenusRetailers, CannMenusResult } from '../actions';
import { useMockData } from '@/hooks/use-mock-data';

// BakedBot assets
const BAKEDBOT_LOGO = 'https://storage.cloud.google.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png';
const AI_AGENT_WIDGET = 'https://storage.cloud.google.com/bakedbot-global-assets/Untitled%20design.png';

export default function AIAgentEmbedTab() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Embed configuration
  const [customerName, setCustomerName] = useState('');
  const [cannMenusId, setCannMenusId] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [greeting, setGreeting] = useState("Hi, I'm Smokey. How can I help you today?");
  const [enableCheckout, setEnableCheckout] = useState(false);

  // Search State
  const [searchResults, setSearchResults] = useState<CannMenusResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Preview Data
  const [previewProducts, setPreviewProducts] = useState<any[]>([]);
  const firebase = useOptionalFirebase();
  const { isMock } = useMockData();

  // Search Effect
  useEffect(() => {
    if (customerName.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCannMenusRetailers(customerName);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [customerName]);

  // Fetch products for preview when CannMenus ID changes
  useEffect(() => {
    if (isMock) {
      // Return dummy products for preview
      setPreviewProducts([
        { id: '1', name: 'Mock Product A', price: 25, category: 'Flower' },
        { id: '2', name: 'Mock Product B', price: 30, category: 'Edible' },
      ]);
      return;
    }

    if (!firebase?.firestore || !cannMenusId || cannMenusId.length < 3) {
      setPreviewProducts([]);
      return;
    }

    const db = firebase.firestore!;

    const fetchPreviewProducts = async () => {
      try {
        const q = query(
          collection(db, 'products'),
          where('brand_id', '==', cannMenusId),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPreviewProducts(products);
      } catch (error) {
        console.error('Error fetching preview products:', error);
      }
    };

    const debounce = setTimeout(fetchPreviewProducts, 1000);
    return () => clearTimeout(debounce);
  }, [cannMenusId, firebase]);

  const selectCustomer = (result: CannMenusResult) => {
    setCustomerName(result.name);
    setCannMenusId(result.id);
    setSearchResults([]); // Close dropdown
  };

  // Generate embed code
  const generateEmbedCode = () => {
    const config = {
      cannMenusId,
      customerName,
      primaryColor,
      position,
      greeting,
      enableCheckout, // New Feature
    };

    const embedCode = `<!-- BakedBot AI Agent - Budtender Chatbot -->
<script>
  window.BakedBotConfig = ${JSON.stringify(config, null, 2)};
</script>
<script src="https://bakedbot-for-brands--studio-567050101-bc6e8.us-east4.hosted.app/embed/chatbot.js" async></script>
<link rel="stylesheet" href="https://bakedbot-for-brands--studio-567050101-bc6e8.us-east4.hosted.app/embed/chatbot.css">
<!-- End BakedBot AI Agent -->`;

    return embedCode;
  };

  const embedCode = generateEmbedCode();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Embed code copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Please copy the code manually.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src={BAKEDBOT_LOGO}
                alt="BakedBot Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Agent Embed Code Generator
              </CardTitle>
              <CardDescription>
                Generate embed codes for AI Agent Budtender chatbot for CannMenus customers only.
                <br />
                Includes Predictive Search and Checkout Configuration.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="configure" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="configure">
                <Code className="h-4 w-4 mr-2" />
                Configure
              </TabsTrigger>
              <TabsTrigger value="embed-code">
                <Code className="h-4 w-4 mr-2" />
                Embed Code
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* Configuration Tab */}
            <TabsContent value="configure" className="space-y-4 mt-6">
              <div className="grid gap-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="customer-name">Customer Name *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customer-name"
                      placeholder="Start typing to search CannMenus database..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pl-9"
                      autoComplete="off"
                    />
                  </div>
                  {/* SEARCH RESULTS DROPDOWN */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-popover text-popover-foreground border rounded-md shadow-md mt-1 overflow-hidden">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground text-sm flex justify-between items-center"
                          onClick={() => selectCustomer(result)}
                        >
                          <span>{result.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{result.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Predictive search active. Selecting a customer will auto-fill the ID.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cannmenus-id">CannMenus ID *</Label>
                  <Input
                    id="cannmenus-id"
                    placeholder="e.g., cm_12345"
                    value={cannMenusId}
                    onChange={(e) => setCannMenusId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The unique CannMenus customer ID for product integration
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greeting">Chatbot Greeting</Label>
                  <Input
                    id="greeting"
                    placeholder="Hi, I'm Smokey..."
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                  />
                </div>

                {/* CHECKOUT TOGGLE */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Checkout</Label>
                    <CardDescription>
                      Allow customers to purchase directly within the chat (Smokey Pay / CannPay).
                    </CardDescription>
                  </div>
                  <Switch
                    checked={enableCheckout}
                    onCheckedChange={setEnableCheckout}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#10b981"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Select value={position} onValueChange={(value: any) => setPosition(value)}>
                      <SelectTrigger id="position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      ⚠️ CannMenus Customers Only
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      This embed code is exclusively for CannMenus customers. The chatbot will only work with a valid CannMenus ID.
                      Headless menu functionality is not included - this is chatbot only.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Embed Code Tab */}
            <TabsContent value="embed-code" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <Label>Generated Embed Code</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Copy this code and paste it into the customer's website, just before the closing &lt;/body&gt; tag.
                  </p>
                </div>

                <div className="relative">
                  <Textarea
                    value={embedCode}
                    readOnly
                    className="font-mono text-xs min-h-[300px] resize-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Installation Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Copy the embed code above</li>
                    <li>Open the customer's website HTML editor</li>
                    <li>Paste the code just before the closing &lt;/body&gt; tag</li>
                    <li>Save and publish the website</li>
                    <li>The AI chatbot will appear automatically on the site</li>
                  </ol>
                </div>

                {(!customerName || !cannMenusId) && (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      ℹ️ Please fill in Customer Name and CannMenus ID in the Configure tab to generate a valid embed code.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <Label>Live Preview</Label>
                  <p className="text-xs text-muted-foreground mb-4">
                    This is how the chatbot will appear on the customer's website.
                  </p>
                </div>

                <div className="border rounded-lg p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-[400px] relative">
                  <div className="text-center text-muted-foreground text-sm mb-4">
                    Customer's Website Preview
                    {/* Chatbot Preview */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="pointer-events-auto w-full h-full">
                        <Chatbot
                          products={previewProducts}
                          brandId={cannMenusId || 'demo'}
                          initialOpen={showPreview}
                          positionStrategy="absolute"
                          className={cn(
                            position === 'bottom-right' ? "bottom-6 right-6" : "bottom-6 left-6"
                          )}
                          windowClassName={cn(
                            position === 'bottom-right' ? "bottom-24 right-6" : "bottom-24 left-6"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-2">
                  Click the robot icon above to toggle the chat preview.
                </p>

                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-4">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    ✓ Chatbot Only Mode
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    This embed includes only the AI chatbot (Smokey). No headless menu or product browsing UI is included.
                    Customers interact with products via conversation only.
                  </p>
                </div>
              </div>

            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Embed Type:</span> Chatbot Only
            </div>
            <div>
              <span className="font-medium">Features:</span> AI Recommendations
            </div>
            <div>
              <span className="font-medium">Product Source:</span> CannMenus API
            </div>
            <div>
              <span className="font-medium">Requirements:</span> Valid CannMenus ID
            </div>
            <div>
              <span className="font-medium">Checkout:</span> {enableCheckout ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
