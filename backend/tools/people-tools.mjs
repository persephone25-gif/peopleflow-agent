import {
  EMPLOYEE_BY_ID,
  EMPLOYEES,
  EMPLOYEE_PLANNING,
  JOB_PROFILES,
  SKILLS,
} from '../data/demo-data.mjs';

export function getEmployeeProfile({ employeeId }) {
  const employee = EMPLOYEE_BY_ID[employeeId];
  if (!employee) throw new Error(`Collaborateur inconnu: ${employeeId}`);

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      currentRole: employee.currentRole,
      department: employee.department,
      status: employee.status,
      experienceYears: employee.experienceYears,
      careerTarget: employee.careerTarget ?? null,
      skills: employee.skills,
      certifications: employee.certifications,
    },
    explainability: {
      dataUsed: ['profil collaborateur', 'compétences validées', 'certifications', 'objectif carrière'],
      dataNotUsed: ['données médicales', 'opinions personnelles', 'informations non nécessaires'],
      humanDecisionRequired: false,
      statement: 'Lecture descriptive du profil PeopleFlow autorisé.',
    },
  };
}

export function getEmployeePlanning({ employeeId }) {
  const employee = EMPLOYEE_BY_ID[employeeId];
  if (!employee) throw new Error(`Collaborateur inconnu: ${employeeId}`);

  return {
    employee: { id: employee.id, name: employee.name },
    events: EMPLOYEE_PLANNING[employeeId] ?? [],
    explainability: {
      dataUsed: ['planning de démonstration', 'identité du collaborateur'],
      dataNotUsed: ['données médicales', 'données externes'],
      humanDecisionRequired: false,
      statement: 'Lecture du planning sans modification automatique.',
    },
  };
}

export function analyzeCareer({ employeeId }) {
  const employee = EMPLOYEE_BY_ID[employeeId];
  if (!employee) throw new Error(`Collaborateur inconnu: ${employeeId}`);

  const target = employee.careerTarget?.toLowerCase().includes('line leader')
    ? JOB_PROFILES['line-leader']
    : JOB_PROFILES['quality-specialist'];

  const skillCriteria = Object.entries(target.requiredSkills).map(([skillId, requiredLevel]) => {
    const currentLevel = employee.skills[skillId] ?? 0;
    return {
      skillId,
      label: SKILLS[skillId] ?? skillId,
      currentLevel,
      requiredLevel,
      gap: Math.max(0, requiredLevel - currentLevel),
      meetsRequirement: currentLevel >= requiredLevel,
    };
  });

  const matched = skillCriteria.filter((criterion) => criterion.meetsRequirement).length;
  const readiness = Math.round((matched / Math.max(1, skillCriteria.length)) * 100);

  return {
    employee: { id: employee.id, name: employee.name, currentRole: employee.currentRole },
    targetRole: target.title,
    readiness,
    skillCriteria,
    developmentActions: skillCriteria
      .filter((criterion) => !criterion.meetsRequirement)
      .map((criterion) => `Développer ${criterion.label} jusqu'au niveau ${criterion.requiredLevel}`),
    explainability: {
      dataUsed: ['compétences validées', 'expérience', 'objectif carrière', 'référentiel du poste cible'],
      dataNotUsed: ['âge', 'données de santé', 'données non liées aux compétences'],
      humanDecisionRequired: true,
      statement: 'L’analyse sert d’aide à la décision et ne décide pas d’une promotion.',
    },
  };
}

export function analyzeRecruitmentCandidates({ jobId = 'line-leader', candidateIds }) {
  const job = JOB_PROFILES[jobId] ?? JOB_PROFILES['line-leader'];
  const pool = Array.isArray(candidateIds) && candidateIds.length > 0
    ? candidateIds.map((id) => EMPLOYEE_BY_ID[id]).filter(Boolean)
    : EMPLOYEES.filter((employee) => employee.status !== 'Absent').slice(0, 6);

  const candidates = pool.map((candidate) => {
    const skillCriteria = Object.entries(job.requiredSkills).map(([skillId, requiredLevel]) => {
      const currentLevel = candidate.skills[skillId] ?? 0;
      return {
        skillId,
        label: SKILLS[skillId] ?? skillId,
        currentLevel,
        requiredLevel,
        gap: Math.max(0, requiredLevel - currentLevel),
        meetsRequirement: currentLevel >= requiredLevel,
      };
    });

    return {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        currentRole: candidate.currentRole,
      },
      experience: {
        years: candidate.experienceYears,
        minimumRequired: job.minimumExperienceYears,
        meetsRequirement: candidate.experienceYears >= job.minimumExperienceYears,
      },
      skillCriteria,
      matchedPreferredCertifications: candidate.certifications.filter((item) =>
        job.preferredCertifications.includes(item),
      ),
      evidenceNotes: [
        `${candidate.experienceYears} ans d'expérience documentée`,
        `${skillCriteria.filter((criterion) => criterion.meetsRequirement).length}/${skillCriteria.length} critères compétences atteints`,
      ],
    };
  });

  return {
    job: { id: job.id, title: job.title, description: job.description },
    candidates,
    explainability: {
      dataUsed: ['expérience documentée', 'compétences validées', 'certifications professionnelles'],
      dataNotUsed: ['âge', 'situation familiale', 'données de santé', 'opinions personnelles'],
      noAutomatedRanking: true,
      humanDecisionRequired: true,
      statement: 'Les candidats ne sont pas classés automatiquement. La décision reste humaine.',
    },
  };
}
