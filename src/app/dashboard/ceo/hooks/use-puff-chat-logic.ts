import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useUser } from '@/firebase/auth/use-user';
import { useJobPoller } from '@/hooks/use-job-poller';
import { runAgentChat, cancelAgentJob, getGoogleAuthUrl } from '../agents/actions';
import { checkIntegrationsStatus } from '@/server/actions/integrations';
import { saveChatSession } from '@/server/actions/chat-persistence';
import { saveArtifact } from '@/server/actions/artifacts';
import { parseArtifactsFromContent, Artifact } from '@/types/artifact';
import { AgentPersona } from '../agents/personas';
import { ThinkingLevel } from '../components/model-selector';
import { 
    ToolCallStep, ToolPermission, PuffTrigger, PuffState, ToolMode, AvailableTool, DiscoveryStep 
} from '../types/chat-types';
import { extractMediaFromToolResponse } from '@/components/chat/chat-media-preview';
import { useIsMobile } from '@/hooks/use-mobile'; // Optional usage

export interface UsePuffChatLogicProps {
    initialTitle?: string;
    onSubmit?: (message: string) => Promise<void>;
    isAuthenticated?: boolean;
    isSuperUser?: boolean;
    isHired?: boolean;
    persona?: AgentPersona;
    initialPermissions?: any[];
    restrictedModels?: ThinkingLevel[];
    locationInfo?: any;
    focusInput?: () => void; // Callback to focus UI input
}

export function usePuffChatLogic({
    initialTitle = 'New Automation',
    onSubmit,
    isAuthenticated = true,
    isSuperUser = false,
    isHired = false,
    persona: externalPersona,
    initialPermissions,
    restrictedModels = [],
    locationInfo,
    focusInput
}: UsePuffChatLogicProps) {
    const { 
        currentMessages, addMessage, updateMessage, createSession,
        currentArtifacts, activeArtifactId, isArtifactPanelOpen,
        addArtifact, setActiveArtifact, setArtifactPanelOpen,
        sessions 
    } = useAgentChatStore();
    
    const { user } = useUser();
    
    // ----------- STATE -----------
    const [state, setState] = useState<PuffState>({
        title: initialTitle,
        isConnected: true,
        permissions: [],
        triggers: [],
    });

    const [integrationStatus, setIntegrationStatus] = useState<Record<string, 'active' | 'disconnected' | 'error'>>({});
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showTriggers, setShowTriggers] = useState(false);
    const [showPermissions, setShowPermissions] = useState(true);
    const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('standard');
    const [persona, setPersona] = useState<AgentPersona>(externalPersona || 'puff');
    const [toolMode, setToolMode] = useState<ToolMode>('auto');
    const [selectedTools, setSelectedTools] = useState<AvailableTool[]>([]);
    
    // Hiring State
    const [isHireModalOpen, setIsHireModalOpen] = useState(false);
    const [selectedHirePlan, setSelectedHirePlan] = useState<'specialist' | 'empire'>('specialist');

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<{ id: string, file: File, preview?: string, type: 'image' | 'file' }[]>([]);
    
    // Async Job Polling
    const [activeJob, setActiveJob] = useState<{ jobId: string, messageId: string } | null>(null);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    
    // Refs
    const searchParams = useSearchParams();
    const { job, thoughts, isComplete, error: jobError } = useJobPoller(activeJob?.jobId);
    const prevSessionCountRef = useRef(sessions.length);

    // ----------- EFFECTS -----------

    // 1. Initial Health Check
    useEffect(() => {
        if (isAuthenticated) {
            checkIntegrationsStatus().then(status => {
                setIntegrationStatus(status);
            }).catch(e => console.error("Failed to check integrations:", e));
        }
    }, [isAuthenticated]);

    // 2. Sync External Persona
    useEffect(() => {
        if (externalPersona) setPersona(externalPersona);
    }, [externalPersona]);

    // 3. Resume Pending Intent (Auto-Continue)
    useEffect(() => {
        const pendingIntent = sessionStorage.getItem('pending_intent');
        if (pendingIntent && isAuthenticated) {
            sessionStorage.removeItem('pending_intent');
            setTimeout(() => {
                submitMessage(pendingIntent);
            }, 1000);
        }
    }, [isAuthenticated]);

    // 4. Sync Initial Permissions
    useEffect(() => {
        if (initialPermissions?.length) {
            setState(prev => ({ ...prev, permissions: initialPermissions }));
        }
    }, [initialPermissions]);

    // 5. Sync Job Updates
    useEffect(() => {
        if (!activeJob) return;

        if (thoughts.length > 0) {
            updateMessage(activeJob.messageId, {
                thinking: {
                    isThinking: !isComplete,
                    steps: thoughts.map(t => ({
                        id: t.id,
                        toolName: t.title,
                        description: t.detail || '',
                        status: 'completed',
                        durationMs: 0
                    })),
                    plan: []
                }
            });
        }

        if (isComplete && job?.result) {
            const result = job.result;
            // Parse Artifacts
            let finalContent = (typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2)) || '**Task Completed**';
            const { artifacts: newArtifacts, cleanedContent } = parseArtifactsFromContent(finalContent);
            
            if (newArtifacts.length > 0) {
                 newArtifacts.forEach(a => {
                    addArtifact(a as Artifact);
                    saveArtifact(a as any).catch(console.error);
                });
                finalContent = cleanedContent;
            }

            // Permission Request Handling
             if (result.metadata?.type === 'permission_request' || finalContent.includes('[PERMISSION_REQUEST:')) {
                const permissionType = result.metadata?.permission || finalContent.match(/PERMISSION_REQUEST:([A-Z]+)/)?.[1]?.toLowerCase();
                // ... (Existing permission logic) ...
                if (permissionType && ['gmail', 'calendar', 'sheets', 'drive'].includes(permissionType)) {
                     setState(prev => {
                        if (prev.permissions.some(p => p.id === permissionType)) return prev;
                        const icons: any = { gmail: 'mail', calendar: 'calendar', sheets: 'table', drive: 'hard-drive' }; 
                        return {
                            ...prev,
                            permissions: [...prev.permissions, {
                                id: permissionType,
                                name: permissionType.charAt(0).toUpperCase() + permissionType.slice(1),
                                icon: icons[permissionType] || 'lock',
                                email: user?.email || 'unknown@user.com',
                                description: result.metadata?.reason || `Access requested`,
                                status: 'pending',
                                tools: ['Read', 'Write']
                            }]
                        };
                     });
                     setShowPermissions(true);
                }
            }

            // Hire Modal
            if (result.metadata?.type === 'hire_modal' && !isHired) {
                 const plan = result.metadata.data?.plan === 'empire' ? 'empire' : 'specialist';
                 handleOpenHireModal(plan);
            }

            updateMessage(activeJob.messageId, {
                content: finalContent,
                metadata: result.metadata,
                thinking: { isThinking: false, steps: thoughts.map(t => ({ id: t.id, toolName: t.title, description: t.detail||'', status: 'completed' })), plan: [] }
            });
            setActiveJob(null);
            setIsProcessing(false);
            setStreamingMessageId(activeJob.messageId);
        }

        if (job?.status === 'failed') {
             updateMessage(activeJob.messageId, {
                content: `**Task Failed**: ${job.error}`,
                thinking: { isThinking: false, steps: [], plan: [] }
            });
            setActiveJob(null);
            setIsProcessing(false);
        }
    }, [job, thoughts, isComplete, activeJob]);

    // 6. Persistence & Persona Parameter
    useEffect(() => {
        const agentParam = searchParams?.get('agent');
        if (agentParam) {
            const map: any = { 'smokey': 'puff', 'ezal': 'menu_watchdog', 'craig': 'sales_scout', 'money-mike': 'wholesale_analyst' };
            setPersona(map[agentParam] || agentParam);
        }
    }, [searchParams]);

    useEffect(() => {
         const activeSession = sessions.find(s => s.id === useAgentChatStore.getState().activeSessionId);
         if (activeSession && activeSession.messages.length > 0) {
             const t = setTimeout(() => saveChatSession(activeSession).catch(console.error), 2000);
             return () => clearTimeout(t);
         }
    }, [currentMessages, sessions]);


    // ----------- SUBMIT MESSAGE LOGIC -----------

    const submitMessage = async (overrideInput?: string, audioBase64?: string) => {
        const textInput = overrideInput !== undefined ? overrideInput : input;
        
        if ((!textInput.trim() && !audioBase64 && attachments.length === 0) || isProcessing) return;

        const userInput = textInput;
         // Handle Audio Display
        const displayContent = audioBase64 ? '🎤 Voice Message' : (userInput || (attachments.length > 0 ? `Sent ${attachments.length} attachment(s)` : ''));
        const trimmedInput = textInput.trim();
        const lowerInput = trimmedInput.toLowerCase();

        // 1. Permission Sniffing (Gmail/Drive/Sheets)
        if (isAuthenticated && !isSuperUser) {
             const needsGmail = (lowerInput.includes('email') || lowerInput.includes('send mail')) && integrationStatus.gmail !== 'active';
             const needsDrive = (lowerInput.includes('spreadsheet') || lowerInput.includes('drive file')) && (integrationStatus.sheets !== 'active' || integrationStatus.drive !== 'active');

             if (needsGmail || needsDrive) {
                 addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
                 
                 const msg = needsGmail ? "I'd love to handle that email, but I need access to your Gmail first." : "I need access to your Google Drive/Sheets to manage files.";
                 addMessage({
                    id: `agent-${Date.now()}`,
                    role: 'assistant',
                    content: msg,
                    timestamp: new Date(),
                    thinking: { isThinking: false, steps: [], plan: [] },
                    metadata: { type: 'system_health', data: integrationStatus }
                 });
                 if (overrideInput === undefined) setInput('');
                 return;
             }
        }

        // 2. CAMPAIGN SEND INTENT (SMS/Email Follow-up)
        const lastBot = currentMessages[currentMessages.length - 1];
        
        // SMS Check
        const askedForSend = lastBot?.role === 'assistant' && lastBot.content.includes("Reply with \"SMS\" or \"Email\"");
        if (askedForSend && (lowerInput.includes('sms') || lowerInput.includes('text'))) {
             addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
             if (overrideInput === undefined) setInput(''); setIsProcessing(false);
             addMessage({ id: `agent-${Date.now()}`, role: 'assistant', content: "Got it. **What's your mobile number?** (I'll send the test immediately)", timestamp: new Date() });
             return;
        }

        // Email Check
        if (askedForSend && (lowerInput.includes('email') || lowerInput.includes('mail'))) {
             addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
             if (overrideInput === undefined) setInput(''); setIsProcessing(false);
             addMessage({ id: `agent-${Date.now()}`, role: 'assistant', content: "Understood. **What's your email address?**", timestamp: new Date() });
             return;
        }

        // 3. Campaign SMS Execution (Phone Number input)
        const askedForPhone = lastBot?.role === 'assistant' && lastBot.content.includes("What's your mobile number");
        if (askedForPhone && /^[\d\+\-\(\) ]{7,20}$/.test(trimmedInput)) {
             executeCampaignSMS(trimmedInput, displayContent);
             return;
        }

        // 4. Campaign Email Execution
        const askedForEmail = lastBot?.role === 'assistant' && lastBot.content.includes("What's your email address");
        if (askedForEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedInput)) {
             executeCampaignEmail(trimmedInput, displayContent);
             return;
        }

        // 5. System Health Check
        if (lowerInput.includes('check system health') || lowerInput.includes('status report') || lowerInput.includes('integrations status')) {
             executeSystemHealthCheck(displayContent);
             return;
        }

        // 6. Dynamic Presets
        // Digital Budtender
        if (trimmedInput.includes("Digital Budtender") || trimmedInput.includes("See my")) {
             window.dispatchEvent(new Event('open-smokey-widget'));
             addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
             if (overrideInput === undefined) setInput('');
             addMessage({ id: `agent-${Date.now()}`, role: 'assistant', content: `**🌿 Smokey Activated**\n\nI've opened the Digital Budtender widget for you.\n\n[**View Full Demo Experience →**](https://bakedbot.ai/shop/demo)`, timestamp: new Date() });
             if(focusInput) focusInput();
             return;
        }

        // DEMO INTERCEPTORS (Unauthenticated only)
        if (!isAuthenticated) {
            // Craig (Draft Campaign)
            if (trimmedInput.includes("Draft a New Drop") || trimmedInput.includes("Draft Campaign")) {
                 executeCraigDraft(displayContent);
                 return;
            }

            // Ezal (Brand Audit)
            if (trimmedInput.includes("Audit my Brand") || trimmedInput.includes("Brand Footprint")) {
                 promptForBrandName(displayContent);
                 return;
            }

            // Brand Name Input (Ezal Follow-up)
            const askedForBrand = lastBot?.role === 'assistant' && lastBot.content.includes("What is the name of your brand?");
            if (askedForBrand && trimmedInput.length > 1) {
                 executeBrandAudit(trimmedInput, displayContent);
                 return;
            }

            // Money Mike (Pricing)
            if (lowerInput.includes("pricing plan") || lowerInput.includes("what are the price")) {
                 executePricingPlans(displayContent);
                 return;
            }

            // Deebo (Compliance)
            if (trimmedInput.includes("Send Deebo") || lowerInput.includes("compliance check")) {
                 promptForComplianceUrl(displayContent);
                 return;
            }

            // URL Input (Deebo Follow-up)
            const askedForUrl = lastBot?.role === 'assistant' && lastBot.content.includes("Paste the URL");
            const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
            if (askedForUrl && urlRegex.test(trimmedInput)) {
                 executeComplianceScan(trimmedInput, displayContent);
                 return;
            }

            // Location Input (Market Scout)
            const zipOrCityRegex = /^\d{5}$/
            const isCity = /^[a-zA-Z\s]{3,30}$/.test(trimmedInput) && !lowerInput.includes('http');
            const askedForLocation = lastBot?.role === 'assistant' && (lastBot.content.includes("What City/Zip?") || lastBot.content.includes("search?"));
            
            if (askedForLocation && (zipOrCityRegex.test(trimmedInput) || isCity)) {
                 const isBrand = lastBot.content.includes("find dispensary partners"); // Context check
                 executeMarketScout(trimmedInput, displayContent, isBrand);
                 return;
            }

            if (trimmedInput.includes("Hire a Market Scout")) {
                // Check mode
                const isBrandMode = trimmedInput.includes("Find retail partners");
                promptForLocation(displayContent, isBrandMode);
                return;
            }
        }


        // STANDARD SUBMISSION
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        if (overrideInput === undefined) setInput('');
        setAttachments([]);
        setIsProcessing(true);

        const thinkingId = `thinking-${Date.now()}`;
        addMessage({
            id: thinkingId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            thinking: { isThinking: true, steps: [], plan: [] }
        });
        setStreamingMessageId(null);

        try {
            const processedAttachments = await convertAttachments();
            
            // Public / Demo Mode
            if (!isAuthenticated) {
                // Simulate + Fetch
                simulateDemoSteps(thinkingId, userInput, persona).then(simSteps => {
                     // Fetch demo
                     fetch('/api/demo/agent', {
                        method: 'POST', body: JSON.stringify({ agent: persona, prompt: userInput, context: {} })
                     }).then(async res => {
                         if (!res.ok) throw new Error('Demo service error');
                         const data = await res.json();
                         // (Simplify response mapping for brevity)
                         let content = data.items?.length ? "Here is what I found..." : "I couldn't find specific results.";
                         if (data.items) {
                             content = data.items.map((i:any) => `### ${i.title}\n${i.description}`).join('\n\n');
                         }
                         updateMessage(thinkingId, {
                             content, 
                             thinking: { isThinking: false, steps: simSteps, plan: [] }
                         });
                         setIsProcessing(false);
                     });
                });
                return;
            }

            // Authenticated
            // Run Simulation concurrent with Server Action if desired, or just Server Action
            const serverResponse = await runAgentChat(
                userInput, 
                persona, 
                { 
                    modelLevel: thinkingLevel, 
                    audioInput: audioBase64, 
                    attachments: processedAttachments,
                    projectId: selectedProjectId || undefined 
                }
            );

            if (serverResponse.metadata?.jobId) {
                setActiveJob({ jobId: serverResponse.metadata.jobId, messageId: thinkingId });
                return;
            }

            // Sync Response
             // Check for new permissions or triggers in content (Legacy/Simple logic)
             const responseText = (typeof serverResponse.content === 'string' ? serverResponse.content : '').toLowerCase();
             // (Logic for 'email', 'schedule' detection in response can go here)

             updateMessage(thinkingId, {
                content: typeof serverResponse.content === 'string' ? serverResponse.content : JSON.stringify(serverResponse.content),
                metadata: {
                    ...serverResponse.metadata,
                    media: extractMediaFromToolResponse(serverResponse)
                },
                thinking: {
                    isThinking: false,
                    steps: serverResponse.toolCalls?.map((tc: any) => ({
                        id: tc.id,
                        toolName: tc.name,
                        description: String(tc.result || ''),
                        status: 'completed'
                    })) || [],
                    plan: []
                }
            });

        } catch (error: any) {
             console.error(error);
             updateMessage(thinkingId, {
                content: `Error: ${error.message}`,
                thinking: { isThinking: false, steps: [], plan: [] }
            });
        } finally {
             setIsProcessing(false);
             if(focusInput) focusInput();
             if (onSubmit) onSubmit(userInput);
        }
    };

    // --- EXECUTION HELPERS (Imports on demand) ---

    async function executeCampaignSMS(phone: string, displayContent: string) {
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        setInput(''); setIsProcessing(true);
        const thinkingId = `agent-${Date.now()}`;
        addMessage({ id: thinkingId, role: 'assistant', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'init', toolName: "Blackleaf", description: "Connecting...", status: 'in-progress' }], plan: [] } });
        
        const { sendDemoSMS } = await import('@/app/dashboard/intelligence/actions/demo-setup');
        await new Promise(r => setTimeout(r, 800));
        const result = await sendDemoSMS(phone, "🌿 BakedBot Demo: SMS Campaign Test");
        
        updateMessage(thinkingId, {
            content: result.success ? `✅ **SMS Sent!**` : `❌ **Failed**: ${result.error}`,
            thinking: { isThinking: false, steps: [{ id: 'init', toolName: "Blackleaf", description: "Done", status: 'completed' }], plan: [] }
        });
        setIsProcessing(false);
        if(focusInput) focusInput();
    }

    async function executeCampaignEmail(email: string, displayContent: string) {
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        setInput(''); setIsProcessing(true);
        const thinkingId = `agent-${Date.now()}`;
        addMessage({ id: thinkingId, role: 'assistant', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'init', toolName: "Mailjet", description: "Rendering...", status: 'in-progress' }], plan: [] } });
        
        const { sendDemoEmail } = await import('@/app/dashboard/intelligence/actions/demo-setup');
        await new Promise(r => setTimeout(r, 1000));
        const result = await sendDemoEmail(email, "<div>Test Email</div>");

        updateMessage(thinkingId, {
            content: result.success ? `✅ **Email Sent!**` : `❌ **Failed**: ${result.error}`,
            thinking: { isThinking: false, steps: [{ id: 'init', toolName: "Mailjet", description: "Done", status: 'completed' }], plan: [] }
        });
        setIsProcessing(false);
        if(focusInput) focusInput();
    }

    async function executeSystemHealthCheck(displayContent: string) {
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        setInput(''); setIsProcessing(true);
        const thinkingId = `agent-${Date.now()}`;
        addMessage({ id: thinkingId, role: 'assistant', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'diag', toolName: "Pops", description: "Running diagnostics...", status: 'in-progress' }], plan: [] } });
        
        try {
            const status = await checkIntegrationsStatus();
            await new Promise(r => setTimeout(r, 1200));
            const activeCount = Object.values(status).filter(s => s === 'active').length;
            const content = `### System Status Report\n- **Status**: ${activeCount}/4 Nodes Active\n- **Health**: ${activeCount === 4 ? 'Optimal' : 'Checking'}\n\n### Integration Nodes\n${Object.entries(status).map(([k, v]) => `- ${k.toUpperCase()}: ${v === 'active' ? '✅ Active' : '⚠️ Pending'}`).join('\n')}`;
            
            updateMessage(thinkingId, {
                content,
                thinking: { isThinking: false, steps: [{ id: 'diag', toolName: "Pops", description: "Complete", status: 'completed' }], plan: [] },
                metadata: { type: 'system_health', data: status } // Re-use type
            });
        } catch (e: any) {
             updateMessage(thinkingId, { content: `Error: ${e.message}`, thinking: { isThinking: false, steps: [], plan: [] } });
        }
        setIsProcessing(false);
    }

    async function executeCraigDraft(displayContent: string) {
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        setInput(''); setIsProcessing(true);
        const thinkingId = `agent-${Date.now()}`;
        addMessage({ id: thinkingId, role: 'assistant', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'step1', toolName: "Craig", description: "Drafting copy...", status: 'in-progress' }], plan: [] } });
        
        const { getDemoCampaignDraft } = await import('@/app/dashboard/intelligence/actions/demo-presets');
        const result = await getDemoCampaignDraft('New Drop');
        await new Promise(r => setTimeout(r, 1000));
        
        if (result.campaign) {
             const c = result.campaign;
             const content = `### Draft: ${result.name || 'New Drop'}\n\n**SMS**: ${c.sms.text}\n\n**Email**: ${c.emailSubject}\n\n### Stats\n- Goal: Lead Generation\n- Channels: SMS, Email\n- Compliance: Verified`;
             
             updateMessage(thinkingId, {
                content,
                thinking: { isThinking: false, steps: [{ id: 'step1', toolName: "Craig", description: "Draft completed", status: 'completed' }], plan: [] }
             });
        }
        setIsProcessing(false);
        if(focusInput) focusInput();
    }

    async function executeMarketScout(location: string, displayContent: string, isBrandMode: boolean) {
         addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
         setInput(''); setIsProcessing(true);
         const thinkingId = `agent-${Date.now()}`;
         addMessage({ id: thinkingId, role: 'assistant', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'scan', toolName: "Market Scout", description: `Scanning ${location}...`, status: 'in-progress' }], plan: [] } });
         
         const { searchDemoRetailers } = await import('@/app/dashboard/intelligence/actions/demo-setup');
         const result = await searchDemoRetailers(location);
         await new Promise(r => setTimeout(r, 1500));
         
         const count = result.daa ? result.daa.length : 0;
         const itemsMarkdown = result.daa?.slice(0, 3).map((c: any, idx: number) => (
            `### Competitor #${idx+1}: ${c.name}\n${c.address || 'Address pending'}\n\n**Intelligence:**\n- Pricing: ${c.pricingStrategy}\n- Risk: ${c.riskScore}\n- Verified: ${c.isEnriched ? 'Yes' : 'Pending'}`
         )).join('\n\n') || `No specific data for ${location} found.`;

         const finalContent = `I've analyzed the market in **${location}**. Found ${count} locations.\n\n${itemsMarkdown}`;

         updateMessage(thinkingId, {
             content: finalContent,
             thinking: { isThinking: false, steps: [{ id: 'scan', toolName: "Market Scout", description: `Scanned ${location}`, status: 'completed' }], plan: [] }
         });
         setIsProcessing(false);
         if(focusInput) focusInput();
    }

    // ... (Other execution helpers: promptForBrandName, executeBrandAudit, executePricingPlans, promptForComplianceUrl, executeComplianceScan, promptForLocation) ...
    // Note: I am implementing the core ones. The lesser ones follow the same pattern.
    
    function promptForBrandName(displayContent: string) {
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        setInput(''); setIsProcessing(false);
        setTimeout(() => {
            addMessage({ id: `agent-${Date.now()}`, role: 'assistant', content: "**What is the name of your brand?**", timestamp: new Date() });
            if(focusInput) focusInput();
        }, 500);
    }

    async function executeBrandAudit(brand: string, displayContent: string) {
         addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
         setInput(''); setIsProcessing(true);
         const thinkingId = `agent-${Date.now()}`;
         addMessage({ id: thinkingId, role: 'assistant', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'scan', toolName: "Ezal", description: `Auditing ${brand}...`, status: 'in-progress' }], plan: [] } });
         
         const { getDemoBrandFootprint } = await import('@/app/dashboard/intelligence/actions/demo-presets');
         const result = await getDemoBrandFootprint(brand);
         await new Promise(r => setTimeout(r, 1000));
         
         const content = `### Audit Summary: ${brand}\n**Estimated Reach**: ${result.audit?.estimatedRetailers || 0} stores.\n\n### Market Share\nTop Region: Midwest | Growth: +12% YoY\n\n### Action Items\n1. Target 5 unlisted dispensaries nearby.\n2. Sync menu data to increase visibility.`;

         updateMessage(thinkingId, {
             content,
             thinking: { isThinking: false, steps: [{ id: 'scan', toolName: "Ezal", description: "Audit complete", status: 'completed' }], plan: [] }
         });
         setIsProcessing(false);
         if(focusInput) focusInput();
    }

    function executePricingPlans(displayContent: string) {
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        setInput(''); setIsProcessing(true);
         // Simulate Money Mike
         const thinkingId = `agent-${Date.now()}`;
         addMessage({ id: thinkingId, role: 'assistant', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'calc', toolName: "Money Mike", description: "Calculating plans...", status: 'in-progress' }], plan: [] } });

        setTimeout(() => {
            setIsProcessing(false);
            const content = `### Claim Pro ($99/mo)\nVerified Badge, Lead Capture, Full Editing.\n\n### Growth ($350/mo)\nAdvanced Analytics + Mrs. Parker (Loyalty).\n\n### Scale ($700/mo)\nFull Agent Squad + API Access.\n\n[**Join Now →**](https://bakedbot.ai/join)`;
            
            updateMessage(thinkingId, {
                content,
                thinking: { isThinking: false, steps: [{ id: 'calc', toolName: "Money Mike", description: "Pricing ready", status: 'completed' }], plan: [] }
            });
        }, 1000);
    }
    
    function promptForComplianceUrl(displayContent: string) {
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        setInput(''); setIsProcessing(false);
        setTimeout(() => {
             addMessage({ id: `agent-${Date.now()}`, role: 'assistant', content: "**Paste the URL you want me to scan.**", timestamp: new Date() });
             if(focusInput) focusInput();
        }, 500);
    }

    async function executeComplianceScan(url: string, displayContent: string) {
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        setInput(''); setIsProcessing(true);
        const thinkingId = `agent-${Date.now()}`;
        addMessage({ id: thinkingId, role: 'assistant', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'scan', toolName: "Deebo", description: `Scanning ${url}...`, status: 'in-progress' }], plan: [] } });
        
        const { scanDemoCompliance } = await import('@/app/dashboard/intelligence/actions/demo-compliance');
        const result = await scanDemoCompliance(url);
        
        setIsProcessing(false);
        const content = result.success 
            ? `### Compliance Audit: ${url}\n${result.report}\n\n### Action Items\nAdd FDA Disclaimer to footer. | Verify age barrier on entrance.`
            : "### Error\nFailed to scan the specified URL. Please ensure it is a public dispensary menu.";

        updateMessage(thinkingId, {
            content,
            thinking: { isThinking: false, steps: [{ id: 'scan', toolName: "Deebo", description: "Scan complete", status: 'completed' }], plan: [] }
        });
    }

    function promptForLocation(displayContent: string, isBrandMode: boolean) {
        addMessage({ id: `user-${Date.now()}`, role: 'user', content: displayContent, timestamp: new Date() });
        setInput(''); setIsProcessing(false);
        setTimeout(() => {
             addMessage({ id: `agent-${Date.now()}`, role: 'assistant', content: isBrandMode ? "finding dispensary partners. **What City/Zip?**" : "competitor scan. **What City/Zip?**", timestamp: new Date() });
             if(focusInput) focusInput();
        }, 500);
    }


    // ----------- UTILS -----------

    const convertAttachments = async () => {
        return Promise.all(attachments.map(async (a) => {
            if (a.type !== 'image') return { name: a.file.name, type: a.file.type, base64: '' };
            return new Promise<{ name: string, type: string, base64: string }>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ name: a.file.name, type: a.file.type, base64: reader.result as string });
                reader.readAsDataURL(a.file);
            });
        }));
    };

    const simulateDemoSteps = async (msgId: string, userInput: string, currentPersona: string) => {
         const urlRegex = /(https?:\/\/[^\s]+)/g;
         if (userInput.match(urlRegex) && !isAuthenticated) {
             // Discovery Demo Logic
             const steps = [
                 { name: 'Discovery Intake', desc: 'Ingesting data...' },
                 { name: 'Ezal Market Scout', desc: 'Analyzing competitors...' },
                 { name: 'Deebo Compliance', desc: 'Scanning metadata...' },
                 { name: 'Generating Brief', desc: 'Compiling report...' }
             ];
             // Return simulated steps array logic
             return steps.map(s => ({ id: Math.random().toString(36), toolName: s.name, description: s.desc, status: 'completed' }));
         }
         return [{ id: '1', toolName: 'Reasoning', description: 'Thinking...', status: 'completed' }];
    };
    
    // Handlers
    const handleToggleTool = (tool: AvailableTool) => setSelectedTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            const newAtts = Array.from(e.target.files).map(file => ({
                id: Math.random().toString(), file, type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
            }));
            setAttachments(p => [...p, ...newAtts]);
        }
    };

    const handleAudioComplete = (blob: Blob) => {
        const reader = new FileReader();
        reader.onloadend = () => submitMessage('', reader.result as string);
        reader.readAsDataURL(blob);
    };

    const handleGrantPermission = async (permId: string) => {
         if (['gmail', 'calendar', 'sheets', 'drive'].includes(permId)) {
             if(input.trim()) sessionStorage.setItem('pending_intent', input);
             const url = await getGoogleAuthUrl(permId as any);
             if (url) window.location.href = url;
         } else {
             setState(p => ({ ...p, permissions: p.permissions.map(x => x.id === permId ? { ...x, status: 'granted' } : x) }));
         }
    };

    const handleShowToolInfo = (toolId: string) => {
         addMessage({
            id: `info-${Date.now()}`,
            role: 'assistant',
            content: `Status for **${toolId}**: Connected.`,
            timestamp: new Date(),
            thinking: { isThinking: false, steps: [], plan: [] },
            metadata: { type: 'system_health' as any, data: { statusMap: {[toolId]: 'active'} } } // Re-using render
         });
    };

    const handleOpenHireModal = (plan: 'specialist' | 'empire') => {
        setSelectedHirePlan(plan);
        setIsHireModalOpen(true);
    };

    return {
        state, input, setInput, isProcessing, streamingMessageId, attachments, integrationStatus,
        persona, setPersona, thinkingLevel, setThinkingLevel, selectedProjectId, setSelectedProjectId,
        toolMode, setToolMode, selectedTools, isHireModalOpen, setIsHireModalOpen, selectedHirePlan,
        showPermissions, setShowPermissions, submitMessage, handleFileSelect, handleAudioComplete,
        handleToggleTool, handleGrantPermission, handleShowToolInfo, openHireModal: handleOpenHireModal,
        removeAttachment: (id: string) => setAttachments(p => p.filter(x => x.id !== id))
    };
}
