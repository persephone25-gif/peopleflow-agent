import {
  EMPLOYEE_BY_ID,
  EMPLOYEES,
  INITIAL_ASSIGNMENTS,
  SKILLS,
  WORKFORCE_POSITIONS,
} from '../data/demo-data.mjs';

function positionById(id) {
  return WORKFORCE_POSITIONS.find((position) => position.id === id);
}

function qualifies(employee, position) {
  if (!employee || employee.status === 'Absent') return false;
  return (employee.skills[position.skillId] ?? 0) >= position.minimumLevel;
}

function coverage(assignments) {
  const lines = new Map();
  let covered = 0;

  for (const position of WORKFORCE_POSITIONS) {
    const assignedId = assignments[position.id] ?? null;
    const employee = assignedId ? EMPLOYEE_BY_ID[assignedId] : null;
    const isCovered = qualifies(employee, position);
    if (isCovered) covered += 1;

    const current = lines.get(position.lineId) ?? {
      lineId: position.lineId,
      lineName: position.lineName,
      covered: 0,
      total: 0,
    };
    current.total += 1;
    if (isCovered) current.covered += 1;
    lines.set(position.lineId, current);
  }

  const total = WORKFORCE_POSITIONS.length;
  const lineCoverage = [...lines.values()].map((line) => ({
    ...line,
    pct: Math.round((line.covered / Math.max(1, line.total)) * 100),
  }));

  return {
    overall: { covered, total, pct: Math.round((covered / Math.max(1, total)) * 100) },
    lines: lineCoverage,
  };
}

function applyMove(assignments, employeeId, toPositionId) {
  const next = { ...assignments };
  for (const [positionId, assignedId] of Object.entries(next)) {
    if (assignedId === employeeId) next[positionId] = null;
  }
  next[toPositionId] = employeeId;
  return next;
}

function snapshotForPosition(assignments, position) {
  const c = coverage(assignments);
  const line = c.lines.find((item) => item.lineId === position.lineId) ?? {
    lineId: position.lineId,
    lineName: position.lineName,
    covered: 0,
    total: 0,
    pct: 0,
  };
  return { overall: c.overall, line };
}

function uncoveredIds(assignments) {
  return WORKFORCE_POSITIONS
    .filter((position) => {
      const employeeId = assignments[position.id];
      return !qualifies(employeeId ? EMPLOYEE_BY_ID[employeeId] : null, position);
    })
    .map((position) => position.id);
}

export function getWorkforceSuggestions({ date, positionId, assignments = INITIAL_ASSIGNMENTS }) {
  const position = positionById(positionId);
  if (!position) throw new Error(`Poste workforce inconnu: ${positionId}`);

  const beforeUncovered = uncoveredIds(assignments);
  const candidates = EMPLOYEES
    .filter((employee) => employee.status !== 'Absent')
    .filter((employee) => (employee.skills[position.skillId] ?? 0) >= position.minimumLevel)
    .slice(0, 4);

  const developmentCandidates = EMPLOYEES
    .filter((employee) => employee.status !== 'Absent')
    .filter((employee) => (employee.skills[position.skillId] ?? 0) === position.minimumLevel - 1)
    .slice(0, 2);

  const scenarios = [];

  for (const candidate of candidates.slice(0, 2)) {
    const fromPositionId = Object.entries(assignments).find(([, employeeId]) => employeeId === candidate.id)?.[0] ?? null;
    const fromPosition = fromPositionId ? positionById(fromPositionId) : null;
    const next = applyMove(assignments, candidate.id, position.id);
    const afterUncovered = uncoveredIds(next);
    const before = snapshotForPosition(assignments, position);
    const after = snapshotForPosition(next, position);

    scenarios.push({
      id: `scenario-${position.id}-${candidate.id}`,
      type: 'direct',
      label: `Affecter ${candidate.name}`,
      summary: `${candidate.name} possède ${SKILLS[position.skillId]} niveau ${candidate.skills[position.skillId]}.`,
      primaryCandidate: {
        id: candidate.id,
        name: candidate.name,
        jobTitle: candidate.currentRole,
        department: candidate.department,
      },
      checks: [
        {
          id: 'skill',
          label: 'Compétence requise',
          status: 'ok',
          detail: `${SKILLS[position.skillId]} ${candidate.skills[position.skillId]} / ${position.minimumLevel} requis`,
        },
        {
          id: 'availability',
          label: 'Disponibilité',
          status: candidate.status === 'Disponible' ? 'ok' : 'warning',
          detail: `Statut actuel : ${candidate.status}`,
        },
      ],
      actions: [
        {
          employeeId: candidate.id,
          employeeName: candidate.name,
          fromPositionId,
          fromPositionTitle: fromPosition?.title ?? null,
          toPositionId: position.id,
          toPositionTitle: position.title,
        },
      ],
      warnings: fromPositionId && afterUncovered.includes(fromPositionId)
        ? [`Le déplacement libère ${fromPosition?.title ?? fromPositionId}.`]
        : [],
      simulation: {
        before,
        after,
        coverageDelta: after.overall.pct - before.overall.pct,
        newlyUncoveredPositionIds: afterUncovered.filter((id) => !beforeUncovered.includes(id)),
        noNewUncoveredPositions: afterUncovered.every((id) => beforeUncovered.includes(id)),
      },
    });
  }

  if (position.developmentSuitable && developmentCandidates.length > 0) {
    const candidate = developmentCandidates[0];
    const next = applyMove(assignments, candidate.id, position.id);
    const before = snapshotForPosition(assignments, position);
    const after = snapshotForPosition(next, position);
    scenarios.push({
      id: `scenario-development-${position.id}-${candidate.id}`,
      type: 'development',
      label: `Mission qualifiante pour ${candidate.name}`,
      summary: `${candidate.name} est à un niveau du minimum requis : scénario à encadrer, pas une affectation automatique.`,
      primaryCandidate: {
        id: candidate.id,
        name: candidate.name,
        jobTitle: candidate.currentRole,
        department: candidate.department,
      },
      checks: [
        {
          id: 'skill',
          label: 'Compétence requise',
          status: 'warning',
          detail: `${SKILLS[position.skillId]} ${candidate.skills[position.skillId]} / ${position.minimumLevel} requis`,
        },
      ],
      actions: [{
        employeeId: candidate.id,
        employeeName: candidate.name,
        fromPositionId: null,
        fromPositionTitle: null,
        toPositionId: position.id,
        toPositionTitle: position.title,
      }],
      warnings: ['Validation de la cheffe d’équipe et supervision requises.'],
      simulation: {
        before,
        after,
        coverageDelta: after.overall.pct - before.overall.pct,
        newlyUncoveredPositionIds: [],
        noNewUncoveredPositions: true,
      },
    });
  }

  return {
    date,
    position: {
      id: position.id,
      lineId: position.lineId,
      lineName: position.lineName,
      title: position.title,
      skillId: position.skillId,
      minimumLevel: position.minimumLevel,
      certification: position.certification,
      developmentSuitable: position.developmentSuitable,
    },
    currentState: {
      uncovered: beforeUncovered.includes(position.id),
      coverage: snapshotForPosition(assignments, position),
    },
    scenarios,
    scenarioCount: scenarios.length,
    explainability: {
      dataUsed: ['affectations courantes', 'compétences validées', 'disponibilité', 'exigences du poste'],
      dataNotUsed: ['âge', 'données de santé', 'situation personnelle'],
      orderingPrinciple: 'Scénarios éligibles puis scénarios de développement, sans classement de personnes.',
      noAutomaticAssignment: true,
      humanDecisionRequired: true,
      statement: 'Aucune affectation n’est appliquée automatiquement.',
    },
  };
}

export function getWorkforceRisks({ date, assignments = INITIAL_ASSIGNMENTS }) {
  const c = coverage(assignments);
  const risks = [];

  for (const position of WORKFORCE_POSITIONS) {
    const employeeId = assignments[position.id];
    const employee = employeeId ? EMPLOYEE_BY_ID[employeeId] : null;
    if (!qualifies(employee, position)) {
      risks.push({
        id: `risk-gap-${position.id}`,
        type: 'coverage_gap',
        severity: 'high',
        title: `${position.title} non couvert`,
        summary: `${position.lineName} ne dispose pas d'une personne éligible sur ce poste.`,
        reasons: [
          employee ? `Affectation actuelle non éligible : ${employee.name}` : 'Aucune personne affectée',
          `${SKILLS[position.skillId]} niveau ${position.minimumLevel} minimum`,
        ],
        entity: { type: 'position', id: position.id, label: `${position.lineName} · ${position.title}` },
        actions: [
          { id: `find-${position.id}`, label: 'Chercher un remplacement', kind: 'find-replacement', positionId: position.id },
          { id: `explain-${position.id}`, label: 'Expliquer le risque', kind: 'explain', positionId: position.id },
        ],
      });
    }
  }

  for (const [skillId, label] of Object.entries(SKILLS)) {
    const ready = EMPLOYEES.filter(
      (employee) => employee.status !== 'Absent' && (employee.skills[skillId] ?? 0) >= 3,
    );
    if (ready.length <= 2) {
      risks.push({
        id: `risk-skill-${skillId}`,
        type: 'skill_resilience',
        severity: ready.length <= 1 ? 'high' : 'medium',
        title: `Faible résilience · ${label}`,
        summary: `${ready.length} personne${ready.length > 1 ? 's' : ''} disponible${ready.length > 1 ? 's' : ''} au niveau 3+.`,
        reasons: ['Couverture avancée limitée', 'Risque en cas d’absence ou formation simultanée'],
        entity: { type: 'skill', id: skillId, label },
        actions: [
          { id: `backup-${skillId}`, label: 'Voir les backups', kind: 'find-backups', skillId },
        ],
      });
    }
  }

  return {
    date,
    summary: {
      overallCoverage: c.overall,
      lineCoverage: c.lines,
      riskCount: risks.length,
      high: risks.filter((risk) => risk.severity === 'high').length,
      medium: risks.filter((risk) => risk.severity === 'medium').length,
      low: risks.filter((risk) => risk.severity === 'low').length,
    },
    risks,
    explainability: {
      dataUsed: ['affectations courantes', 'compétences validées', 'disponibilité'],
      dataNotUsed: ['âge', 'santé', 'données personnelles sans rapport opérationnel'],
      readOnly: true,
      noAutomaticAssignment: true,
      statement: 'Analyse en lecture seule ; les changements restent soumis à décision humaine.',
    },
  };
}

export function getSkillBackups({ skillId, minimumLevel = 3 }) {
  if (!SKILLS[skillId]) throw new Error(`Compétence inconnue: ${skillId}`);

  const readyNow = [];
  const developmentCandidates = [];
  const temporarilyUnavailable = [];

  for (const employee of EMPLOYEES) {
    const level = employee.skills[skillId] ?? 0;
    if (employee.status === 'Absent' && level >= minimumLevel) {
      temporarilyUnavailable.push({
        employee: { id: employee.id, name: employee.name, jobTitle: employee.currentRole },
        currentLevel: level,
        status: employee.status,
        note: 'Compétence suffisante mais indisponible actuellement.',
      });
    } else if (employee.status !== 'Absent' && level >= minimumLevel) {
      readyNow.push({
        employee: { id: employee.id, name: employee.name, jobTitle: employee.currentRole, department: employee.department },
        currentLevel: level,
        targetLevel: minimumLevel,
        status: 'Éligible',
        evidence: [`${SKILLS[skillId]} niveau ${level}`, `Statut : ${employee.status}`],
      });
    } else if (employee.status !== 'Absent' && level === minimumLevel - 1) {
      developmentCandidates.push({
        employee: { id: employee.id, name: employee.name, jobTitle: employee.currentRole, department: employee.department },
        currentLevel: level,
        targetLevel: minimumLevel,
        gap: 1,
        developmentAction: `Formation ou mission supervisée sur ${SKILLS[skillId]}`,
        evidence: [`Niveau actuel ${level}`, `Écart de 1 niveau`],
      });
    }
  }

  return {
    skill: { id: skillId, label: SKILLS[skillId], targetLevel: minimumLevel },
    readyNow,
    developmentCandidates,
    temporarilyUnavailable,
    counts: {
      readyNow: readyNow.length,
      development: developmentCandidates.length,
      temporarilyUnavailable: temporarilyUnavailable.length,
    },
    explainability: {
      dataUsed: ['compétences validées', 'statut de disponibilité'],
      dataNotUsed: ['âge', 'données de santé', 'situation personnelle'],
      automatedRanking: false,
      humanDecisionRequired: true,
      statement: 'Les personnes sont regroupées par éligibilité, sans classement automatique.',
    },
  };
}
