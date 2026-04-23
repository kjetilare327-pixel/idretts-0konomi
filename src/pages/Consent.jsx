import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Check, ChevronRight, FileText, Lock, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Consent({ onConsented }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;
    setLoading(true);
    await base44.auth.updateMe({
      consent_given: true,
      consent_date: new Date().toISOString(),
    });
    toast.success('Samtykke registrert');
    onConsented();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-2xl">KF</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Velkommen til KlubbFinans</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Før du starter, trenger vi ditt samtykke til hvordan vi håndterer dine data.
          </p>
        </div>

        {/* Data usage info */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5 mb-6">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Slik bruker vi dine data
          </h2>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Medlems- og betalingsdata</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vi lagrer informasjon om klubbens medlemmer og betalinger for å hjelpe deg med å administrere klubbøkonomien. Data lagres sikkert og deles ikke med tredjeparter.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Personvern og sikkerhet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vi behandler personopplysninger i henhold til GDPR. Du har rett til innsyn, retting og sletting av dine data. E-postadresser og kontaktinfo brukes kun til purringer og kommunikasjon fra klubben.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">E-postvarsler</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vi kan sende e-post til foresatte og medlemmer med betalingspåminnelser og viktige beskjeder fra klubben. Du kan når som helst administrere dette i innstillinger.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Ved å bruke KlubbFinans godtar du våre{' '}
              <a href="https://www.klubbfinans.no/vilkaar" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
                brukervilkår
              </a>{' '}
              og{' '}
              <a href="https://www.klubbfinans.no/personvern" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
                personvernpolicy
              </a>.
            </p>
          </div>
        </div>

        {/* Consent checkbox */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-6 flex items-start gap-3">
          <Checkbox
            id="consent"
            checked={accepted}
            onCheckedChange={setAccepted}
            className="mt-0.5"
          />
          <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
            Jeg har lest og godtar KlubbFinans sine vilkår og personvernpolicy, og samtykker til at KlubbFinans behandler personopplysninger som beskrevet over.
          </Label>
        </div>

        {/* CTA */}
        <Button
          className="w-full"
          size="lg"
          disabled={!accepted || loading}
          onClick={handleAccept}
        >
          {loading ? (
            'Lagrer samtykke...'
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Godta og fortsett
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Du kan slette kontoen og alle data under Innstillinger.
        </p>
      </div>
    </div>
  );
}