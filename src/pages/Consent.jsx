import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Shield, Check, ChevronRight, FileText, Lock, Bell,
  Database, UserCheck, Scale, Trash2, X, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const CONSENT_VERSION = '1.0';

export default function Consent({ onConsented }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeclineInfo, setShowDeclineInfo] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;
    setLoading(true);
    try {
      await base44.auth.updateMe({
        consent_given: true,
        consent_date: new Date().toISOString(),
        consent_version: CONSENT_VERSION,
      });
      toast.success('Samtykke registrert');
      onConsented();
    } catch {
      toast.error('Noe gikk galt. Prøv igjen.');
      setLoading(false);
    }
  };

  const handleDecline = () => {
    setShowDeclineInfo(true);
  };

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  if (showDeclineInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <X className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Samtykke er nødvendig</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                KlubbFinans kan dessverre ikke brukes uten at du samtykker til behandling av personopplysninger.
                Dette er lovpålagt etter GDPR (personopplysningsloven), da vi behandler persondata om
                klubbens medlemmer og foresatte på dine vegne.
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-left text-xs text-muted-foreground space-y-1">
              <p>• Uten samtykke kan vi ikke lagre eller behandle nødvendige data.</p>
              <p>• Du kan logge inn igjen og godta samtykke når som helst.</p>
              <p>• Dine rettigheter etter GDPR er alltid ivaretatt.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setShowDeclineInfo(false)} className="w-full">
                <ChevronRight className="w-4 h-4 mr-2" /> Gå tilbake og godta
              </Button>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                Logg ut
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-2xl">KF</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Personvern og samtykke</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-sm">
            I henhold til GDPR må vi informere deg om hvordan vi behandler personopplysninger og innhente ditt samtykke.
          </p>
        </div>

        {/* Main consent card */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5 mb-4">

          {/* What data */}
          <Section icon={Database} title="Personopplysninger vi behandler">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vi behandler følgende kategorier av personopplysninger: <strong>navn, e-postadresse, telefonnummer</strong> (administratorer og foresatte),
              <strong> medlemsdata</strong> (spiller, lag, fødselår, type),
              <strong> betalingsdata</strong> (krav, betalingsstatus, betalingshistorikk),
              <strong> banktransaksjoner og saldo, dugnadsinntekter</strong> samt
              <strong> AI-genererte innsikter</strong> basert på klubbens økonomidata.
            </p>
          </Section>

          {/* Purpose */}
          <Section icon={FileText} title="Formål med behandlingen">
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Administrasjon av klubbøkonomi, budsjett og regnskapsrapporter</li>
              <li>• Håndtering av betalingskrav og innkrevning av kontingent</li>
              <li>• Utsending av påminnelser og varsler til foresatte og medlemmer</li>
              <li>• AI-drevne innsikter og anbefalinger for bedre økonomiforvaltning</li>
              <li>• Administrasjon av sesong- og lagsdata</li>
            </ul>
          </Section>

          {/* Rights */}
          <Section icon={Scale} title="Dine rettigheter (GDPR)">
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• <strong>Innsyn:</strong> Du kan når som helst be om innsyn i dine opplysninger</li>
              <li>• <strong>Retting:</strong> Du kan korrigere feilaktige opplysninger</li>
              <li>• <strong>Sletting:</strong> Du kan be om sletting av dine data («retten til å bli glemt»)</li>
              <li>• <strong>Trekke samtykke:</strong> Du kan trekke samtykket ditt i Innstillinger → Personvern</li>
              <li>• <strong>Klage:</strong> Du kan klage til <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Datatilsynet</a> dersom du mener vi behandler data ulovlig</li>
            </ul>
          </Section>

          {/* Storage & responsibility */}
          <Section icon={Lock} title="Lagringstid og behandlingsansvar">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Data lagres så lenge du er aktiv bruker av tjenesten, og i inntil <strong>3 år</strong> etter avsluttet abonnement av bokføringshensyn.
              <strong> Behandlingsansvarlig er klubben</strong> du administrerer gjennom KlubbFinans. KlubbFinans AS er databehandler
              på vegne av klubben og behandler data i henhold til vår databehandleravtale.
            </p>
          </Section>

          {/* Notifications */}
          <Section icon={Bell} title="Varsler og kommunikasjon">
            <p className="text-xs text-muted-foreground leading-relaxed">
              E-postadresser brukes til betalingspåminnelser og viktige beskjeder fra klubben.
              Du administrerer varslingsinnstillinger under Innstillinger → Automatisering.
            </p>
          </Section>

          {/* Responsibility */}
          <Section icon={UserCheck} title="Dine plikter som administrator">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Når du registrerer andre personers opplysninger (f.eks. spillere og foresatte), er du ansvarlig for
              at disse er informert og at behandlingen har gyldig rettslig grunnlag etter GDPR.
            </p>
          </Section>

          <div className="border-t border-border pt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Samtykkeversjon {CONSENT_VERSION} · Sist oppdatert april 2025
            </p>
            <a
              href="https://www.klubbfinans.no/personvern"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline underline-offset-2 hover:opacity-80 flex items-center gap-1"
            >
              Full personvernerklæring <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Consent checkbox */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-4 flex items-start gap-3">
          <Checkbox
            id="consent"
            checked={accepted}
            onCheckedChange={setAccepted}
            className="mt-0.5"
          />
          <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
            Jeg bekrefter at jeg har lest og forstått informasjonen over, og samtykker til at KlubbFinans
            behandler personopplysninger som beskrevet, i samsvar med GDPR.
          </Label>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
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
                Godta samtykke og fortsett
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full text-muted-foreground"
            onClick={handleDecline}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Avslå
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Du kan trekke samtykket og slette kontoen din under Innstillinger.
        </p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium mb-1">{title}</p>
        {children}
      </div>
    </div>
  );
}