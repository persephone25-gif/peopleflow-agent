import { randomUUID } from 'node:crypto';
import { USERS, normalizeText } from './data/demo-data.mjs';
import {
  analyzeCareer,
  analyzeRecruitmentCandidates,
  getEmployeePlanning,
  getEmployeeProfile,
} from './tools/people-tools.mjs';
import {
  getSkillBackups,
  getWorkforceRisks,
  getWorkforceSuggestions,
} from './tools/workforce-tools.mjs';

const sessions = new Map();

const roleAllowedTools = {
  employee: new Set(['get_employee_profile', 'get_employee_planning', 'analyze_career']),
  manager: new Set([
    'get_employee_profile',
    'get_employee_planning',
    'analyze_career',
    'get_workforce_risks',
    'get_workforce_suggestions',
    'get_skill_backups',
  ]),
  hr: new Set([
    'get_employee_profile',
    'get_employee_planning',
    'analyze_career',
    'analyze_recruitment_candidates',
    'get_workforce_risks',
    'get_workforce_suggestions',
    'get_skill_backups',
  ]),
  production: new Set([
    'get_workforce_risks',
    'get_workforce_suggestions',
    'get_skill_backups',
  ]),
};

function resolveUser(userId) {
  return USERS[userId] ?? null;
}

function getSession(sessionId, userId) {
  const existing = sessionId ? sessions.get(sessionId) : undefined;
  if (existing && existing.userId === userId) return existing;

  const id = randomUUID();
  const created = {
    id,
    userId,
    pendingAction: null,
    history: [],
  };
  sessions.set(id, created);
  return created;
}

function toolResult(toolName, fn) {
  const callId = randomUUID();
  try {
    return { callId, toolName, ok: true, data: fn() };
  } catch (error) {
    return {
      callId,
      toolName,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function assertToolAllowed(role, toolName) {
  if (!roleAllowedTools[role]?.has(toolName)) {
    throw new Error(`Outil non autorisé pour le rôle ${role}: ${toolName}`);
  }
}

function runTool(user, toolName, args) {
  return toolResult(toolName, () => {
    assertToolAllowed(user.role, toolName);
    switch (toolName) {
      case 'get_employee_profile':
        return getEmployeeProfile(args);
      case 'get_employee_planning':
        return getEmployeePlanning(args);
      case 'analyze_career':
        return analyzeCareer(args);
      case 'analyze_recruitment_candidates':
        return analyzeRecruitmentCandidates(args);
      case 'get_workforce_risks':
        return getWorkforceRisks(args);
      case 'get_workforce_suggestions':
        return getWorkforceSuggestions(args);
      case 'get_skill_backups':
        return getSkillBackups(args);
      default:
        throw new Error(`Outil inconnu: ${toolName}`);
    }
  });
}

function agentForIntent(intent) {
  if (intent.startsWith('career')) return 'career';
  if (intent.startsWith('planning') || intent.startsWith('training')) return 'planning';
  if (intent.startsWith('recruitment')) return 'recruitment';
  if (intent.startsWith('workforce')) return 'workforce';
  if (intent.startsWith('profile')) return 'profile';
  return 'general';
}

function detectSkill(text) {
  if (text.includes('robot')) return 'robotics';
  if (text.includes('maintenance')) return 'maintenance';
  if (text.includes('qualit')) return 'quality';
  if (text.includes('assembl')) return 'assembly';
  return 'setup';
}

function targetEmployeeFor(user, text) {
  if (user.role === 'employee') return user.id;
  if (text.includes('amina')) return 'amina-benali';
  return 'amina-benali';
}

function actionTargetPages(type) {
  if (type === 'overtime' || type === 'schedule' || type === 'company-event') {
    return {
      employee: 'employee-planning',
      manager: 'manager-planning',
      hr: 'hr-planning',
      production: 'production-planning',
    };
  }
  if (type === 'training') {
    return {
      employee: 'employee-learning',
      manager: 'manager-learning',
      hr: 'hr-learning',
    };
  }
  if (type === 'mobility' || type === 'job-change' || type === 'career' || type === 'mission') {
    return {
      employee: 'employee-career',
      manager: 'manager-team',
      hr: 'hr-career',
    };
  }
  return {
    employee: 'employee-requests',
    manager: 'manager-requests',
    hr: 'hr-requests',
  };
}

function prepareRequestAction(user, request) {
  return {
    type: 'create_unified_request',
    payload: {
      ...request,
      targetPageByRole: actionTargetPages(request.type),
    },
  };
}

function detectAction(user, text) {
  const canManagerAct = user.role === 'manager';
  const canHRAct = user.role === 'hr';
  const canWorkforceAct = user.role === 'manager' || user.role === 'production';

  if (canManagerAct && (text.includes('heure') || /\d+\s*h/.test(text)) && (text.includes('sup') || text.includes('supplement'))) {
    const hoursMatch = text.match(/(\d+)\s*h/);
    const hours = hoursMatch ? Number(hoursMatch[1]) : 2;
    return prepareRequestAction(user, {
      type: 'overtime',
      targetRoles: ['employee'],
      targetEmployeeIds: ['amina-benali'],
      title: `${hours} h supplémentaires proposées`,
      description: `Proposition de ${hours} h supplémentaires préparée par PeopleFlow AI pour Amina Benali.`,
      priority: 'normal',
      actionRequired: true,
      metadata: {
        hours,
        reason: 'Proposition préparée par PeopleFlow AI',
        eventDate: '2026-10-22',
        dateLabel: '22 oct. 2026',
        startTime: '15:00',
        endTime: '17:00',
        timeLabel: '15:00–17:00',
        location: 'NovaFab Lille',
      },
    });
  }

  if ((user.role === 'employee' || canManagerAct || canHRAct) && text.includes('formation') && (text.includes('propos') || text.includes('demande') || text.includes('inscri'))) {
    const employeeInitiated = user.role === 'employee';
    return prepareRequestAction(user, {
      type: 'training',
      targetRoles: employeeInitiated ? ['manager'] : ['employee'],
      targetEmployeeIds: ['amina-benali'],
      title: employeeInitiated
        ? 'Demande de formation préparée par PeopleFlow AI'
        : 'Formation proposée par PeopleFlow AI',
      description: employeeInitiated
        ? 'Demande de formation préparée pour validation par la cheffe d’équipe. Aucune inscription n’est automatique.'
        : 'Proposition de formation préparée à partir du contexte PeopleFlow. Le choix final reste soumis aux validations humaines.',
      priority: 'normal',
      actionRequired: true,
      metadata: { source: 'peopleflow-ai' },
    });
  }

  if (user.role === 'employee' && (text.includes('mobilite') || text.includes('mutation')) && (text.includes('demande') || text.includes('souhaite') || text.includes('etudier'))) {
    return prepareRequestAction(user, {
      type: 'mobility',
      targetRoles: ['hr'],
      targetEmployeeIds: ['amina-benali'],
      title: 'Demande de mobilité à étudier',
      description: 'Amina souhaite étudier une mobilité interne. PeopleFlow AI prépare uniquement la demande ; les RH restent décisionnaires.',
      priority: 'normal',
      actionRequired: true,
      metadata: { source: 'peopleflow-ai' },
    });
  }

  if (canHRAct && text.includes('mutation')) {
    return prepareRequestAction(user, {
      type: 'mobility',
      targetRoles: ['employee'],
      targetEmployeeIds: ['amina-benali'],
      title: 'Proposition de mutation à étudier',
      description: 'Projet de mobilité préparé par PeopleFlow AI. La disponibilité réelle du poste et les conditions doivent être confirmées par les RH.',
      priority: 'normal',
      actionRequired: true,
      metadata: { source: 'peopleflow-ai', requiresHRValidation: true },
    });
  }

  if (canHRAct && (text.includes('changement de poste') || text.includes('evolution de poste') || (text.includes('line leader') && (text.includes('propos') || text.includes('offre') || text.includes('nomm'))))) {
    return prepareRequestAction(user, {
      type: 'job-change',
      targetRoles: ['employee'],
      targetEmployeeIds: ['amina-benali'],
      title: 'Évolution de poste · Line Leader',
      description: 'Proposition d’évolution préparée par PeopleFlow AI à partir des données de compétences et de carrière. Validation RH obligatoire.',
      priority: 'high',
      actionRequired: true,
      metadata: { source: 'peopleflow-ai', targetRole: 'Line Leader' },
    });
  }

  if (canHRAct && text.includes('evenement')) {
    return prepareRequestAction(user, {
      type: 'company-event',
      targetRoles: ['employee', 'manager', 'hr', 'production'],
      title: 'Événement entreprise préparé par PeopleFlow AI',
      description: 'Événement préparé par l’assistant. Les RH doivent confirmer le contenu, le site, la date et les horaires.',
      priority: 'normal',
      actionRequired: true,
      metadata: {
        source: 'peopleflow-ai',
        eventDate: '2026-11-20',
        dateLabel: '20 nov. 2026',
        startTime: '14:00',
        endTime: '17:00',
        timeLabel: '14:00–17:00',
        location: 'NovaFab Lille',
      },
    });
  }

  if (canWorkforceAct && text.includes('balanced') && (text.includes('appli') || text.includes('active') || text.includes('lance'))) {
    return {
      type: 'apply_workforce_strategy',
      payload: { strategyId: 'balanced' },
    };
  }

  return null;
}


function presentationItem(id, title, description, value, severity = 'neutral', details = []) {
  return {
    id,
    title,
    ...(description ? { description } : {}),
    ...(value ? { value } : {}),
    severity,
    ...(details.length > 0 ? { details } : {}),
  };
}

function actionPresentation(action) {
  if (action.type === 'apply_workforce_strategy') {
    return {
      kind: 'action',
      eyebrow: 'Action à confirmer',
      title: 'Appliquer le scénario Balanced',
      summary: 'Le scénario est prêt, mais aucune affectation ne sera modifiée sans votre confirmation.',
      items: [
        presentationItem('strategy', 'Scénario', 'Équilibre couverture opérationnelle et développement.', 'Balanced', 'neutral'),
        presentationItem('effect', 'Effet', 'Les affectations workforce seront mises à jour après confirmation.', 'Organisation', 'high'),
      ],
    };
  }

  if (action.type !== 'create_unified_request') {
    return {
      kind: 'action',
      eyebrow: 'Action à confirmer',
      title: 'Action PeopleFlow prête',
      summary: 'Cette action nécessite une confirmation humaine avant exécution.',
      items: [],
    };
  }

  const payload = action.payload;
  const metadata = payload.metadata ?? {};
  const employeeName = payload.targetEmployeeIds?.includes('amina-benali') ? 'Amina Benali' : undefined;
  const items = [];

  if (employeeName) {
    items.push(presentationItem('person', 'Personne concernée', undefined, employeeName, 'neutral'));
  }

  if (payload.type === 'overtime') {
    items.push(
      presentationItem('date', 'Date', undefined, String(metadata.dateLabel ?? 'À confirmer'), 'neutral'),
      presentationItem('time', 'Horaire', undefined, String(metadata.timeLabel ?? 'À confirmer'), 'neutral'),
      presentationItem('duration', 'Durée', 'Heures supplémentaires proposées.', `+${Number(metadata.hours ?? 0)} h`, 'high'),
      presentationItem('reason', 'Motif', String(metadata.reason ?? payload.description), undefined, 'neutral'),
    );

    return {
      kind: 'action',
      eyebrow: 'Action à confirmer',
      title: `${Number(metadata.hours ?? 0)} h supplémentaires pour ${employeeName ?? 'le collaborateur'}`,
      summary: 'La demande est prête à être envoyée. Vérifiez les informations essentielles avant de confirmer.',
      items,
    };
  }

  if (payload.type === 'company-event') {
    items.push(
      presentationItem('date', 'Date', undefined, String(metadata.dateLabel ?? 'À confirmer'), 'neutral'),
      presentationItem('time', 'Horaire', undefined, String(metadata.timeLabel ?? 'À confirmer'), 'neutral'),
      presentationItem('location', 'Lieu', undefined, String(metadata.location ?? 'À confirmer'), 'neutral'),
      presentationItem('audience', 'Public', 'Profils destinataires de l’événement.', payload.targetRoles.join(' · '), 'neutral'),
    );
  } else if (payload.type === 'mobility') {
    items.push(
      presentationItem('type', 'Type', 'Mobilité interne à étudier avec les RH.', 'Mutation / mobilité', 'neutral'),
      presentationItem('validation', 'Vérification requise', 'Le site, le poste et les conditions doivent être confirmés avant envoi final.', 'RH', 'high'),
    );
  } else if (payload.type === 'job-change') {
    items.push(
      presentationItem('target', 'Poste proposé', undefined, String(metadata.targetRole ?? 'À confirmer'), 'neutral'),
      presentationItem('validation', 'Validation', 'La proposition doit rester soumise à une décision RH et au salarié.', 'Humaine', 'high'),
    );
  } else if (payload.type === 'training') {
    items.push(
      presentationItem('type', 'Objet', 'Demande ou proposition de formation.', 'Formation', 'neutral'),
      presentationItem('validation', 'Prochaine étape', 'La demande sera envoyée au profil destinataire pour validation.', payload.targetRoles.join(' · '), 'neutral'),
    );
  }

  return {
    kind: 'action',
    eyebrow: 'Action à confirmer',
    title: payload.title,
    summary: payload.description,
    items,
  };
}

function presentationFromIntent(intent, toolResults, fallbackMessage) {
  const first = toolResults.find((result) => result.ok && result.data)?.data;

  if (intent === 'workforce.risks' && first) {
    const risks = Array.isArray(first.risks) ? first.risks : [];
    const overall = first.summary?.overallCoverage;
    return {
      kind: 'analysis',
      eyebrow: 'Analyse workforce',
      title: `${risks.length} risque${risks.length > 1 ? 's' : ''} détecté${risks.length > 1 ? 's' : ''}`,
      summary: risks.length > 0
        ? 'Les risques sont détaillés ci-dessous par ordre de sévérité opérationnelle.'
        : 'Aucun risque n’est actuellement détecté dans les données disponibles.',
      metrics: [
        ...(overall ? [{ label: 'Couverture globale', value: `${overall.pct} %`, detail: `${overall.covered}/${overall.total} postes couverts`, tone: overall.pct >= 100 ? 'positive' : 'attention' }] : []),
        { label: 'Risques élevés', value: String(first.summary?.high ?? 0), tone: (first.summary?.high ?? 0) > 0 ? 'critical' : 'positive' },
        { label: 'À surveiller', value: String(first.summary?.medium ?? 0), tone: (first.summary?.medium ?? 0) > 0 ? 'attention' : 'neutral' },
      ],
      items: risks.map((risk) => presentationItem(
        risk.id,
        risk.title,
        risk.summary,
        risk.entity?.label,
        risk.severity === 'high' ? 'high' : risk.severity === 'medium' ? 'medium' : 'low',
        Array.isArray(risk.reasons) ? risk.reasons : [],
      )),
    };
  }

  if (intent === 'workforce.backups' && first) {
    const ready = Array.isArray(first.readyNow) ? first.readyNow : [];
    const development = Array.isArray(first.developmentCandidates) ? first.developmentCandidates : [];
    const unavailable = Array.isArray(first.temporarilyUnavailable) ? first.temporarilyUnavailable : [];
    const items = [
      ...ready.map((candidate, index) => presentationItem(
        `ready-${candidate.employee?.id ?? index}`,
        candidate.employee?.name ?? 'Collaborateur',
        candidate.employee?.jobTitle,
        `Niveau ${candidate.currentLevel}`,
        'positive',
        Array.isArray(candidate.evidence) ? candidate.evidence : [],
      )),
      ...development.map((candidate, index) => presentationItem(
        `develop-${candidate.employee?.id ?? index}`,
        candidate.employee?.name ?? 'Collaborateur',
        candidate.developmentAction,
        `Niveau ${candidate.currentLevel}`,
        'medium',
        Array.isArray(candidate.evidence) ? candidate.evidence : [],
      )),
      ...unavailable.map((candidate, index) => presentationItem(
        `unavailable-${candidate.employee?.id ?? index}`,
        candidate.employee?.name ?? 'Collaborateur',
        candidate.note,
        'Indisponible',
        'low',
      )),
    ];

    return {
      kind: 'analysis',
      eyebrow: 'Backups compétence',
      title: `Backups pour ${first.skill?.label ?? 'la compétence'}`,
      summary: `${ready.length} personne${ready.length > 1 ? 's' : ''} immédiatement éligible${ready.length > 1 ? 's' : ''}.`,
      metrics: [
        { label: 'Éligibles maintenant', value: String(ready.length), tone: ready.length > 0 ? 'positive' : 'critical' },
        { label: 'À développer', value: String(development.length), tone: development.length > 0 ? 'attention' : 'neutral' },
        { label: 'Indisponibles', value: String(unavailable.length), tone: unavailable.length > 0 ? 'attention' : 'neutral' },
      ],
      items,
    };
  }

  if (intent === 'workforce.suggestions' && first) {
    const scenarios = Array.isArray(first.scenarios) ? first.scenarios : [];
    return {
      kind: 'analysis',
      eyebrow: 'Scénarios workforce',
      title: `${scenarios.length} scénario${scenarios.length > 1 ? 's' : ''} disponible${scenarios.length > 1 ? 's' : ''}`,
      summary: `${first.position?.lineName ?? 'Ligne'} · ${first.position?.title ?? 'Poste'} — aucune affectation n’est automatique.`,
      items: scenarios.map((scenario) => presentationItem(
        scenario.id,
        scenario.label,
        scenario.summary,
        scenario.simulation?.coverageDelta === 0 ? 'Couverture stable' : `${scenario.simulation?.coverageDelta > 0 ? '+' : ''}${scenario.simulation?.coverageDelta ?? 0} pt`,
        scenario.type === 'development' ? 'medium' : scenario.simulation?.noNewUncoveredPositions ? 'positive' : 'high',
        Array.isArray(scenario.warnings) ? scenario.warnings : [],
      )),
    };
  }

  if (intent === 'career.analysis' && first) {
    const criteria = Array.isArray(first.skillCriteria) ? first.skillCriteria : [];
    const gaps = criteria.filter((criterion) => !criterion.meetsRequirement);
    return {
      kind: 'analysis',
      eyebrow: 'Carrière',
      title: `${first.employee?.name ?? 'Collaborateur'} → ${first.targetRole ?? 'poste cible'}`,
      summary: gaps.length > 0
        ? `${gaps.length} compétence${gaps.length > 1 ? 's' : ''} reste${gaps.length > 1 ? 'nt' : ''} à renforcer.`
        : 'Les critères de compétences documentés sont actuellement atteints.',
      metrics: [
        { label: 'Readiness', value: `${first.readiness ?? 0} %`, tone: (first.readiness ?? 0) >= 100 ? 'positive' : 'attention' },
        { label: 'Écarts', value: String(gaps.length), tone: gaps.length > 0 ? 'attention' : 'positive' },
      ],
      items: criteria.map((criterion) => presentationItem(
        criterion.skillId,
        criterion.label,
        `Niveau actuel ${criterion.currentLevel} · requis ${criterion.requiredLevel}`,
        criterion.meetsRequirement ? 'Atteint' : `Écart ${criterion.gap}`,
        criterion.meetsRequirement ? 'positive' : 'medium',
      )),
      ...(Array.isArray(first.developmentActions) && first.developmentActions.length > 0
        ? {
            recommendation: {
              title: first.developmentActions[0],
              description: 'Action de développement issue des écarts de compétences documentés.',
            },
          }
        : {}),
    };
  }

  if (intent === 'planning.read' && first) {
    const events = Array.isArray(first.events) ? first.events : [];
    return {
      kind: 'answer',
      eyebrow: 'Planning',
      title: `Planning de ${first.employee?.name ?? 'la personne'}`,
      summary: events.length > 0 ? 'Voici les événements trouvés.' : 'Aucun événement n’est enregistré dans la période disponible.',
      items: events.map((event, index) => presentationItem(
        `event-${index}`,
        event.label ?? 'Événement',
        event.date,
        `${event.start ?? ''}–${event.end ?? ''}`,
        'neutral',
      )),
    };
  }

  if (intent === 'profile.read' && first) {
    const employee = first.employee ?? {};
    const skills = employee.skills ?? {};
    return {
      kind: 'answer',
      eyebrow: 'Profil collaborateur',
      title: employee.name ?? 'Profil',
      summary: `${employee.currentRole ?? 'Poste non renseigné'} · ${employee.department ?? 'Département non renseigné'}`,
      metrics: [
        { label: 'Expérience', value: `${employee.experienceYears ?? 0} ans`, tone: 'neutral' },
        { label: 'Statut', value: employee.status ?? 'Non renseigné', tone: employee.status === 'Disponible' ? 'positive' : 'attention' },
      ],
      items: [
        presentationItem('target', 'Objectif carrière', undefined, employee.careerTarget ?? 'Non renseigné', 'neutral'),
        ...Object.entries(skills).map(([skillId, level]) => presentationItem(`skill-${skillId}`, skillId, undefined, `Niveau ${level}`, Number(level) >= 3 ? 'positive' : 'neutral')),
      ],
    };
  }

  if (intent === 'recruitment.analysis' && first) {
    return {
      kind: 'analysis',
      eyebrow: 'Recrutement',
      title: `Analyse · ${first.job?.title ?? 'poste'}`,
      summary: 'Les candidatures sont comparées sur les critères professionnels documentés, sans classement automatique.',
    };
  }

  return {
    kind: 'answer',
    eyebrow: 'PeopleFlow AI',
    title: 'Réponse PeopleFlow',
    summary: fallbackMessage,
    items: [],
  };
}

function describePreparedAction(action) {
  if (action.type === 'apply_workforce_strategy') {
    return 'Le scénario workforce Balanced est prêt. Aucune affectation ne sera modifiée sans votre confirmation.';
  }
  if (action.type === 'create_unified_request') {
    return `La demande « ${action.payload.title} » est prête. Elle ne sera créée qu'après confirmation explicite.`;
  }
  return 'Une action est prête et nécessite une confirmation humaine.';
}

function defaultSuggestions(intent) {
  if (intent.startsWith('workforce')) return ['Voir les risques', 'Chercher des backups'];
  if (intent.startsWith('career')) return ['Voir les écarts', 'Proposer une formation'];
  if (intent.startsWith('recruitment')) return ['Analyser Line Leader', 'Voir les critères'];
  return ['Profil Amina', 'Risques workforce', 'Carrière Amina'];
}

export function handleAgentMessage({ userId, sessionId, message, currentPage }) {
  const user = resolveUser(userId);
  if (!user) throw new Error('Utilisateur de démonstration non reconnu');

  const session = getSession(sessionId, userId);
  const text = normalizeText(message);

  if (text === 'confirmer' || text === 'confirme' || text === 'oui confirmer') {
    if (!session.pendingAction) {
      return {
        sessionId: session.id,
        agent: 'general',
        intent: 'confirm.none',
        message: 'Aucune action n’est en attente de confirmation.',
        presentation: { kind: 'answer', eyebrow: 'PeopleFlow AI', title: 'Aucune action en attente', summary: 'Il n’y a actuellement rien à confirmer.', items: [] },
        suggestions: defaultSuggestions('general'),
        toolResults: [],
        provider: 'local',
      };
    }

    const action = session.pendingAction;
    session.pendingAction = null;
    session.history.push({ type: 'confirmed', at: new Date().toISOString(), action });

    return {
      sessionId: session.id,
      agent: action.type === 'apply_workforce_strategy' ? 'workforce' : 'general',
      intent: 'action.confirmed',
      message: 'Confirmation reçue. PeopleFlow transmet maintenant l’action autorisée au client pour exécution et traçabilité.',
      presentation: { kind: 'answer', eyebrow: 'Action confirmée', title: 'Confirmation enregistrée', summary: 'PeopleFlow transmet maintenant l’action autorisée au client pour exécution et traçabilité.', items: [] },
      suggestions: ['Voir le résultat'],
      toolResults: [],
      clientAction: { ...action, confirmed: true },
      provider: 'local',
    };
  }

  if (text === 'annuler' || text === 'annule' || text === 'non') {
    const hadPending = Boolean(session.pendingAction);
    session.pendingAction = null;
    session.history.push({ type: 'cancelled', at: new Date().toISOString() });
    return {
      sessionId: session.id,
      agent: 'general',
      intent: 'action.cancelled',
      message: hadPending ? 'Action annulée. Aucune modification n’a été appliquée.' : 'Aucune action n’était en attente.',
      presentation: { kind: 'answer', eyebrow: 'Action annulée', title: hadPending ? 'Aucune modification appliquée' : 'Aucune action en attente', summary: hadPending ? 'La proposition a été annulée.' : 'Il n’y avait aucune action à annuler.', items: [] },
      suggestions: defaultSuggestions('general'),
      toolResults: [],
      provider: 'local',
    };
  }

  const action = detectAction(user, text);
  if (action) {
    session.pendingAction = action;
    session.history.push({ type: 'prepared', at: new Date().toISOString(), action });
    return {
      sessionId: session.id,
      agent: action.type === 'apply_workforce_strategy' ? 'workforce' : 'general',
      intent: 'action.prepare',
      message: describePreparedAction(action),
      presentation: actionPresentation(action),
      suggestions: ['Confirmer', 'Annuler'],
      toolResults: [],
      provider: 'local',
    };
  }

  const employeeId = targetEmployeeFor(user, text);
  const toolResults = [];
  let intent = 'general.answer';
  let answer = `Je peux analyser le contexte PeopleFlow de ${user.name} sur la page ${currentPage ?? 'courante'}.`;

  if (text.includes('recrut') || text.includes('candidat')) {
    intent = 'recruitment.analysis';
    const result = runTool(user, 'analyze_recruitment_candidates', { jobId: 'line-leader' });
    toolResults.push(result);
    answer = result.ok
      ? 'J’ai préparé une analyse des critères documentés pour le poste Line Leader, sans classement automatique des candidats.'
      : result.error;
  } else if (text.includes('risque') || text.includes('couverture') || text.includes('sous effectif')) {
    intent = 'workforce.risks';
    const result = runTool(user, 'get_workforce_risks', { date: '2026-10-14' });
    toolResults.push(result);
    answer = result.ok
      ? `Analyse workforce terminée : ${result.data.summary.riskCount} risque(s) détecté(s), dont ${result.data.summary.high} élevé(s).`
      : result.error;
  } else if (text.includes('backup') || text.includes('remplac') || text.includes('polyval')) {
    intent = 'workforce.backups';
    const skillId = detectSkill(text);
    const result = runTool(user, 'get_skill_backups', { skillId, minimumLevel: 3 });
    toolResults.push(result);
    answer = result.ok
      ? `${result.data.counts.readyNow} backup(s) immédiatement éligible(s) pour ${result.data.skill.label}, sans classement automatique.`
      : result.error;
  } else if (text.includes('affect') || text.includes('scenario workforce') || text.includes('remplacement ligne')) {
    intent = 'workforce.suggestions';
    const result = runTool(user, 'get_workforce_suggestions', {
      date: '2026-10-14',
      positionId: 'l3-setup',
      assignments: undefined,
    });
    toolResults.push(result);
    answer = result.ok
      ? `${result.data.scenarioCount} scénario(s) de couverture sont disponibles pour Ligne 3 · Réglage X17. Aucune affectation n’est automatique.`
      : result.error;
  } else if (text.includes('carriere') || text.includes('readiness') || text.includes('evolution')) {
    intent = 'career.analysis';
    const result = runTool(user, 'analyze_career', { employeeId });
    toolResults.push(result);
    answer = result.ok
      ? `Readiness de ${result.data.employee.name} vers ${result.data.targetRole} : ${result.data.readiness} %. La décision reste humaine.`
      : result.error;
  } else if (text.includes('planning')) {
    intent = 'planning.read';
    const result = runTool(user, 'get_employee_planning', { employeeId });
    toolResults.push(result);
    answer = result.ok
      ? `J’ai trouvé ${result.data.events.length} événement(s) de planning pour ${result.data.employee.name}.`
      : result.error;
  } else if (text.includes('profil') || text.includes('amina') || text.includes('competence')) {
    intent = 'profile.read';
    const result = runTool(user, 'get_employee_profile', { employeeId });
    toolResults.push(result);
    answer = result.ok
      ? `${result.data.employee.name} est ${result.data.employee.currentRole}. Objectif carrière : ${result.data.employee.careerTarget ?? 'non renseigné'}.`
      : result.error;
  }

  session.history.push({ type: 'message', at: new Date().toISOString(), message, intent });

  return {
    sessionId: session.id,
    agent: agentForIntent(intent),
    intent,
    message: answer,
    presentation: presentationFromIntent(intent, toolResults, answer),
    suggestions: defaultSuggestions(intent),
    toolResults,
    provider: 'local',
  };
}

export function getToolsForUser(userId) {
  const user = resolveUser(userId);
  if (!user) throw new Error('Utilisateur de démonstration non reconnu');
  return [...(roleAllowedTools[user.role] ?? [])];
}

export function resolveDemoUser(userId) {
  return resolveUser(userId);
}

export { runTool };
