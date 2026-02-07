/**
 * Compliance Tab
 *
 * Manage state-specific compliance rules and disclaimers.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updateBrandGuide } from '@/server/actions/brand-guide';
import { COMPLIANCE_RULES_BY_STATE, US_STATES } from '@/lib/compliance-rules';
import { useToast } from '@/hooks/use-toast';
import type { BrandGuide, BrandCompliance, ComplianceRule } from '@/types/brand-guide';

interface ComplianceTabProps {
  brandId: string;
  brandGuide: BrandGuide;
  onUpdate: (updates: Partial<BrandGuide>) => void;
}

export function ComplianceTab({ brandId, brandGuide, onUpdate }: ComplianceTabProps) {
  const [compliance, setCompliance] = useState<BrandCompliance>(brandGuide.compliance);
  const [selectedState, setSelectedState] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);

    try {
      const result = await updateBrandGuide({
        brandId,
        updates: { compliance },
        createVersion: true,
        reason: 'Updated compliance settings',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update compliance');
      }

      toast({
        title: 'Compliance Updated',
        description: 'Your compliance settings have been saved successfully.',
      });

      onUpdate({ compliance });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addStateRules = () => {
    if (!selectedState) return;

    const rules = COMPLIANCE_RULES_BY_STATE[selectedState as keyof typeof COMPLIANCE_RULES_BY_STATE];
    if (!rules) return;

    // Check if state already added
    const existingStateRules = compliance.stateSpecificRules || [];
    if (existingStateRules.some((r) => r.state === selectedState)) {
      toast({
        title: 'Already Added',
        description: `${selectedState} rules are already in your compliance settings.`,
        variant: 'destructive',
      });
      return;
    }

    setCompliance({
      ...compliance,
      stateSpecificRules: [...existingStateRules, ...rules],
    });

    setSelectedState('');

    toast({
      title: 'State Rules Added',
      description: `Added ${rules.length} compliance rules for ${selectedState}.`,
    });
  };

  const removeStateRules = (state: string) => {
    setCompliance({
      ...compliance,
      stateSpecificRules: (compliance.stateSpecificRules || []).filter((r) => r.state !== state),
    });
  };

  const toggleRestriction = (restriction: string) => {
    const current = compliance.restrictions || [];
    const updated = current.includes(restriction)
      ? current.filter((r) => r !== restriction)
      : [...current, restriction];

    setCompliance({ ...compliance, restrictions: updated });
  };

  const getUniqueStates = () => {
    const states = new Set((compliance.stateSpecificRules || []).map((r) => r.state));
    return Array.from(states);
  };

  const getRulesForState = (state: string): ComplianceRule[] => {
    return (compliance.stateSpecificRules || []).filter((r) => r.state === state);
  };

  return (
    <div className="space-y-6">
      {/* Overview Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          Configure state-specific compliance rules and general restrictions for your brand.
          These rules help ensure all content meets regulatory requirements.
        </AlertDescription>
      </Alert>

      {/* State-Specific Rules */}
      <Card>
        <CardHeader>
          <CardTitle>State-Specific Compliance Rules</CardTitle>
          <CardDescription>
            Add compliance rules for states where you operate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a state..." />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addStateRules} disabled={!selectedState}>
              Add State
            </Button>
          </div>

          {/* Active States */}
          {getUniqueStates().length > 0 && (
            <div className="space-y-4 mt-6">
              <Label>Active States</Label>
              {getUniqueStates().map((state) => {
                const rules = getRulesForState(state);
                return (
                  <Card key={state}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{state}</CardTitle>
                          <Badge variant="secondary">{rules.length} rules</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStateRules(state)}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {rules.map((rule, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-sm p-2 bg-muted rounded"
                          >
                            {rule.severity === 'critical' ? (
                              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                            ) : rule.severity === 'high' ? (
                              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{rule.category}</div>
                              <div className="text-muted-foreground">{rule.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>General Content Restrictions</CardTitle>
          <CardDescription>
            Select what types of content or claims are restricted for your brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { id: 'health_claims', label: 'Health Claims', description: 'No medical or health benefit claims' },
            { id: 'therapeutic_claims', label: 'Therapeutic Claims', description: 'No therapeutic or treatment claims' },
            { id: 'age_restricted', label: 'Age-Restricted Content', description: 'Content only for 21+' },
            { id: 'no_minors', label: 'No Minors in Marketing', description: 'Never show minors in marketing materials' },
            { id: 'no_celebrity', label: 'No Celebrity Endorsements', description: 'Avoid celebrity endorsements' },
            { id: 'no_cartoon', label: 'No Cartoon Characters', description: 'No cartoon or animated characters' },
            { id: 'pesticide_testing', label: 'Pesticide Testing Required', description: 'Must show pesticide test results' },
            { id: 'potency_testing', label: 'Potency Testing Required', description: 'Must show THC/CBD percentages' },
          ].map((restriction) => (
            <div key={restriction.id} className="flex items-start gap-3 p-3 border rounded">
              <Checkbox
                id={restriction.id}
                checked={(compliance.restrictions || []).includes(restriction.id)}
                onCheckedChange={() => toggleRestriction(restriction.id)}
              />
              <div className="flex-1">
                <Label htmlFor={restriction.id} className="cursor-pointer font-medium">
                  {restriction.label}
                </Label>
                <p className="text-sm text-muted-foreground">{restriction.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Required Disclaimers */}
      <Card>
        <CardHeader>
          <CardTitle>Required Disclaimers</CardTitle>
          <CardDescription>
            Standard disclaimers that must appear on marketing materials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="disclaimer-age">Age Restriction Disclaimer</Label>
            <Textarea
              id="disclaimer-age"
              value={compliance.requiredDisclaimers?.age || ''}
              onChange={(e) =>
                setCompliance({
                  ...compliance,
                  requiredDisclaimers: {
                    ...compliance.requiredDisclaimers,
                    age: e.target.value,
                  },
                })
              }
              placeholder="e.g., Must be 21+ to purchase. Valid ID required."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="disclaimer-health">Health Disclaimer</Label>
            <Textarea
              id="disclaimer-health"
              value={compliance.requiredDisclaimers?.health || ''}
              onChange={(e) =>
                setCompliance({
                  ...compliance,
                  requiredDisclaimers: {
                    ...compliance.requiredDisclaimers,
                    health: e.target.value,
                  },
                })
              }
              placeholder="e.g., These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="disclaimer-legal">Legal Disclaimer</Label>
            <Textarea
              id="disclaimer-legal"
              value={compliance.requiredDisclaimers?.legal || ''}
              onChange={(e) =>
                setCompliance({
                  ...compliance,
                  requiredDisclaimers: {
                    ...compliance.requiredDisclaimers,
                    legal: e.target.value,
                  },
                })
              }
              placeholder="e.g., For legal adult use only. Possession and use is subject to state and local law."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Packaging Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Packaging Requirements</CardTitle>
          <CardDescription>
            Packaging and labeling requirements specific to your brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={compliance.packagingRequirements || ''}
            onChange={(e) =>
              setCompliance({ ...compliance, packagingRequirements: e.target.value })
            }
            placeholder="Describe packaging requirements (e.g., child-resistant, opaque, specific warning symbols, etc.)"
            rows={5}
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setCompliance(brandGuide.compliance)}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
