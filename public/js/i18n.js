(function () {
  'use strict';

  const FLAGS = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸' };
  const CODES  = { fr: 'FR',   en: 'EN',   es: 'ES'  };

  // ── Translation dictionaries (French is the source language) ─────────
  // Rules:
  //   • Long/complete phrases MUST be listed before short ones — but the
  //     buildEntries() sort (longest key first) handles this automatically.
  //   • Add the longest natural phrase you see on screen first; short words
  //     (e.g. "Paramètres") are fallbacks for places that render just that word.
  const DICT = {
    en: {

      // ══════════════════ PAGE TITLES / HEADINGS ═══════════════════════
      'Paramètres de l\'Application':           'Application Settings',
      'Gestion des Utilisateurs':               'User Management',
      'Éditeur de Permissions':                 'Permissions Editor',
      'Tableau de bord':                        'Dashboard',
      'Liste des Formateurs':                   'Trainers List',
      'Sessions de Formation':                  'Training Sessions',
      'Session de Formation':                   'Training Session',
      'Modèles de Checklist':                   'Checklist Templates',
      'Vue d\'ensemble du système de formation':'Training system overview',

      // ══════════════════ SETTINGS PAGE ════════════════════════════════
      'Configurez SharePoint et personnalisez l\'apparence': 'Configure SharePoint and customize the appearance',
      'Couleurs par Département':               'Colors by Department',
      'Chaque département peut avoir sa propre couleur d\'accent, choisie parmi la palette officielle Distech Controls.': 'Each department can have its own accent color, chosen from the official Distech Controls palette.',
      'Enregistrer les couleurs':               'Save Colors',
      'Save les couleurs':                      'Save Colors',
      'Configuration SharePoint':               'SharePoint Configuration',
      'Personnalisation du Thème':              'Theme Customization',
      'Guide de configuration':                 'Configuration Guide',
      'Application (client) ID de votre app Azure AD': 'Application (client) ID from your Azure AD app',
      'Secret de l\'application Azure AD':      'Azure AD application secret',
      'Directory (tenant) ID de votre organisation': 'Directory (tenant) ID of your organization',
      'URL complète de votre site SharePoint':  'Full URL of your SharePoint site',
      'Nom exact de la liste SharePoint':       'Exact name of the SharePoint list',
      'Enregistrer SharePoint':                 'Save SharePoint',
      'Palette Distech Controls — cliquez pour appliquer à l\'onglet actif': 'Distech Controls palette — click to apply to active tab',
      'Couleur d\'accent — boutons, liens actifs, badges': 'Accent color — buttons, active links, badges',
      'Couleur d\'accent — boutons, liens actifs': 'Accent color — buttons, active links',
      'Couleurs de la barre de navigation':     'Navbar colors',
      'Couleurs de la barre latérale':          'Sidebar colors',
      'Couleurs de la page':                    'Page colors',
      'En-tête des cartes':                     'Card headers',
      'S\'applique au département:':            'Applies to department:',
      'Département actif:':                     'Active department:',
      'Rétablir les couleurs officielles Distech Controls?': 'Restore official Distech Controls colors?',
      'Ajoutez les permissions: Sites.ReadWrite.All': 'Add permissions: Sites.ReadWrite.All',
      'Créez la liste SharePoint avec les colonnes nécessaires': 'Create the SharePoint list with the required columns',
      'Copiez Client ID, Secret et Tenant ID ici': 'Copy Client ID, Secret and Tenant ID here',
      'Créez une app dans Azure AD (App registrations)': 'Create an app in Azure AD (App registrations)',
      'Créez un client secret':                 'Create a client secret',

      // ══════════════════ BACKUP SECTION ═══════════════════════════════
      'Sauvegarde Complète':                    'Full Backup',
      'Contenu de la sauvegarde :':             'Backup contents:',
      'Base de données (KB)':                   'Database (KB)',
      'Base de données':                        'Database',
      'Fichiers téléversés':                    'Uploaded Files',
      'Aucune donnée envoyée en ligne':         'No data sent online',
      'Restauration :':                         'Restore:',
      '— toutes vos données (employés, formations, évaluations, paramètres)': '— all your data (employees, training, evaluations, settings)',
      '— toutes les photos d\'employés et fichiers téléversés': '— all employee photos and uploaded files',
      '— date et auteur de la sauvegarde':      '— date and author of the backup',
      'pour restaurer, remplacez le fichier':   'to restore, replace the file',
      'et le dossier':                          'and the folder',
      'puis redémarrez l\'application.':        'then restart the application.',

      // ══════════════════ PERMISSIONS EDITOR ═══════════════════════════
      'Permissions selon le rôle de l\'utilisateur': 'Permissions based on the user\'s role',
      'Permissions supplémentaires par département': 'Additional permissions by department',
      'Admin ⭐ est toujours verrouillé ON':    'Admin ⭐ is always locked ON',
      'Ces permissions s\'':                    'These permissions ',
      'ajoutent':                               'are added',
      'aux permissions du rôle. Si un utilisateur a déjà la permission via son rôle, ce tableau n\'a pas d\'effet. Utile pour donner accès à une fonctionnalité spécifique à un département sans changer le rôle global.': 'to the role permissions. If a user already has the permission via their role, this table has no effect. Useful for granting access to a specific feature for a department without changing the global role.',
      'Exemple : activer la Matrice de formation pour les utilisateurs Logistique.': 'Example: enable the Training Matrix for Logistics users.',
      'Réinitialiser par défaut':               'Reset to defaults',
      'Réinitialiser toutes les permissions aux valeurs par défaut?': 'Reset all permissions to default values?',
      'Enregistrer toutes les permissions':     'Save all permissions',
      'Par Rôle':                               'By Role',
      'Par Département':                        'By Department',
      'Retour Utilisateurs':                    'Back to Users',
      'Non disponible par département':         'Not available by department',
      'Toujours activé pour Admin':             'Always enabled for Admin',

      // ══════════════════ PERMISSIONS TABLE LABELS ══════════════════════
      'Voir la liste des employés':             'View employee list',
      'Modifier / ajouter des employés':        'Edit / add employees',
      'Importer CSV employés':                  'Import CSV employees',
      'Grille de compétences':                  'Competency matrix',
      'Planification hebdomadaire':             'Weekly planning',
      'Voir ses sessions assignées':            'View own assigned sessions',
      'Voir TOUTES les sessions':               'View ALL sessions',
      'Cocher la checklist':                    'Check the checklist',
      'Créer sessions / assigner':              'Create sessions / assign',
      'Créer / modifier modèles checklist':     'Create / edit checklist templates',
      'Importer Word':                          'Import Word',
      'Supprimer modèles / sessions':           'Delete templates / sessions',
      'Gérer les utilisateurs':                 'Manage users',
      'Configuration SharePoint / Thème':       'SharePoint / Theme configuration',

      // ══════════════════ PERMISSION GROUPS ════════════════════════════
      'EMPLOYÉS & PLANIFICATION':               'EMPLOYEES & PLANNING',
      'SESSIONS DE FORMATION':                  'TRAINING SESSIONS',
      'ADMINISTRATION':                         'ADMINISTRATION',
      'FORMATION':                              'TRAINING',
      'OPÉRATIONS':                             'OPERATIONS',

      // ══════════════════ USER MANAGEMENT ══════════════════════════════
      'Nouvel Utilisateur':                     'New User',
      'Modifier Utilisateur':                   'Edit User',
      'Nom d\'utilisateur *':                   'Username *',
      'Nom d\'utilisateur':                     'Username',
      'Nom complet':                            'Full Name',
      'Rôle *':                                 'Role *',
      'Mot de passe *':                         'Password *',
      'Laisser vide pour ne pas changer':       'Leave blank to keep unchanged',
      'Créer l\'utilisateur':                   'Create user',
      'Mettre à jour':                          'Update',
      'Retour à la liste':                      'Back to list',
      'Éditer les permissions':                 'Edit Permissions',
      'Utilisateur créé avec succès':           'User created successfully',
      'Utilisateur mis à jour':                 'User updated',
      'Utilisateur supprimé':                   'User deleted',

      // ══════════════════ SIDEBAR ═══════════════════════════════════════
      'Tableau de bord':                        'Dashboard',
      'Opérations':                             'Operations',
      'Employés':                               'Employees',
      'Matrice de formation':                   'Training Matrix',
      'Planification':                          'Planning',
      'Stations Display':                       'Display Stations',
      'Formateurs':                             'Trainers',
      'Sessions':                               'Sessions',
      'Checklists':                             'Checklists',
      'Administration':                         'Administration',
      'Utilisateurs':                           'Users',
      'Paramètres':                             'Settings',
      'Permissions':                            'Permissions',
      'SharePoint / Export':                    'SharePoint / Export',

      // ══════════════════ NAVBAR ════════════════════════════════════════
      'Tous les départements':                  'All Departments',
      'Techniciens':                            'Technicians',
      'Logistique':                             'Logistics',
      'Déconnexion':                            'Logout',
      'Administrateur':                         'Administrator',

      // ══════════════════ DASHBOARD ════════════════════════════════════
      'Actions Rapides':                        'Quick Actions',
      'Activité Récente':                       'Recent Activity',
      'Formateurs Certifiés':                   'Certified Trainers',
      'Total Formateurs':                       'Total Trainers',
      'Formateurs Validés':                     'Validated Trainers',
      'Employés en Formation':                  'Employees in Training',
      'Sessions Actives':                       'Active Sessions',
      'En Formation':                           'In Training',

      // ══════════════════ CHECKLIST PAGE ════════════════════════════════
      'Nouveau Modèle':                         'New Template',
      'Télécharger Template':                   'Download Template',
      'Gérer Items':                            'Manage Items',
      'Aucune description':                     'No description',
      'éléments':                               'items',
      'élément':                                'item',
      'Aucun modèle de checklist':              'No checklist templates',
      'Créez votre premier modèle':             'Create your first template',
      'Nom du modèle':                          'Template name',
      'Créer le modèle':                        'Create template',
      'Modifier le modèle':                     'Edit template',
      'Items de la Checklist':                  'Checklist Items',
      'Ajouter un item':                        'Add item',
      'Jour de formation':                      'Training day',
      'Importer depuis Word':                   'Import from Word',

      // ══════════════════ TRAINING SESSIONS ════════════════════════════
      'Nouvelle Session':                       'New Session',
      'Progression de la Formation':            'Training Progress',
      'Affichage des sessions qui vous sont assignées': 'Showing sessions assigned to you',
      'Aucune session enregistrée':             'No sessions recorded',
      'Aucune session ne vous est assignée pour le moment': 'No sessions assigned to you yet',
      'Reporter au jour suivant':               'Roll over to next day',
      'Compléter la session':                   'Complete session',

      // ══════════════════ TRAINERS ══════════════════════════════════════
      'Nouveau Formateur':                      'New Trainer',
      'Aucun formateur enregistré':             'No trainers registered',

      // ══════════════════ EMPLOYEES ════════════════════════════════════
      'Statut par station':                     'Status by station',
      'Pièces jointes':                         'Attachments',
      'Profil personnel':                       'Personal Profile',
      'Informations générales':                 'General Information',
      'Formé(es)':                              'Trained',
      'En formation':                           'In Training',
      'Glissez des fichiers ici ou':            'Drag files here or',
      'cliquez pour parcourir':                 'click to browse',
      'Aucune pièce jointe pour l\'instant':    'No attachments yet',
      'Envoyer les fichiers':                   'Upload files',
      'Ancienneté':                             'Seniority',
      'Embauche':                               'Hire date',
      'Naissance':                              'Birth date',
      'Aucun employé trouvé. Importez vos employés d\'abord.': 'No employees found. Import your employees first.',
      'Importer CSV':                           'Import CSV',
      'Importer les employés':                  'Import employees',

      // ══════════════════ TABLE HEADERS ════════════════════════════════
      'Nom et Prénom':                          'Full Name',
      'Domaine d\'expertise':                   'Expertise Area',
      'Date début':                             'Start Date',
      'Date fin prévue':                        'Expected End Date',
      'Début:':                                 'Start:',
      'Fin prévue:':                            'Expected end:',
      'Créé le':                                'Created',

      // ══════════════════ COMMON TABLE/FORM WORDS ═══════════════════════
      'Département':                            'Department',
      'Statut':                                 'Status',
      'Actions':                                'Actions',
      'Station':                                'Station',
      'Formés':                                 'Trained',
      'Progression':                            'Progress',
      'Employé':                                'Employee',
      'Formateur':                              'Trainer',
      'Superviseur':                            'Supervisor',
      'Poste':                                  'Position',
      'Total':                                  'Total',
      'Contact':                                'Contact',
      'Informations':                           'Information',
      'Période':                                'Period',
      'Notes':                                  'Notes',
      'Email':                                  'Email',
      'Description':                            'Description',
      'Catégorie':                              'Category',
      'Critère':                                'Criterion',
      'Ordre':                                  'Order',
      'Shift':                                  'Shift',

      // ══════════════════ FILTERS ══════════════════════════════════════
      'Tous les statuts':                       'All Statuses',
      'Tous les shifts':                        'All Shifts',
      'Tous les postes':                        'All Positions',
      'Tous':                                   'All',
      'Actifs':                                 'Active',
      'Inactifs':                               'Inactive',
      'Rechercher…':                            'Search…',

      // ══════════════════ STATUS BADGES ════════════════════════════════
      'En cours':                               'In Progress',
      'Terminée':                               'Completed',
      'En retard':                              'Late',
      'Actif':                                  'Active',
      'Inactif':                                'Inactive',
      'Validé':                                 'Validated',
      'Non validé':                             'Not Validated',

      // ══════════════════ MATRIX ═══════════════════════════════════════
      'Légende :':                              'Legend:',
      'Formé ✓':                               'Trained ✓',
      'En formation ⚡':                        'In Training ⚡',
      'Non formé':                              'Not Trained',
      'Couverture par station':                 'Station Coverage',
      'À revoir':                               'To Review',

      // ══════════════════ BUTTONS ══════════════════════════════════════
      'Enregistrer les couleurs':               'Save Colors',
      'Enregistrer SharePoint':                 'Save SharePoint',
      'Enregistrer toutes les permissions':     'Save all permissions',
      'Enregistrer':                            'Save',
      'Modifier':                               'Edit',
      'Supprimer':                              'Delete',
      'Retour':                                 'Back',
      'Annuler':                                'Cancel',
      'Voir':                                   'View',
      'Exporter':                               'Export',
      'Créer':                                  'Create',
      'Ajouter':                                'Add',
      'Réinitialiser':                          'Reset',
      'Télécharger':                            'Download',

      // ══════════════════ PROCESS STEPS ════════════════════════════════
      'Sélection des candidats':                'Candidate selection',
      'Session TWI':                            'TWI Session',
      'Certificat interne':                     'Internal certificate',
      'Suivi continu':                          'Continuous monitoring',
      'Processus "Former les Formateurs"':      'Train the Trainers process',

      // ══════════════════ DAYS / TIME ══════════════════════════════════
      'de retard':                              'late',
      'jours':                                  'days',
      'jour':                                   'day',

      // ══════════════════ MISC ══════════════════════════════════════════
      'formateur(s)':                           'trainer(s)',
      'session(s)':                             'session(s)',
      'formés':                                 'trained',
      'Admin':                                  'Admin',
      'Jour':                                   'Day',
      'Soir':                                   'Evening',
      'Nuit':                                   'Night',
      '% formés':                               '% trained',
      'Restriction':                            'Restriction',
      'Passion':                                'Passion',
      'Ambition':                               'Ambition',
      'Préoccupation':                          'Concern',
      '— Aucun (Admin uniquement) —':           '— None (Admin only) —',
      'Organisation':                           'Organisation',
    },

    es: {

      // ══════════════════ PAGE TITLES / HEADINGS ═══════════════════════
      'Paramètres de l\'Application':           'Configuración de la Aplicación',
      'Gestion des Utilisateurs':               'Gestión de Usuarios',
      'Éditeur de Permissions':                 'Editor de Permisos',
      'Tableau de bord':                        'Panel principal',
      'Liste des Formateurs':                   'Lista de formadores',
      'Sessions de Formation':                  'Sesiones de formación',
      'Session de Formation':                   'Sesión de formación',
      'Modèles de Checklist':                   'Modelos de Checklist',
      'Vue d\'ensemble du système de formation':'Resumen del sistema de formación',

      // ══════════════════ SETTINGS PAGE ════════════════════════════════
      'Configurez SharePoint et personnalisez l\'apparence': 'Configure SharePoint y personalice la apariencia',
      'Couleurs par Département':               'Colores por Departamento',
      'Chaque département peut avoir sa propre couleur d\'accent, choisie parmi la palette officielle Distech Controls.': 'Cada departamento puede tener su propio color de acento, elegido de la paleta oficial de Distech Controls.',
      'Enregistrer les couleurs':               'Guardar colores',
      'Save les couleurs':                      'Guardar colores',
      'Configuration SharePoint':               'Configuración de SharePoint',
      'Personnalisation du Thème':              'Personalización del Tema',
      'Guide de configuration':                 'Guía de configuración',
      'Application (client) ID de votre app Azure AD': 'ID de aplicación (cliente) de su app Azure AD',
      'Secret de l\'application Azure AD':      'Secreto de la aplicación Azure AD',
      'Directory (tenant) ID de votre organisation': 'ID de directorio (inquilino) de su organización',
      'URL complète de votre site SharePoint':  'URL completa de su sitio SharePoint',
      'Nom exact de la liste SharePoint':       'Nombre exacto de la lista SharePoint',
      'Enregistrer SharePoint':                 'Guardar SharePoint',
      'Palette Distech Controls — cliquez pour appliquer à l\'onglet actif': 'Paleta Distech Controls — haga clic para aplicar a la pestaña activa',
      'Couleur d\'accent — boutons, liens actifs, badges': 'Color de acento — botones, enlaces activos, insignias',
      'Couleur d\'accent — boutons, liens actifs': 'Color de acento — botones, enlaces activos',
      'Couleurs de la barre de navigation':     'Colores de la barra de navegación',
      'Couleurs de la barre latérale':          'Colores de la barra lateral',
      'Couleurs de la page':                    'Colores de la página',
      'En-tête des cartes':                     'Encabezado de tarjetas',
      'S\'applique au département:':            'Se aplica al departamento:',
      'Département actif:':                     'Departamento activo:',
      'Rétablir les couleurs officielles Distech Controls?': '¿Restaurar los colores oficiales de Distech Controls?',
      'Ajoutez les permissions: Sites.ReadWrite.All': 'Agregue los permisos: Sites.ReadWrite.All',
      'Créez la liste SharePoint avec les colonnes nécessaires': 'Cree la lista SharePoint con las columnas necesarias',
      'Copiez Client ID, Secret et Tenant ID ici': 'Copie el Client ID, Secret y Tenant ID aquí',
      'Créez une app dans Azure AD (App registrations)': 'Cree una app en Azure AD (Registros de aplicaciones)',
      'Créez un client secret':                 'Cree un secreto de cliente',

      // ══════════════════ BACKUP SECTION ═══════════════════════════════
      'Sauvegarde Complète':                    'Copia de Seguridad Completa',
      'Contenu de la sauvegarde :':             'Contenido de la copia:',
      'Base de données (KB)':                   'Base de datos (KB)',
      'Base de données':                        'Base de datos',
      'Fichiers téléversés':                    'Archivos subidos',
      'Aucune donnée envoyée en ligne':         'Ningún dato enviado en línea',
      'Restauration :':                         'Restauración:',
      '— toutes vos données (employés, formations, évaluations, paramètres)': '— todos sus datos (empleados, formaciones, evaluaciones, configuración)',
      '— toutes les photos d\'employés et fichiers téléversés': '— todas las fotos de empleados y archivos subidos',
      '— date et auteur de la sauvegarde':      '— fecha y autor de la copia',
      'pour restaurer, remplacez le fichier':   'para restaurar, reemplace el archivo',
      'et le dossier':                          'y la carpeta',
      'puis redémarrez l\'application.':        'luego reinicie la aplicación.',

      // ══════════════════ PERMISSIONS EDITOR ═══════════════════════════
      'Permissions selon le rôle de l\'utilisateur': 'Permisos según el rol del usuario',
      'Permissions supplémentaires par département': 'Permisos adicionales por departamento',
      'Admin ⭐ est toujours verrouillé ON':    'Admin ⭐ siempre bloqueado en ON',
      'ajoutent':                               'añaden',
      'aux permissions du rôle. Si un utilisateur a déjà la permission via son rôle, ce tableau n\'a pas d\'effet. Utile pour donner accès à une fonctionnalité spécifique à un département sans changer le rôle global.': 'a los permisos del rol. Si un usuario ya tiene el permiso por su rol, esta tabla no tiene efecto. Útil para dar acceso a una función específica a un departamento sin cambiar el rol global.',
      'Exemple : activer la Matrice de formation pour les utilisateurs Logistique.': 'Ejemplo: activar la Matriz de formación para los usuarios de Logística.',
      'Réinitialiser par défaut':               'Restablecer valores por defecto',
      'Réinitialiser toutes les permissions aux valeurs par défaut?': '¿Restablecer todos los permisos a los valores por defecto?',
      'Enregistrer toutes les permissions':     'Guardar todos los permisos',
      'Par Rôle':                               'Por Rol',
      'Par Département':                        'Por Departamento',
      'Retour Utilisateurs':                    'Volver a Usuarios',
      'Non disponible par département':         'No disponible por departamento',
      'Toujours activé pour Admin':             'Siempre activado para Admin',

      // ══════════════════ PERMISSIONS TABLE LABELS ══════════════════════
      'Voir la liste des employés':             'Ver lista de empleados',
      'Modifier / ajouter des employés':        'Editar / agregar empleados',
      'Importer CSV employés':                  'Importar CSV empleados',
      'Grille de compétences':                  'Matriz de competencias',
      'Planification hebdomadaire':             'Planificación semanal',
      'Voir ses sessions assignées':            'Ver sus sesiones asignadas',
      'Voir TOUTES les sessions':               'Ver TODAS las sesiones',
      'Cocher la checklist':                    'Marcar la checklist',
      'Créer sessions / assigner':              'Crear sesiones / asignar',
      'Créer / modifier modèles checklist':     'Crear / editar modelos de checklist',
      'Supprimer modèles / sessions':           'Eliminar modelos / sesiones',
      'Gérer les utilisateurs':                 'Gestionar usuarios',
      'Configuration SharePoint / Thème':       'Configuración SharePoint / Tema',

      // ══════════════════ PERMISSION GROUPS ════════════════════════════
      'EMPLOYÉS & PLANIFICATION':               'EMPLEADOS Y PLANIFICACIÓN',
      'SESSIONS DE FORMATION':                  'SESIONES DE FORMACIÓN',
      'ADMINISTRATION':                         'ADMINISTRACIÓN',
      'FORMATION':                              'FORMACIÓN',
      'OPÉRATIONS':                             'OPERACIONES',

      // ══════════════════ USER MANAGEMENT ══════════════════════════════
      'Nouvel Utilisateur':                     'Nuevo Usuario',
      'Modifier Utilisateur':                   'Editar Usuario',
      'Nom d\'utilisateur *':                   'Nombre de usuario *',
      'Nom d\'utilisateur':                     'Nombre de usuario',
      'Nom complet':                            'Nombre completo',
      'Rôle *':                                 'Rol *',
      'Mot de passe *':                         'Contraseña *',
      'Laisser vide pour ne pas changer':       'Dejar en blanco para no cambiar',
      'Créer l\'utilisateur':                   'Crear usuario',
      'Mettre à jour':                          'Actualizar',
      'Retour à la liste':                      'Volver a la lista',
      'Éditer les permissions':                 'Editar permisos',

      // ══════════════════ SIDEBAR ═══════════════════════════════════════
      'Opérations':                             'Operaciones',
      'Employés':                               'Empleados',
      'Matrice de formation':                   'Matriz de formación',
      'Planification':                          'Planificación',
      'Stations Display':                       'Pantallas de estación',
      'Formateurs':                             'Formadores',
      'Sessions':                               'Sesiones',
      'Checklists':                             'Listas de control',
      'Administration':                         'Administración',
      'Utilisateurs':                           'Usuarios',
      'Paramètres':                             'Configuración',
      'Permissions':                            'Permisos',
      'SharePoint / Export':                    'SharePoint / Exportar',

      // ══════════════════ NAVBAR ════════════════════════════════════════
      'Tous les départements':                  'Todos los departamentos',
      'Techniciens':                            'Técnicos',
      'Logistique':                             'Logística',
      'Déconnexion':                            'Cerrar sesión',
      'Administrateur':                         'Administrador',

      // ══════════════════ DASHBOARD ════════════════════════════════════
      'Actions Rapides':                        'Acciones Rápidas',
      'Activité Récente':                       'Actividad Reciente',
      'Formateurs Certifiés':                   'Formadores Certificados',
      'Total Formateurs':                       'Total Formadores',
      'Formateurs Validés':                     'Formadores validados',
      'Employés en Formation':                  'Empleados en formación',
      'Sessions Actives':                       'Sesiones activas',
      'En Formation':                           'En Formación',

      // ══════════════════ CHECKLIST PAGE ════════════════════════════════
      'Nouveau Modèle':                         'Nuevo modelo',
      'Télécharger Template':                   'Descargar plantilla',
      'Gérer Items':                            'Gestionar items',
      'Aucune description':                     'Sin descripción',
      'éléments':                               'elementos',
      'élément':                                'elemento',
      'Aucun modèle de checklist':              'Sin modelos de checklist',
      'Créez votre premier modèle':             'Crea tu primer modelo',
      'Nom du modèle':                          'Nombre del modelo',
      'Créer le modèle':                        'Crear modelo',
      'Modifier le modèle':                     'Editar modelo',
      'Items de la Checklist':                  'Ítems de la checklist',
      'Ajouter un item':                        'Agregar ítem',
      'Jour de formation':                      'Día de formación',
      'Importer depuis Word':                   'Importar desde Word',

      // ══════════════════ TRAINING SESSIONS ════════════════════════════
      'Nouvelle Session':                       'Nueva sesión',
      'Progression de la Formation':            'Progreso de la formación',
      'Affichage des sessions qui vous sont assignées': 'Mostrando sesiones asignadas a usted',
      'Aucune session enregistrée':             'Ninguna sesión registrada',
      'Aucune session ne vous est assignée pour le moment': 'No hay sesiones asignadas por el momento',
      'Reporter au jour suivant':               'Pasar al día siguiente',
      'Compléter la session':                   'Completar sesión',

      // ══════════════════ TRAINERS ══════════════════════════════════════
      'Nouveau Formateur':                      'Nuevo formador',
      'Aucun formateur enregistré':             'Ningún formador registrado',

      // ══════════════════ EMPLOYEES ════════════════════════════════════
      'Statut par station':                     'Estado por estación',
      'Pièces jointes':                         'Archivos adjuntos',
      'Profil personnel':                       'Perfil personal',
      'Informations générales':                 'Información general',
      'Formé(es)':                              'Formado(s)',
      'En formation':                           'En formación',
      'Glissez des fichiers ici ou':            'Arrastre archivos aquí o',
      'cliquez pour parcourir':                 'haga clic para buscar',
      'Aucune pièce jointe pour l\'instant':    'Sin archivos adjuntos por ahora',
      'Envoyer les fichiers':                   'Enviar archivos',
      'Ancienneté':                             'Antigüedad',
      'Embauche':                               'Contratación',
      'Naissance':                              'Nacimiento',
      'Aucun employé trouvé. Importez vos employés d\'abord.': 'Sin empleados. Importe sus empleados primero.',
      'Importer CSV':                           'Importar CSV',
      'Importer les employés':                  'Importar empleados',

      // ══════════════════ TABLE HEADERS ════════════════════════════════
      'Nom et Prénom':                          'Nombre completo',
      'Domaine d\'expertise':                   'Área de experiencia',
      'Date début':                             'Fecha inicio',
      'Date fin prévue':                        'Fecha fin prevista',
      'Début:':                                 'Inicio:',
      'Fin prévue:':                            'Fin prevista:',
      'Créé le':                                'Creado el',

      // ══════════════════ COMMON TABLE/FORM WORDS ═══════════════════════
      'Département':                            'Departamento',
      'Statut':                                 'Estado',
      'Actions':                                'Acciones',
      'Station':                                'Estación',
      'Formés':                                 'Formados',
      'Progression':                            'Progreso',
      'Employé':                                'Empleado',
      'Formateur':                              'Formador',
      'Superviseur':                            'Supervisor',
      'Poste':                                  'Puesto',
      'Total':                                  'Total',
      'Contact':                                'Contacto',
      'Informations':                           'Información',
      'Période':                                'Período',
      'Notes':                                  'Notas',
      'Email':                                  'Correo',
      'Description':                            'Descripción',
      'Catégorie':                              'Categoría',
      'Critère':                                'Criterio',
      'Ordre':                                  'Orden',
      'Shift':                                  'Turno',

      // ══════════════════ FILTERS ══════════════════════════════════════
      'Tous les statuts':                       'Todos los estados',
      'Tous les shifts':                        'Todos los turnos',
      'Tous les postes':                        'Todos los puestos',
      'Tous':                                   'Todos',
      'Actifs':                                 'Activos',
      'Inactifs':                               'Inactivos',
      'Rechercher…':                            'Buscar…',

      // ══════════════════ STATUS BADGES ════════════════════════════════
      'En cours':                               'En curso',
      'Terminée':                               'Finalizada',
      'En retard':                              'Atrasada',
      'Actif':                                  'Activo',
      'Inactif':                                'Inactivo',
      'Validé':                                 'Validado',
      'Non validé':                             'No validado',

      // ══════════════════ MATRIX ═══════════════════════════════════════
      'Légende :':                              'Leyenda:',
      'Formé ✓':                               'Formado ✓',
      'En formation ⚡':                        'En formación ⚡',
      'Non formé':                              'No formado',
      'Couverture par station':                 'Cobertura por estación',
      'À revoir':                               'Por revisar',

      // ══════════════════ BUTTONS ══════════════════════════════════════
      'Enregistrer les couleurs':               'Guardar colores',
      'Enregistrer SharePoint':                 'Guardar SharePoint',
      'Enregistrer toutes les permissions':     'Guardar todos los permisos',
      'Enregistrer':                            'Guardar',
      'Modifier':                               'Editar',
      'Supprimer':                              'Eliminar',
      'Retour':                                 'Volver',
      'Annuler':                                'Cancelar',
      'Voir':                                   'Ver',
      'Exporter':                               'Exportar',
      'Créer':                                  'Crear',
      'Ajouter':                                'Agregar',
      'Réinitialiser':                          'Restablecer',
      'Télécharger':                            'Descargar',

      // ══════════════════ PROCESS STEPS ════════════════════════════════
      'Sélection des candidats':                'Selección de candidatos',
      'Session TWI':                            'Sesión TWI',
      'Certificat interne':                     'Certificado interno',
      'Suivi continu':                          'Seguimiento continuo',
      'Processus "Former les Formateurs"':      'Proceso "Formar a los Formadores"',

      // ══════════════════ DAYS / TIME ══════════════════════════════════
      'de retard':                              'de retraso',
      'jours':                                  'días',
      'jour':                                   'día',

      // ══════════════════ MISC ══════════════════════════════════════════
      'formateur(s)':                           'formador(es)',
      'session(s)':                             'sesión(es)',
      'formés':                                 'formados',
      'Admin':                                  'Admin',
      'Jour':                                   'Día',
      'Soir':                                   'Tarde',
      'Nuit':                                   'Noche',
      '% formés':                               '% formados',
      'Restriction':                            'Restricción',
      'Passion':                                'Pasión',
      'Ambition':                               'Ambición',
      'Préoccupation':                          'Preocupación',
      '— Aucun (Admin uniquement) —':           '— Ninguno (solo Admin) —',
      'Organisation':                           'Organización',
    }
  };

  // ── Original text cache (Map: TextNode → original FR string) ─────────
  const origCache = new Map();

  function cacheTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.parentElement) continue;
      const tag = n.parentElement.tagName;
      if (['SCRIPT','STYLE','INPUT','TEXTAREA'].includes(tag)) continue;
      if (!origCache.has(n)) origCache.set(n, n.textContent);
    }
  }

  // Sort phrases longest-first to prevent partial matches
  function buildEntries(dict) {
    return Object.entries(dict).sort((a, b) => b[0].length - a[0].length);
  }

  function translateText(text, entries) {
    for (const [fr, target] of entries) {
      if (text.includes(fr)) text = text.split(fr).join(target);
    }
    return text;
  }

  function applyLang(lang) {
    // Cache BEFORE any translation so we always store the original French text
    cacheTextNodes(document.body);

    const dict    = lang === 'fr' ? null : DICT[lang];
    const entries = dict ? buildEntries(dict) : [];

    // ── Text nodes (covers all elements including <option> children) ──
    origCache.forEach((origText, node) => {
      if (!node.parentNode) return;
      const tag = node.parentElement ? node.parentElement.tagName : '';
      if (['SCRIPT','STYLE','INPUT','TEXTAREA'].includes(tag)) return;
      const newText = dict ? translateText(origText, entries) : origText;
      if (node.textContent !== newText) node.textContent = newText;
    });

    // ── Placeholders (attribute value — not a text node) ──
    document.querySelectorAll('[placeholder]').forEach(el => {
      if (!el.dataset.i18nPh) el.dataset.i18nPh = el.placeholder;
      el.placeholder = dict ? translateText(el.dataset.i18nPh, entries) : el.dataset.i18nPh;
    });

    // ── Page title ──
    if (!document._i18nOrigTitle) document._i18nOrigTitle = document.title;
    document.title = dict ? translateText(document._i18nOrigTitle, entries) : document._i18nOrigTitle;

    document.documentElement.lang = lang;
  }

  // ── Update the dropdown button label ────────────────────────────────
  function updateDropdownBtn(lang) {
    const flagEl = document.getElementById('lang-flag');
    const codeEl = document.getElementById('lang-code');
    if (flagEl) flagEl.textContent = FLAGS[lang] || '🇫🇷';
    if (codeEl) codeEl.textContent = CODES[lang] || 'FR';

    document.querySelectorAll('.lang-btn').forEach(item => {
      item.classList.toggle('active', item.dataset.lang === lang);
    });
  }

  // ── Public API ───────────────────────────────────────────────────────
  window.setLang = function (lang) {
    localStorage.setItem('app_lang', lang);
    applyLang(lang);
    updateDropdownBtn(lang);
  };

  // ── Auto-apply on every page load ────────────────────────────────────
  window.addEventListener('DOMContentLoaded', function () {
    cacheTextNodes(document.body);
    const saved = localStorage.getItem('app_lang') || 'fr';
    applyLang(saved);
    updateDropdownBtn(saved);
  });

})();
