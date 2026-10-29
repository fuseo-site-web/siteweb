// Connexion et espace utilisateur. NOUVEAU : textes à relire (le consentement santé est un texte juridique).
const M = (en, es) => ({ en, es });
module.exports = [
  ['auth.title', 'Se connecter', M('Sign in', 'Iniciar sesión')],
  [
    'auth.lead',
    'Retrouvez vos voyages et vos plans sur tous vos appareils.',
    M(
      'Find your trips and plans on all your devices.',
      'Encuentre sus viajes y planes en todos sus dispositivos.',
    ),
  ],
  ['auth.google', 'Continuer avec Google', M('Continue with Google', 'Continuar con Google')],
  ['auth.or', 'ou', M('or', 'o')],
  ['auth.email', 'Adresse e-mail', M('Email address', 'Correo electrónico')],
  [
    'auth.send',
    'Recevoir un lien de connexion',
    M('Email me a sign-in link', 'Recibir un enlace de acceso'),
  ],
  ['auth.sending', 'Envoi…', M('Sending…', 'Enviando…')],
  [
    'auth.sent',
    "Un lien de connexion vient d'être envoyé à {email}.",
    M('A sign-in link has been sent to {email}.', 'Se ha enviado un enlace de acceso a {email}.'),
  ],
  [
    'auth.error',
    'La connexion a échoué. Réessayez.',
    M('Sign-in failed. Please try again.', 'No se pudo iniciar sesión. Inténtelo de nuevo.'),
  ],
  [
    'auth.legal',
    'En vous connectant, vous acceptez les',
    M('By signing in, you accept the', 'Al iniciar sesión, acepta las'),
  ],
  ['auth.and', 'et la', M('and the', 'y la')],
  ['auth.tabLogin', 'Se connecter', M('Sign in', 'Iniciar sesión')],
  ['auth.tabSignup', 'Créer un compte', M('Create an account', 'Crear una cuenta')],
  ['auth.password', 'Mot de passe', M('Password', 'Contraseña')],
  [
    'auth.passwordHint',
    '10 caractères minimum.',
    M('At least 10 characters.', 'Mínimo 10 caracteres.'),
  ],
  ['auth.signIn', 'Se connecter', M('Sign in', 'Iniciar sesión')],
  ['auth.signUp', 'Créer mon compte', M('Create my account', 'Crear mi cuenta')],
  ['auth.forgot', 'Mot de passe oublié ?', M('Forgot your password?', '¿Olvidó su contraseña?')],
  [
    'auth.reset',
    'Envoyer le lien de réinitialisation',
    M('Send the reset link', 'Enviar el enlace de restablecimiento'),
  ],
  [
    'auth.resetIntro',
    'Saisissez votre adresse e-mail : nous vous envoyons un lien pour choisir un nouveau mot de passe.',
    M(
      'Enter your email address: we will send you a link to choose a new password.',
      'Introduzca su correo electrónico: le enviaremos un enlace para elegir una nueva contraseña.',
    ),
  ],
  [
    'auth.resetSent',
    "Si un compte existe pour {email}, un lien de réinitialisation vient d'être envoyé.",
    M(
      'If an account exists for {email}, a reset link has just been sent.',
      'Si existe una cuenta para {email}, se ha enviado un enlace de restablecimiento.',
    ),
  ],
  [
    'auth.signupSent',
    'Compte créé. Confirmez votre adresse avec le lien envoyé à {email}, puis connectez-vous.',
    M(
      'Account created. Confirm your address with the link sent to {email}, then sign in.',
      'Cuenta creada. Confirme su dirección con el enlace enviado a {email} y luego inicie sesión.',
    ),
  ],
  [
    'auth.badCreds',
    'Adresse e-mail ou mot de passe incorrect, ou adresse pas encore confirmée.',
    M(
      'Incorrect email or password, or address not confirmed yet.',
      'Correo o contraseña incorrectos, o dirección aún sin confirmar.',
    ),
  ],
  [
    'auth.weak',
    'Mot de passe trop court : 10 caractères minimum.',
    M(
      'Password too short: at least 10 characters.',
      'Contraseña demasiado corta: mínimo 10 caracteres.',
    ),
  ],
  ['auth.back', 'Retour à la connexion', M('Back to sign in', 'Volver al inicio de sesión')],
  ['auth.resetTitle', 'Nouveau mot de passe', M('New password', 'Nueva contraseña')],
  [
    'auth.resetLead',
    'Choisissez un nouveau mot de passe pour votre compte.',
    M('Choose a new password for your account.', 'Elija una nueva contraseña para su cuenta.'),
  ],
  ['auth.resetSave', 'Enregistrer le mot de passe', M('Save password', 'Guardar la contraseña')],
  [
    'auth.resetDone',
    'Mot de passe mis à jour. Redirection vers votre espace…',
    M(
      'Password updated. Redirecting to your account…',
      'Contraseña actualizada. Redirigiendo a su espacio…',
    ),
  ],
  [
    'auth.resetExpired',
    'Ce lien a expiré ou a déjà été utilisé.',
    M(
      'This link has expired or has already been used.',
      'Este enlace ha caducado o ya se ha usado.',
    ),
  ],
  [
    'auth.resetAgain',
    'Demander un nouveau lien',
    M('Request a new link', 'Solicitar un nuevo enlace'),
  ],

  ['account.title', 'Mon espace', M('My account', 'Mi espacio')],
  [
    'account.lead',
    'Vos accès, vos voyages et vos données, au même endroit.',
    M(
      'Your access, trips and data, all in one place.',
      'Sus accesos, viajes y datos, en un solo lugar.',
    ),
  ],
  [
    'account.hello',
    'Connecté en tant que {email}',
    M('Signed in as {email}', 'Sesión iniciada como {email}'),
  ],
  ['account.signOut', 'Se déconnecter', M('Sign out', 'Cerrar sesión')],
  ['account.access', 'Mon accès', M('My access', 'Mi acceso')],
  [
    'account.free',
    'Offre Découverte : aperçu gratuit des premiers jours de chaque plan.',
    M(
      'Discovery offer: free preview of the first days of each plan.',
      'Oferta Descubrimiento: vista previa gratuita de los primeros días de cada plan.',
    ),
  ],
  [
    'account.accessUntil',
    "valable jusqu'au {date}",
    M('valid until {date}', 'válido hasta el {date}'),
  ],
  [
    'account.credits',
    '{n} voyage(s) restant(s)',
    M('{n} trip(s) left', '{n} viaje(s) restante(s)'),
  ],
  ['account.trips', 'Mes voyages', M('My trips', 'Mis viajes')],
  [
    'account.tripsEmpty',
    'Aucun voyage enregistré. Générez un plan puis enregistrez-le depuis la page du plan.',
    M(
      'No saved trips. Generate a plan, then save it from the plan page.',
      'Ningún viaje guardado. Genere un plan y guárdelo desde la página del plan.',
    ),
  ],
  ['account.create', 'Créer un plan', M('Create a plan', 'Crear un plan')],
  ['account.open', 'Ouvrir', M('Open', 'Abrir')],
  ['account.delete', 'Supprimer', M('Delete', 'Eliminar')],
  ['account.savedOn', 'Enregistré le {date}', M('Saved on {date}', 'Guardado el {date}')],
  [
    'account.deleteAfter',
    'Suppression automatique le {date}',
    M('Automatically deleted on {date}', 'Eliminación automática el {date}'),
  ],
  ['account.health', 'Mes données de santé', M('My health data', 'Mis datos de salud')],
  [
    'account.healthOn',
    'Consentement accordé le {date}. Vos horaires de sommeil et vos voyages sont enregistrés chiffrés ; vous seul pouvez les lire.',
    M(
      'Consent given on {date}. Your sleep times and trips are stored encrypted; only you can read them.',
      'Consentimiento otorgado el {date}. Sus horarios de sueño y viajes se guardan cifrados; solo usted puede leerlos.',
    ),
  ],
  [
    'account.healthOff',
    "Aucune donnée de santé n'est enregistrée. Autorisez l'enregistrement chiffré pour retrouver vos voyages d'un appareil à l'autre.",
    M(
      'No health data is stored. Allow encrypted storage to find your trips across devices.',
      'No se guarda ningún dato de salud. Autorice el almacenamiento cifrado para encontrar sus viajes en todos sus dispositivos.',
    ),
  ],
  [
    'account.consentText',
    "J'accepte que Fuseo enregistre mes données de santé (horaires de sommeil, profil, vols) pour calculer et conserver mes plans. Ce consentement est distinct de l'acceptation des CGU et je peux le retirer à tout moment, ce qui supprime ces données.",
    M(
      'I agree that Fuseo stores my health data (sleep times, profile, flights) to calculate and keep my plans. This consent is separate from accepting the Terms of use and I can withdraw it at any time, which deletes this data.',
      'Acepto que Fuseo guarde mis datos de salud (horarios de sueño, perfil, vuelos) para calcular y conservar mis planes. Este consentimiento es independiente de la aceptación de las condiciones de uso y puedo retirarlo en cualquier momento, lo que elimina estos datos.',
    ),
  ],
  [
    'account.grant',
    "Autoriser l'enregistrement",
    M('Allow storage', 'Autorizar el almacenamiento'),
  ],
  [
    'account.withdraw',
    'Retirer mon consentement et supprimer mes données',
    M('Withdraw consent and delete my data', 'Retirar mi consentimiento y eliminar mis datos'),
  ],
  [
    'account.confirm',
    'Confirmer la suppression',
    M('Confirm deletion', 'Confirmar la eliminación'),
  ],
  ['account.cancel', 'Annuler', M('Cancel', 'Cancelar')],
  [
    'account.export',
    'Télécharger mes données (JSON)',
    M('Download my data (JSON)', 'Descargar mis datos (JSON)'),
  ],
  [
    'account.profileSaved',
    'Profil de sommeil enregistré le {date}',
    M('Sleep profile saved on {date}', 'Perfil de sueño guardado el {date}'),
  ],
  ['account.danger', 'Supprimer mon compte', M('Delete my account', 'Eliminar mi cuenta')],
  [
    'account.dangerText',
    "Supprime votre compte et vos données de santé. Vos factures sont conservées sans données de santé, comme l'exige la loi.",
    M(
      'Deletes your account and health data. Invoices are kept without health data, as required by law.',
      'Elimina su cuenta y sus datos de salud. Las facturas se conservan sin datos de salud, como exige la ley.',
    ),
  ],
  [
    'account.deleteAccount',
    'Supprimer définitivement mon compte',
    M('Permanently delete my account', 'Eliminar definitivamente mi cuenta'),
  ],
  [
    'account.error',
    "L'opération a échoué. Réessayez.",
    M('The operation failed. Please try again.', 'La operación ha fallado. Inténtelo de nuevo.'),
  ],
  ['planner.save', 'Enregistrer ce voyage', M('Save this trip', 'Guardar este viaje')],
  [
    'planner.saved',
    'Voyage enregistré dans votre espace.',
    M('Trip saved in your account.', 'Viaje guardado en su espacio.'),
  ],
  [
    'planner.needLogin',
    'Connectez-vous pour enregistrer ce voyage et le retrouver sur tous vos appareils.',
    M(
      'Sign in to save this trip and find it on all your devices.',
      'Inicie sesión para guardar este viaje y encontrarlo en todos sus dispositivos.',
    ),
  ],
  [
    'planner.saveError',
    "L'enregistrement a échoué. Réessayez.",
    M('Saving failed. Please try again.', 'No se pudo guardar. Inténtelo de nuevo.'),
  ],

  [
    'planner.pdfTitle',
    'Plan anti-jet lag personnalisé',
    M('Personalised anti-jet-lag plan', 'Plan antijet lag personalizado'),
  ],
  ['planner.pdfGenerated', 'généré le {date}', M('generated on {date}', 'generado el {date}')],
  ['planner.pdf', 'Télécharger en PDF', M('Download as PDF', 'Descargar en PDF')],
  ['planner.share', 'Partager le PDF', M('Share the PDF', 'Compartir el PDF')],
  ['planner.pdfBusy', 'Préparation du PDF…', M('Preparing the PDF…', 'Preparando el PDF…')],
  [
    'planner.pdfError',
    'Le PDF n’a pas pu être généré. Réessayez.',
    M(
      'The PDF could not be generated. Please try again.',
      'No se pudo generar el PDF. Inténtelo de nuevo.',
    ),
  ],
  [
    'planner.shareFallback',
    'PDF téléchargé : joignez-le à votre message WhatsApp, e-mail ou SMS.',
    M(
      'PDF downloaded: attach it to your WhatsApp message, email or text.',
      'PDF descargado: adjúntelo a su mensaje de WhatsApp, correo o SMS.',
    ),
  ],
  ['account.pdf', 'PDF', M('PDF', 'PDF')],
  ['account.share', 'Partager', M('Share', 'Compartir')],

  ['account.greeting', 'Bonjour {name}', M('Hello {name}', 'Hola {name}')],
  [
    'account.memberSince',
    'Membre depuis le {date}',
    M('Member since {date}', 'Miembro desde el {date}'),
  ],
  [
    'account.profileProgress',
    'Profil complété à {n} %',
    M('Profile {n}% complete', 'Perfil completado al {n} %'),
  ],
  [
    'account.profileNudge',
    'Ajoutez votre nom, votre date de naissance et votre aéroport habituel.',
    M(
      'Add your name, date of birth and usual airport.',
      'Añada su nombre, fecha de nacimiento y aeropuerto habitual.',
    ),
  ],
  ['account.statTrips', 'Voyages', M('Trips', 'Viajes')],
  ['account.statUpcoming', 'À venir', M('Upcoming', 'Próximos')],
  ['account.statZones', 'Fuseaux horaires', M('Time zones', 'Husos horarios')],
  ['account.statNext', 'Prochain départ', M('Next departure', 'Próxima salida')],
  ['account.tabTrips', 'Mes voyages', M('My trips', 'Mis viajes')],
  ['account.tabProfile', 'Mon profil', M('My profile', 'Mi perfil')],
  ['account.tabData', 'Accès et données', M('Access and data', 'Acceso y datos')],
  ['account.upcoming', 'À venir', M('Upcoming', 'Próximos')],
  ['account.past', 'Passés', M('Past', 'Pasados')],
  [
    'account.emptyUpcoming',
    'Aucun voyage à venir. Créez un plan pour votre prochain départ.',
    M(
      'No upcoming trips. Create a plan for your next departure.',
      'No hay viajes próximos. Cree un plan para su próxima salida.',
    ),
  ],
  [
    'account.emptyPast',
    'Aucun voyage passé pour le moment.',
    M('No past trips yet.', 'Aún no hay viajes pasados.'),
  ],
  [
    'account.countdown',
    '{n, plural, =0 {Départ aujourd’hui} =1 {Demain} other {Dans # jours}}',
    M(
      '{n, plural, =0 {Departing today} =1 {Tomorrow} other {In # days}}',
      '{n, plural, =0 {Salida hoy} =1 {Mañana} other {En # días}}',
    ),
  ],
  ['account.ongoing', 'En cours', M('In progress', 'En curso')],
  ['account.done', 'Terminé', M('Completed', 'Finalizado')],
  ['account.ticketReturn', 'Retour {date}', M('Return {date}', 'Regreso {date}')],
  ['account.ticketShift', '{h} h de décalage', M('{h} h time difference', '{h} h de diferencia')],
  ['account.ticketNoShift', 'Même fuseau', M('Same time zone', 'Mismo huso')],
  [
    'account.ticketStops',
    '{n, plural, =0 {Direct} one {# escale} other {# escales}}',
    M(
      '{n, plural, =0 {Direct} one {# stop} other {# stops}}',
      '{n, plural, =0 {Directo} one {# escala} other {# escalas}}',
    ),
  ],
  ['account.ticketNoFlight', 'Plan Fuseo', M('Fuseo plan', 'Plan Fuseo')],
  ['account.ticketPass', 'Carte d’embarquement', M('Boarding pass', 'Tarjeta de embarque')],
  [
    'account.deleteTripConfirm',
    'Supprimer ce voyage ?',
    M('Delete this trip?', '¿Eliminar este viaje?'),
  ],
  ['account.profileTitle', 'Mes informations', M('My details', 'Mis datos')],
  [
    'account.profileLead',
    'Ces informations restent privées : elles servent uniquement à personnaliser votre espace.',
    M(
      'This information stays private: it is only used to personalise your account.',
      'Estos datos son privados: solo sirven para personalizar su espacio.',
    ),
  ],
  ['account.emailLabel', 'Adresse e-mail', M('Email address', 'Correo electrónico')],
  ['account.firstName', 'Prénom', M('First name', 'Nombre')],
  ['account.lastName', 'Nom', M('Last name', 'Apellidos')],
  ['account.birthDate', 'Date de naissance', M('Date of birth', 'Fecha de nacimiento')],
  ['account.ageYears', '{n} ans', M('{n} years old', '{n} años')],
  ['account.country', 'Pays de résidence', M('Country of residence', 'País de residencia')],
  ['account.countryNone', 'Choisir un pays', M('Choose a country', 'Elegir un país')],
  ['account.homeAirport', 'Aéroport habituel', M('Usual airport', 'Aeropuerto habitual')],
  [
    'account.profileSave',
    'Enregistrer mes informations',
    M('Save my details', 'Guardar mis datos'),
  ],
  ['account.profileUpdated', 'Informations enregistrées.', M('Details saved.', 'Datos guardados.')],
  [
    'account.profileInvalid',
    'Vérifiez les informations (date de naissance : 12 ans minimum).',
    M(
      'Please check the details (date of birth: at least 12 years old).',
      'Revise los datos (fecha de nacimiento: mínimo 12 años).',
    ),
  ],
];
