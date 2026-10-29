/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — typage interne progressif (PLAN §5.1.3) : les types publics sont dans ./types.ts

const MELATONIN_CONTRAINDICATIONS = Object.freeze({
  pregnant: 'Grossesse',
  breastfeeding: 'Allaitement',
  epilepsy: 'Épilepsie',
  autoimmune: 'Maladie auto-immune ou inflammatoire',
  anticoagulant: 'Traitement anticoagulant (dont AVK)',
  immunosuppressant: 'Traitement immunosuppresseur',
  fluvoxamine: 'Fluvoxamine ou autre inhibiteur puissant du CYP1A2',
  hepaticImpairment: 'Insuffisance hépatique',
  sedatives: 'Traitement sédatif, hypnotique ou consommation d’alcool associée',
  otherContraindication: 'Autre contre-indication signalée',
});
/**
 * @param {object|null} medical réponses au questionnaire de sécurité (null = non rempli)
 * @param {object} profile CircadianProfile
 * @param {{enabled?:boolean, physicianApproved?:boolean, doseMg?:number}} pref préférence mélatonine
 */
function screenMelatonin(medical, profile, pref = {}) {
  const reasons = [],
    warnings = [];
  if (!pref || !pref.enabled)
    return {
      allowed: false,
      reasons: [{ code: 'NOT_REQUESTED' }],
      warnings,
      requiresMedicalAdvice: true,
    };
  if (!medical)
    return {
      allowed: false,
      reasons: [{ code: 'SCREENING_REQUIRED', message: 'Questionnaire de sécurité non rempli.' }],
      warnings,
      requiresMedicalAdvice: true,
    };
  if (profile && profile.age != null && profile.age < 18)
    reasons.push({ code: 'MINOR', message: 'Moins de 18 ans.' });
  for (const [k, label] of Object.entries(MELATONIN_CONTRAINDICATIONS))
    if (medical[k]) reasons.push({ code: k.toUpperCase(), message: label });
  let doseMg = 0.5;
  if (pref.physicianApproved && Number.isFinite(+pref.doseMg) && +pref.doseMg > 0)
    doseMg = Math.min(+pref.doseMg, 5);
  if (doseMg > 1)
    warnings.push({
      code: 'DOSE_ABOVE_LOW',
      message: 'Au-delà de 1 mg, la somnolence résiduelle augmente sans gain de recalage démontré.',
    });
  warnings.push({
    code: 'NO_DRIVING',
    message: 'Pas de conduite ni d’activité à risque dans les heures suivant la prise.',
  });
  return {
    allowed: reasons.length === 0,
    reasons,
    warnings,
    doseMg,
    requiresMedicalAdvice: !pref.physicianApproved,
    label: pref.physicianApproved
      ? `Mélatonine ${doseMg} mg (dose validée par votre médecin)`
      : 'Mélatonine faible dose, uniquement après avis médical',
  };
}
function screenCaffeine(profile, medical = {}) {
  if (!profile || profile.caffeineUse === 'none')
    return { allowed: false, reason: 'NO_CAFFEINE_USER' };
  if (medical && (medical.pregnant || medical.arrhythmia || medical.caffeineIntolerance))
    return { allowed: false, reason: 'MEDICAL' };
  return {
    allowed: true,
    cutoffBeforeSleepH: profile.caffeineUse === 'high' || profile.sleepQuality === 'poor' ? 8 : 6,
    maxServingsPerDay: profile.caffeineUse === 'high' ? 4 : 3,
  };
}
/** Avertissements génériques ajoutés à tout plan. */
function globalSafetyNotes({ itinerary, trace }) {
  const notes = [
    {
      code: 'NOT_MEDICAL_ADVICE',
      message: 'Plan d’information générale ; il ne remplace pas une consultation.',
    },
    {
      code: 'NO_HYPNOTICS',
      message: 'Fuseo ne recommande jamais de somnifère ; ils ne recalent pas l’horloge.',
    },
    { code: 'ALCOHOL', message: 'Pas d’alcool pour dormir, en particulier en vol.' },
  ];
  if (itinerary && trace)
    for (const l of itinerary.legs) {
      const low = trace.find(
        (p) =>
          p.t >= l.arrUtc && p.t <= l.arrUtc + 6 * 3600e3 && !p.asleep && p.predictedAlertness < 40,
      );
      if (low) {
        notes.push({
          code: 'DROWSY_DRIVING',
          legId: l.id,
          message: `Vigilance prédite basse après l’arrivée du vol ${l.id} : évitez de conduire.`,
        });
        break;
      }
    }
  return notes;
}

export { MELATONIN_CONTRAINDICATIONS, screenMelatonin, screenCaffeine, globalSafetyNotes };
